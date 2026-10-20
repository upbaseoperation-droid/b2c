import type { KocItem, StorePortfolioItem } from './types';
import type { StaffListingSheetRow } from './staffBrandListingSheet';

export type KocEmailTemplateCategory =
  | 'PAID_BOOKING'
  | 'FOC_SAMPLE'
  | 'REBOOK_WINNER'
  | 'LIVESTREAM'
  | 'FOLLOW_UP'
  | 'CUSTOM';

export type KocEmailTemplateStatus = 'APPROVED' | 'DRAFT' | 'ARCHIVED';

export interface KocEmailTemplateItem {
  id: string;
  code: string;
  name: string;
  category: KocEmailTemplateCategory;
  status: KocEmailTemplateStatus;
  isDefaultForCategory: boolean;
  isLockedByManager: boolean;
  brandScope: string; // 'ALL' hoặc tên Brand cụ thể
  subjectTemplate: string;
  bodyTemplate: string;
  createdBy: string;
  approvedBy?: string;
  updatedAt: string;
  usageCount: number;
}

export type EmailDeliveryMode = 'WEBHOOK_GMAIL' | 'RESEND_API' | 'SMTP_RELAY';

export interface KocEmailServerConfig {
  deliveryMode: EmailDeliveryMode;
  senderName: string;
  senderEmail: string;
  replyToEmail: string;
  defaultCcEmails: string;
  resendApiKey: string;
  webhookUrl: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  signatureBlock: string;
  autoUpdateSheetStatusOnSend: boolean;
}

export interface KocEmailOutreachLogItem {
  id: string;
  sentAt: string;
  sheetKey: string;
  rowId: string;
  kocId?: string;
  idKenh: string;
  tenKenh: string;
  recipientEmail: string;
  ccEmails?: string;
  brandName: string;
  storeName: string;
  monthKey: string;
  templateId: string;
  templateName: string;
  subject: string;
  body: string;
  channelMethod: 'SYSTEM_DIRECT' | 'GMAIL_WEB' | 'MAILTO_CLIENT' | 'COPIED';
  deliveryStatus: 'SENT' | 'QUEUED_LOGGED' | 'OPENED_GMAIL' | 'COPIED' | 'FAILED';
  sentBy: string;
  errorMessage?: string;
}

export interface KocOutreachEmailState {
  templates: KocEmailTemplateItem[];
  serverConfig: KocEmailServerConfig;
  logs: KocEmailOutreachLogItem[];
  updatedAt: string;
}

export const KOC_EMAIL_CATEGORY_LABELS: Record<KocEmailTemplateCategory, string> = {
  PAID_BOOKING: 'Booking Video Có Cát-xê (KL1–KL7)',
  FOC_SAMPLE: 'Gửi Mẫu Trải Nghiệm & Affiliate (Freecast)',
  REBOOK_WINNER: 'Tái Hợp Tác KOC Winner',
  LIVESTREAM: 'Mời Phiên Livestream Nhãn Hàng',
  FOLLOW_UP: 'Nhắc Phản Hồi & Xác Nhận Gửi Mẫu',
  CUSTOM: 'Mẫu Tùy Chỉnh Khác',
};

export interface MergeVariableMeta {
  token: string;
  label: string;
  sample: string;
}

