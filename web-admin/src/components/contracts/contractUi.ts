/**
 * Logic hiển thị dùng chung cho phân hệ Hợp đồng: trạng thái theo bộ 8 nhãn chuẩn,
 * tên vai trò, nhóm ô, chọn mẫu theo loại hồ sơ KOC và điền sẵn từ hồ sơ KOC / booking.
 */

import type { BookingDealItem, KocItem } from '../../lib/types';
import type { ContractField, ContractRecord, ContractRole, FieldGroup, LegalTemplate, ReviewStep } from '../../lib/contracts/types';
import type { StatusTone } from '../ui';
import { formatNumber } from '../../lib/format';
import { legalTypeOf } from '../koc/kocUtils';

export const ROLE_LABEL: Record<ContractRole, string> = {
  CREATOR: 'Người tạo',
  LEGAL: 'Pháp chế',
  FINANCE: 'Kế toán',
  LEAD: 'Trưởng nhóm',
  SIGN_COORDINATOR: 'Điều phối ký',
  AUDITOR: 'Người xem',
};

export interface StatusView { label: string; tone: StatusTone; note?: string }

export function stepStatus(s: ReviewStep): StatusView {
  if (s.status === 'APPROVED') return { label: 'Đã duyệt', tone: 'positive' };
  if (s.status === 'CHANGES') return { label: 'Cần sửa', tone: 'critical', note: 'Yêu cầu bổ sung' };
  if (s.status === 'REJECTED') return { label: 'Cần sửa', tone: 'critical', note: 'Từ chối' };
  return { label: 'Chờ duyệt', tone: 'warning' };
}

/** Trạng thái của một người ký trên weSign (mã action của MISA). */
export function signerStatus(action: number, raw: string): StatusView {
  if (action === 2) return { label: 'Đã ký', tone: 'positive' };
  if (action === 3) return { label: 'Từ chối', tone: 'critical' };
  if (action === 1) return { label: 'Chờ ký', tone: 'warning' };
  if (action === 0) return { label: 'Chưa đến lượt', tone: 'neutral' };
  return { label: raw, tone: 'neutral' };
}

/** Một trạng thái tổng cho hồ sơ: lượt ký (nếu có) quyết định, nếu chưa trình ký thì theo phê duyệt. */
export function contractStatus(r: ContractRecord): StatusView {
  const s = r.signing.at(-1);
  if (s) {
    const signed = s.people.filter(p => p.action === 2).length;
    if (s.status === 'COMPLETED') return { label: 'Hoàn tất', tone: 'positive', note: 'Đã ký đủ' };
    if (s.status === 'REJECTED') return { label: 'Cần sửa', tone: 'critical', note: 'Bên ký từ chối' };
    if (s.status === 'CANCELLED') return { label: 'Đã hủy', tone: 'neutral', note: 'Lượt ký đã hủy' };
    if (s.status === 'WAITING' || s.status === 'PARTIAL') return { label: 'Đang chạy', tone: 'info', note: `Đang ký · ${signed}/${s.people.length} đã ký` };
    return { label: 'Đang chạy', tone: 'info', note: 'Chưa xác định trạng thái ký' };
  }
  if (r.approval === 'APPROVED') return { label: 'Đã duyệt', tone: 'positive', note: 'Chờ trình ký' };
  if (r.approval === 'CHANGES') return { label: 'Cần sửa', tone: 'critical', note: 'Yêu cầu bổ sung' };
  if (r.approval === 'REJECTED') return { label: 'Cần sửa', tone: 'critical', note: 'Bị từ chối' };
  if (r.approval === 'IN_REVIEW') {
    const waiting = r.steps.filter(x => x.status === 'PENDING').map(x => ROLE_LABEL[x.role]);
    return { label: 'Chờ duyệt', tone: 'warning', note: waiting.length ? `Chờ ${waiting.join(', ').toLowerCase()}` : undefined };
  }
  return { label: 'Nháp', tone: 'neutral' };
}

export const HISTORY_LABEL: Record<string, string> = {
  CREATE: 'Tạo hồ sơ', EDIT: 'Tạo phiên bản mới', SUBMIT: 'Gửi duyệt', APPROVED: 'Duyệt', CHANGES: 'Yêu cầu bổ sung',
  REJECTED: 'Từ chối', WITHDRAW: 'Thu hồi', RULE_CHECK: 'Kiểm tra ô bắt buộc', AI_CHECK: 'Kiểm tra nội dung',
  DEMO_SIGN_START: 'Bắt đầu ký thử', DEMO_SIGN_NEXT: 'Ký thử', DEMO_SIGN_REJECT: 'Từ chối ký thử',
  LINK_WESIGN: 'Liên kết luồng ký', SYNC_WESIGN: 'Cập nhật tiến độ ký', SYNC_ERROR: 'Lỗi cập nhật tiến độ ký',
};

