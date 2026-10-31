import type { LegalDocAttachment, LegalDocCategory } from '../types';
export type { LegalDocAttachment, LegalDocCategory };
export * from './googleDocsTypes';
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
  vMerge?: 'restart' | 'continue';
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
export interface ContractServiceTemplateField {
  fieldKey: string;
  fieldType: 'text' | 'number' | 'date' | 'checkbox' | 'select' | string;
  required: boolean;
}
export interface ContractServiceTemplateParticipant {
  code: string;
  role?: string | null;
  action?: string | null;
  signingOrder?: number | null;
  required?: boolean | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  signatureType?: string | null;
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
  /** UUID mẫu hợp đồng trên Contract Service (ví dụ: 23adfa68-b9a5-4ff6-a453-48a08b6a47a0). */
  remoteTemplateId?: string;
  /** Mã code mẫu hợp đồng trên Contract Service (ví dụ: HDNT-CANHAN). */
  remoteTemplateCode?: string;
  /** Cờ xác nhận mẫu đã cấu hình luồng ký trên Contract Service (chỉ true mới gọi được requestSign). */
  hasSigningFlowConfig?: boolean;
  /** Danh sách field placeholder {{KEY}} khai báo trên Contract Service. */
  remoteFields?: ContractServiceTemplateField[];
  /** Danh sách người ký (participants) khai báo trên Contract Service. */
  remoteParticipants?: ContractServiceTemplateParticipant[];
  /** Link file .docx gốc của mẫu trên S3 (từ documents[type=source] của API 2 getContractTemplate). */
  sourceFileUrl?: string;
  /** Link Google Docs xem trước của mẫu (từ documents[type=preview] của API 2 getContractTemplate). */
  previewFileUrl?: string;
  /** Danh sách thẻ ô ký tự động trong mẫu (ví dụ: {{SIGN_PROVIDER}}, {{SIGN_CLIENT}}) do contract-system bóc tách. */
  signTags?: string[];
  /** Cấu hình luồng ký từ configureTemplateSigningFlow (Agency Portal / contract-system). */
  signingFlowConfig?: {
    mode: 'SEQUENTIAL' | 'PARALLEL';
    deadlineDays: number;
    signers: Array<{
      order: number;
      role: string;
      signTag: string;
    }>;
  };
}
export interface ReviewStep { role: 'LEGAL' | 'FINANCE' | 'LEAD'; reviewerId: string; reviewerName: string; status: 'PENDING' | 'APPROVED' | 'CHANGES' | 'REJECTED'; note: string; decidedAt?: string; version: number }
export interface ContractFinding { severity: 'ERROR' | 'WARNING' | 'INFO'; message: string; evidence: string; fieldKey?: string }
export interface AiCheck { version: number; at: string; provider: 'RULES' | 'AI'; findings: ContractFinding[] }
export interface SigningPerson {
  name: string;
  email: string;
  action: number;
  status: string;
  at?: string;
  role?: number;
  roleLabel?: string;
  level?: number;
}
export interface SigningAttempt {
  documentId: string;
  version: number;
  linkedBy: string;
  linkedAt: string;
  status: string;
  sourceStatus: number;
  people: SigningPerson[];
  syncedAt: string;
  error?: string;
  evidenceConfirmedBy: string;
  evidenceHash: string;
  provider?: 'MISA' | 'CONTRACT_SYSTEM' | 'DEMO';
  name?: string;
  completedCount?: number;
  totalCount?: number;
  progressPercent?: number;
  currentSignerName?: string;
  currentSignerEmail?: string;
  /** Mã hợp đồng idempotent dùng khi gọi requestSign sang contract-system. */
  contractCode?: string;
  /** File đã ký được worker tải về từ queue signed-file-download. */
  signedFileUrl?: string;
  signedFileStatus?: 'IDLE' | 'QUEUED' | 'DOWNLOADED' | 'FAILED';
  /** Dấu thời gian sự kiện webhook gần nhất để chặn sự kiện cũ ghi đè lùi trạng thái. */
  lastWebhookTimestamp?: number;
}
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
export interface ContractSystemSyncMeta {
  /** Mã hợp đồng ổn định làm khóa idempotent khi gọi generateContract / requestSign. */
  contractCode: string;
  /** ID bản ghi hợp đồng bên contract-system. */
  contractSystemId: string;
  /** UUID mẫu hợp đồng trên Contract Service (ví dụ: 23adfa68-b9a5-4ff6-a453-48a08b6a47a0). */
  remoteTemplateId?: string;
  /** Trạng thái nguyên bản của hợp đồng trên Contract Service (rendered, ready, signing_requested, completed...). */
  remoteStatus?: string;
  /** Phân loại chặng văn bản trong chuỗi 3 bước: HĐNT Khung -> Phụ lục SOW -> Biên bản nghiệm thu BBNT. */
  documentStage?: 'HDNT' | 'SOW' | 'BBNT';
  /** Mã hợp đồng gốc / Phụ lục SOW gốc mà văn bản này kế thừa (HĐNT -> SOW -> BBNT). */
  parentContractCode?: string;
  /** ID và URL tài liệu trên Google Docs để chỉnh sửa điều khoản trước khi ký (Bước 5 & 6). */
  googleDocsId?: string;
  googleDocsUrl?: string;
  googleDocsSyncedAt?: string;
  /** URL file .docx đã render / xuất lại từ Google Docs trên UpBase upload API. */
  exportedDocxUrl?: string;
  /** URL file .docx dùng cho bước ký (giữ tag {{SIGN_*}}) từ generateContract.data.document.signingFileUrl. */
  signingFileUrl?: string;
  /** Request ID trả về từ WeSign khi gọi requestSign thành công. */
  wesignRequestId?: string;
  /** Trạng thái và URL file đã ký từ worker queue signed-file-download (Bước 11 & 12). */
  signedFileStatus?: 'IDLE' | 'QUEUED' | 'DOWNLOADED' | 'FAILED';
  signedFileUrl?: string;
  /** Bản chụp phiên bản template và thẻ ô ký tại thời điểm generateContract. */
  templateSnapshot?: {
    templateId: string;
    version: string;
    hash: string;
    signTags: string[];
    capturedAt: string;
  };
  /** Thời điểm nhận sự kiện đồng bộ gần nhất từ contract-system (Bước 13). */
  lastSyncedAt?: string;
  lastWebhookTimestamp?: number;
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
  /** ID hồ sơ pháp lý Bên B đã chọn khi tạo hợp đồng. */
  legalProfileId?: string;
  /** Danh sách tệp đính kèm CCCD & ĐKKD của hồ sơ pháp lý Bên B lưu trên Cloudflare R2. */
  legalAttachments?: LegalDocAttachment[];
  /** Metadata đồng bộ với contract-system (generateContract, Google Docs, requestSign, webhook Step 13). */
  contractSystem?: ContractSystemSyncMeta;
  /** Luồng hợp đồng sửa đổi / riêng trên Google Docs */
  googleDocsUrl?: string;
  googleDocsId?: string;
  googleDocsSource?: 'TEMPLATE_AMENDED' | 'KOC_CUSTOM_DOC';
  /** Luồng Google Doc: DRAFT = đã trình draft, các bên đang sửa trên file; FINAL = B2C đã trình final, nội dung đã chốt. */
  googleDocsStage?: 'DRAFT' | 'FINAL';
  googleDocsReviewRouting?: import('./googleDocsTypes').GoogleDocsReviewRouting;
  googleDocsComments?: import('./googleDocsTypes').GoogleDocCommentItem[];
  googleDocsAuditTrail?: import('./googleDocsTypes').GoogleDocsAuditTrail;
}

export type TemplateFieldSource = FieldSource | string;