export const KOC_EMAIL_MERGE_VARIABLES: MergeVariableMeta[] = [
  { token: '{{ten_koc}}', label: 'Tên KOC / Tên kênh', sample: 'Hà Linh Official' },
  { token: '{{id_kenh}}', label: 'ID kênh TikTok (@handle)', sample: '@halinhofficial' },
  { token: '{{link_kenh}}', label: 'Link kênh TikTok', sample: 'https://www.tiktok.com/@halinhofficial' },
  { token: '{{thuong_hieu}}', label: 'Tên Thương hiệu', sample: 'Kutieskin' },
  { token: '{{gian_hang}}', label: 'Tên Gian hàng', sample: 'Kutieskin Chính Hãng - TikTok Shop' },
  { token: '{{san_pham}}', label: 'Sản phẩm đề xuất', sample: 'Kem mẩn đỏ & Kem dưỡng ẩm Kutieskin' },
  { token: '{{content_tag}}', label: 'Tuyến nội dung (Pillar)', sample: 'Nỗi đau – Giải pháp' },
  { token: '{{tep_booking}}', label: 'Phân khúc (Freecast / KL1–KL7)', sample: 'KL3' },
  { token: '{{muc_cat_xe}}', label: 'Đơn giá Net / Quyền lợi', sample: '2.500.000 VNĐ (Net)' },
  { token: '{{ngay_air_du_kien}}', label: 'Ngày lên sóng dự kiến', sample: '25/10/2026' },
  { token: '{{dot_booking}}', label: 'Đợt triển khai', sample: 'Đợt 1' },
  { token: '{{thang_chien_dich}}', label: 'Tháng chiến dịch', sample: '10/2026' },
  { token: '{{thanh_qua_cu}}', label: 'Thành quả hợp tác cũ', sample: 'Đã hợp tác 3 video, GMV cao nhất 45.000.000đ' },
  { token: '{{ten_pic}}', label: 'Tên Chuyên viên phụ trách', sample: 'Lê Phương Thảo' },
  { token: '{{sdt_pic}}', label: 'SĐT / Zalo Chuyên viên', sample: '0988 654 321' },
  { token: '{{email_pic}}', label: 'Email Chuyên viên', sample: 'thao.lp@upbase.vn' },
  { token: '{{ghi_chu_rieng}}', label: 'Lời nhắn riêng cho KOC', sample: '' },
  { token: '{{chu_ky_phong}}', label: 'Chữ ký chuẩn Phòng Booking', sample: 'Phòng Booking B2C - UpBase' },
];

export const DEFAULT_EMAIL_SERVER_CONFIG: KocEmailServerConfig = {
  deliveryMode: 'WEBHOOK_GMAIL',
  senderName: 'Phòng Booking B2C - UpBase',
  senderEmail: 'booking.b2c@upbase.vn',
  replyToEmail: 'booking.b2c@upbase.vn',
  defaultCcEmails: 'nhi.dty@upbase.vn',
  resendApiKey: '',
  webhookUrl: '',
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  smtpUser: 'booking.b2c@upbase.vn',
  smtpPass: '',
  signatureBlock: `Trân trọng,\nPhòng Phát Triển Đối Tác KOC/KOL Khối B2C — UpBase Vietnam\nĐịa chỉ: Tầng 9, Tòa nhà UpBase, Hà Nội / TP. Hồ Chí Minh\nWebsite: https://upbase.vn`,
  autoUpdateSheetStatusOnSend: true,
};

