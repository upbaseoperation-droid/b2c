export type ContractRole = 'CREATOR' | 'LEGAL' | 'FINANCE' | 'LEAD' | 'SIGN_COORDINATOR' | 'AUDITOR';
export interface ContractActor { id: string; name: string; roles: ContractRole[]; brands: string[]; allBrands?: boolean }
export type FieldGroup = 'NUMBER' | 'PARTY' | 'DATE' | 'SCOPE' | 'MONEY' | 'OTHER';
export type FieldKind = 'text' | 'long' | 'money' | 'number' | 'date';
/** Dữ liệu có sẵn trong hệ thống dùng để điền sẵn ô (hồ sơ KOC, booking, ngày lập). */
export type FieldSource =
  | 'partyName'
  | 'ownerName'
  | 'representative'
  | 'cccd'
  | 'taxCode'
  | 'address'
  | 'phone'
  | 'email'
  | 'kocId'
  | 'brand'
  | 'channelLink'
  | 'bankAccountName'
  | 'bankAccountNumber'
  | 'bankName'
  | 'airDate'
  | 'docDate'
  | 'parentContractDate'
  | 'parentSowDate'
  | 'signDay'
  | 'signMonth'
  | 'signYearDigit'
  | 'product'
  | 'unitPrice'
  | 'quantity'
  | 'lineTotal'
  | 'netTotal'
  | 'grossTotal'
  | 'vatAmount'
  | 'pitAmount'
  | 'advanceAmount'
  | 'adjustmentAmount'
  | 'remainingAmount'
  | 'amountInWords';
export interface ContractField {
  key: string; label: string; context: string; required: boolean; part: string; paragraph: number; start?: number; end?: number;
  /** Nhãn hiển thị trên form; `label` giữ nguyên chữ trong mẫu. */
  title?: string; group?: FieldGroup; kind?: FieldKind; source?: FieldSource;
}
export interface DocParagraph {
  kind: 'p';
  part: string;
  paragraph: number;
  text: string;
  align?: 'left' | 'center' | 'right' | 'justify';
  bold?: boolean;
  italic?: boolean;
  boldPrefix?: number;
}
export interface DocTableCell {
  colSpan?: number;
  blocks: DocBlock[];
}
export interface DocTable {
  kind: 'table';
  part: string;
  variant: 'party' | 'signature' | 'grid';
  rows: DocTableCell[][];
}
export type DocBlock = DocParagraph | DocTable;
export type ContractCategory = 'BOOKING_VIDEO' | 'ACCEPTANCE_SETTLEMENT' | 'CTV_FRAMEWORK' | 'LIVESTREAM_APPENDIX';

