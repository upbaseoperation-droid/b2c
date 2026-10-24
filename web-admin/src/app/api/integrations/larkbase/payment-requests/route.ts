import { NextRequest, NextResponse } from 'next/server';
import { fetchLarkAppAccessToken, getLarkConfig, getAuthenticatedUser } from '@/lib/larkAuth';
import {
  buildLarkPaymentRequestSlip,
  type DealPaymentLedgerEntry,
  type DealPaymentOverrides,
  type LarkPaymentRequestSlip,
  type PaymentRequestType,
} from '@/lib/larkPaymentRequestEngine';
import type { BookingDealItem, KocItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Kho lưu trữ các phiếu ĐNTT / Tạm ứng đã đẩy sang Lark Approval & Larkbase trong phiên
const memoryPaymentRequestSlips = new Map<string, LarkPaymentRequestSlip>();

function seedInitialPaymentSlips() {
  if (memoryPaymentRequestSlips.size > 0) return;
  const sampleSlip: LarkPaymentRequestSlip = {
    id: 'SLIP-202610-001',
    slipCode: 'DNTT-202610-001',
    requestType: 'SETTLEMENT',
    requestTypeLabel: 'Đề nghị thanh toán tất toán (Đợt 2 / 100%)',
    month: '2026/10',
    createdAt: '2026-10-18T09:15:00.000Z',
    createdBy: 'Lương Thị Như Quỳnh',
    note: 'Tất toán 100% đơn video Kutieskin Mama đã nghiệm thu link air & mã Spark Ads 60 ngày',
    payee: {
      subjectKind: 'IND',
      subjectLabel: 'Cá nhân (Khấu trừ 10% TNCN khi ≥ 2M)',
      kocId: 'koc-1',
      kocStageName: 'Mẹ Gấu Review',
      kocChannelId: '@megauriviu',
      legalEntityName: 'Nguyễn Thị Thu Hương',
      legalId: '001195018294',
      hasIdCardScan: true,
      bankName: 'Techcombank',
      bankAccount: '19036829104018',
      bankHolder: 'NGUYEN THI THU HUONG',
      isMcnOrAlternatePayee: false,
      vietQrUrl:
        'https://img.vietqr.io/image/970407-19036829104018-compact2.png?amount=3500000&addInfo=DNTT%20BO260961606%202026%2F10&accountName=NGUYEN%20THI%20THU%20HUONG',
    },
    approvalRoute: {
      hasBookingLeader: false,
      marketingDirectorName: 'Đặng Thị Yến Nhi',
      financeApproverName: 'Phòng Tài chính - Kế toán (TCKT)',
      routeSummary:
        'Chuyên viên (Lương Thị Như Quỳnh) → Giám đốc MKT (Đặng Thị Yến Nhi) → Kế toán (TCKT) (Gian hàng không qua Leader trung gian)',
    },
    lineItems: [
      {
        dealId: 'deal-sample-1',
        dealCode: 'BO260961606',
        jobId: 'ID260952684',
        brandName: 'Kutieskin Mama',
        storeName: 'Kutieskin Mama_TikTok_E2E-S',
        productName: 'Kem bôi dịu da cho bé Kutieskin',
        salaryGrade: 'KL3',
        bookingPic: 'Lương Thị Như Quỳnh',
        approverDirector: 'Đặng Thị Yến Nhi',
        requestType: 'SETTLEMENT',
        agreedNetAmount: 3500000,
        droppedDeductionAmount: 0,
        effectiveSettledNetAmount: 3500000,
        advancePaidAmount: 0,
        requestBaseNetAmount: 3500000,
        vatRate: 0,
        vatAmount: 0,
        pitDeductionRate: 0.1,
        pitDeductionAmount: 388889,
        grossContractAmount: 3888889,
        netTransferAmount: 3500000,
        linkAir: 'https://www.tiktok.com/@megauriviu/video/7421859203849102599',
        postedDate: '2026-10-12',
        sparkAdsCode: 'SPARK-TT-61606-8821',
        contractUrl: 'https://drive.google.com/drive/folders/upbase-hd-bo260961606',
        bbntUrl: 'Miễn BBNT (<20M & khớp 100% theo BR-04)',
        invoiceNumber: '',
        isContractMandatory: false,
        contractMandatoryReason: 'Tổng giá trị < 10.000.000 đ và tạm ứng < 2.000.000 đ: Miễn ký HĐ giấy theo BR-03.',
        isBbntMandatory: false,
        bbntMandatoryReason: 'Tổng giá trị < 20.000.000 đ và nghiệm thu khớp 100%: Tự động thanh lý theo BR-04.',
        isEligible: true,
        issues: [],
      },
    ],
    totals: {
      dealsCount: 1,
      agreedNetTotal: 3500000,
      droppedDeductionTotal: 0,
      advancePaidTotal: 0,
      requestBaseNetTotal: 3500000,
      vatTotal: 0,
      pitTax10PctTotal: 388889,
      grossTotal: 3888889,
      netTransferTotal: 3500000,
      amountInWords: 'Ba triệu năm trăm nghìn đồng',
    },
    larkSync: {
      approvalInstanceCode: 'LARK-DNTT-20261018-001',
      larkbaseRecordId: 'recB2cPayment32_001',
      larkAppToken: process.env.LARK_BASE_APP_TOKEN || 'bascnUpbaseB2CPlan41',
      larkTableId: process.env.LARK_PAYMENT_TABLE_ID || 'tblB2cBookingPayment32',
      anycrossWebhookDelivered: true,
      syncMode: 'SANDBOX_SIMULATED',
      approvalStatus: 'APPROVED',
      syncedAt: '2026-10-18T09:15:02.000Z',
    },
  };
  memoryPaymentRequestSlips.set(sampleSlip.id, sampleSlip);
}

/** Tổng hợp các phiếu đã lập theo mã đơn để chặn lập trùng và trừ tạm ứng khi tất toán. */
function paymentLedgerByDealCode(): Record<string, DealPaymentLedgerEntry> {
  const ledger: Record<string, DealPaymentLedgerEntry> = {};
  for (const slip of memoryPaymentRequestSlips.values()) {
    for (const item of slip.lineItems) {
      const entry = (ledger[item.dealCode] ??= { advanceRequestedAmount: 0, settlementRequested: false });
      if (slip.requestType === 'ADVANCE') entry.advanceRequestedAmount += item.requestBaseNetAmount;
      else entry.settlementRequested = true;
    }
  }
  return ledger;
}

type ApprovalStatus = LarkPaymentRequestSlip['larkSync']['approvalStatus'];

/** Vai trò được duyệt ở từng bước; mỗi lần chỉ chuyển sang bước kế tiếp. */
const APPROVER_ROLES_BY_STATUS: Partial<Record<ApprovalStatus, string[]>> = {
  PENDING_LEADER: ['LEADER', 'MANAGER', 'ADMIN'],
  PENDING_DIRECTOR: ['MANAGER', 'ADMIN'],
  PENDING_FINANCE: ['FINANCE', 'ADMIN'],
  APPROVED: ['FINANCE', 'ADMIN'],
};

function getLarkPaymentIntegrationConfig() {
  const lark = getLarkConfig();
  const appToken = (process.env.LARK_BASE_APP_TOKEN || 'bascnUpbaseB2CPlan41').trim();
  const paymentTableId = (process.env.LARK_PAYMENT_TABLE_ID || 'tblB2cBookingPayment32').trim();
  const approvalDefCode = (process.env.LARK_APPROVAL_DEFINITION_CODE || '').trim();
  const anycrossWebhookUrl = (process.env.ANYCROSS_PAYMENT_WEBHOOK_URL || '').trim();

  return {
    domain: lark.domain,
    hasLarkCredentials: lark.isConfigured,
    appToken,
    paymentTableId,
    approvalDefCode: approvalDefCode || 'DEF_B2C_BOOKING_PAYMENT_V2026',
    hasLiveApprovalDef: Boolean(approvalDefCode),
    hasAnycrossWebhook: Boolean(anycrossWebhookUrl),
    anycrossWebhookUrl,
  };
}

/**
 * GET /api/integrations/larkbase/payment-requests
 * Lấy trạng thái cấu hình kết nối Lark Approval / Larkbase 3.2 và danh sách các phiếu ĐNTT đã đẩy
 */
export async function GET(request: NextRequest) {
  const user = getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized: Vui lòng đăng nhập để xem danh sách phiếu đề nghị thanh toán.' },
      { status: 401 }
    );
  }
  if (user.partnerType || user.role.endsWith('_PARTNER')) {
    return NextResponse.json(
      { error: 'Tài khoản đối tác không có quyền truy cập dữ liệu đề nghị thanh toán nội bộ.' },
      { status: 403 }
    );
  }

  seedInitialPaymentSlips();
  const config = getLarkPaymentIntegrationConfig();
  const slips = Array.from(memoryPaymentRequestSlips.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  return NextResponse.json({
    config: {
      domain: config.domain,
      appToken: config.appToken,
      paymentTableId: config.paymentTableId,
      approvalDefCode: config.approvalDefCode,
      hasLiveApprovalDef: config.hasLiveApprovalDef,
      hasAnycrossWebhook: config.hasAnycrossWebhook,
    },
    slips,
  });
}

