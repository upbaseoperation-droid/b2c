import { NextRequest, NextResponse } from 'next/server';
import { assertListingSheetAccess } from '@/lib/server/monthlyPlanStore';
import { isStaffGlobalAdminOrManager } from '@/lib/rbacScope';
import { readRecord, updateRecord, RecordError } from '@/lib/server/sharedRecords';
import {
  appendNewRows,
  configureSpreadsheetTemplate,
  ensureServiceAccountLoaded,
  GoogleSheetsError,
  listSpreadsheetTabs,
  parseSpreadsheetGid,
  parseSpreadsheetId,
  saveServiceAccountConfig,
  type SheetColumnPresetMode,
  type SheetSortMode,
} from '@/lib/server/googleSheets';
import { createListingItem, moveItem } from '@/lib/listingBoardRules';
import { getRealLarkListingsForBoardKey } from '@/lib/realLarkListings2026';
import type { KocListingItem } from '@/lib/types';
import { getPlanActor, handlePlanError, unauthorized } from '../../monthly-plans/_shared';

export const dynamic = 'force-dynamic';

const MAX_ROWS = 500;
const KEY_COLUMN = 'ID kênh';

interface PushRow {
  handle: string;
  kocName: string;
  followers: number;
  fee: number;
  grade: string;
  slotId?: string;
  pic?: string;
  cells: (string | number)[];
}

const listingKey = (planId: string) => `listing-board-${planId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)}`;

// GET /api/booking-list/push-sheet — trạng thái cấu hình kết nối Google Sheet (kèm danh sách Tab & trạng thái ẩn/hiện nếu truyền ?sheetUrl=...)
export async function GET(request: NextRequest) {
  const sa = await ensureServiceAccountLoaded();
  const sheetUrl = (request.nextUrl.searchParams.get('sheetUrl') || '').trim();

  // Truy vấn trạng thái Service Account thuần túy từ bảng cấu hình tích hợp (không yêu cầu phiên làm việc)
  if (!sheetUrl) {
    return NextResponse.json({
      configured: sa.configured,
      serviceAccountEmail: sa.configured ? sa.email : null,
      source: sa.source,
    });
  }

  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();

  if (sheetUrl && sa.configured) {
    const spreadsheetId = parseSpreadsheetId(sheetUrl);
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Link Google Sheet không hợp lệ.', code: 'INVALID' }, { status: 400 });
    }
    try {
      const info = await listSpreadsheetTabs(spreadsheetId);
      const gid = parseSpreadsheetGid(sheetUrl);
      const matchedTabByGid =
        gid !== null ? info.tabsDetail.find(t => t.sheetId === gid)?.title || null : null;
      return NextResponse.json({
        configured: sa.configured,
        serviceAccountEmail: sa.configured ? sa.email : null,
        source: sa.source,
        spreadsheetTitle: info.spreadsheetTitle,
        tabs: info.tabs,
        tabsDetail: info.tabsDetail,
        matchedTabByGid,
      });
    } catch (err) {
      if (err instanceof GoogleSheetsError) {
        return NextResponse.json(
          {
            configured: sa.configured,
            serviceAccountEmail: sa.configured ? sa.email : null,
            source: sa.source,
            error: err.message,
            code: err.code,
          },
          { status: err.status }
        );
      }
    }
  }
  return NextResponse.json({
    configured: sa.configured,
    serviceAccountEmail: sa.configured ? sa.email : null,
    source: sa.source,
  });
}