/** Danh sách 11 biểu mẫu chuẩn thế hệ mới (HĐNT -> Phụ lục SOW -> BBNT) áp dụng cho vận hành Booking B2C */
export const OFFICIAL_3STAGE_TEMPLATE_IDS = [
  'IND-HDNT',
  'IND-SOW',
  'IND-VID-BBNT',
  'HKD-HDNT',
  'HKD-SOW',
  'HKD-VID-BBNT',
  'COM-HDNT',
  'COM-SOW',
  'COM-VID-BBNT',
  'CTV-HDNT',
  'CTV-VID-BBNT',
] as const;
export interface TemplateVersionHistoryItem {
  version: string;
  hash: string;
  filename: string;
  updatedAt: string;
  updatedBy: string;
  note?: string;
}
export interface LegalTemplate {
  id: string;
  name: string;
  filename: string;
  subject: string;
  kind: 'CONTRACT' | 'ACCEPTANCE';
  version: string;
  hash: string;
  fields: ContractField[];
  paragraphs: string[];
  blocks?: DocBlock[];
  category?: ContractCategory;
  description?: string;
  active?: boolean;
  defaultReviewRoles?: ('LEGAL' | 'FINANCE' | 'LEAD')[];
  updatedAt?: string;
  updatedBy?: string;
  fieldCount?: number;
  requiredFieldCount?: number;
  history?: TemplateVersionHistoryItem[];
  /** Mẫu chuẩn: hồ sơ không có điều khoản ngoại lệ được miễn bước duyệt của Pháp chế. */
  exemptLegalReview?: boolean;
  /** Phạm vi áp dụng: Dùng chung (GLOBAL) hoặc mẫu riêng đã duyệt theo KOC/KOL (KOC_CUSTOM). */
  scope?: 'GLOBAL' | 'KOC_CUSTOM';
  /** Mã KOC gắn với mẫu này. */
  kocId?: string;
  /** Tên KOC / Đối tác. */
  kocName?: string;
  /** Người đại diện Pháp chế phê duyệt mẫu này. */
  approvedByLegal?: string;
  /** Thời điểm Pháp chế phê duyệt. */
  approvedAt?: string;
  /** Mã hợp đồng gốc đã phát sinh và được duyệt mẫu này. */
  originalContractId?: string;
  /** Loại mẫu tùy chỉnh: Sửa trên mẫu Upbase hoặc dùng Form riêng của KOC. */
  customType?: 'UPBASE_AMENDED' | 'KOC_FORM';
  /** Ghi chú và lưu ý nghiệp vụ của Pháp chế cho KOC. */
  legalNotes?: string;
}
export interface ReviewStep { role: 'LEGAL' | 'FINANCE' | 'LEAD'; reviewerId: string; reviewerName: string; status: 'PENDING' | 'APPROVED' | 'CHANGES' | 'REJECTED'; note: string; decidedAt?: string; version: number }
export interface ContractFinding { severity: 'ERROR' | 'WARNING' | 'INFO'; message: string; evidence: string; fieldKey?: string }
export interface AiCheck { version: number; at: string; provider: 'RULES' | 'AI'; findings: ContractFinding[] }
export interface SigningPerson { name: string; email: string; action: number; status: string; at?: string }
export interface SigningAttempt { documentId: string; version: number; linkedBy: string; linkedAt: string; status: string; sourceStatus: number; people: SigningPerson[]; syncedAt: string; error?: string; evidenceConfirmedBy: string; evidenceHash: string; provider?: 'MISA' | 'DEMO' }
export interface ContractEvent { at: string; actorId: string; actorName: string; action: string; note: string; version: number }
export interface VideoAcceptanceInspectionMeta {
  resolvedUrl: string;
  videoId: string;
  authorHandle: string;
  authorNickname: string;
  publishedTimeFormatted: string;
  publishedDateVn: string;
  durationSeconds: number;
  caption: string;
  hashtags: string[];
  hasCartAnchor: boolean;
  cartAnchorTitle?: string;
  cartProductCount?: number;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  savesCount: number;
  engagementRate: number;
  hasSubtitles: boolean;
  transcriptSnippet?: string;
  wordCount?: number;
  matchedProductTerms: string[];
  violatedWords: Array<{
    word: string;
    category: 'CHÍNH_SÁCH_SÀN' | 'Y_TẾ_QUÁ_ĐÀ' | 'ĐỐI_THỦ';
    suggestion: string;
  }>;
  scriptVerdict: 'ĐẠT_CHUẨN' | 'CẦN_KIỂM_TRA' | 'VI_PHẠM_TỪ_CẤM';
  scriptSummaryNote: string;
}

export interface AcceptanceScreenshotItem {
  id: string;
  videoUrl: string;
  videoId?: string;
  authorHandle?: string;
  timestampSec: number;
  timeLabel: string;
  matchedTerm?: string;
  captionQuote?: string;
  imageDataUrl: string;
  capturedAt: string;
  sourceMode: 'VIDEO_FRAME' | 'SUGGESTED_MOMENT' | 'CLIPBOARD_OR_UPLOAD';
  note?: string;
  inspectionMeta?: VideoAcceptanceInspectionMeta;
}
export interface ContractRevision {
  version: number;
  values: Record<string, string>;
  at: string;
  actorId: string;
  customFile?: {
    filename: string;
    hash: string;
    blocks?: DocBlock[];
    paragraphs?: string[];
  };
  acceptanceScreenshots?: AcceptanceScreenshotItem[];
}
export interface ContractRecord {
  id: string; title: string; brand: string; partner: string; ownerId: string; ownerName: string;
  templateId: string; templateHash: string; version: number; revision: number; values: Record<string, string>;
  createdAt: string; updatedAt: string; approval: 'DRAFT' | 'IN_REVIEW' | 'CHANGES' | 'REJECTED' | 'APPROVED';
  steps: ReviewStep[]; checks: AiCheck[]; signing: SigningAttempt[]; history: ContractEvent[]; versions: ContractRevision[];
  parentId?: string;
  /** Booking và KOC mà hồ sơ này phục vụ. */
  dealId?: string; dealCode?: string; kocId?: string;
  /** Có điều khoản ngoại lệ / KOC yêu cầu chỉnh sửa so với mẫu chuẩn. */
  hasCustomTerms?: boolean;
  /** Tóm tắt các điểm KOC đề xuất sửa hoặc ngoại lệ. */
  customTermsSummary?: string;
  /** Ghi chú đàm phán & lưu vết thỏa thuận nội bộ. */
  internalNotes?: string;
  /** Hồ sơ sử dụng file hợp đồng riêng của KOC / Agency tải lên. */
  isKocOwnForm?: boolean;
  /** Thông tin tệp hợp đồng riêng của KOC đã tải lên. */
  customFile?: {
    filename: string;
    hash: string;
    uploadedAt: string;
    uploadedBy: string;
    blocks?: DocBlock[];
    paragraphs?: string[];
  };
  /** Danh sách ảnh chụp màn hình video lúc sản phẩm xuất hiện đính kèm Biên bản nghiệm thu. */
  acceptanceScreenshots?: AcceptanceScreenshotItem[];
}