export const DEFAULT_KOC_EMAIL_TEMPLATES: KocEmailTemplateItem[] = [
  {
    id: 'tpl-b2c-paid-01',
    code: 'TPL-PAID-01',
    name: 'Thư mời hợp tác Booking Video TikTok / Shopee (Có cát-xê)',
    category: 'PAID_BOOKING',
    status: 'APPROVED',
    isDefaultForCategory: true,
    isLockedByManager: true,
    brandScope: 'ALL',
    createdBy: 'Đặng Thị Yến Nhi',
    approvedBy: 'Đặng Thị Yến Nhi',
    updatedAt: '2026-10-15T09:00:00.000Z',
    usageCount: 142,
    subjectTemplate: '[{{thuong_hieu}} x UpBase] Lời mời hợp tác Booking Video tháng {{thang_chien_dich}} — Kênh {{ten_koc}} ({{id_kenh}})',
    bodyTemplate: `Chào bạn {{ten_koc}},

Mình là {{ten_pic}} — Đại diện bộ phận Booking Thương hiệu {{thuong_hieu}} (Gian hàng chính hãng: {{gian_hang}}) thuộc hệ sinh thái UpBase Vietnam.

Qua quá trình theo dõi kênh {{id_kenh}} ({{link_kenh}}), nhãn hàng {{thuong_hieu}} rất ấn tượng với phong cách sáng tạo nội dung và tệp khán giả của bạn. Chúng mình trân trọng gửi lời mời bạn hợp tác sản xuất Video trong chiến dịch tháng {{thang_chien_dich}} ({{dot_booking}}) với thông tin cụ thể như sau:

1. Thông tin chiến dịch & Sản phẩm:
- Nhãn hàng: {{thuong_hieu}} ({{gian_hang}})
- Sản phẩm trọng tâm: {{san_pham}}
- Định hướng nội dung: {{content_tag}}
- Thời gian lên sóng dự kiến: {{ngay_air_du_kien}}

2. Quyền lợi & Ngân sách hợp tác:
- Chi phí cát-xê đề xuất: {{muc_cat_xe}}
- Hỗ trợ 01 bộ sản phẩm chính hãng gửi tận nơi để trải nghiệm và quay dựng.
- Hoa hồng Affiliate TikTok Shop theo chính sách ưu đãi dành riêng cho đối tác của nhãn hàng.
- Nhãn hàng hỗ trợ ngân sách đẩy quảng cáo Spark Ads cho video có chuyển đổi tốt.
{{ghi_chu_rieng}}

3. Bước tiếp theo:
Nếu bạn quan tâm và sẵn sàng đồng hành cùng {{thuong_hieu}} trong đợt này, bạn vui lòng phản hồi lại email này hoặc nhắn trực tiếp qua Zalo ({{sdt_pic}}) để mình gửi Brief chi tiết và xác nhận địa chỉ nhận sản phẩm mẫu nhé.

Thông tin liên hệ trực tiếp:
- Phụ trách Booking: {{ten_pic}}
- SĐT / Zalo: {{sdt_pic}}
- Email: {{email_pic}}

Rất mong được hợp tác cùng bạn {{ten_koc}} trong chiến dịch lần này!

{{chu_ky_phong}}`,
  },
  {
    id: 'tpl-b2c-foc-01',
    code: 'TPL-FOC-01',
    name: 'Thư mời trải nghiệm sản phẩm & Affiliate hoa hồng cao (Freecast / FOC)',
    category: 'FOC_SAMPLE',
    status: 'APPROVED',
    isDefaultForCategory: true,
    isLockedByManager: true,
    brandScope: 'ALL',
    createdBy: 'Đặng Thị Yến Nhi',
    approvedBy: 'Đặng Thị Yến Nhi',
    updatedAt: '2026-10-15T09:00:00.000Z',
    usageCount: 98,
    subjectTemplate: '[{{thuong_hieu}}] Thư mời trải nghiệm sản phẩm chính hãng & Hợp tác Affiliate tháng {{thang_chien_dich}} — {{ten_koc}}',
    bodyTemplate: `Chào bạn {{ten_koc}},

Mình là {{ten_pic}} từ đội ngũ phát triển đối tác KOC của nhãn hàng {{thuong_hieu}} ({{gian_hang}}).

Nhận thấy kênh TikTok {{id_kenh}} của bạn có tuyến nội dung rất phù hợp với dòng sản phẩm {{san_pham}} của nhãn hàng, {{thuong_hieu}} mong muốn gửi tặng bạn bộ sản phẩm Fullsize để trải nghiệm thực tế và đồng hành chia sẻ cảm nhận tới người xem trong tháng {{thang_chien_dich}}.

Quyền lợi dành riêng cho bạn khi tham gia chương trình:
- Nhận miễn phí 100% bộ sản phẩm chính hãng: {{san_pham}} (không phát sinh bất kỳ chi phí nào).
- Mở mức hoa hồng Affiliate ưu đãi đặc quyền (Target Collaboration) cao hơn mức đại trà trên TikTok Shop.
- Hỗ trợ kịch bản gợi ý ({{content_tag}}) và tài nguyên truyền thông từ nhãn hàng.
- Ưu tiên xét duyệt vào danh sách KOC nhận cát-xê cố định (Paid Booking) và đẩy Spark Ads của {{thuong_hieu}} ngay khi video đạt hiệu quả tốt.
{{ghi_chu_rieng}}

Để nhãn hàng kịp đóng gói và gửi sản phẩm cho bạn trước ngày {{ngay_air_du_kien}}, bạn vui lòng phản hồi xác nhận thông tin nhận hàng (Họ tên, SĐT, Địa chỉ nhận hàng) qua email này hoặc Zalo {{sdt_pic}} giúp mình nhé.

Thông tin đầu mối phụ trách:
- Chuyên viên: {{ten_pic}}
- SĐT / Zalo: {{sdt_pic}}
- Email: {{email_pic}}

Cảm ơn bạn và chúc kênh {{id_kenh}} ngày càng phát triển mạnh mẽ!

{{chu_ky_phong}}`,
  },
  {
    id: 'tpl-b2c-rebook-01',
    code: 'TPL-REBOOK-01',
    name: 'Thư mời tái hợp tác KOC Winner (Chiến dịch Tháng mới)',
    category: 'REBOOK_WINNER',
    status: 'APPROVED',
    isDefaultForCategory: true,
    isLockedByManager: true,
    brandScope: 'ALL',
    createdBy: 'Nguyễn Thị Ngọc Tâm',
    approvedBy: 'Đặng Thị Yến Nhi',
    updatedAt: '2026-10-16T10:30:00.000Z',
    usageCount: 64,
    subjectTemplate: '[{{thuong_hieu}} x {{ten_koc}}] Lời mời tái hợp tác Chiến dịch Trọng điểm tháng {{thang_chien_dich}}',
    bodyTemplate: `Chào bạn {{ten_koc}},

Mình là {{ten_pic}} — Phụ trách Booking nhãn hàng {{thuong_hieu}} ({{gian_hang}}) tại UpBase.

Trước hết, nhãn hàng {{thuong_hieu}} xin gửi lời cảm ơn chân thành tới bạn vì sự đồng hành hiệu quả trong các đợt hợp tác trước đây ({{thanh_qua_cu}}). Bạn luôn nằm trong nhóm đối tác KOC chủ lực được nhãn hàng ưu tiên hàng đầu.

Bước sang tháng {{thang_chien_dich}} ({{dot_booking}}), {{thuong_hieu}} triển khai chiến dịch đẩy mạnh dòng sản phẩm {{san_pham}} và rất mong muốn tiếp tục đồng hành cùng kênh {{id_kenh}}:

- Sản phẩm trọng tâm: {{san_pham}}
- Góc nội dung đề xuất: {{content_tag}}
- Lịch lên sóng dự kiến: {{ngay_air_du_kien}}
- Ngân sách cát-xê đề xuất: {{muc_cat_xe}} + Hoa hồng Affiliate đặc quyền + Ngân sách vít Spark Ads.
{{ghi_chu_rieng}}

Bạn {{ten_koc}} xem lịch dự kiến trên có phù hợp với lịch đăng video của kênh không nhé? Nhắn lại cho mình qua Zalo {{sdt_pic}} hoặc trả lời email này để mình giữ suất ngân sách ưu tiên cho kênh bạn ngay trong hôm nay nhé!

{{chu_ky_phong}}`,
  },
  {
    id: 'tpl-b2c-live-01',
    code: 'TPL-LIVE-01',
    name: 'Thư mời hợp tác Phiên Livestream Nhãn hàng / Gắn rổ Live',
    category: 'LIVESTREAM',
    status: 'APPROVED',
    isDefaultForCategory: true,
    isLockedByManager: false,
    brandScope: 'ALL',
    createdBy: 'Đặng Thị Yến Nhi',
    approvedBy: 'Đặng Thị Yến Nhi',
    updatedAt: '2026-10-16T14:00:00.000Z',
    usageCount: 31,
    subjectTemplate: '[{{thuong_hieu}}] Lời mời hợp tác Livestream / Gắn rổ hàng Mega Campaign tháng {{thang_chien_dich}} — {{ten_koc}}',
    bodyTemplate: `Chào bạn {{ten_koc}},

Mình là {{ten_pic}} đại diện nhãn hàng {{thuong_hieu}} ({{gian_hang}}).

Chuẩn bị cho chuỗi phiên Livestream trọng điểm tháng {{thang_chien_dich}}, nhãn hàng {{thuong_hieu}} trân trọng mời bạn ({{id_kenh}}) hợp tác lên sóng giới thiệu dòng sản phẩm {{san_pham}} với gói tài trợ Deal độc quyền:

- Sản phẩm lên Live: {{san_pham}}
- Ngày phiên Live dự kiến: {{ngay_air_du_kien}}
- Quyền lợi hợp tác: {{muc_cat_xe}}
- Hỗ trợ từ nhãn hàng: Tung Voucher giảm sâu độc quyền theo khung giờ Live của bạn, gửi mẫu test trước phiên Live và hỗ trợ kỹ thuật vận hành rổ hàng.
{{ghi_chu_rieng}}

Bạn phản hồi lại qua email hoặc Zalo {{sdt_pic}} để hai bên chốt khung giờ Live và số lượng suất Deal giới hạn cho khán giả của kênh nhé!

{{chu_ky_phong}}`,
  },
  {
    id: 'tpl-b2c-followup-01',
    code: 'TPL-FOLLOWUP-01',
    name: 'Thư nhắc xác nhận hợp tác & Gửi sản phẩm mẫu (Follow-up 48h)',
    category: 'FOLLOW_UP',
    status: 'APPROVED',
    isDefaultForCategory: true,
    isLockedByManager: false,
    brandScope: 'ALL',
    createdBy: 'Nguyễn Thị Ngọc Tâm',
    approvedBy: 'Đặng Thị Yến Nhi',
    updatedAt: '2026-10-17T08:30:00.000Z',
    usageCount: 53,
    subjectTemplate: 'Re: [{{thuong_hieu}} x {{ten_koc}}] Xác nhận lịch gửi sản phẩm mẫu chiến dịch tháng {{thang_chien_dich}}',
    bodyTemplate: `Chào bạn {{ten_koc}},

Mình là {{ten_pic}} từ đội ngũ Booking nhãn hàng {{thuong_hieu}} ({{gian_hang}}).

Mình xin phép nhắn lại để hỏi thăm xem bạn đã kịp xem qua lời mời hợp tác sản phẩm {{san_pham}} trong chiến dịch tháng {{thang_chien_dich}} ({{dot_booking}}) của nhãn hàng chưa ạ?

Hiện tại đội ngũ đang chốt danh sách xuất kho gửi mẫu để kịp lịch lên sóng dự kiến ngày {{ngay_air_du_kien}} với mức ngân sách {{muc_cat_xe}}.
{{ghi_chu_rieng}}

Nếu bạn đồng ý tham gia, bạn phản hồi sớm giúp mình qua email này hoặc Zalo {{sdt_pic}} để mình giữ suất ngân sách và gửi hàng mẫu ngay trong đợt giao hàng tuần này nhé.

Cảm ơn bạn {{ten_koc}} rất nhiều!

{{chu_ky_phong}}`,
  },
];