export const GROUP_ORDER: Array<{ key: FieldGroup; title: string }> = [
  { key: 'PARTY', title: 'Bên B' },
  { key: 'NUMBER', title: 'Số hợp đồng' },
  { key: 'DATE', title: 'Ngày ký' },
  { key: 'SCOPE', title: 'Hạng mục công việc' },
  { key: 'MONEY', title: 'Giá trị & thanh toán' },
  { key: 'OTHER', title: 'Ô khác trong mẫu' },
];

/** Mỗi khóa một ô (token như [ID KOC] xuất hiện nhiều chỗ nhưng điền một lần). */
export const uniqueFields = (t: LegalTemplate | null) => (t ? [...new Map(t.fields.map(f => [f.key, f])).values()] : []);

export const isAcceptance = (templateId: string) => templateId.endsWith('-BBNT');

/** Mẫu hợp lý cho KOC theo loại hồ sơ pháp lý. */
export function templateFor(koc: KocItem | undefined, kind: 'CONTRACT' | 'ACCEPTANCE'): string {
  const subject = !koc ? 'IND' : { INDIVIDUAL: 'IND', HOUSEHOLD: 'HKD', COMPANY: 'COM' }[legalTypeOf(koc)];
  return `${subject}-${kind === 'CONTRACT' ? 'HD' : 'BBNT'}`;
}

/** Tên đối tác hiển thị trên hồ sơ: tên pháp lý nếu có, không thì tên kênh. */
export function partnerName(koc: KocItem | undefined, deal?: BookingDealItem): string {
  if (!koc) return deal?.kocStageName || '';
  const type = legalTypeOf(koc);
  return (type === 'INDIVIDUAL' ? koc.realName : koc.companyName || koc.realName) || koc.stageName;
}

const money = (n?: number) => (n ? formatNumber(n) : '');

/**
 * Điền sẵn các ô có nguồn dữ liệu trong hệ thống. Chỉ điền ô đang trống, không bịa giá trị:
 * thiếu dữ liệu thì để trống cho người tạo nhập.
 */
export function prefill(fields: ContractField[], values: Record<string, string>, ctx: { koc?: KocItem; deal?: BookingDealItem; today?: Date }) {
  const { koc, deal } = ctx; const d = ctx.today || new Date();
  const dd = String(d.getDate()).padStart(2, '0'); const mm = String(d.getMonth() + 1).padStart(2, '0');
  const type = koc ? legalTypeOf(koc) : 'INDIVIDUAL';
  const quantity = deal?.committedOutputsCount;
  const cccdWithIssue = (f: ContractField) =>
    koc?.cccd && f.start !== undefined && (koc.issueDate || koc.issuePlace)
      ? [koc.cccd, koc.issueDate && `cấp ngày ${koc.issueDate}`, koc.issuePlace && `tại ${koc.issuePlace}`].filter(Boolean).join(' ')
      : koc?.cccd || '';
  const source = (f: ContractField): string => {
    switch (f.source) {
      case 'partyName': return koc ? (type === 'INDIVIDUAL' ? koc.realName : koc.companyName || '') : '';
      case 'ownerName': return koc?.legalRepresentative || koc?.realName || '';
      case 'representative': return koc?.legalRepresentative || '';
      case 'cccd': return cccdWithIssue(f);
      case 'taxCode': return koc?.taxCode || '';
      case 'address': return koc?.permanentAddress || '';
      case 'phone': return koc?.phone || '';
      case 'email': return koc?.email || '';
      case 'kocId': return koc ? koc.channelId.replace(/^@/, '') : '';
      case 'docDate': return `${dd}.${mm}.${String(d.getFullYear()).slice(2)}`;
      case 'signDay': return dd;
      case 'signMonth': return mm;
      case 'signYearDigit': return String(d.getFullYear()).slice(-1);
      case 'product': return deal?.productName || '';
      case 'unitPrice': return money(deal?.totalValue);
      case 'quantity': return quantity ? String(quantity) : '';
      case 'lineTotal': return quantity && deal?.totalValue ? money(deal.totalValue * quantity) : '';
      case 'netTotal': return money(deal?.totalValue);
      default: return '';
    }
  };
  const next = { ...values }; const filled: string[] = [];
  for (const f of fields) {
    if (next[f.key]?.trim() || !f.source) continue;
    const v = source(f);
    if (v) { next[f.key] = v; filled.push(f.key); }
  }
  return { values: next, filled };
}

/** Ô tiền: chỉ giữ chữ số, hiển thị dấu chấm ngăn nghìn. */
export function formatMoneyInput(raw: string) {
  const digits = raw.replace(/\D/g, '');
  return digits ? formatNumber(Number(digits)) : '';
}

export const dateTime = (iso?: string) =>
  iso ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : '—';