// PUT /api/booking-list/push-sheet — khai báo hoặc cập nhật thông tin Google Service Account trực tiếp từ giao diện (chỉ Giám đốc / Admin)
export async function PUT(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  if (!isStaffGlobalAdminOrManager(actor)) {
    return NextResponse.json({ error: 'Chỉ Giám đốc / Admin được đổi tài khoản dịch vụ Google.', code: 'FORBIDDEN' }, { status: 403 });
  }
  try {
    const body = (await request.json()) as {
      serviceAccountEmail?: string;
      privateKey?: string;
      serviceAccountJson?: string;
    };
    let email = (body.serviceAccountEmail || '').trim();
    let key = (body.privateKey || '').trim();
    if (body.serviceAccountJson?.trim()) {
      try {
        const parsed = JSON.parse(body.serviceAccountJson.trim()) as {
          client_email?: string;
          private_key?: string;
        };
        if (parsed.client_email) email = parsed.client_email.trim();
        if (parsed.private_key) key = parsed.private_key.trim();
      } catch {
        return NextResponse.json({ error: 'Nội dung JSON Service Account không đúng cú pháp.', code: 'INVALID' }, { status: 400 });
      }
    }
    const saved = await saveServiceAccountConfig({
      serviceAccountEmail: email,
      privateKey: key,
      actorName: actor.name,
    });
    return NextResponse.json({
      ok: true,
      configured: saved.configured,
      serviceAccountEmail: saved.email,
      source: saved.source,
    });
  } catch (err) {
    if (err instanceof GoogleSheetsError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return handlePlanError(err);
  }
}

// PATCH /api/booking-list/push-sheet — điều khiển Template Google Sheet:
// 1. Ẩn / Hiện các Tab tháng cũ
// 2. Ẩn / Hiện các nhóm cột trên Google Sheet theo giai đoạn (Gửi Brand duyệt / Đi Air & Nghiệm thu / Toàn bộ)
// 3. Sắp xếp (Sort) trực tiếp trên Google Sheet theo Sản phẩm / Nhân sự điền / Đợt + Tạo sẵn Filter Views trên Google Sheet
export async function PATCH(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  try {
    const body = (await request.json()) as {
      planId?: string;
      sheetUrl?: string;
      activeTab?: string;
      tabVisibility?: { title: string; hidden: boolean }[];
      collapsedMonths?: string[];
      collapseOldMonthsBefore?: string;
      expandAllMonths?: boolean;
      columnPreset?: SheetColumnPresetMode;
      customHiddenColumns?: string[];
      sortBy?: SheetSortMode;
      installFilterViews?: boolean;
      standardizeFormatting?: boolean;
    };
    const spreadsheetId = parseSpreadsheetId(body.sheetUrl || '');
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Link Google Sheet không hợp lệ.', code: 'INVALID' }, { status: 400 });
    }
    if (!body.planId) {
      return NextResponse.json({ error: 'Thiếu mã kế hoạch hoặc mã Sheet Listing.', code: 'INVALID' }, { status: 400 });
    }
    await assertListingSheetAccess(body.planId, actor);
    const sa = await ensureServiceAccountLoaded();
    if (!sa.configured) {
      return NextResponse.json(
        { error: 'Chưa cấu hình tài khoản dịch vụ Google Service Account.', code: 'NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    const result = await configureSpreadsheetTemplate({
      spreadsheetId,
      activeTab: body.activeTab?.trim(),
      tabVisibility: body.tabVisibility,
      collapsedMonths: body.collapsedMonths,
      collapseOldMonthsBefore: body.collapseOldMonthsBefore?.trim(),
      expandAllMonths: body.expandAllMonths,
      columnPreset: body.columnPreset,
      customHiddenColumns: body.customHiddenColumns,
      sortBy: body.sortBy,
      installFilterViews: body.installFilterViews,
      standardizeFormatting: body.standardizeFormatting,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof GoogleSheetsError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return handlePlanError(err);
  }
}

// POST /api/booking-list/push-sheet — đẩy danh sách KOC dự kiến book lên Google Sheet của Brand (nhận diện theo Row ID -> Composite -> ID kênh),
// đồng thời đưa các KOC mới vào bảng điều phối listing ở trạng thái "Chờ Brand duyệt".
export async function POST(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  try {
    const body = (await request.json()) as {
      planId?: string;
      sheetUrl?: string;
      tab?: string;
      tabName?: string;
      columns?: string[];
      header?: string[];
      rows?: (PushRow | (string | number)[])[];
      dryRun?: boolean;
      refresh?: boolean;
    };
    const dryRun = body.dryRun === true;
    const forceFresh = dryRun ? body.refresh === true : true;
    const planId = body.planId || '';
    const spreadsheetId = parseSpreadsheetId(body.sheetUrl || '');
    const columns = Array.isArray(body.columns) ? body.columns : Array.isArray(body.header) ? body.header : null;
    const rawRows = Array.isArray(body.rows) ? body.rows : [];
    if (!planId || !spreadsheetId) return NextResponse.json({ error: 'Thiếu mã kế hoạch hoặc link Google Sheet không hợp lệ.', code: 'INVALID' }, { status: 400 });
    if (!columns || rawRows.length === 0) return NextResponse.json({ error: 'Chưa có KOC nào được gán để gửi.', code: 'INVALID' }, { status: 400 });
    if (rawRows.length > MAX_ROWS) return NextResponse.json({ error: `Tối đa ${MAX_ROWS} KOC mỗi lần gửi.`, code: 'INVALID' }, { status: 400 });
    const sa = await ensureServiceAccountLoaded();
    if (!sa.configured) {
      return NextResponse.json({ error: 'Chưa cấu hình tài khoản dịch vụ Google. Vui lòng khai báo Service Account hoặc tải file Excel.', code: 'NOT_CONFIGURED' }, { status: 503 });
    }
    // Sheet nhân sự ("YYYY/MM__Gian") không có kế hoạch: chỉ ghi Sheet, không đưa KOC vào bảng điều phối
    const plan = await assertListingSheetAccess(planId, actor);

    const cellRows: (string | number)[][] = rawRows.map(r => (Array.isArray(r) ? r : r.cells));
    const pushObjects: PushRow[] = rawRows.filter((r): r is PushRow => !Array.isArray(r) && typeof r === 'object' && r !== null && 'handle' in r);
    const resolvedKeyCol = columns.find(c => /id kênh|id kenh/i.test(c)) || KEY_COLUMN;

    const result = await appendNewRows({
      spreadsheetId,
      tab: (body.tab || body.tabName || '').trim(),
      sheetGid: parseSpreadsheetGid(body.sheetUrl || ''),
      columns,
      rows: cellRows,
      keyColumn: resolvedKeyCol,
      dryRun,
      forceFresh,
    });

    // Đưa KOC vừa gửi vào bảng điều phối listing (Chờ Brand duyệt) — chỉ thực hiện khi ghi thật (!dryRun)
    let listed = 0;
    if (!dryRun && plan && pushObjects.length > 0) {
      const boardKey = listingKey(plan.id);
      const fallbackItems = getRealLarkListingsForBoardKey(boardKey);
      for (let attempt = 0; attempt < 3; attempt++) {
        const rec = await readRecord<{ items: KocListingItem[] }>(boardKey, { items: fallbackItems });
        const curItems =
          rec.revision > 0 || (Array.isArray(rec.data.items) && rec.data.items.length > 0)
            ? rec.data.items
            : fallbackItems;
        const existingByKey = new Map<string, number>();
        curItems.forEach((i, idx) => {
          if (i.overallStatus === 'DROPPED') return;
          const h = (i.kocHandle || '').replace(/^@/, '').toLowerCase();
          existingByKey.set(h, idx);
          if (i.planSlotId) existingByKey.set(`${h}::${i.planSlotId.toLowerCase()}`, idx);
        });
        const nextItems = [...curItems];
        let changedCount = 0;
        for (const r of pushObjects) {
          const h: string = (r.handle || '').replace(/^@/, '').toLowerCase();
          const compKey: string = r.slotId ? `${h}::${r.slotId.toLowerCase()}` : h;
          const existIdx = existingByKey.get(compKey) ?? existingByKey.get(h);
          if (existIdx !== undefined) {
            const existing = nextItems[existIdx];
            if (existing.overallStatus === 'DRAFT') {
              const moved = moveItem(existing, 'WAIT_BRAND', actor.name);
              if (moved.item) {
                nextItems[existIdx] = moved.item;
                changedCount += 1;
              }
            }
            continue;
          }
          const item = createListingItem({
            plan,
            grade: (r.grade as never) || 'KL1',
            handle: r.handle,
            fee: r.fee,
            followers: r.followers,
            kocName: r.kocName,
            actorId: actor.id,
            actorName: actor.name,
          });
          if (typeof r.slotId === 'string' && r.slotId) item.planSlotId = r.slotId.slice(0, 60);
          if (typeof r.pic === 'string' && r.pic.trim()) item.assignedStaffName = r.pic.trim().slice(0, 120);
          nextItems.push(moveItem(item, 'WAIT_BRAND', actor.name).item || item);
          changedCount += 1;
        }
        if (changedCount === 0) break;
        try {
          await updateRecord<{ items: KocListingItem[] }>(boardKey, { items: fallbackItems }, rec.revision, () => ({ items: nextItems }));
          listed = changedCount;
          break;
        } catch (err) {
          if (!(err instanceof RecordError && err.status === 409)) throw err;
        }
      }
    }

    return NextResponse.json({ ok: true, ...result, listed, url: body.sheetUrl });
  } catch (err) {
    if (err instanceof GoogleSheetsError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    if (err instanceof RecordError) return NextResponse.json({ error: err.message }, { status: err.status });
    return handlePlanError(err);
  }
}