const LOCAL_STORAGE_KEY = 'upbase_b2c_koc_outreach_email_state_v1';
export const KOC_OUTREACH_EMAIL_UPDATED_EVENT = 'upbase:koc-outreach-email-updated';

function cloneDefaultState(): KocOutreachEmailState {
  return {
    templates: DEFAULT_KOC_EMAIL_TEMPLATES.map((t) => ({ ...t })),
    serverConfig: { ...DEFAULT_EMAIL_SERVER_CONFIG },
    logs: [],
    updatedAt: new Date().toISOString(),
  };
}

export function loadKocOutreachEmailState(): KocOutreachEmailState {
  if (typeof window === 'undefined') {
    return cloneDefaultState();
  }
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      const initial = cloneDefaultState();
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as Partial<KocOutreachEmailState>;
    const templates =
      Array.isArray(parsed.templates) && parsed.templates.length > 0
        ? parsed.templates
        : DEFAULT_KOC_EMAIL_TEMPLATES.map((t) => ({ ...t }));
    const serverConfig: KocEmailServerConfig = {
      ...DEFAULT_EMAIL_SERVER_CONFIG,
      ...(parsed.serverConfig || {}),
    };
    const logs = Array.isArray(parsed.logs) ? parsed.logs : [];
    return {
      templates,
      serverConfig,
      logs,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return cloneDefaultState();
  }
}