/**
 * POST /api/integrations/larkbase/payment-requests
 * Kiểm tra chặn cứng 100% hồ sơ Bảng 3.2 và đẩy phiếu Tạm ứng / ĐNTT sang Lark Approval API + Larkbase Bitable / AnyCross
 */
export async function POST(request: NextRequest) {
  const user = getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized: Vui lòng đăng nhập để tạo phiếu đề nghị thanh toán.' },
      { status: 401 }
    );
  }
  const allowedRoles = [
    'ADMIN',
    'MANAGER',
    'GROWTH_MANAGER',
    'MEDIA_MANAGER',
    'LEADER',
    'BOOKING_MEMBER',
    'MEMBER',
    'FINANCE'
  ];
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { error: 'Bạn không có quyền lập phiếu đề nghị thanh toán.' },
      { status: 403 }
    );
  }

  try {
    seedInitialPaymentSlips();
    const body = (await request.json()) as {
      mode?: 'SYNC_LARK_32_BOOKING_LIST';
      jobs?: Array<{
        jobId: string;
        jobCode: string;
        dealCode: string;
        brandName: string;
        storeName: string;
        month: string;
        kocName: string;
        kocHandle: string;
        grade: string;
        fee: number;
        sampleStatus?: string;
        trackingNo?: string;
        airLink?: string;
        airedAt?: string;
        sparkAdsCode?: string;
        acceptanceStatus?: string;
        existingRecordId?: string;
      }>;
      requestType?: PaymentRequestType;
      deals?: BookingDealItem[];
      kocs?: KocItem[];
      overridesByDealId?: Record<string, DealPaymentOverrides>;
      sharedPayeeOverride?: DealPaymentOverrides;
      actorName?: string;
      note?: string;
      month?: string;
    };

    if (body.mode === 'SYNC_LARK_32_BOOKING_LIST') {
      const jobs = Array.isArray(body.jobs) ? body.jobs : [];
      if (jobs.length === 0) {
        return NextResponse.json({ success: false, error: 'Chưa có Job nào để đồng bộ sang Bảng 3.2.' }, { status: 400 });
      }
      // Chưa nối API ghi Bảng 3.2: không sinh mã bản ghi giả, trả rõ là giả lập; production báo chưa hỗ trợ.
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { success: false, error: 'LARK32_SYNC_NOT_CONNECTED', message: 'Đồng bộ Bảng 3.2 chưa được kết nối với Larkbase. Chưa có Job nào được gửi.' },
          { status: 501 }
        );
      }
      const nowIso = new Date().toISOString();
      const syncedJobs = jobs.map(j => {
        const isAired = Boolean((j.airLink || '').trim());
        const larkRecordId = j.existingRecordId || '';
        return {
          jobId: j.jobId,
          jobCode: j.jobCode,
          larkRecordId,
          syncedAt: nowIso,
          milestone: isAired ? 'MILESTONE_2_AIRED_ACCEPTED' : 'MILESTONE_1_BOOKED',
          isFoc: j.fee === 0 || j.grade === 'TAP UpAffiliate' || j.grade === 'FOC',
        };
      });
      return NextResponse.json({
        success: true,
        simulated: true,
        syncedCount: syncedJobs.length,
        syncedJobs,
      });
    }

    const requestType: PaymentRequestType = body.requestType === 'ADVANCE' ? 'ADVANCE' : 'SETTLEMENT';
    const deals = Array.isArray(body.deals) ? body.deals : [];
    const kocs = Array.isArray(body.kocs) ? body.kocs : [];
    const actorName = user.name;
    const month = (body.month || '2026/10').trim();

    if (deals.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'EMPTY_DEALS',
          message: 'Vui lòng chọn ít nhất 1 mã đơn BO từ Bảng 3.2 để tạo phiếu thanh toán.',
        },
        { status: 400 }
      );
    }

    // 1. Chạy động cơ kiểm tra chặn cứng 100% ngay trên máy chủ
    const built = buildLarkPaymentRequestSlip({
      requestType,
      deals,
      kocs,
      overridesByDealId: body.overridesByDealId,
      sharedPayeeOverride: body.sharedPayeeOverride,
      createdBy: actorName,
      note: body.note,
      month,
      ledgerByDealCode: paymentLedgerByDealCode(),
    });

    if (!built.canSubmit) {
      return NextResponse.json(
        {
          success: false,
          error: 'HARD_BLOCK_VALIDATION_FAILED',
          message: `Không thể đẩy phiếu thanh toán: Phát hiện ${built.allIssues.length} thông tin bắt buộc còn thiếu hoặc chưa hợp lệ trên Bảng 3.2.`,
          issues: built.allIssues,
          lineItems: built.lineItems,
        },
        { status: 422 }
      );
    }

    const config = getLarkPaymentIntegrationConfig();
    const hasLiveLark =
      config.hasLarkCredentials && config.appToken !== 'bascnUpbaseB2CPlan41' && config.hasLiveApprovalDef;
    // Production không được "giả lập thành công": thiếu kết nối thì báo lỗi, phiếu không được ghi nhận.
    if (!hasLiveLark && !config.hasAnycrossWebhook && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        {
          success: false,
          error: 'LARK_NOT_CONFIGURED',
          message: 'Chưa cấu hình kết nối Lark Approval / Larkbase (LARK_APPROVAL_DEFINITION_CODE, LARK_BASE_APP_TOKEN). Phiếu chưa được gửi.',
        },
        { status: 503 }
      );
    }
    const seq = String(memoryPaymentRequestSlips.size + 1).padStart(3, '0');
    const prefix = requestType === 'ADVANCE' ? 'TU' : 'DNTT';
    const monthCompact = month.replace(/\D/g, '');
    const slipCode = `${prefix}-${monthCompact}-${seq}`;
    const nowIso = new Date().toISOString();

    let approvalInstanceCode = `LARK-${prefix}-${monthCompact}-${Date.now().toString().slice(-5)}`;
    let larkbaseRecordId = `recB2cPayment32_${Date.now().toString().slice(-6)}`;
    let anycrossWebhookDelivered = false;
    let syncMode: LarkPaymentRequestSlip['larkSync']['syncMode'] = 'SANDBOX_SIMULATED';

    let liveSyncError = '';

    // 2. Đẩy sang Lark Approval Open API + Larkbase Bitable API v1 nếu đã cấu hình thông tin xác thực thật
    if (hasLiveLark) {
      try {
        const accessToken = await fetchLarkAppAccessToken();

        // 2a. Tạo phiếu trên Lark Approval v4 (/open-apis/approval/v4/instances)
        {
          const approvalRes = await fetch(
            `https://${config.domain}/open-apis/approval/v4/instances`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                approval_code: config.approvalDefCode,
                form: JSON.stringify([
                  { id: 'slip_code', type: 'input', value: slipCode },
                  {
                    id: 'request_type',
                    type: 'input',
                    value:
                      requestType === 'ADVANCE'
                        ? 'Phiếu Tạm ứng Đợt 1'
                        : 'Phiếu Đề nghị thanh toán Tất toán',
                  },
                  {
                    id: 'deal_codes',
                    type: 'input',
                    value: built.lineItems.map(i => i.dealCode).join(', '),
                  },
                  {
                    id: 'master_contract_codes',
                    type: 'input',
                    value: Array.from(
                      new Set(built.lineItems.map(i => i.masterContractCode).filter(Boolean))
                    ).join(', '),
                  },
                  {
                    id: 'appendix_codes',
                    type: 'input',
                    value: built.lineItems
                      .map(i => i.contractAppendixCode || `PL-${i.dealCode}-01`)
                      .join(', '),
                  },
                  {
                    id: 'video_asset_net_amount',
                    type: 'amount',
                    value: String(
                      built.lineItems.reduce((s, i) => s + (i.videoAssetNetAmount || 0), 0)
                    ),
                  },
                  {
                    id: 'addon_services_net_amount',
                    type: 'amount',
                    value: String(
                      built.lineItems.reduce((s, i) => s + (i.addonServicesNetAmount || 0), 0)
                    ),
                  },
                  {
                    id: 'dropped_deduction_amount',
                    type: 'amount',
                    value: String(built.totals.droppedDeductionTotal),
                  },
                  { id: 'koc_name', type: 'input', value: built.payee.kocStageName },
                  { id: 'payee_holder', type: 'input', value: built.payee.bankHolder },
                  {
                    id: 'bank_info',
                    type: 'input',
                    value: `${built.payee.bankName} - ${built.payee.bankAccount}`,
                  },
                  { id: 'legal_id', type: 'input', value: built.payee.legalId },
                  {
                    id: 'net_transfer_amount',
                    type: 'amount',
                    value: String(built.totals.netTransferTotal),
                  },
                  {
                    id: 'gross_contract_amount',
                    type: 'amount',
                    value: String(built.totals.grossTotal),
                  },
                  {
                    id: 'tax_amount',
                    type: 'amount',
                    value: String(built.totals.pitTax10PctTotal + built.totals.vatTotal),
                  },
                ]),
              }),
            }
          );
          const approvalJson = await approvalRes.json().catch(() => null);
          if (approvalJson?.code === 0 && approvalJson?.data?.instance_code) {
            approvalInstanceCode = approvalJson.data.instance_code;
            syncMode = 'LIVE_LARK_API';
          } else {
            throw new Error(`Lark Approval từ chối tạo phiếu: ${approvalJson?.msg || `HTTP ${approvalRes.status}`}`);
          }
        }

        // 2b. Ghi bản ghi ĐNTT vào bảng Larkbase Bitable (Bảng 3.2 / Bảng Thanh toán)
        const bitableRes = await fetch(
          `https://${config.domain}/open-apis/bitable/v1/apps/${encodeURIComponent(
            config.appToken
          )}/tables/${encodeURIComponent(config.paymentTableId)}/records`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fields: {
                'Mã phiếu ĐNTT': slipCode,
                'Mã duyệt Lark Approval': approvalInstanceCode,
                'Loại thanh toán':
                  requestType === 'ADVANCE' ? 'Tạm ứng đợt 1' : 'Tất toán / Thanh toán 100%',
                'Danh sách Mã BO': built.lineItems.map(i => i.dealCode).join(', '),
                'Thương hiệu': Array.from(new Set(built.lineItems.map(i => i.brandName))).join(', '),
                'Gian hàng': Array.from(new Set(built.lineItems.map(i => i.storeName))).join(', '),
                'KOC': built.payee.kocStageName,
                'ID Kênh': built.payee.kocChannelId,
                'Chủ thể thuế': built.payee.subjectLabel,
                'CCCD / MST': built.payee.legalId,
                'Ngân hàng': built.payee.bankName,
                'Số tài khoản': built.payee.bankAccount,
                'Chủ tài khoản': built.payee.bankHolder,
                'Giá Net thỏa thuận': built.totals.agreedNetTotal,
                'Khấu trừ rớt sóng': built.totals.droppedDeductionTotal,
                'Đã tạm ứng': built.totals.advancePaidTotal,
                'Thuế TNCN 10%': built.totals.pitTax10PctTotal,
                'Thuế VAT': built.totals.vatTotal,
                'Tổng Gross hợp đồng': built.totals.grossTotal,
                'Số tiền thực chuyển': built.totals.netTransferTotal,
                'Link Air nghiệm thu': built.lineItems.map(i => i.linkAir).filter(Boolean).join('\n'),
                'Link Hợp đồng': built.lineItems.map(i => i.contractUrl).filter(Boolean).join('\n'),
                'Biên bản nghiệm thu': built.lineItems.map(i => i.bbntUrl).filter(Boolean).join('\n'),
                'Người tạo phiếu': actorName,
                'Luồng phê duyệt': built.approvalRoute.routeSummary,
                'Trạng thái': built.approvalRoute.hasBookingLeader
                  ? 'Chờ Leader sơ duyệt'
                  : 'Chờ Giám đốc MKT & Kế toán duyệt',
              },
            }),
          }
        );
        const bitableJson = await bitableRes.json().catch(() => null);
        if (bitableJson?.code === 0 && bitableJson?.data?.record?.record_id) {
          larkbaseRecordId = bitableJson.data.record.record_id;
        } else {
          // Phiếu duyệt đã tạo nhưng chưa ghi được Bảng 3.2: vẫn lưu phiếu (tránh tạo trùng phiếu duyệt) và báo rõ.
          larkbaseRecordId = '';
          liveSyncError = `Đã tạo phiếu duyệt Lark nhưng chưa ghi được Larkbase 3.2: ${bitableJson?.msg || `HTTP ${bitableRes.status}`}.`;
        }
      } catch (err) {
        if (syncMode !== 'LIVE_LARK_API') {
          return NextResponse.json(
            {
              success: false,
              error: 'LARK_SYNC_FAILED',
              message: `Không gửi được phiếu sang Lark: ${err instanceof Error ? err.message : 'lỗi kết nối'}. Phiếu chưa được ghi nhận, có thể thử lại.`,
            },
            { status: 502 }
          );
        }
        larkbaseRecordId = '';
        liveSyncError = `Đã tạo phiếu duyệt Lark nhưng chưa ghi được Larkbase 3.2: ${err instanceof Error ? err.message : 'lỗi kết nối'}.`;
      }
    }

    // 3. Nếu có cấu hình ANYCROSS_PAYMENT_WEBHOOK_URL thì bắn payload đồng bộ sang AnyCross
    if (config.hasAnycrossWebhook) {
      try {
        const whRes = await fetch(config.anycrossWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.ANYCROSS_WEBHOOK_SECRET
              ? { 'x-anycross-secret': process.env.ANYCROSS_WEBHOOK_SECRET }
              : {}),
          },
          body: JSON.stringify({
            event: 'B2C_PAYMENT_REQUEST_CREATED',
            slipCode,
            approvalInstanceCode,
            requestType,
            month,
            createdBy: actorName,
            payee: built.payee,
            approvalRoute: built.approvalRoute,
            totals: built.totals,
            lineItems: built.lineItems,
          }),
        });
        if (whRes.ok) {
          anycrossWebhookDelivered = true;
          if (syncMode === 'SANDBOX_SIMULATED') syncMode = 'ANYCROSS_WEBHOOK';
        }
      } catch {
        anycrossWebhookDelivered = false;
      }
      if (!anycrossWebhookDelivered && !hasLiveLark) {
        return NextResponse.json(
          {
            success: false,
            error: 'ANYCROSS_SYNC_FAILED',
            message: 'Không gửi được phiếu sang AnyCross. Phiếu chưa được ghi nhận, có thể thử lại.',
          },
          { status: 502 }
        );
      }
    }
    const simulated = syncMode === 'SANDBOX_SIMULATED';

    const slip: LarkPaymentRequestSlip = {
      id: `SLIP-${Date.now()}`,
      slipCode,
      requestType,
      requestTypeLabel:
        requestType === 'ADVANCE'
          ? 'Phiếu tạm ứng (Đợt 1)'
          : 'Đề nghị thanh toán tất toán (Đợt 2 / 100%)',
      month,
      createdAt: nowIso,
      createdBy: actorName,
      note: body.note?.trim() || undefined,
      payee: built.payee,
      approvalRoute: built.approvalRoute,
      lineItems: built.lineItems,
      totals: built.totals,
      larkSync: {
        approvalInstanceCode,
        larkbaseRecordId,
        larkAppToken: config.appToken,
        larkTableId: config.paymentTableId,
        anycrossWebhookDelivered,
        syncMode,
        approvalStatus: built.approvalRoute.hasBookingLeader
          ? 'PENDING_LEADER'
          : 'PENDING_DIRECTOR',
        syncedAt: nowIso,
      },
    };

    memoryPaymentRequestSlips.set(slip.id, slip);

    return NextResponse.json(
      {
        success: true,
        simulated,
        slip,
        message: simulated
          ? `Giả lập (môi trường thử): đã tạo phiếu ${slipCode} cho ${built.lineItems.length} Deal nhưng CHƯA gửi lên Lark.`
          : liveSyncError ||
            `Đã tạo phiếu ${slipCode} (${approvalInstanceCode}) và đồng bộ ${built.lineItems.length} Deal lên ${
              syncMode === 'LIVE_LARK_API' ? 'Lark Approval & Larkbase 3.2' : 'AnyCross'
            }.`,
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message:
          err instanceof Error
            ? err.message
            : 'Lỗi máy chủ khi đẩy phiếu đề nghị thanh toán sang Lark.',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/integrations/larkbase/payment-requests
 * Cập nhật bước duyệt trong luồng Lark Approval (PENDING_LEADER -> PENDING_DIRECTOR -> PENDING_FINANCE -> APPROVED -> PAID)
 */
export async function PATCH(request: NextRequest) {
  const user = getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized: Vui lòng đăng nhập để cập nhật luồng Lark Approval.' },
      { status: 401 }
    );
  }
  if (user.partnerType || user.role.endsWith('_PARTNER')) {
    return NextResponse.json(
      { error: 'Tài khoản đối tác không có quyền duyệt phiếu thanh toán.' },
      { status: 403 }
    );
  }

  try {
    seedInitialPaymentSlips();
    const body = (await request.json()) as {
      slipId?: string;
      approvalInstanceCode?: string;
    };

    const target = Array.from(memoryPaymentRequestSlips.values()).find(
      s =>
        (body.slipId && s.id === body.slipId) ||
        (body.approvalInstanceCode &&
          s.larkSync.approvalInstanceCode === body.approvalInstanceCode)
    );

    if (!target) {
      return NextResponse.json(
        {
          success: false,
          error: 'SLIP_NOT_FOUND',
          message: 'Không tìm thấy phiếu luồng phê duyệt Lark Approval tương ứng.',
        },
        { status: 404 }
      );
    }

    const order: LarkPaymentRequestSlip['larkSync']['approvalStatus'][] = target.approvalRoute
      .hasBookingLeader
      ? ['PENDING_LEADER', 'PENDING_DIRECTOR', 'PENDING_FINANCE', 'APPROVED', 'PAID']
      : ['PENDING_DIRECTOR', 'PENDING_FINANCE', 'APPROVED', 'PAID'];

    // Chỉ tiến đúng một bước theo luồng; không nhận trạng thái đích từ client, không lùi, không bỏ bước.
    const currentStatus = target.larkSync.approvalStatus;
    const currentIdx = order.indexOf(currentStatus);
    if (currentIdx < 0 || currentIdx >= order.length - 1) {
      return NextResponse.json(
        { success: false, error: 'SLIP_CLOSED', message: 'Phiếu đã ở bước cuối, không chuyển tiếp được.' },
        { status: 409 }
      );
    }
    const allowedRoles = APPROVER_ROLES_BY_STATUS[currentStatus] || [];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN_STEP', message: 'Bạn không có quyền duyệt bước hiện tại của phiếu này.' },
        { status: 403 }
      );
    }
    const resolvedNext: ApprovalStatus = order[currentIdx + 1];

    const updatedSlip: LarkPaymentRequestSlip = {
      ...target,
      larkSync: {
        ...target.larkSync,
        approvalStatus: resolvedNext,
        syncedAt: new Date().toISOString(),
      },
    };

    memoryPaymentRequestSlips.set(updatedSlip.id, updatedSlip);

    return NextResponse.json({
      success: true,
      slip: updatedSlip,
      message: `Đã cập nhật trạng thái luồng Lark Approval (${updatedSlip.larkSync.approvalInstanceCode}) sang ${resolvedNext}.`,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message:
          err instanceof Error
            ? err.message
            : 'Lỗi khi cập nhật trạng thái luồng Lark Approval.',
      },
      { status: 500 }
    );
  }
}
