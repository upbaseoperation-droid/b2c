import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/larkAuth';
import {
  ingestLarkbaseWebhookRecord,
  listIngestedLarkbasePlanRecords,
  pullApprovedBookingPlansFromLarkbase
} from '@/lib/server/larkbaseBookingPlanSync';

export const dynamic = 'force-dynamic';

// GET /api/integrations/larkbase/booking-plans — Lấy trạng thái kết nối & danh sách bản ghi trong bảng hứng kế hoạch B2C Booking từ Larkbase / AnyCross
export async function GET(request: NextRequest) {
  const user = getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized: Vui lòng đăng nhập để xem danh sách kế hoạch Larkbase.' },
      { status: 401 }
    );
  }
  if (user.partnerType || user.role.endsWith('_PARTNER')) {
    return NextResponse.json(
      { error: 'Tài khoản đối tác không có quyền truy cập dữ liệu bảng hứng kế hoạch nội bộ.' },
      { status: 403 }
    );
  }

  try {
    const month = request.nextUrl.searchParams.get('month') || undefined;
    const data = await listIngestedLarkbasePlanRecords(month);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Lỗi khi tải bảng hứng kế hoạch Larkbase.' },
      { status: 500 }
    );
  }
}

// POST /api/integrations/larkbase/booking-plans — Nhận dữ liệu đẩy từ Lark AnyCross / Larkbase Automation hoặc chủ động kéo qua API
export async function POST(request: NextRequest) {
  try {
    // Ghi kế hoạch qua webhook chỉ nhận khi: AnyCross gửi đúng secret, hoặc người đăng nhập có quyền đồng bộ kế hoạch.
    const expectedSecret = process.env.ANYCROSS_WEBHOOK_SECRET?.trim();
    const headerSecret =
      request.headers.get('x-anycross-secret')?.trim() ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
    if (headerSecret && expectedSecret && headerSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Sai mã xác thực AnyCross (x-anycross-secret).' }, { status: 401 });
    }
    const viaAnyCross = Boolean(expectedSecret && headerSecret === expectedSecret);
    const user = getAuthenticatedUser(request);
    const canSync = Boolean(
      user &&
        !user.partnerType &&
        !user.role.endsWith('_PARTNER') &&
        (['ADMIN', 'MANAGER', 'LEADER'].includes(user.role) ||
          user.permissions?.includes('canApproveBudget'))
    );
    const rejectWebhook = () =>
      NextResponse.json(
        { error: 'Webhook kế hoạch cần mã xác thực AnyCross hợp lệ hoặc tài khoản có quyền đồng bộ kế hoạch.' },
        { status: user ? 403 : 401 }
      );

    const rawBody = await request.json().catch(() => ({}));

    // 1. Trường hợp AnyCross đẩy mảng nhiều bản ghi cùng lúc (Batch)
    if (Array.isArray(rawBody) || Array.isArray(rawBody?.records)) {
      if (!viaAnyCross && !canSync) return rejectWebhook();
      const items = (Array.isArray(rawBody) ? rawBody : rawBody.records) as Array<Record<string, unknown>>;
      const acceptedRecords = [];
      const acceptedPlans = [];

      for (const item of items) {
        const res = await ingestLarkbaseWebhookRecord({
          record_id: String(item.record_id || item.larkRecordId || `recAnyCross${Date.now()}`),
          app_token: String(item.app_token || item.larkAppToken || 'bascnUpbaseB2CPlan41'),
          table_id: String(item.table_id || item.larkTableId || 'tblBookingInputPlan411'),
          fields: (item.fields as Record<string, unknown>) || item
        });
        if (res.accepted && res.record && res.plan) {
          acceptedRecords.push(res.record);
          acceptedPlans.push(res.plan);
        }
      }

      return NextResponse.json(
        {
          accepted: acceptedRecords.length > 0,
          syncedCount: acceptedRecords.length,
          records: acceptedRecords,
          plans: acceptedPlans
        },
        { status: 201 }
      );
    }

    const body = rawBody as {
      mode?: 'PULL' | 'WEBHOOK' | 'ANYCROSS';
      appToken?: string;
      tableId?: string;
      viewId?: string;
      month?: string;
      actorName?: string;
      record_id?: string;
      app_token?: string;
      table_id?: string;
      fields?: Record<string, unknown>;
      store_name?: string;
      Gian_hang?: string;
    };

    // 2. Trường hợp AnyCross hoặc Larkbase Automation đẩy 1 bản ghi (có bọc `fields` hoặc JSON phẳng trực tiếp từ AnyCross)
    const isDirectAnyCrossPayload =
      body.mode === 'WEBHOOK' ||
      body.mode === 'ANYCROSS' ||
      Boolean(body.fields) ||
      Boolean(body.store_name || (rawBody as Record<string, unknown>)['Gian hàng']);

    if (isDirectAnyCrossPayload) {
      if (!viaAnyCross && !canSync) return rejectWebhook();
      const result = await ingestLarkbaseWebhookRecord({
        record_id: body.record_id || String((rawBody as Record<string, unknown>).larkRecordId || `recAnyCross${Date.now()}`),
        app_token: body.app_token || body.appToken,
        table_id: body.table_id || body.tableId,
        fields: body.fields || (rawBody as Record<string, unknown>)
      });
      if (!result.accepted) {
        return NextResponse.json(result, { status: 202 });
      }
      return NextResponse.json(result, { status: 201 });
    }

    // 3. Trường hợp bấm nút đồng bộ từ giao diện
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: Vui lòng đăng nhập để thực hiện đồng bộ kế hoạch.' },
        { status: 401 }
      );
    }
    if (!canSync) {
      return NextResponse.json(
        { error: 'Bạn không có quyền kích hoạt đồng bộ kế hoạch từ Larkbase.' },
        { status: 403 }
      );
    }

    const result = await pullApprovedBookingPlansFromLarkbase({
      appToken: body.appToken,
      tableId: body.tableId,
      viewId: body.viewId,
      month: body.month,
      actorName: body.actorName || user.name
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Lỗi khi đồng bộ kế hoạch từ Larkbase / AnyCross.' },
      { status: 500 }
    );
  }
}