export function saveKocOutreachEmailState(
  state: KocOutreachEmailState,
  syncServer = true
): void {
  if (typeof window === 'undefined') return;
  const next: KocOutreachEmailState = {
    ...state,
    updatedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(KOC_OUTREACH_EMAIL_UPDATED_EVENT));
  } catch {
    // ignore storage quota errors
  }

  if (syncServer) {
    void fetch('/api/integrations/koc-outreach-email', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templates: next.templates,
        serverConfig: next.serverConfig,
        logs: next.logs.slice(0, 300),
      }),
    }).catch(() => {});
  }
}

export async function hydrateKocOutreachEmailStateFromServer(): Promise<KocOutreachEmailState> {
  const local = loadKocOutreachEmailState();
  if (typeof window === 'undefined') return local;
  try {
    const res = await fetch('/api/integrations/koc-outreach-email', {
      method: 'GET',
      cache: 'no-store',
    });
    if (!res.ok) return local;
    const data = await res.json();
    if (data && Array.isArray(data.templates) && data.templates.length > 0) {
      const merged: KocOutreachEmailState = {
        templates: data.templates,
        serverConfig: {
          ...DEFAULT_EMAIL_SERVER_CONFIG,
          ...(data.serverConfig || {}),
        },
        logs: Array.isArray(data.logs) && data.logs.length > 0 ? data.logs : local.logs,
        updatedAt: data.updatedAt || local.updatedAt,
      };
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent(KOC_OUTREACH_EMAIL_UPDATED_EVENT));
      return merged;
    }
  } catch {
    // fallback to local
  }
  return local;
}

