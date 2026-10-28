// Kết nối Lark Approval / Larkbase cho phiếu thanh toán, dùng chung cho ĐNTT Booking KOC và quyết toán CTV Self-channel.
import { fetchLarkAppAccessToken, getLarkConfig } from '../larkAuth';

export function getLarkPaymentIntegrationConfig() {
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

/** Đã đủ cấu hình để tạo phiếu duyệt thật trên Lark Approval. */
export function hasLiveLarkApproval() {
  const config = getLarkPaymentIntegrationConfig();
  return config.hasLarkCredentials && config.appToken !== 'bascnUpbaseB2CPlan41' && config.hasLiveApprovalDef;
}

export type LarkFormField = { id: string; type: 'input' | 'amount'; value: string };

/**
 * Tạo phiếu duyệt trên Lark Approval v4 rồi ghi bản ghi vào bảng Larkbase thanh toán.
 * Lỗi tạo phiếu duyệt: ném lỗi (chưa có gì được ghi nhận). Lỗi ghi Larkbase: phiếu duyệt đã có, trả kèm cảnh báo.
 */
export async function submitLarkPaymentApproval(params: {
  form: LarkFormField[];
  bitableFields: Record<string, unknown>;
}): Promise<{ instanceCode: string; recordId: string; warning?: string }> {
  const config = getLarkPaymentIntegrationConfig();
  const accessToken = await fetchLarkAppAccessToken();
  const approvalRes = await fetch(`https://${config.domain}/open-apis/approval/v4/instances`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ approval_code: config.approvalDefCode, form: JSON.stringify(params.form) }),
  });
  const approvalJson = await approvalRes.json().catch(() => null);
  if (approvalJson?.code !== 0 || !approvalJson?.data?.instance_code) {
    throw new Error(`Lark Approval từ chối tạo phiếu: ${approvalJson?.msg || `HTTP ${approvalRes.status}`}`);
  }
  const instanceCode = String(approvalJson.data.instance_code);
  try {
    const bitableRes = await fetch(
      `https://${config.domain}/open-apis/bitable/v1/apps/${encodeURIComponent(config.appToken)}/tables/${encodeURIComponent(config.paymentTableId)}/records`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { ...params.bitableFields, 'Mã duyệt Lark Approval': instanceCode } }),
      }
    );
    const bitableJson = await bitableRes.json().catch(() => null);
    if (bitableJson?.code === 0 && bitableJson?.data?.record?.record_id) {
      return { instanceCode, recordId: String(bitableJson.data.record.record_id) };
    }
    return { instanceCode, recordId: '', warning: `Đã tạo phiếu duyệt Lark nhưng chưa ghi được Larkbase: ${bitableJson?.msg || `HTTP ${bitableRes.status}`}.` };
  } catch (err) {
    return { instanceCode, recordId: '', warning: `Đã tạo phiếu duyệt Lark nhưng chưa ghi được Larkbase: ${err instanceof Error ? err.message : 'lỗi kết nối'}.` };
  }
}

/** Trạng thái phiếu trên Lark Approval: PENDING, APPROVED, REJECTED, CANCELED, DELETED. */
export async function fetchLarkApprovalStatus(instanceCode: string): Promise<string> {
  const config = getLarkPaymentIntegrationConfig();
  const token = await fetchLarkAppAccessToken();
  const res = await fetch(`https://${config.domain}/open-apis/approval/v4/instances/${encodeURIComponent(instanceCode)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => null);
  if (json?.code !== 0) throw new Error(`Lark trả lỗi: ${json?.msg || `HTTP ${res.status}`}`);
  return String(json.data?.status || '');
}