/**
 * Gợi ý mẫu thư phù hợp nhất dựa trên dữ liệu dòng KOC trong Sheet
 */
export function recommendTemplateForRow(
  row: StaffListingSheetRow | undefined,
  templates: KocEmailTemplateItem[],
  brandName?: string
): KocEmailTemplateItem {
  const activeTemplates = templates.filter((t) => t.status !== 'ARCHIVED');
  const pool = activeTemplates.length > 0 ? activeTemplates : templates;

  const findByCat = (cat: KocEmailTemplateCategory): KocEmailTemplateItem | undefined => {
    if (brandName) {
      const brandSpecific = pool.find(
        (t) =>
          t.category === cat &&
          t.brandScope !== 'ALL' &&
          t.brandScope.toLowerCase() === brandName.toLowerCase()
      );
      if (brandSpecific) return brandSpecific;
    }
    return (
      pool.find((t) => t.category === cat && t.isDefaultForCategory) ||
      pool.find((t) => t.category === cat)
    );
  };

  if (!row) {
    return findByCat('PAID_BOOKING') || pool[0] || DEFAULT_KOC_EMAIL_TEMPLATES[0];
  }

  // Nếu là Freecast hoặc giá net = 0 -> mẫu Gửi mẫu trải nghiệm & Affiliate (FOC)
  if (row.tepBooking === 'Freecast' || Number(row.giaNetVideo) <= 0) {
    return findByCat('FOC_SAMPLE') || pool[0] || DEFAULT_KOC_EMAIL_TEMPLATES[1];
  }

  // Nếu đã có lịch sử GMV hợp tác lớn -> ưu tiên mẫu Tái hợp tác Winner
  if (Number(row.gmvDaHopTac) >= 10_000_000) {
    return findByCat('REBOOK_WINNER') || findByCat('PAID_BOOKING') || pool[0];
  }

  return findByCat('PAID_BOOKING') || pool[0] || DEFAULT_KOC_EMAIL_TEMPLATES[0];
}

export interface RenderOutreachEmailParams {
  subjectTemplate: string;
  bodyTemplate: string;
  row: StaffListingSheetRow;
  store?: StorePortfolioItem;
  kocDirectoryItem?: KocItem;
  staffName: string;
  staffPhone?: string;
  staffEmail?: string;
  customNote?: string;
  signatureBlock?: string;
  hideExactFeeInEmail?: boolean;
}

export function renderKocOutreachEmail(params: RenderOutreachEmailParams): {
  subject: string;
  body: string;
  recipientEmail: string;
} {
  const {
    subjectTemplate,
    bodyTemplate,
    row,
    store,
    kocDirectoryItem,
    staffName,
    staffPhone = '0988 654 321',
    staffEmail = 'booking.b2c@upbase.vn',
    customNote = '',
    signatureBlock = DEFAULT_EMAIL_SERVER_CONFIG.signatureBlock,
    hideExactFeeInEmail = false,
  } = params;

  const cleanHandle = (row.idKenh || kocDirectoryItem?.channelId || '')
    .trim()
    .replace(/^@+/, '');
  const handleDisplay = cleanHandle ? `@${cleanHandle}` : '@koc_channel';
  const tenKoc =
    (row.tenKenh || kocDirectoryItem?.stageName || cleanHandle || 'Bạn').trim();
  const linkKenh =
    row.linkKenh && !row.linkKenh.startsWith('=')
      ? row.linkKenh
      : cleanHandle
        ? `https://www.tiktok.com/@${cleanHandle}`
        : 'https://www.tiktok.com';

  const brandName =
    store?.brandName ||
    (row.store ? row.store.split(/[-–—]/)[0].trim() : 'Nhãn hàng');
  const storeName = store?.storeName || row.store || brandName;
  const sanPham =
    (row.sanPham || store?.mainProducts?.[0] || `Sản phẩm chủ lực ${brandName}`).trim();
  const contentTag = (row.contentTag || 'Review trải nghiệm thực tế').trim();
  const tepBooking = (row.tepBooking || 'KL2').trim();

  const netFee = Number(row.giaNetVideo) || 0;
  let mucCatXe = 'Trao đổi chi tiết theo Ratecard kênh';
  if (netFee <= 0 || tepBooking === 'Freecast') {
    mucCatXe = 'Tặng bộ sản phẩm Fullsize + Hoa hồng Affiliate ưu đãi đặc quyền';
  } else if (!hideExactFeeInEmail) {
    mucCatXe = `${netFee.toLocaleString('vi-VN')} VNĐ (Giá Net nhận về)`;
  }

  const ngayAirRaw = (row.ngayAirPlan || '').trim();
  let ngayAirDuKien = 'Trong tháng chiến dịch (linh hoạt theo lịch kênh)';
  if (ngayAirRaw) {
    const parts = ngayAirRaw.split('-');
    if (parts.length === 3) {
      ngayAirDuKien = `${parts[2]}/${parts[1]}/${parts[0]}`;
    } else {
      ngayAirDuKien = ngayAirRaw;
    }
  }

  const dotBooking = (row.dot || 'Đợt 1').trim();
  const thangRaw = (row.thang || '2026/10').trim();
  const thangParts = thangRaw.split('/');
  const thangChienDich =
    thangParts.length === 2 ? `${thangParts[1]}/${thangParts[0]}` : thangRaw;

  const thanhQuaCu =
    row.thanhQuaHopTac && row.thanhQuaHopTac !== 'Chưa có lịch sử hợp tác'
      ? row.thanhQuaHopTac
      : 'Đã từng đồng hành hiệu quả cùng hệ sinh thái nhãn hàng UpBase';

  const formattedCustomNote = customNote.trim()
    ? `\n- Ghi chú bổ sung cho kênh ${handleDisplay}: ${customNote.trim()}`
    : '';

  const replacements: Record<string, string> = {
    '{{ten_koc}}': tenKoc,
    '{{id_kenh}}': handleDisplay,
    '{{link_kenh}}': linkKenh,
    '{{thuong_hieu}}': brandName,
    '{{gian_hang}}': storeName,
    '{{san_pham}}': sanPham,
    '{{content_tag}}': contentTag,
    '{{tep_booking}}': tepBooking,
    '{{muc_cat_xe}}': mucCatXe,
    '{{ngay_air_du_kien}}': ngayAirDuKien,
    '{{dot_booking}}': dotBooking,
    '{{thang_chien_dich}}': thangChienDich,
    '{{thanh_qua_cu}}': thanhQuaCu,
    '{{ten_pic}}': staffName || row.nhanSuDien || 'Chuyên viên Booking B2C',
    '{{sdt_pic}}': staffPhone,
    '{{email_pic}}': staffEmail,
    '{{ghi_chu_rieng}}': formattedCustomNote,
    '{{chu_ky_phong}}': signatureBlock,
  };

  let subject = subjectTemplate;
  let body = bodyTemplate;

  for (const [token, val] of Object.entries(replacements)) {
    subject = subject.split(token).join(val);
    body = body.split(token).join(val);
  }

  // Dọn dòng trống thừa nếu không có ghi chú riêng
  body = body.replace(/\n{3,}/g, '\n\n').trim();

  const recipientEmail = (row.email || kocDirectoryItem?.email || '').trim();

  return {
    subject,
    body,
    recipientEmail,
  };
}

export function buildGmailComposeUrl(params: {
  to: string;
  cc?: string;
  subject: string;
  body: string;
}): string {
  const url = new URL('https://mail.google.com/mail/');
  url.searchParams.set('view', 'cm');
  url.searchParams.set('fs', '1');
  if (params.to.trim()) {
    url.searchParams.set('to', params.to.trim());
  }
  if (params.cc?.trim()) {
    url.searchParams.set('cc', params.cc.trim());
  }
  url.searchParams.set('su', params.subject);
  url.searchParams.set('body', params.body);
  return url.toString();
}

export function buildMailtoUrl(params: {
  to: string;
  cc?: string;
  subject: string;
  body: string;
}): string {
  const query: string[] = [];
  if (params.cc?.trim()) {
    query.push(`cc=${encodeURIComponent(params.cc.trim())}`);
  }
  query.push(`subject=${encodeURIComponent(params.subject)}`);
  query.push(`body=${encodeURIComponent(params.body)}`);
  return `mailto:${encodeURIComponent(params.to.trim())}?${query.join('&')}`;
}
