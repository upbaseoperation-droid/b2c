'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshCw,
  Send,
  Link2,
  Trash2,
  Copy,
  Play,
  MessageSquare,
  ShieldCheck,
  Check,
  FileText,
  Clock,
  CheckCircle2,
  Users,
  Terminal,
  Edit3,
  ExternalLink,
} from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { INITIAL_INTERNAL_STAFF_RBAC } from '@/lib/rbacData';
import { REAL_B2C_69_STORES } from '@/lib/realB2cPlanData';
import {
  Panel,
  Button,
  DataTable,
  FilterBar,
  StatRow,
  Stat,
  Modal,
  ConfirmDialog,
  Input,
  Select,
  Field,
  Textarea,
  EmptyState,
  Status,
  Person,
  Chips,
  Tabs,
  type Column,
} from '@/components/ui';

type ZaloGroupRole = 'KOC_GROUP' | 'BRAND_PARTNER' | 'INTERNAL_OPS' | 'BOD_EXECUTIVE';

type ZaloAutoReplyKey =
  | 'AIR_CHECK_RESULT'
  | 'AIR_CHECK_PHOTO_CAPTION'
  | 'BRIEF_MESSAGE'
  | 'DRAFT_RECEIVED'
  | 'DRAFT_APPROVED'
  | 'DRAFT_REJECTED'
  | 'BRAND_PROGRESS_REPORT';

interface ZaloAutoReplyTemplateItem {
  key: ZaloAutoReplyKey;
  label: string;
  triggerHint: string;
  content: string;
  availablePlaceholders: string[];
}

interface ZaloBroadcastTemplateItem {
  id: string;
  label: string;
  targetRole: ZaloGroupRole | 'ALL';
  content: string;
}

interface ZaloBotReplyConfigState {
  sendHoldingPhotoOnAirCheck: boolean;
  sendScanningProgressMessage: boolean;
  autoReplyTemplates: ZaloAutoReplyTemplateItem[];
  broadcastTemplates: ZaloBroadcastTemplateItem[];
  updatedAt?: string;
}

type ZaloGroupAccessStatus = 'APPROVED' | 'PENDING_APPROVAL' | 'BLOCKED';

interface ZaloBotSecurityPolicy {
  requireGroupWhitelist: boolean;
  lockRoleElevationFromChat: boolean;
  enforceBrandScopeInInternalGroups: boolean;
  restrictDraftReviewToStaff: boolean;
  isolateCrossDealLookupInKocGroup: boolean;
  updatedAt?: string;
}

type ZaloDealWorkflowStatus =
  | 'CHỜ_NHẬN_MẪU'
  | 'ĐANG_QUAY_NHÁP'
  | 'ĐÃ_NỘP_NHÁP'
  | 'ĐÃ_DUYỆT_NHÁP'
  | 'ĐÃ_NGHIỆM_THU_AIR'
  | 'CẦN_CHỈNH_SỬA';

type ZaloStaffRole = 'CEO' | 'LEAD_B2C' | 'LEADER' | 'PIC' | 'KOC';

interface ZaloGroupMappingItem {
  groupId: string;
  groupName?: string;
  groupRole: ZaloGroupRole;
  accessStatus?: ZaloGroupAccessStatus;
  allowedBrands?: string[];
  dealCode?: string;
  kocHandle?: string;
  kocName?: string;
  brandName?: string;
  storeName?: string;
  picName?: string;
  leaderName?: string;
  productName?: string;
  pillarName?: string;
  briefSummary?: string;
  requiredHashtags?: string[];
  expectedProductUrl?: string;
  deadlineDate?: string;
  bookingFeeNet?: number;
  dealStatus: ZaloDealWorkflowStatus;
  draftVideoUrl?: string;
  draftReviewNote?: string;
  airedVideoUrl?: string;
  trackingCode?: string;
  sampleShippedAt?: string;
  sparkAdsCode?: string;
  isAutoDiscovered?: boolean;
  lastMessageText?: string;
  lastSenderId?: string;
  lastSenderName?: string;
  lastActiveAt?: string;
  messageCount?: number;
  linkedAt: string;
  updatedAt?: string;
}

interface ZaloDiscoveredSenderItem {
  senderId: string;
  displayName: string;
  lastChatId: string;
  lastGroupName?: string;
  lastMessageText: string;
  lastSeenAt: string;
  messageCount: number;
}

interface ZaloUserPermissionItem {
  zaloUserId: string;
  displayName: string;
  staffName: string;
  staffEmail: string;
  role: ZaloStaffRole;
  roleLabel: string;
  assignedBrands: string[];
  updatedAt: string;
}

interface ZaloAirCheckHistoryItem {
  id: string;
  checkedAt: string;
  chatId: string;
  dealCode?: string;
  brandName?: string;
  kocHandle: string;
  videoUrl: string;
  verdict: 'PASS' | 'REVIEW' | 'FAIL';
  status: string;
  hasProductLink: boolean;
  productTitle?: string;
  productUrl?: string;
  productId?: string;
  cartProducts?: Array<{
    productId: string;
    title: string;
    productUrl: string;
  }>;
  holdingScreenshotUrl?: string;
  holdingMomentSec?: number;
  holdingMomentTimeLabel?: string;
  holdingMomentQuote?: string;
  airedAtVn?: string;
  publishedAt?: string;
  firstProductAppearanceSec?: number | null;
  firstProductMentionTimeLabel?: string;
  firstProductMentionTerm?: string;
  firstProductMentionQuote?: string;
  productMentionMoments?: Array<{
    startSec: number;
    endSec: number;
    timeLabel: string;
    matchedTerm: string;
    quote: string;
  }>;
  views: number | null;
  likes: number | null;
  hashtags: string[];
  sentToZalo: boolean;
}

interface WebhookDebugEvent {
  time: string;
  body: any;
  extractedChatId?: string;
  replySent?: boolean;
  replyText?: string;
  replyPhotoUrl?: string;
  error?: string;
}

interface ZaloBotManagerProps {
  currentUser: UserProfile;
  onNotify?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const GROUP_ROLE_LABEL: Record<ZaloGroupRole, string> = {
  KOC_GROUP: 'Nhóm KOC 3 bên',
  BRAND_PARTNER: 'Nhóm làm việc với Brand',
  INTERNAL_OPS: 'Nhóm Vận hành nội bộ',
  BOD_EXECUTIVE: 'Nhóm Điều hành BOD',
};

const DEFAULT_CLIENT_REPLY_CONFIG: ZaloBotReplyConfigState = {
  sendHoldingPhotoOnAirCheck: true,
  sendScanningProgressMessage: true,
  autoReplyTemplates: [
    {
      key: 'AIR_CHECK_RESULT',
      label: '1. Kết quả nghiệm thu video TikTok (Quét link Air)',
      triggerHint: 'Tự động gửi khi KOC / PIC / Brand dán link video TikTok vào nhóm',
      availablePlaceholders: [
        '{verdictIcon}',
        '{kocHandle}',
        '{airedAt}',
        '{statusText}',
        '{cartText}',
        '{productLinks}',
        '{mentionLine}',
        '{holdingLine}',
        '{views}',
        '{likes}',
        '{hashtags}',
        '{dealSyncNote}',
      ],
      content: [
        '📊 KẾT QUẢ NGHIỆM THU VIDEO TIKTOK',
        '----------------------------------------',
        '• Đánh giá: {verdictIcon}',
        '• Tác giả kênh: @{kocHandle}',
        '• Ngày giờ lên sóng (Air): {airedAt}',
        '• Tình trạng: {statusText}',
        '• Giỏ hàng: {cartText}',
        '{productLinks}',
        '{mentionLine}',
        '{holdingLine}',
        '• Lượt xem: {views} | Lượt thích: {likes}',
        '• Hashtags: {hashtags}',
        '----------------------------------------',
        '{dealSyncNote}',
      ].join('\n'),
    },
    {
      key: 'AIR_CHECK_PHOTO_CAPTION',
      label: '2. Chú thích dưới ảnh chụp KOC cầm sản phẩm (sendPhoto)',
      triggerHint: 'Đính kèm dưới bức ảnh cắt từ clip tại mốc giây KOC cầm sản phẩm',
      availablePlaceholders: [
        '{kocHandle}',
        '{holdingSec}',
        '{holdingTimeLabel}',
        '{airedAt}',
        '{mentionSec}',
        '{productTitle}',
        '{holdingQuote}',
      ],
      content: [
        '📸 Ảnh chụp KOC @{kocHandle} cầm sản phẩm ở giây {holdingSec}s ({holdingTimeLabel})',
        '📅 Ngày giờ Air: {airedAt} | ⏱️ Nhắc SP lần đầu: Giây {mentionSec}s',
        '🛒 SP: {productTitle}',
        '💬 Lời thoại: "{holdingQuote}"',
      ].join('\n'),
    },
    {
      key: 'BRIEF_MESSAGE',
      label: '3. Bản tin Brief chiến dịch KOC (/brief)',
      triggerHint: 'Phản hồi khi gõ lệnh /brief hoặc bấm nút Gửi Brief trên Web-Admin',
      availablePlaceholders: [
        '{dealCode}',
        '{brandName}',
        '{storeName}',
        '{kocName}',
        '{productName}',
        '{pillarName}',
        '{briefSummary}',
        '{hashtags}',
        '{deadlineDate}',
        '{picName}',
      ],
      content: [
        '📋 BRIEF CHIẾN DỊCH BOOKING KOC - UPBASE B2C',
        '----------------------------------------',
        '• Mã Deal: {dealCode}',
        '• Thương hiệu: {brandName} ({storeName})',
        '• KOC thực hiện: {kocName}',
        '• Sản phẩm trọng tâm: {productName}',
        '• Trụ cột nội dung: {pillarName}',
        '• Yêu cầu kịch bản & góc quay:',
        '  {briefSummary}',
        '• Hashtag bắt buộc: {hashtags}',
        '• Hạn nộp video nháp (SLA): {deadlineDate}',
        '• Chuyên viên phụ trách (PIC): {picName}',
        '----------------------------------------',
        '👉 Cách nộp bài ngay trong nhóm:',
        '1. Nộp link video nháp (Google Drive): Gõ /nopnhap <link_drive>',
        '2. Nộp link TikTok đã đăng (Air): Dán trực tiếp link TikTok kèm tag @Bot để hệ thống tự động quét nghiệm thu.',
      ].join('\n'),
    },
    {
      key: 'DRAFT_RECEIVED',
      label: '4. Xác nhận tiếp nhận video nháp (/nopnhap)',
      triggerHint: 'Phản hồi khi KOC gửi link Google Drive / CapCut hoặc gõ /nopnhap',
      availablePlaceholders: ['{senderName}', '{dealCode}', '{brandName}', '{draftUrl}', '{picName}'],
      content: [
        '📥 ĐÃ TIẾP NHẬN VIDEO DEMO / NHÁP',
        '----------------------------------------',
        '• Người nộp: {senderName}',
        '• Mã Deal: {dealCode}',
        '• Thương hiệu: {brandName}',
        '• Link bản nháp: {draftUrl}',
        '• Trạng thái mới: ĐÃ_NỘP_NHÁP (Chờ PIC/Brand duyệt)',
        '----------------------------------------',
        '🔔 Nhắc PIC phụ trách ({picName}): Sau khi kiểm tra nội dung, hãy gõ:',
        '• /duyetnhap [ghi chú] -> Để phê duyệt cho KOC đăng bài.',
        '• /suanhap <nội dung cần sửa> -> Để yêu cầu KOC chỉnh sửa.',
      ].join('\n'),
    },
    {
      key: 'DRAFT_APPROVED',
      label: '5. Thông báo phê duyệt video nháp (/duyetnhap)',
      triggerHint: 'Phản hồi khi PIC hoặc Đại diện Brand gõ /duyetnhap',
      availablePlaceholders: ['{dealCode}', '{brandName}', '{kocName}', '{senderName}', '{reviewNote}'],
      content: [
        '✅ PHÊ DUYỆT VIDEO NHÁP THÀNH CÔNG',
        '----------------------------------------',
        '• Mã Deal: {dealCode} ({brandName})',
        '• KOC: {kocName}',
        '• Người duyệt: {senderName}',
        '• Ghi chú duyệt: {reviewNote}',
        '• Trạng thái Deal: ĐÃ_DUYỆT_NHÁP',
        '----------------------------------------',
        '👉 Khi đăng video lên TikTok xong, KOC chỉ cần gửi link TikTok vào nhóm này để Bot nghiệm thu tự động!',
      ].join('\n'),
    },
    {
      key: 'DRAFT_REJECTED',
      label: '6. Thông báo yêu cầu chỉnh sửa video nháp (/suanhap)',
      triggerHint: 'Phản hồi khi PIC hoặc Đại diện Brand gõ /suanhap <nội dung>',
      availablePlaceholders: ['{dealCode}', '{brandName}', '{senderName}', '{feedback}'],
      content: [
        '🛠️ YÊU CẦU CHỈNH SỬA VIDEO NHÁP',
        '----------------------------------------',
        '• Mã Deal: {dealCode} ({brandName})',
        '• Người yêu cầu: {senderName}',
        '• Nội dung cần điều chỉnh: {feedback}',
        '• Trạng thái Deal: CẦN_CHỈNH_SỬA',
        '----------------------------------------',
        '👉 Sau khi chỉnh sửa xong, KOC gửi lại link Google Drive mới kèm lệnh /nopnhap nhé!',
      ].join('\n'),
    },
    {
      key: 'BRAND_PROGRESS_REPORT',
      label: '7. Báo cáo tiến độ chiến dịch dành cho Nhóm Brand (/tiendo, /baocaobrand)',
      triggerHint: 'Phản hồi trong Nhóm làm việc với Nhãn hàng (BRAND_PARTNER) khi gõ /tiendo hoặc /baocaobrand',
      availablePlaceholders: [
        '{brandName}',
        '{leaderName}',
        '{storeSummary}',
        '{airedSummary}',
        '{pendingDraftSummary}',
      ],
      content: [
        '📊 BÁO CÁO TIẾN ĐỘ CHIẾN DỊCH NHÃN HÀNG: {brandName}',
        '• Quản lý điều phối Upbase: {leaderName}',
        '----------------------------------------',
        '{storeSummary}',
        '----------------------------------------',
        '📌 TÌNH HÌNH NGHIỆM THU & BẢN NHÁP:',
        '{airedSummary}',
        '{pendingDraftSummary}',
        '----------------------------------------',
        '👉 Lệnh hỗ trợ Nhãn hàng trong nhóm: /listing (xem KOC đề xuất), /nhapchoduyet (xem demo chờ duyệt), /duyetkoc <@handle>, /duyetnhap <@handle>.',
      ].join('\n'),
    },
  ],
  broadcastTemplates: [
    {
      id: 'brief_reminder',
      label: 'Mẫu gửi Brief chiến dịch KOC',
      targetRole: 'KOC_GROUP',
      content: [
        '📋 THÔNG BÁO BRIEF CHIẾN DỊCH BOOKING KOC',
        '• Thương hiệu: ClubClio Vietnam',
        '• Sản phẩm: Phấn nước Clio Kill Cover Mesh Glow Cushion',
        '• Yêu cầu nội dung: Quay cận cảnh chất kem che khuyết điểm dưới ánh sáng tự nhiên trong 3 giây đầu, gắn giỏ hàng sản phẩm chính hãng góc trái.',
        '• Hashtag bắt buộc: #ClubClio #ClioCushion #BeautyReview',
        '• Hạn nộp video nháp: 30/10/2026',
        '👉 Khi quay xong bản nháp, KOC gửi link Google Drive kèm lệnh /nopnhap vào nhóm nhé!',
      ].join('\n'),
    },
    {
      id: 'brand_listing_submit',
      label: 'Mẫu trình Nhãn hàng duyệt danh sách KOC (SLA 48h)',
      targetRole: 'BRAND_PARTNER',
      content: [
        '📑 TRÌNH DUYỆT DANH SÁCH KOC ĐỀ XUẤT CHIẾN DỊCH THÁNG',
        '• Kính gửi Anh/Chị đại diện Nhãn hàng,',
        '• Team Booking Upbase đã cập nhật danh sách KOC đề xuất đợt mới kèm phân tích GMV, View trung vị và mức giá Net dự kiến.',
        '• Anh/Chị có thể gõ trực tiếp trong nhóm này:',
        '  - /listing : Để xem nhanh danh sách KOC đang chờ duyệt',
        '  - /duyetkoc <@handle> : Để chốt chọn KOC ngay trên Zalo (đo SLA 48h)',
        '  - /tuchoikoc <@handle> <lý do> : Để báo đổi KOC khác',
      ].join('\n'),
    },
    {
      id: 'brand_draft_review',
      label: 'Mẫu mời Nhãn hàng duyệt Video Demo của KOC',
      targetRole: 'BRAND_PARTNER',
      content: [
        '🎬 BÁO CÁO VIDEO DEMO KOC MỚI NỘP CHỜ BRAND DUYỆT',
        '• Team Upbase đã kiểm tra sơ bộ kịch bản và gửi link video nháp của KOC lên hệ thống.',
        '• Anh/Chị đại diện Nhãn hàng vui lòng gõ /nhapchoduyet để xem danh sách link Drive và phản hồi bằng lệnh /duyetnhap hoặc /suanhap nhé!',
      ].join('\n'),
    },
    {
      id: 'sla_24h',
      label: 'Mẫu nhắc hạn nộp video (SLA 24h)',
      targetRole: 'KOC_GROUP',
      content: [
        '⏰ NHẮC LỊCH NỘP VIDEO CHIẾN DỊCH (CÒN 24 GIỜ)',
        '• Chào bạn, thời hạn nộp video nháp cho chiến dịch đang sắp đến hạn.',
        '• Vui lòng gửi link Google Drive video nháp vào nhóm kèm lệnh: /nopnhap <link_drive>',
        '• Nếu đã được duyệt nháp và đăng bài lên TikTok, hãy gửi link TikTok kèm tag @Bot để hệ thống nghiệm thu tự động.',
      ].join('\n'),
    },
  ],
};

const DEAL_STATUS_META: Record<
  ZaloDealWorkflowStatus,
  { label: string; tone: 'positive' | 'warning' | 'critical' | 'neutral' }
> = {
  CHỜ_NHẬN_MẪU: { label: 'Chờ nhận mẫu', tone: 'neutral' },
  ĐANG_QUAY_NHÁP: { label: 'Đang quay nháp', tone: 'warning' },
  ĐÃ_NỘP_NHÁP: { label: 'Đã nộp nháp', tone: 'warning' },
  ĐÃ_DUYỆT_NHÁP: { label: 'Đã duyệt nháp', tone: 'positive' },
  ĐÃ_NGHIỆM_THU_AIR: { label: 'Đã nghiệm thu (Air)', tone: 'positive' },
  CẦN_CHỈNH_SỬA: { label: 'Cần chỉnh sửa', tone: 'critical' },
};

const MESSAGE_TEMPLATES: Array<{ id: string; label: string; content: string }> = [
  {
    id: 'brief_reminder',
    label: 'Mẫu gửi Brief chiến dịch KOC',
    content: [
      '📋 THÔNG BÁO BRIEF CHIẾN DỊCH BOOKING KOC',
      '• Thương hiệu: ClubClio Vietnam',
      '• Sản phẩm: Phấn nước Clio Kill Cover Mesh Glow Cushion',
      '• Yêu cầu nội dung: Quay cận cảnh chất kem che khuyết điểm dưới ánh sáng tự nhiên trong 3 giây đầu, gắn giỏ hàng sản phẩm chính hãng góc trái.',
      '• Hashtag bắt buộc: #ClubClio #ClioCushion #BeautyReview',
      '• Hạn nộp video nháp: 30/10/2026',
      '👉 Khi quay xong bản nháp, KOC gửi link Google Drive kèm lệnh /nopnhap vào nhóm nhé!',
    ].join('\n'),
  },
  {
    id: 'sla_24h',
    label: 'Mẫu nhắc hạn nộp video (SLA 24h)',
    content: [
      '⏰ NHẮC LỊCH NỘP VIDEO CHIẾN DỊCH (CÒN 24 GIỜ)',
      '• Chào bạn, thời hạn nộp video nháp cho chiến dịch đang sắp đến hạn.',
      '• Vui lòng gửi link Google Drive video nháp vào nhóm kèm lệnh: /nopnhap <link_drive>',
      '• Nếu đã được duyệt nháp và đăng bài lên TikTok, hãy gửi link TikTok kèm tag @Bot để hệ thống nghiệm thu tự động.',
    ].join('\n'),
  },
  {
    id: 'draft_approved',
    label: 'Mẫu thông báo đã duyệt video nháp',
    content: [
      '✅ PHÊ DUYỆT VIDEO DEMO / NHÁP',
      '• Video nháp của bạn đã được Nhãn hàng & PIC kiểm tra đạt yêu cầu.',
      '• Bạn vui lòng đăng video lên kênh TikTok ở chế độ Công khai, gắn đúng sản phẩm trong giỏ hàng và đầy đủ hashtag theo Brief.',
      '• Ngay sau khi đăng, hãy dán link video TikTok vào nhóm này để Bot xác nhận nghiệm thu.',
    ].join('\n'),
  },
  {
    id: 'overbudget_alert',
    label: 'Mẫu cảnh báo ngân sách nội bộ',
    content: [
      '🚨 CẢNH BÁO KIỂM SOÁT HẠN MỨC NGÂN SÁCH NET',
      '• Đề nghị các PIC rà soát lại các deal trả phí trước khi chốt danh sách trình duyệt.',
      '• Các gian hàng thuộc nhóm 8 Brand trọng điểm trình qua Leader Nguyễn Thị Ngọc Tâm; các gian hàng còn lại trình trực tiếp Giám đốc B2C Đặng Thị Yến Nhi.',
    ].join('\n'),
  },
];

const QUICK_COMMANDS: Array<{ cmd: string; label: string; role: ZaloGroupRole }> = [
  { cmd: '/listing', label: 'Brand: Danh sách KOC đề xuất', role: 'BRAND_PARTNER' },
  { cmd: '/tiendo', label: 'Brand: Báo cáo tiến độ & ngân sách Brand', role: 'BRAND_PARTNER' },
  { cmd: '/nhapchoduyet', label: 'Brand: Danh sách Demo chờ duyệt', role: 'BRAND_PARTNER' },
  { cmd: '/duyetkoc @po.trann77', label: 'Brand: Chốt duyệt KOC', role: 'BRAND_PARTNER' },
  { cmd: '/pnl', label: 'Tổng hợp PnL 69 gian hàng', role: 'BOD_EXECUTIVE' },
  { cmd: '/pnl clubclio', label: 'Chi tiết PnL ClubClio', role: 'INTERNAL_OPS' },
  { cmd: '/pnl eupc', label: 'Chi tiết PnL EUPC', role: 'INTERNAL_OPS' },
  { cmd: '/overbudget', label: 'Quét gian hàng vượt trần', role: 'BOD_EXECUTIVE' },
  { cmd: '/koc @po.trann77', label: 'Tra cứu KOC @po.trann77', role: 'INTERNAL_OPS' },
  { cmd: '/brief', label: 'Xem Brief nhóm hiện tại', role: 'KOC_GROUP' },
  { cmd: '/vandon SPXVN048291823', label: 'KOC: Báo mã vận đơn & tính hạn SLA 5-7 ngày', role: 'KOC_GROUP' },
  { cmd: '/ads #7F9A2B8C1D4E', label: 'KOC: Nộp mã ủy quyền Spark Ads', role: 'KOC_GROUP' },
  { cmd: '/bbnt', label: 'Đối soát 4 cổng BBNT & Bảng tính Thuế/Thanh toán', role: 'KOC_GROUP' },
  { cmd: '/nhacnho', label: 'Nội bộ: Tự động nhắc hạn SLA hàng loạt', role: 'INTERNAL_OPS' },
  { cmd: '/tomtat', label: 'Tóm tắt hội thoại & tiến độ nhóm', role: 'KOC_GROUP' },
  { cmd: '/sla', label: 'Báo cáo tiến độ SLA', role: 'INTERNAL_OPS' },
  { cmd: '/digest', label: 'Báo cáo tổng hợp cuối ngày', role: 'BOD_EXECUTIVE' },
  { cmd: '/status', label: 'Kiểm tra trạng thái nhóm', role: 'KOC_GROUP' },
  { cmd: '/help', label: 'Danh sách lệnh hỗ trợ', role: 'INTERNAL_OPS' },
];

export function ZaloBotManagerView({ currentUser, onNotify }: ZaloBotManagerProps) {
  const [activeTab, setActiveTab] = useState<
    | 'GROUPS'
    | 'AIR_CHECK'
    | 'REPLY_TEMPLATES'
    | 'COMMAND_BROADCAST'
    | 'RBAC_USERS'
    | 'WEBHOOK_LOGS'
  >('GROUPS');
  const [isLoading, setIsLoading] = useState(false);
  const [botInfo, setBotInfo] = useState<any>({
    id: '4534079839618724427',
    display_name: 'Bot tttttttupbase',
    account_name: 'bot.qxQiPkja',
    can_join_groups: true,
  });
  const [webhookInfo, setWebhookInfo] = useState<any>({
    url: 'https://b2c-theta.vercel.app/api/integrations/zalo-bot/webhook',
    updated_at: Date.now(),
  });
  const [mappings, setMappings] = useState<ZaloGroupMappingItem[]>([]);
  const [userPermissions, setUserPermissions] = useState<ZaloUserPermissionItem[]>([]);
  const [discoveredSenders, setDiscoveredSenders] = useState<ZaloDiscoveredSenderItem[]>([]);
  const [airHistory, setAirHistory] = useState<ZaloAirCheckHistoryItem[]>([]);
  const [recentEvents, setRecentEvents] = useState<WebhookDebugEvent[]>([]);
  const [replyConfig, setReplyConfig] = useState<ZaloBotReplyConfigState>(
    DEFAULT_CLIENT_REPLY_CONFIG
  );
  const [selectedReplyKey, setSelectedReplyKey] = useState<ZaloAutoReplyKey>('AIR_CHECK_RESULT');
  const [isSavingReplyConfig, setIsSavingReplyConfig] = useState(false);
  const [newBroadcastLabel, setNewBroadcastLabel] = useState('');
  const [newBroadcastRole, setNewBroadcastRole] = useState<ZaloGroupRole | 'ALL'>('BRAND_PARTNER');
  const [newBroadcastContent, setNewBroadcastContent] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'DISCOVERED' | ZaloGroupRole>('ALL');
  const [picFilter, setPicFilter] = useState<string>('ALL');
  const [brandFilter, setBrandFilter] = useState<string>('ALL');
  const [copiedLink, setCopiedLink] = useState(false);

  // Modal thêm/sửa liên kết nhóm
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [modalGroupId, setModalGroupId] = useState('');
  const [modalGroupName, setModalGroupName] = useState('');
  const [modalGroupRole, setModalGroupRole] = useState<ZaloGroupRole>('KOC_GROUP');
  const [modalAccessStatus, setModalAccessStatus] = useState<ZaloGroupAccessStatus>('APPROVED');
  const [modalAllowedBrands, setModalAllowedBrands] = useState('');
  const [modalDealCode, setModalDealCode] = useState('');
  const [modalKocHandle, setModalKocHandle] = useState('');
  const [modalKocName, setModalKocName] = useState('');
  const [modalBrandName, setModalBrandName] = useState('');
  const [modalStoreName, setModalStoreName] = useState('');
  const [modalPicName, setModalPicName] = useState('');
  const [modalProductName, setModalProductName] = useState('');
  const [modalBriefSummary, setModalBriefSummary] = useState('');
  const [modalHashtags, setModalHashtags] = useState('');
  const [modalDeadlineDate, setModalDeadlineDate] = useState('31/10/2026');
  const [modalDealStatus, setModalDealStatus] = useState<ZaloDealWorkflowStatus>('ĐANG_QUAY_NHÁP');
  const [modalTrackingCode, setModalTrackingCode] = useState('');
  const [modalSparkAdsCode, setModalSparkAdsCode] = useState('');

  // Modal duyệt / cập nhật trạng thái nháp
  const [reviewModalTarget, setReviewModalTarget] = useState<ZaloGroupMappingItem | null>(null);
  const [reviewNextStatus, setReviewNextStatus] = useState<ZaloDealWorkflowStatus>('ĐÃ_DUYỆT_NHÁP');
  const [reviewNote, setReviewNote] = useState('');

  // Modal xem trước nội dung vừa gửi
  const [previewModalData, setPreviewModalData] = useState<{
    title: string;
    content: string;
    photoUrl?: string;
  } | null>(null);

  // Confirm dialog hủy liên kết
  const [unlinkTargetGroupId, setUnlinkTargetGroupId] = useState<string | null>(null);

  // Thử nghiệm Quét Air Check
  const [testVideoUrl, setTestVideoUrl] = useState('');
  const [airCheckTargetChatId, setAirCheckTargetChatId] = useState('');
  const [isCheckingAir, setIsCheckingAir] = useState(false);
  const [airCheckResult, setAirCheckResult] = useState<any>(null);
  const [airCheckScreenshot, setAirCheckScreenshot] = useState<{
    url: string;
    sec?: number;
    timeLabel?: string;
    quote?: string;
  } | null>(null);

  // Bộ thực thi lệnh Bot (Command Simulator) & Broadcast
  const [simCommand, setSimCommand] = useState('/pnl');
  const [simChatId, setSimChatId] = useState('zalo_grp_b2c_internal_ops');
  const [simGroupRole, setSimGroupRole] = useState<ZaloGroupRole>('INTERNAL_OPS');
  const [simSendToZalo, setSimSendToZalo] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simOutput, setSimOutput] = useState<string>('');

  const [broadcastChatId, setBroadcastChatId] = useState('');
  const [broadcastText, setBroadcastText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Modal phân quyền nhân sự Zalo
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [permUserId, setPermUserId] = useState('');
  const [permDisplayName, setPermDisplayName] = useState('');
  const [permStaffName, setPermStaffName] = useState('');
  const [permStaffEmail, setPermStaffEmail] = useState('');
  const [permRole, setPermRole] = useState<ZaloStaffRole>('PIC');
  const [permBrands, setPermBrands] = useState('');
  const [securityPolicy, setSecurityPolicy] = useState<ZaloBotSecurityPolicy>({
    requireGroupWhitelist: false,
    lockRoleElevationFromChat: true,
    enforceBrandScopeInInternalGroups: true,
    restrictDraftReviewToStaff: false,
    isolateCrossDealLookupInKocGroup: true,
  });

  const inviteUrl = 'https://bot.zaloplatforms.com/groups/invite/bot.qxQiPkja';

  const fetchBotStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/integrations/zalo-bot/status');
      if (res.ok) {
        const data = await res.json();
        if (data.botInfo) setBotInfo(data.botInfo);
        if (data.webhookInfo) setWebhookInfo(data.webhookInfo);
        if (Array.isArray(data.mappings)) setMappings(data.mappings);
        if (Array.isArray(data.userPermissions)) setUserPermissions(data.userPermissions);
        if (Array.isArray(data.discoveredSenders)) setDiscoveredSenders(data.discoveredSenders);
        if (data.securityPolicy) setSecurityPolicy(data.securityPolicy);
        if (data.replyConfig && Array.isArray(data.replyConfig.autoReplyTemplates)) {
          setReplyConfig(data.replyConfig);
        }
        if (Array.isArray(data.airHistory)) setAirHistory(data.airHistory);
        if (Array.isArray(data.recentEvents)) setRecentEvents(data.recentEvents);
      }
    } catch {
      // Fallback giữ nguyên state
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBotStatus();
  }, [fetchBotStatus]);

  const handleCopyInviteLink = () => {
    void navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    onNotify?.('Đã sao chép liên kết mời Bot vào nhóm Zalo.', 'success');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const openEditGroupModal = (item?: ZaloGroupMappingItem) => {
    if (item) {
      setModalGroupId(item.groupId);
      setModalGroupName(item.groupName || '');
      setModalGroupRole(item.groupRole || 'KOC_GROUP');
      setModalAccessStatus(item.accessStatus || 'APPROVED');
      setModalAllowedBrands((item.allowedBrands || []).join(', '));
      setModalDealCode(item.dealCode || '');
      setModalKocHandle(item.kocHandle || '');
      setModalKocName(item.kocName || '');
      setModalBrandName(item.brandName || '');
      setModalStoreName(item.storeName || '');
      setModalPicName(item.picName || '');
      setModalProductName(item.productName || '');
      setModalBriefSummary(item.briefSummary || '');
      setModalHashtags((item.requiredHashtags || []).join(', '));
      setModalDeadlineDate(item.deadlineDate || '31/10/2026');
      setModalDealStatus(item.dealStatus || 'ĐANG_QUAY_NHÁP');
      setModalTrackingCode(item.trackingCode || '');
      setModalSparkAdsCode(item.sparkAdsCode || '');
    } else {
      setModalGroupId('');
      setModalGroupName('');
      setModalGroupRole('KOC_GROUP');
      setModalAccessStatus('APPROVED');
      setModalAllowedBrands('ClubClio');
      setModalDealCode('');
      setModalKocHandle('');
      setModalKocName('');
      setModalBrandName('ClubClio');
      setModalStoreName('ClubClio_TikTok_Flagship');
      setModalPicName(currentUser?.name || 'Hà Thị Thủy');
      setModalProductName('');
      setModalBriefSummary('');
      setModalHashtags('ClubClio, UpbaseB2C, BeautyReview');
      setModalDeadlineDate('31/10/2026');
      setModalDealStatus('ĐANG_QUAY_NHÁP');
      setModalTrackingCode('');
      setModalSparkAdsCode('');
    }
    setIsLinkModalOpen(true);
  };

  const handleToggleSecurityPolicy = async (key: keyof ZaloBotSecurityPolicy) => {
    const nextPolicy: ZaloBotSecurityPolicy = {
      ...securityPolicy,
      [key]: !securityPolicy[key],
    };
    setSecurityPolicy(nextPolicy);
    try {
      const res = await fetch('/api/integrations/zalo-bot/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_SECURITY_POLICY',
          ...nextPolicy,
        }),
      });
      if (res.ok) {
        onNotify?.('Đã cập nhật chính sách bảo mật nhóm Zalo.', 'success');
      }
    } catch {
      onNotify?.('Lỗi lưu chính sách bảo mật.', 'error');
    }
  };

  const handleSaveMapping = async () => {
    if (!modalGroupId.trim()) {
      onNotify?.('Vui lòng nhập Mã nhóm (Chat/Group ID).', 'error');
      return;
    }
    try {
      const res = await fetch('/api/integrations/zalo-bot/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'LINK',
          groupId: modalGroupId.trim(),
          groupName: modalGroupName.trim(),
          groupRole: modalGroupRole,
          accessStatus: modalAccessStatus,
          allowedBrands: modalAllowedBrands,
          dealCode: modalDealCode.trim(),
          kocHandle: modalKocHandle.trim(),
          kocName: modalKocName.trim(),
          brandName: modalBrandName.trim(),
          storeName: modalStoreName.trim(),
          picName: modalPicName.trim(),
          productName: modalProductName.trim(),
          briefSummary: modalBriefSummary.trim(),
          requiredHashtags: modalHashtags,
          deadlineDate: modalDeadlineDate.trim(),
          dealStatus: modalDealStatus,
          trackingCode: modalTrackingCode.trim(),
          sparkAdsCode: modalSparkAdsCode.trim(),
        }),
      });
      if (res.ok) {
        onNotify?.('Đã lưu cấu hình nhóm Zalo thành công.', 'success');
        setIsLinkModalOpen(false);
        void fetchBotStatus();
      } else {
        onNotify?.('Lưu liên kết thất bại.', 'error');
      }
    } catch {
      onNotify?.('Lỗi kết nối máy chủ.', 'error');
    }
  };

  const handleGroupQuickAction = async (
    groupId: string,
    action: 'SEND_BRIEF' | 'SEND_SLA_REMINDER' | 'SEND_BBNT_SUMMARY'
  ) => {
    try {
      const res = await fetch('/api/integrations/zalo-bot/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, groupId }),
      });
      const data = await res.json();
      if (res.ok) {
        onNotify?.(data.message || 'Đã thực thi tác vụ thành công.', 'success');
        if (data.previewText) {
          setPreviewModalData({
            title:
              action === 'SEND_BRIEF'
                ? 'Nội dung Brief đã phát đi'
                : action === 'SEND_BBNT_SUMMARY'
                  ? 'Phiếu đối soát BBNT & Bóc tách Thuế/Thanh toán'
                  : 'Nội dung Nhắc hạn SLA đã phát đi',
            content: data.previewText,
          });
        }
      } else {
        onNotify?.(data.error || 'Không thể thực thi tác vụ.', 'error');
      }
    } catch {
      onNotify?.('Lỗi kết nối máy chủ.', 'error');
    }
  };

  const handleBulkSlaReminder = async () => {
    try {
      const res = await fetch('/api/integrations/zalo-bot/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'BULK_SLA_REMINDER',
          brandName: brandFilter !== 'ALL' ? brandFilter : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onNotify?.(data.message || 'Đã phát thông báo nhắc hạn SLA tự động.', 'success');
        if (data.previewText) {
          setPreviewModalData({
            title: 'Báo cáo Rà soát & Nhắc hạn SLA Tự động Hàng loạt',
            content: data.previewText,
          });
        }
      } else {
        onNotify?.(data.error || 'Không thể chạy nhắc hạn SLA hàng loạt.', 'error');
      }
    } catch {
      onNotify?.('Lỗi kết nối máy chủ.', 'error');
    }
  };

  const handleSubmitDealReview = async () => {
    if (!reviewModalTarget) return;
    try {
      const res = await fetch('/api/integrations/zalo-bot/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_DEAL_STATUS',
          groupId: reviewModalTarget.groupId,
          dealStatus: reviewNextStatus,
          reviewNote: reviewNote.trim(),
        }),
      });
      if (res.ok) {
        onNotify?.('Đã cập nhật trạng thái Deal và gửi thông báo tới nhóm.', 'success');
        setReviewModalTarget(null);
        setReviewNote('');
        void fetchBotStatus();
      } else {
        onNotify?.('Cập nhật trạng thái thất bại.', 'error');
      }
    } catch {
      onNotify?.('Lỗi kết nối máy chủ.', 'error');
    }
  };

  const handleConfirmUnlink = async () => {
    if (!unlinkTargetGroupId) return;
    try {
      const res = await fetch('/api/integrations/zalo-bot/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UNLINK',
          groupId: unlinkTargetGroupId,
        }),
      });
      if (res.ok) {
        onNotify?.('Đã hủy liên kết nhóm.', 'info');
        setUnlinkTargetGroupId(null);
        void fetchBotStatus();
      }
    } catch {
      onNotify?.('Lỗi khi hủy liên kết.', 'error');
    }
  };

  const handleRunAirCheck = async () => {
    if (!testVideoUrl.trim()) {
      onNotify?.('Vui lòng nhập đường link video TikTok.', 'error');
      return;
    }
    setIsCheckingAir(true);
    setAirCheckResult(null);
    setAirCheckScreenshot(null);
    try {
      // Thực thi qua bộ xử lý lệnh của Bot để vừa quét link vừa lưu vào lịch sử nghiệm thu
      const res = await fetch('/api/integrations/zalo-bot/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SIMULATE_COMMAND',
          command: testVideoUrl.trim(),
          chatId: airCheckTargetChatId || 'zalo_grp_clubclio_potrann',
          groupRole: 'KOC_GROUP',
          sendToZalo: Boolean(airCheckTargetChatId),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAirCheckResult(data.reply);
        if (data.holdingScreenshotUrl) {
          setAirCheckScreenshot({
            url: data.holdingScreenshotUrl,
            sec: data.holdingMomentSec,
            timeLabel: data.holdingMomentTimeLabel,
            quote: data.holdingMomentQuote,
          });
        }
        onNotify?.('Đã hoàn tất quét nghiệm thu video TikTok.', 'success');
        void fetchBotStatus();
      } else {
        onNotify?.(data?.error || 'Không thể quét dữ liệu video.', 'error');
      }
    } catch {
      onNotify?.('Lỗi kết nối máy chủ quét video.', 'error');
    } finally {
      setIsCheckingAir(false);
    }
  };

  const handleSimulateCommand = async (customCmd?: string, customRole?: ZaloGroupRole) => {
    const cmdToRun = (customCmd ?? simCommand).trim();
    const roleToUse = customRole ?? simGroupRole;
    if (!cmdToRun) {
      onNotify?.('Vui lòng nhập câu lệnh Bot.', 'error');
      return;
    }
    setIsSimulating(true);
    try {
      const res = await fetch('/api/integrations/zalo-bot/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SIMULATE_COMMAND',
          command: cmdToRun,
          chatId: simChatId || 'zalo_grp_b2c_internal_ops',
          groupRole: roleToUse,
          sendToZalo: simSendToZalo,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSimOutput(data.reply || 'Đã xử lý lệnh.');
        void fetchBotStatus();
      } else {
        onNotify?.(data?.error || 'Lỗi thực thi lệnh.', 'error');
      }
    } catch {
      onNotify?.('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!broadcastChatId.trim() || !broadcastText.trim()) {
      onNotify?.('Vui lòng chọn nhóm và nhập nội dung tin nhắn.', 'error');
      return;
    }
    setIsSendingMessage(true);
    try {
      const res = await fetch('/api/integrations/zalo-bot/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: broadcastChatId.trim(),
          text: broadcastText.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onNotify?.('Đã gửi tin nhắn vào nhóm Zalo thành công.', 'success');
        setBroadcastText('');
      } else {
        onNotify?.(data?.error || 'Gửi tin nhắn thất bại.', 'error');
      }
    } catch {
      onNotify?.('Lỗi kết nối gửi tin nhắn.', 'error');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSaveUserPermission = async () => {
    if (!permUserId.trim() || !permStaffName.trim()) {
      onNotify?.('Vui lòng nhập Mã người dùng Zalo và Họ tên nhân sự.', 'error');
      return;
    }
    try {
      const res = await fetch('/api/integrations/zalo-bot/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_USER_PERMISSION',
          zaloUserId: permUserId.trim(),
          displayName: permDisplayName.trim() || permStaffName.trim(),
          staffName: permStaffName.trim(),
          staffEmail: permStaffEmail.trim(),
          role: permRole,
          assignedBrands: permBrands,
        }),
      });
      if (res.ok) {
        onNotify?.('Đã lưu phân quyền nhân sự Zalo.', 'success');
        setIsPermModalOpen(false);
        setPermUserId('');
        setPermDisplayName('');
        setPermStaffName('');
        setPermStaffEmail('');
        setPermBrands('');
        void fetchBotStatus();
      } else {
        onNotify?.('Không thể lưu phân quyền.', 'error');
      }
    } catch {
      onNotify?.('Lỗi kết nối máy chủ.', 'error');
    }
  };

  const handleRemoveUserPermission = async (zaloUserId: string) => {
    try {
      const res = await fetch('/api/integrations/zalo-bot/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REMOVE_USER_PERMISSION',
          zaloUserId,
        }),
      });
      if (res.ok) {
        onNotify?.('Đã xóa phân quyền nhân sự.', 'info');
        void fetchBotStatus();
      }
    } catch {
      onNotify?.('Lỗi khi xóa phân quyền.', 'error');
    }
  };

  const handleQuickApproveGroup = async (
    groupId: string,
    accessStatus: ZaloGroupAccessStatus = 'APPROVED',
    groupRole?: ZaloGroupRole
  ) => {
    try {
      const res = await fetch('/api/integrations/zalo-bot/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'QUICK_APPROVE_GROUP',
          groupId,
          accessStatus,
          groupRole,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onNotify?.(data.message || 'Đã phê duyệt nhanh nhóm Zalo.', 'success');
        void fetchBotStatus();
      } else {
        onNotify?.(data.error || 'Không thể phê duyệt nhóm.', 'error');
      }
    } catch {
      onNotify?.('Lỗi kết nối máy chủ.', 'error');
    }
  };

  const handleBulkApproveDiscovered = async () => {
    try {
      const res = await fetch('/api/integrations/zalo-bot/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'BULK_APPROVE_DISCOVERED' }),
      });
      const data = await res.json();
      if (res.ok) {
        onNotify?.(data.message || 'Đã phê duyệt toàn bộ nhóm mới.', 'success');
        void fetchBotStatus();
      }
    } catch {
      onNotify?.('Lỗi kết nối máy chủ.', 'error');
    }
  };

  const handleSelectInternalStaffForPerm = (staffId: string) => {
    const member = INITIAL_INTERNAL_STAFF_RBAC.find((s) => s.id === staffId);
    if (!member) return;
    setPermStaffName(member.name);
    setPermStaffEmail(member.email);
    if (!permDisplayName) setPermDisplayName(member.name);

    let mappedRole: ZaloStaffRole = 'PIC';
    if (member.name.includes('Đỗ Văn Giang') || member.position === 'CEO') {
      mappedRole = 'CEO';
    } else if (member.role === 'MANAGER' || member.name.includes('Đặng Thị Yến Nhi')) {
      mappedRole = 'LEAD_B2C';
    } else if (member.role === 'LEADER' || member.name.includes('Nguyễn Thị Ngọc Tâm')) {
      mappedRole = 'LEADER';
    }
    setPermRole(mappedRole);

    // Liên thông tự động danh sách Thương hiệu phụ trách từ 69 gian hàng B2C + hồ sơ nhân sự
    if (mappedRole === 'CEO' || mappedRole === 'LEAD_B2C' || member.picBrands?.includes('ALL_BRANDS')) {
      setPermBrands('Toàn bộ 69 gian hàng B2C');
    } else {
      const storeBrands = REAL_B2C_69_STORES.filter(
        (st) =>
          st.primaryPic === member.name ||
          st.b2cOwnerName === member.name ||
          st.bookingLeader === member.name
      ).map((st) => st.brandName);
      const mergedBrands = Array.from(
        new Set([...(member.picBrands || []), ...storeBrands].filter((b) => b && b !== 'ALL_BRANDS'))
      );
      setPermBrands(mergedBrands.length > 0 ? mergedBrands.join(', ') : 'ClubClio, EUPC');
    }
  };

  const handleSelectStoreForGroup = (storeName: string) => {
    const store = REAL_B2C_69_STORES.find((s) => s.storeName === storeName);
    if (!store) return;
    setModalStoreName(store.storeName);
    setModalBrandName(store.brandName);
    setModalAllowedBrands(store.brandName);
    if (store.primaryPic || store.b2cOwnerName) {
      setModalPicName(store.primaryPic || store.b2cOwnerName);
    }
    const cleanBrandTag = store.brandName.replace(/\s+/g, '');
    setModalHashtags(`${cleanBrandTag}, UpbaseB2C, BeautyReview`);
  };

  const selectedReplyTemplate = useMemo(
    () =>
      replyConfig.autoReplyTemplates.find((t) => t.key === selectedReplyKey) ||
      replyConfig.autoReplyTemplates[0] ||
      DEFAULT_CLIENT_REPLY_CONFIG.autoReplyTemplates[0],
    [replyConfig.autoReplyTemplates, selectedReplyKey]
  );

  const liveTemplatePreview = useMemo(() => {
    const sampleVars: Record<string, string> = {
      verdictIcon: '✅ ĐẠT (PASS)',
      kocHandle: 'po.trann77',
      airedAt: '28/10/2026 20:15 (Giờ VN)',
      statusText: 'Đang công khai (Live/Air)',
      cartText: 'Đã gắn giỏ hàng (Phấn nước Clio Kill Cover Mesh Glow Cushion [Mã SP: 1730981234567890123])',
      productLinks: '• Link sản phẩm: https://shop.tiktok.com/view/product/1730981234567890123?region=VN&locale=vi-VN',
      mentionLine: '• Thời gian KOC nhắc SP: Lần đầu ở giây 2.4s (00:02 - 00:05) — Từ khóa "phấn nước clio"',
      holdingLine: '• Khoảnh khắc KOC cầm SP (cắt ảnh): Giây 3.8s (00:03 - 00:06) — "Em cushion Clio bản hồng này che phủ cực đỉnh"',
      views: '128.450',
      likes: '6.820',
      hashtags: '#ClubClio #ClioCushion #UpbaseB2C',
      dealSyncNote: '✅ Đã đồng bộ kết quả vào Deal [BO261067161] (ClubClio) — Trạng thái: ĐÃ_NGHIỆM_THU_AIR',
      holdingSec: '3.8',
      holdingTimeLabel: '00:03 - 00:06',
      mentionSec: '2.4',
      productTitle: 'Phấn nước Clio Kill Cover Mesh Glow Cushion SPF50+',
      holdingQuote: 'Em cushion Clio bản hồng này che phủ cực đỉnh',
      dealCode: 'BO261067161',
      brandName: 'ClubClio',
      storeName: 'ClubClio_TikTok_Flagship',
      kocName: 'Phương Thảo (@po.trann77)',
      productName: 'Phấn nước Clio Kill Cover Mesh Glow Cushion',
      pillarName: 'Review trực tiếp trải nghiệm thực tế',
      briefSummary: 'Quay cận cảnh chất phấn trong 3 giây đầu, test độ che phủ và gắn giỏ hàng góc trái.',
      deadlineDate: '31/10/2026',
      picName: 'Hà Thị Thủy',
      senderName: 'Phương Thảo',
      draftUrl: 'https://drive.google.com/file/d/1ClioDemoVideo/view',
      reviewNote: 'Hình ảnh sáng đẹp, âm thanh rõ, KOC đăng bài đúng khung giờ 20h nhé.',
      feedback: 'Cần bổ sung cảnh quay cận vỏ hộp ở giây thứ 2 và thêm hashtag #ClubClio.',
      leaderName: 'Nguyễn Thị Ngọc Tâm (Leader 8 gian hàng trọng điểm)',
      storeSummary: '🏪 ClubClio_TikTok_Flagship: Chỉ tiêu 25 Paid / 40 FOC | Đã Air: 19 video | Ngân sách Net: 68.000.000 ₫ / 95.000.000 ₫',
      airedSummary: '• Video đã lên sóng (Air): 19 video (71.5% ngân sách)\n  1. @po.trann77 (28/10/2026 20:15) — View: 128.450',
      pendingDraftSummary: '• Video Demo đang chờ Brand duyệt: 2 bản nháp (Gõ /nhapchoduyet để xem link)',
    };
    const raw = selectedReplyTemplate?.content || '';
    return raw.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, token) => sampleVars[token] ?? `{${token}}`);
  }, [selectedReplyTemplate]);

  const handleUpdateSelectedAutoReplyContent = (nextContent: string) => {
    setReplyConfig((prev) => ({
      ...prev,
      autoReplyTemplates: prev.autoReplyTemplates.map((t) =>
        t.key === selectedReplyKey ? { ...t, content: nextContent } : t
      ),
    }));
  };

  const handleInsertPlaceholder = (placeholder: string) => {
    const current = selectedReplyTemplate?.content || '';
    handleUpdateSelectedAutoReplyContent(`${current}${current.endsWith('\n') || !current ? '' : ' '}${placeholder}`);
  };

  const handleSaveReplyConfig = async (customNext?: ZaloBotReplyConfigState) => {
    const payload = customNext || replyConfig;
    setIsSavingReplyConfig(true);
    try {
      const res = await fetch('/api/integrations/zalo-bot/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_REPLY_CONFIG',
          ...payload,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.replyConfig) setReplyConfig(data.replyConfig);
        onNotify?.('Đã lưu kịch bản & mẫu tin nhắn trả lời của Bot.', 'success');
      } else {
        onNotify?.(data?.error || 'Không thể lưu kịch bản tin nhắn.', 'error');
      }
    } catch {
      onNotify?.('Lỗi kết nối máy chủ khi lưu kịch bản.', 'error');
    } finally {
      setIsSavingReplyConfig(false);
    }
  };

  const handleResetReplyConfig = async () => {
    setIsSavingReplyConfig(true);
    try {
      const res = await fetch('/api/integrations/zalo-bot/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET_REPLY_CONFIG' }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.replyConfig) setReplyConfig(data.replyConfig);
        onNotify?.('Đã khôi phục toàn bộ mẫu tin nhắn trả lời của Bot về mặc định.', 'info');
      }
    } catch {
      onNotify?.('Lỗi khôi phục mặc định.', 'error');
    } finally {
      setIsSavingReplyConfig(false);
    }
  };

  const handleAddBroadcastTemplate = async () => {
    if (!newBroadcastLabel.trim() || !newBroadcastContent.trim()) {
      onNotify?.('Vui lòng nhập Tên mẫu thông báo và Nội dung tin nhắn.', 'error');
      return;
    }
    const newItem: ZaloBroadcastTemplateItem = {
      id: `tpl_${Date.now()}`,
      label: newBroadcastLabel.trim(),
      targetRole: newBroadcastRole,
      content: newBroadcastContent.trim(),
    };
    const nextCfg: ZaloBotReplyConfigState = {
      ...replyConfig,
      broadcastTemplates: [newItem, ...(replyConfig.broadcastTemplates || [])],
    };
    setReplyConfig(nextCfg);
    setNewBroadcastLabel('');
    setNewBroadcastContent('');
    await handleSaveReplyConfig(nextCfg);
  };

  const handleDeleteBroadcastTemplate = async (id: string) => {
    const nextCfg: ZaloBotReplyConfigState = {
      ...replyConfig,
      broadcastTemplates: (replyConfig.broadcastTemplates || []).filter((t) => t.id !== id),
    };
    setReplyConfig(nextCfg);
    await handleSaveReplyConfig(nextCfg);
  };

  const pendingOrDiscoveredCount = useMemo(
    () =>
      mappings.filter(
        (m) => m.accessStatus === 'PENDING_APPROVAL' || Boolean(m.isAutoDiscovered)
      ).length,
    [mappings]
  );

  const uniquePics = useMemo(() => {
    const set = new Set<string>();
    for (const m of mappings) {
      if (m.picName) set.add(m.picName);
    }
    return Array.from(set).sort();
  }, [mappings]);

  const uniqueBrands = useMemo(() => {
    const set = new Set<string>();
    for (const m of mappings) {
      if (m.brandName) set.add(m.brandName);
    }
    return Array.from(set).sort();
  }, [mappings]);

  const filteredMappings = useMemo(() => {
    return mappings.filter((m) => {
      if (roleFilter === 'DISCOVERED') {
        if (!m.isAutoDiscovered && !m.lastMessageText) return false;
      } else if (roleFilter !== 'ALL' && m.groupRole !== roleFilter) {
        return false;
      }
      if (picFilter !== 'ALL' && m.picName !== picFilter) return false;
      if (brandFilter !== 'ALL' && m.brandName !== brandFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.groupId.toLowerCase().includes(q) ||
        (m.groupName && m.groupName.toLowerCase().includes(q)) ||
        (m.dealCode && m.dealCode.toLowerCase().includes(q)) ||
        (m.kocName && m.kocName.toLowerCase().includes(q)) ||
        (m.kocHandle && m.kocHandle.toLowerCase().includes(q)) ||
        (m.brandName && m.brandName.toLowerCase().includes(q)) ||
        (m.picName && m.picName.toLowerCase().includes(q)) ||
        (m.lastSenderName && m.lastSenderName.toLowerCase().includes(q))
      );
    });
  }, [mappings, roleFilter, picFilter, brandFilter, searchQuery]);

  const groupColumns: Column<ZaloGroupMappingItem>[] = [
    {
      key: 'groupInfo',
      header: 'Nhóm chat Zalo & Chat ID',
      render: (row) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-ink">
              {row.groupName || row.groupId}
            </span>
            {row.isAutoDiscovered && (
              <Status tone="warning">Mới phát hiện</Status>
            )}
          </div>
          <div className="font-mono text-2xs text-ink-2 select-all">
            Chat ID: {row.groupId}
          </div>
          {row.lastMessageText && (
            <div className="text-2xs text-ink-3 truncate max-w-xs">
              Tin cuối ({row.lastSenderName || 'Zalo'}): &ldquo;{row.lastMessageText}&rdquo;
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'groupRole',
      header: 'Phân quyền & Bảo mật Nhóm',
      render: (row) => {
        const tone =
          row.groupRole === 'BOD_EXECUTIVE'
            ? 'positive'
            : row.groupRole === 'INTERNAL_OPS' || row.groupRole === 'BRAND_PARTNER'
              ? 'warning'
              : 'neutral';
        const access = row.accessStatus || 'APPROVED';
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1 flex-wrap">
              <Status tone={tone}>
                {GROUP_ROLE_LABEL[row.groupRole || 'KOC_GROUP']}
              </Status>
              <Status
                tone={
                  access === 'APPROVED'
                    ? 'positive'
                    : access === 'PENDING_APPROVAL'
                      ? 'warning'
                      : 'critical'
                }
              >
                {access === 'APPROVED'
                  ? 'Đã duyệt'
                  : access === 'PENDING_APPROVAL'
                    ? 'Chờ duyệt'
                    : 'Đã khóa'}
              </Status>
            </div>
            {row.allowedBrands && row.allowedBrands.length > 0 && (
              <div className="text-2xs text-ink-3">
                Phạm vi Brand: {row.allowedBrands.join(', ')}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'campaign',
      header: 'Chiến dịch & KOC',
      render: (row) => (
        <div className="space-y-0.5 text-xs">
          <div className="flex items-center gap-1.5">
            {row.dealCode && (
              <span className="px-1.5 py-0.5 rounded bg-sunken font-mono text-2xs font-medium text-ink">
                {row.dealCode}
              </span>
            )}
            <span className="font-medium text-ink">{row.brandName || '—'}</span>
          </div>
          <div className="text-ink-2">
            {row.kocName || '—'}{' '}
            {row.kocHandle ? (
              <span className="font-mono text-ink-3">(@{row.kocHandle})</span>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      key: 'pic',
      header: 'PIC & Cấp duyệt',
      render: (row) => (
        <div className="space-y-0.5 text-xs">
          <Person name={row.picName || 'Chưa phân công'} sub={row.leaderName || 'Trình Lead B2C'} size={24} />
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Tiến độ & Hạn SLA',
      render: (row) => {
        const meta = DEAL_STATUS_META[row.dealStatus || 'ĐANG_QUAY_NHÁP'];
        return (
          <div className="space-y-1">
            <Status tone={meta.tone}>{meta.label}</Status>
            <div className="text-2xs text-ink-3">
              Hạn SLA: {row.deadlineDate || '—'}
            </div>
            {(row.trackingCode || row.sparkAdsCode) && (
              <div className="flex items-center gap-1 flex-wrap text-2xs font-mono text-ink-2">
                {row.trackingCode && (
                  <span className="px-1 py-0.5 rounded bg-sunken border border-line">
                    MVĐ: {row.trackingCode}
                  </span>
                )}
                {row.sparkAdsCode && (
                  <span className="px-1 py-0.5 rounded bg-sunken border border-line">
                    Ads: {row.sparkAdsCode.slice(0, 12)}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Thao tác vận hành',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1 flex-wrap">
          {(row.accessStatus === 'PENDING_APPROVAL' || row.isAutoDiscovered) && (
            <Button
              size="sm"
              variant="secondary"
              icon={Check}
              onClick={() => handleQuickApproveGroup(row.groupId, 'APPROVED', row.groupRole)}
            >
              Duyệt nhóm
            </Button>
          )}
          {row.groupRole === 'KOC_GROUP' && (
            <>
              <Button
                size="sm"
                variant="secondary"
                icon={FileText}
                onClick={() => handleGroupQuickAction(row.groupId, 'SEND_BRIEF')}
              >
                Gửi Brief
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={CheckCircle2}
                onClick={() => {
                  setReviewModalTarget(row);
                  setReviewNextStatus('ĐÃ_DUYỆT_NHÁP');
                  setReviewNote(row.draftReviewNote || '');
                }}
              >
                Duyệt bài
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={ShieldCheck}
                onClick={() => handleGroupQuickAction(row.groupId, 'SEND_BBNT_SUMMARY')}
              >
                Phiếu BBNT
              </Button>
              <Button
                size="sm"
                variant="ghost"
                icon={Clock}
                onClick={() => handleGroupQuickAction(row.groupId, 'SEND_SLA_REMINDER')}
              >
                Nhắc hạn
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            icon={Edit3}
            onClick={() => openEditGroupModal(row)}
          >
            Sửa
          </Button>
          <Button
            size="sm"
            variant="danger"
            icon={Trash2}
            onClick={() => setUnlinkTargetGroupId(row.groupId)}
          >
            Hủy
          </Button>
        </div>
      ),
    },
  ];

  const discoveredSenderColumns: Column<ZaloDiscoveredSenderItem>[] = [
    {
      key: 'sender',
      header: 'Tài khoản Zalo tương tác',
      render: (row) => (
        <Person
          name={row.displayName || row.senderId}
          sub={`${row.messageCount} tin nhắn • ${new Date(row.lastSeenAt).toLocaleTimeString('vi-VN')}`}
          size={26}
        />
      ),
    },
    {
      key: 'senderId',
      header: 'Mã người gửi (Sender ID)',
      render: (row) => (
        <span className="font-mono text-xs text-ink select-all">{row.senderId}</span>
      ),
    },
    {
      key: 'lastChatId',
      header: 'Nhóm Chat ID gần nhất',
      render: (row) => (
        <div className="text-xs">
          <div className="font-mono text-ink select-all">{row.lastChatId}</div>
          {row.lastGroupName && <div className="text-2xs text-ink-3">{row.lastGroupName}</div>}
        </div>
      ),
    },
    {
      key: 'lastMessageText',
      header: 'Nội dung tin nhắn cuối',
      render: (row) => (
        <span className="text-xs text-ink-2 truncate max-w-xs block">
          &ldquo;{row.lastMessageText}&rdquo;
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Phân quyền nhanh',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setPermUserId(row.senderId);
              setPermDisplayName(row.displayName);
              setPermStaffName(row.displayName);
              setIsPermModalOpen(true);
            }}
          >
            Cấp quyền Nhân sự
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const existingGrp = mappings.find((m) => m.groupId === row.lastChatId);
              if (existingGrp) {
                openEditGroupModal(existingGrp);
              } else {
                setModalGroupId(row.lastChatId);
                setModalGroupName(`Nhóm của ${row.displayName}`);
                setModalGroupRole('KOC_GROUP');
                setIsLinkModalOpen(true);
              }
            }}
          >
            Phân quyền Nhóm
          </Button>
        </div>
      ),
    },
  ];

  const airHistoryColumns: Column<ZaloAirCheckHistoryItem>[] = [
    {
      key: 'checkedAt',
      header: 'Giờ quét & Ngày giờ Air',
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="font-mono font-medium text-ink">
            Air: {row.airedAtVn || (row.publishedAt ? row.publishedAt.slice(0, 10) : '—')}
          </div>
          <div className="font-mono text-2xs text-ink-3">
            Quét: {new Date(row.checkedAt).toLocaleString('vi-VN')}
          </div>
        </div>
      ),
    },
    {
      key: 'koc',
      header: 'KOC & Chiến dịch',
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="font-medium text-ink">@{row.kocHandle}</div>
          <div className="text-ink-3">
            {row.brandName || 'B2C'} {row.dealCode ? `(${row.dealCode})` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'verdict',
      header: 'Kết quả nghiệm thu',
      render: (row) => (
        <Status
          tone={
            row.verdict === 'PASS'
              ? 'positive'
              : row.verdict === 'REVIEW'
                ? 'warning'
                : 'critical'
          }
        >
          {row.verdict === 'PASS'
            ? 'ĐẠT (PASS)'
            : row.verdict === 'REVIEW'
              ? 'CẦN RÀ SOÁT'
              : 'KHÔNG ĐẠT'}
        </Status>
      ),
    },
    {
      key: 'cart',
      header: 'Giỏ hàng & Link sản phẩm',
      render: (row) => {
        const primaryUrl = row.productUrl || row.cartProducts?.[0]?.productUrl;
        const primaryTitle = row.productTitle || row.cartProducts?.[0]?.title;
        const primaryId = row.productId || row.cartProducts?.[0]?.productId;
        return (
          <div className="text-xs space-y-0.5 max-w-xs">
            <div className={row.hasProductLink ? 'text-positive font-medium' : 'text-critical'}>
              {row.hasProductLink
                ? primaryTitle
                  ? `Đã gắn: ${primaryTitle}`
                  : 'Đã gắn giỏ hàng'
                : 'Thiếu giỏ hàng'}
            </div>
            {primaryUrl && (
              <a
                href={primaryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-2xs text-accent hover:underline font-mono truncate max-w-full"
              >
                Link SP {primaryId ? `(${primaryId})` : ''} <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            )}
            {row.firstProductAppearanceSec !== null &&
              row.firstProductAppearanceSec !== undefined && (
                <div className="text-2xs text-ink-2 font-mono">
                  Nhắc SP: Giây {row.firstProductAppearanceSec}s
                  {row.firstProductMentionTimeLabel ? ` (${row.firstProductMentionTimeLabel})` : ''}
                  {row.firstProductMentionTerm ? ` • "${row.firstProductMentionTerm}"` : ''}
                  {row.productMentionMoments && row.productMentionMoments.length > 1
                    ? ` (${row.productMentionMoments.length} lần)`
                    : ''}
                </div>
              )}
            <div className="text-2xs font-mono text-ink-3 truncate">
              {row.hashtags?.length
                ? row.hashtags.map((h) => `#${h.replace(/^#+/, '')}`).join(' ')
                : 'Không có hashtag'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'holdingFrame',
      header: 'Ảnh KOC cầm SP',
      render: (row) =>
        row.holdingScreenshotUrl ? (
          <a
            href={row.holdingScreenshotUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={row.holdingScreenshotUrl}
              alt={`Khung hình KOC @${row.kocHandle}`}
              className="w-12 h-16 object-cover rounded border border-line bg-sunken shrink-0"
            />
            <div className="text-2xs space-y-0.5 max-w-[140px]">
              <div className="font-mono font-medium text-ink group-hover:text-accent">
                {row.holdingMomentSec !== undefined ? `Giây ${row.holdingMomentSec}s` : 'Ảnh cắt clip'}
              </div>
              {row.holdingMomentTimeLabel && (
                <div className="font-mono text-ink-3">{row.holdingMomentTimeLabel}</div>
              )}
              {row.holdingMomentQuote && (
                <div className="text-ink-2 line-clamp-2" title={row.holdingMomentQuote}>
                  &ldquo;{row.holdingMomentQuote}&rdquo;
                </div>
              )}
            </div>
          </a>
        ) : (
          <span className="text-xs text-ink-3">—</span>
        ),
    },
    {
      key: 'metrics',
      header: 'Chỉ số (View / Tim)',
      render: (row) => (
        <span className="text-xs font-mono text-ink">
          {row.views !== null ? row.views.toLocaleString('vi-VN') : '—'} views /{' '}
          {row.likes !== null ? row.likes.toLocaleString('vi-VN') : '—'} tim
        </span>
      ),
    },
    {
      key: 'videoUrl',
      header: 'Link Video',
      align: 'right',
      render: (row) => (
        <a
          href={row.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
        >
          Mở video <ExternalLink className="w-3 h-3" />
        </a>
      ),
    },
  ];

  const permissionColumns: Column<ZaloUserPermissionItem>[] = [
    {
      key: 'staff',
      header: 'Nhân sự Upbase',
      render: (row) => (
        <Person name={row.staffName} sub={row.staffEmail || row.zaloUserId} size={28} />
      ),
    },
    {
      key: 'zaloId',
      header: 'Định danh Zalo',
      render: (row) => (
        <div className="text-xs">
          <div className="font-medium text-ink">{row.displayName}</div>
          <div className="font-mono text-2xs text-ink-3">{row.zaloUserId}</div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Cấp thẩm quyền Bot',
      render: (row) => {
        const tone =
          row.role === 'CEO' || row.role === 'LEAD_B2C'
            ? 'positive'
            : row.role === 'LEADER'
              ? 'warning'
              : 'neutral';
        return <Status tone={tone}>{row.roleLabel}</Status>;
      },
    },
    {
      key: 'brands',
      header: 'Phạm vi Gian hàng / Brand',
      render: (row) => (
        <span className="text-xs text-ink-2">
          {(row.assignedBrands || []).join(', ')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (row) => (
        <Button
          size="sm"
          variant="danger"
          icon={Trash2}
          onClick={() => handleRemoveUserPermission(row.zaloUserId)}
        >
          Xóa
        </Button>
      ),
    },
  ];

  const logColumns: Column<WebhookDebugEvent>[] = [
    {
      key: 'time',
      header: 'Thời gian',
      render: (row) => (
        <span className="text-xs text-ink-3 font-mono">
          {new Date(row.time).toLocaleTimeString('vi-VN')}
        </span>
      ),
    },
    {
      key: 'event',
      header: 'Loại sự kiện',
      render: (row) => (
        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-sunken text-ink">
          {row.body?.event_name || 'message.text.received'}
        </span>
      ),
    },
    {
      key: 'chatId',
      header: 'Chat ID',
      render: (row) => (
        <span className="text-xs font-mono text-ink-2">
          {row.extractedChatId || row.body?.result?.message?.chat?.id || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái xử lý',
      render: (row) =>
        row.replySent ? (
          <Status tone="positive">Đã phản hồi</Status>
        ) : row.error ? (
          <Status tone="critical">{row.error}</Status>
        ) : (
          <Status tone="warning">Đã tiếp nhận</Status>
        ),
    },
    {
      key: 'content',
      header: 'Tin nhắn gửi tới Bot',
      render: (row) => (
        <span className="text-xs text-ink truncate max-w-xs block" title={JSON.stringify(row.body)}>
          {row.body?.result?.message?.text || row.body?.message?.text || JSON.stringify(row.body)}
        </span>
      ),
    },
    {
      key: 'replyText',
      header: 'Tin nhắn Bot đã trả lời',
      render: (row) =>
        row.replyText ? (
          <div className="flex items-center justify-between gap-2 max-w-md">
            <span className="text-xs text-ink-2 truncate font-mono">
              {row.replyText.split('\n')[0]}
            </span>
            <Button
              size="sm"
              variant="secondary"
              icon={MessageSquare}
              onClick={() =>
                setPreviewModalData({
                  title: `Chi tiết phản hồi của Bot (${new Date(row.time).toLocaleTimeString('vi-VN')})`,
                  content: row.replyText || '',
                  photoUrl: row.replyPhotoUrl,
                })
              }
            >
              Xem tin trả lời
            </Button>
          </div>
        ) : (
          <span className="text-xs text-ink-3">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Tối đa 4 chỉ số đầu trang */}
      <StatRow>
        <Stat label="Trạng thái Webhook" value="Hoạt động" tone="positive" />
        <Stat label="Tên Zalo Bot" value={botInfo.display_name || 'Bot tttttttupbase'} />
        <Stat label="Nhóm chat đang quản lý" value={mappings.length} />
        <Stat label="Mẫu tin nhắn trả lời" value={replyConfig.autoReplyTemplates.length} />
      </StatRow>

      {/* Thanh điều hướng phân hệ chuẩn Design System <Tabs> */}
      <Tabs
        value={activeTab}
        onChange={(k) => setActiveTab(k)}
        items={[
          { key: 'GROUPS', label: 'Nhóm chat & Tiến độ Deal', count: mappings.length },
          { key: 'AIR_CHECK', label: 'Nghiệm thu Video TikTok', count: airHistory.length },
          {
            key: 'REPLY_TEMPLATES',
            label: 'Kịch bản & Tin nhắn Bot',
            count: replyConfig.autoReplyTemplates.length,
          },
          { key: 'COMMAND_BROADCAST', label: 'Lệnh Bot & Gửi thông báo' },
          { key: 'RBAC_USERS', label: 'Phân quyền Nhân sự & Bảo mật', count: userPermissions.length },
          { key: 'WEBHOOK_LOGS', label: 'Cấu hình & Nhật ký', count: recentEvents.length },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" icon={RefreshCw} onClick={fetchBotStatus}>
              {isLoading ? 'Đang tải...' : 'Làm mới'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={copiedLink ? Check : Copy}
              onClick={handleCopyInviteLink}
            >
              {copiedLink ? 'Đã sao chép link' : 'Lấy link mời Bot'}
            </Button>
          </div>
        }
      />

      {/* TAB 1: QUẢN LÝ NHÓM CHAT & TIẾN ĐỘ DEAL */}
      {activeTab === 'GROUPS' && (
        <Panel
          title="Danh sách nhóm chat Zalo & Điều phối Deal KOC"
          actions={
            <div className="flex items-center gap-2">
              {pendingOrDiscoveredCount > 0 && (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Check}
                  onClick={handleBulkApproveDiscovered}
                >
                  Duyệt tất cả nhóm mới ({pendingOrDiscoveredCount})
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                icon={Clock}
                onClick={handleBulkSlaReminder}
              >
                Nhắc hạn SLA hàng loạt
              </Button>
              <Button
                size="sm"
                variant="primary"
                icon={Link2}
                onClick={() => openEditGroupModal()}
              >
                Thêm liên kết nhóm
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <FilterBar
              search={{
                value: searchQuery,
                onChange: setSearchQuery,
                placeholder: 'Tìm theo tên nhóm, Chat ID, mã BO, tên KOC, Brand hoặc PIC...',
              }}
              chips={
                <Chips
                  value={roleFilter}
                  onChange={(v) => setRoleFilter(v as 'ALL' | 'DISCOVERED' | ZaloGroupRole)}
                  items={[
                    { key: 'ALL', label: 'Tất cả nhóm', count: mappings.length },
                    {
                      key: 'DISCOVERED',
                      label: 'Có tin nhắn / Mới phát hiện',
                      count: mappings.filter((m) => m.isAutoDiscovered || Boolean(m.lastMessageText)).length,
                    },
                    {
                      key: 'KOC_GROUP',
                      label: 'Nhóm KOC 3 bên',
                      count: mappings.filter((m) => m.groupRole === 'KOC_GROUP').length,
                    },
                    {
                      key: 'BRAND_PARTNER',
                      label: 'Nhóm làm việc với Brand',
                      count: mappings.filter((m) => m.groupRole === 'BRAND_PARTNER').length,
                    },
                    {
                      key: 'INTERNAL_OPS',
                      label: 'Nhóm Vận hành nội bộ',
                      count: mappings.filter((m) => m.groupRole === 'INTERNAL_OPS').length,
                    },
                    {
                      key: 'BOD_EXECUTIVE',
                      label: 'Nhóm Điều hành BOD',
                      count: mappings.filter((m) => m.groupRole === 'BOD_EXECUTIVE').length,
                    },
                  ]}
                />
              }
              filters={
                <div className="flex items-center gap-2">
                  <Select
                    value={picFilter}
                    onChange={(e) => setPicFilter(e.target.value)}
                  >
                    <option value="ALL">Tất cả Nhân viên PIC ({uniquePics.length})</option>
                    {uniquePics.map((pic) => (
                      <option key={pic} value={pic}>
                        PIC: {pic}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={brandFilter}
                    onChange={(e) => setBrandFilter(e.target.value)}
                  >
                    <option value="ALL">Tất cả Thương hiệu ({uniqueBrands.length})</option>
                    {uniqueBrands.map((b) => (
                      <option key={b} value={b}>
                        Brand: {b}
                      </option>
                    ))}
                  </Select>
                </div>
              }
              resultCount={filteredMappings.length}
            />

            <DataTable
              columns={groupColumns}
              rows={filteredMappings}
              rowKey={(r) => r.groupId}
              empty={
                <EmptyState
                  title="Không có nhóm Zalo nào khớp bộ lọc"
                  action={
                    <Button variant="primary" icon={Link2} onClick={() => openEditGroupModal()}>
                      Thêm liên kết nhóm
                    </Button>
                  }
                />
              }
            />
          </div>
        </Panel>
      )}

      {/* TAB 2: NGHIỆM THU VIDEO TIKTOK */}
      {activeTab === 'AIR_CHECK' && (
        <div className="space-y-4">
          <Panel title="Quét kiểm tra nghiệm thu video TikTok trực tiếp">
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <Field label="Đường link video TikTok cần nghiệm thu">
                    <Input
                      placeholder="https://vt.tiktok.com/ZS... hoặc https://www.tiktok.com/@user/video/..."
                      value={testVideoUrl}
                      onChange={(e) => setTestVideoUrl(e.target.value)}
                    />
                  </Field>
                </div>
                <div>
                  <Field label="Đồng bộ kết quả vào nhóm Zalo (Tùy chọn)">
                    <Select
                      value={airCheckTargetChatId}
                      onChange={(e) => setAirCheckTargetChatId(e.target.value)}
                    >
                      <option value="">-- Chỉ quét trên Web (Không bắn tin) --</option>
                      {mappings.map((m) => (
                        <option key={m.groupId} value={m.groupId}>
                          {m.groupName || m.groupId} ({m.dealCode || '—'})
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="primary"
                  icon={Play}
                  onClick={handleRunAirCheck}
                  disabled={isCheckingAir}
                >
                  {isCheckingAir ? 'Đang quét dữ liệu video...' : 'Quét nghiệm thu ngay'}
                </Button>
              </div>

              {airCheckResult && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded border border-line bg-sunken">
                  <div className={airCheckScreenshot ? 'md:col-span-2' : 'md:col-span-3'}>
                    <pre className="text-xs font-mono text-ink whitespace-pre-wrap">
                      {airCheckResult}
                    </pre>
                  </div>
                  {airCheckScreenshot && (
                    <div className="flex flex-col items-start gap-2 border-t md:border-t-0 md:border-l border-line pt-3 md:pt-0 md:pl-3">
                      <div className="text-xs font-medium text-ink">
                        Ảnh chụp KOC cầm sản phẩm{' '}
                        {airCheckScreenshot.sec !== undefined ? `(Giây ${airCheckScreenshot.sec}s)` : ''}
                      </div>
                      <a
                        href={airCheckScreenshot.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={airCheckScreenshot.url}
                          alt="Ảnh chụp KOC cầm sản phẩm"
                          className="w-36 h-48 object-cover rounded border border-line bg-surface"
                        />
                      </a>
                      {airCheckScreenshot.quote && (
                        <div className="text-2xs text-ink-2">
                          Lời thoại ({airCheckScreenshot.timeLabel || '—'}): &ldquo;{airCheckScreenshot.quote}&rdquo;
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Panel>

          <Panel title="Lịch sử nghiệm thu video qua Zalo Bot">
            <DataTable
              columns={airHistoryColumns}
              rows={airHistory}
              rowKey={(r) => r.id}
              empty={
                <EmptyState title="Chưa có video nào được quét nghiệm thu trong phiên này" />
              }
            />
          </Panel>
        </div>
      )}

      {/* TAB 2B: KỊCH BẢN & QUẢN LÝ TIN NHẮN TRẢ LỜI CỦA BOT */}
      {activeTab === 'REPLY_TEMPLATES' && (
        <div className="space-y-4">
          <Panel
            title="Cấu hình hành vi phản hồi tự động khi quét nghiệm thu"
            actions={
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleResetReplyConfig}
                  disabled={isSavingReplyConfig}
                >
                  Khôi phục mặc định
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleSaveReplyConfig()}
                  disabled={isSavingReplyConfig}
                >
                  {isSavingReplyConfig ? 'Đang lưu...' : 'Lưu kịch bản trả lời'}
                </Button>
              </div>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded border border-line bg-sunken flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-medium text-ink flex items-center gap-2">
                    <span>Tự động chụp & gửi ảnh KOC cầm sản phẩm vào nhóm Zalo</span>
                    <Status tone={replyConfig.sendHoldingPhotoOnAirCheck ? 'positive' : 'neutral'}>
                      {replyConfig.sendHoldingPhotoOnAirCheck ? 'Đang bật' : 'Đang tắt'}
                    </Status>
                  </div>
                  <div className="text-ink-2">
                    Khi phát hiện link TikTok, Bot tự động cắt khung hình tại giây KOC giơ sản phẩm và gọi `sendPhoto` vào nhóm chat.
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const nextCfg = {
                      ...replyConfig,
                      sendHoldingPhotoOnAirCheck: !replyConfig.sendHoldingPhotoOnAirCheck,
                    };
                    setReplyConfig(nextCfg);
                    void handleSaveReplyConfig(nextCfg);
                  }}
                >
                  {replyConfig.sendHoldingPhotoOnAirCheck ? 'Tắt gửi ảnh' : 'Bật gửi ảnh'}
                </Button>
              </div>

              <div className="p-3 rounded border border-line bg-sunken flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-medium text-ink flex items-center gap-2">
                    <span>Gửi tin nhắn báo &ldquo;Đang quét dữ liệu...&rdquo; tức thì</span>
                    <Status tone={replyConfig.sendScanningProgressMessage ? 'positive' : 'neutral'}>
                      {replyConfig.sendScanningProgressMessage ? 'Đang bật' : 'Đang tắt'}
                    </Status>
                  </div>
                  <div className="text-ink-2">
                    Phản hồi ngay lập tức vào nhóm Zalo khi vừa nhận link TikTok để KOC/PIC biết Bot đang xử lý.
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const nextCfg = {
                      ...replyConfig,
                      sendScanningProgressMessage: !replyConfig.sendScanningProgressMessage,
                    };
                    setReplyConfig(nextCfg);
                    void handleSaveReplyConfig(nextCfg);
                  }}
                >
                  {replyConfig.sendScanningProgressMessage ? 'Tắt thông báo chờ' : 'Bật thông báo chờ'}
                </Button>
              </div>
            </div>
          </Panel>

          <Panel title="Soạn thảo 7 Kịch bản Tin nhắn Trả lời Tự động của Bot (Auto-Reply Templates)">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Cột trái: Danh sách 7 mẫu kịch bản */}
              <div className="lg:col-span-4 space-y-1.5">
                {replyConfig.autoReplyTemplates.map((tpl) => {
                  const isSelected = tpl.key === selectedReplyKey;
                  return (
                    <button
                      key={tpl.key}
                      type="button"
                      onClick={() => setSelectedReplyKey(tpl.key)}
                      className={`w-full text-left p-2.5 rounded border transition-colors ${
                        isSelected
                          ? 'bg-sunken border-line-strong text-ink font-medium'
                          : 'bg-surface border-line text-ink-2 hover:bg-sunken'
                      }`}
                    >
                      <div className="text-xs">{tpl.label}</div>
                      <div className="text-2xs text-ink-3 mt-0.5 line-clamp-2">{tpl.triggerHint}</div>
                    </button>
                  );
                })}
              </div>

              {/* Cột phải: Khung chỉnh sửa nội dung & Xem trước (Live Preview) */}
              <div className="lg:col-span-8 space-y-3">
                <div className="p-2.5 rounded bg-sunken border border-line flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-medium text-ink">{selectedReplyTemplate?.label}</div>
                    <div className="text-2xs text-ink-3">{selectedReplyTemplate?.triggerHint}</div>
                  </div>
                  <span className="font-mono text-2xs px-1.5 py-0.5 rounded bg-surface border border-line text-ink-2">
                    {selectedReplyTemplate?.key}
                  </span>
                </div>

                <Field label="Biến dữ liệu động (Bấm vào biến để chèn nhanh vào mẫu tin nhắn)">
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedReplyTemplate?.availablePlaceholders || []).map((ph) => (
                      <Button
                        key={ph}
                        size="sm"
                        variant="secondary"
                        onClick={() => handleInsertPlaceholder(ph)}
                      >
                        {ph}
                      </Button>
                    ))}
                  </div>
                </Field>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Nội dung kịch bản Bot trả lời (có thể sửa trực tiếp)">
                    <Textarea
                      rows={12}
                      value={selectedReplyTemplate?.content || ''}
                      onChange={(e) => handleUpdateSelectedAutoReplyContent(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </Field>

                  <Field label="Xem trước tin nhắn thực tế khi gửi vào nhóm Zalo">
                    <div className="p-3 rounded border border-line bg-sunken h-[258px] overflow-y-auto">
                      <pre className="text-xs font-mono text-ink whitespace-pre-wrap leading-relaxed">
                        {liveTemplatePreview}
                      </pre>
                    </div>
                  </Field>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-line">
                  <Button
                    variant="secondary"
                    onClick={handleResetReplyConfig}
                    disabled={isSavingReplyConfig}
                  >
                    Khôi phục mặc định
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleSaveReplyConfig()}
                    disabled={isSavingReplyConfig}
                  >
                    {isSavingReplyConfig ? 'Đang lưu...' : 'Lưu mẫu tin nhắn trả lời'}
                  </Button>
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Quản lý Thư viện Mẫu Thông Báo Chủ Động (Broadcast Templates cho KOC / Brand / Nội bộ)">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-5 space-y-3 border-b lg:border-b-0 lg:border-r border-line pb-4 lg:pb-0 lg:pr-4">
                <div className="text-xs font-medium text-ink">Thêm mẫu thông báo mới vào thư viện</div>
                <Field label="Tên gợi nhớ mẫu thông báo">
                  <Input
                    placeholder="Ví dụ: Mẫu mời Brand duyệt danh sách KOC đợt 2..."
                    value={newBroadcastLabel}
                    onChange={(e) => setNewBroadcastLabel(e.target.value)}
                  />
                </Field>
                <Field label="Nhóm đối tượng áp dụng">
                  <Select
                    value={newBroadcastRole}
                    onChange={(e) => setNewBroadcastRole(e.target.value as ZaloGroupRole | 'ALL')}
                  >
                    <option value="BRAND_PARTNER">Nhóm làm việc với Brand (BRAND_PARTNER)</option>
                    <option value="KOC_GROUP">Nhóm KOC 3 bên (KOC_GROUP)</option>
                    <option value="INTERNAL_OPS">Nhóm Vận hành nội bộ (INTERNAL_OPS)</option>
                    <option value="BOD_EXECUTIVE">Nhóm Điều hành BOD (BOD_EXECUTIVE)</option>
                    <option value="ALL">Tất cả các nhóm</option>
                  </Select>
                </Field>
                <Field label="Nội dung mẫu tin nhắn">
                  <Textarea
                    rows={5}
                    placeholder="Nhập nội dung mẫu thông báo để tái sử dụng nhanh..."
                    value={newBroadcastContent}
                    onChange={(e) => setNewBroadcastContent(e.target.value)}
                  />
                </Field>
                <div className="flex justify-end">
                  <Button variant="primary" onClick={handleAddBroadcastTemplate}>
                    Thêm vào thư viện mẫu
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-7 space-y-2.5">
                <div className="text-xs font-medium text-ink">
                  Danh sách mẫu thông báo đang lưu ({(replyConfig.broadcastTemplates || []).length} mẫu)
                </div>
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {(replyConfig.broadcastTemplates || []).map((tpl) => (
                    <div
                      key={tpl.id}
                      className="p-3 rounded border border-line bg-sunken space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-ink">{tpl.label}</span>
                          <Status tone="neutral">
                            {tpl.targetRole === 'ALL'
                              ? 'Tất cả nhóm'
                              : GROUP_ROLE_LABEL[tpl.targetRole as ZaloGroupRole] || tpl.targetRole}
                          </Status>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={Send}
                            onClick={() => {
                              setBroadcastText(tpl.content);
                              setActiveTab('COMMAND_BROADCAST');
                            }}
                          >
                            Đưa vào khung gửi tin
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            icon={Trash2}
                            onClick={() => handleDeleteBroadcastTemplate(tpl.id)}
                          >
                            Xóa
                          </Button>
                        </div>
                      </div>
                      <pre className="text-2xs font-mono text-ink-2 whitespace-pre-wrap line-clamp-3">
                        {tpl.content}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* TAB 3: BỘ THỰC THI LỆNH BOT & GỬI THÔNG BÁO */}
      {activeTab === 'COMMAND_BROADCAST' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="Bảng điều khiển & Kiểm thử Lệnh Bot (Command Console)">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {QUICK_COMMANDS.map((item) => (
                  <Button
                    key={item.cmd}
                    size="sm"
                    variant={simCommand === item.cmd ? 'secondary' : 'ghost'}
                    onClick={() => {
                      setSimCommand(item.cmd);
                      setSimGroupRole(item.role);
                      void handleSimulateCommand(item.cmd, item.role);
                    }}
                  >
                    {item.cmd} — {item.label}
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Chế độ phân quyền nhóm khi kiểm thử">
                  <Select
                    value={simGroupRole}
                    onChange={(e) => setSimGroupRole(e.target.value as ZaloGroupRole)}
                  >
                    <option value="INTERNAL_OPS">Nhóm Vận hành nội bộ (Mở PnL/KOC)</option>
                    <option value="BRAND_PARTNER">Nhóm làm việc với Brand (Mở Listing/Demo/Tiến độ Brand)</option>
                    <option value="BOD_EXECUTIVE">Nhóm Điều hành BOD (Toàn quyền)</option>
                    <option value="KOC_GROUP">Nhóm KOC 3 bên (Chặn lệnh PnL nội bộ)</option>
                  </Select>
                </Field>

                <Field label="Ngữ cảnh nhóm áp dụng">
                  <Select
                    value={simChatId}
                    onChange={(e) => setSimChatId(e.target.value)}
                  >
                    {mappings.map((m) => (
                      <option key={m.groupId} value={m.groupId}>
                        {m.groupName || m.groupId}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <Field label="Nhập cú pháp lệnh Bot (hoặc dán link Google Drive / TikTok)">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ví dụ: /listing, /tiendo, /nhapchoduyet, /duyetkoc @po.trann77, /pnl clubclio..."
                    value={simCommand}
                    onChange={(e) => setSimCommand(e.target.value)}
                    className="flex-1 font-mono"
                  />
                  <Button
                    variant="primary"
                    icon={Terminal}
                    onClick={() => handleSimulateCommand()}
                    disabled={isSimulating}
                  >
                    {isSimulating ? 'Đang chạy...' : 'Chạy lệnh'}
                  </Button>
                </div>
              </Field>

              <label className="flex items-center gap-2 text-xs text-ink-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={simSendToZalo}
                  onChange={(e) => setSimSendToZalo(e.target.checked)}
                  className="rounded border-line-strong"
                />
                Đồng thời bắn kết quả phản hồi này vào nhóm Zalo thật đã chọn
              </label>

              <div className="p-3 rounded border border-line bg-sunken min-h-[220px]">
                <div className="text-2xs font-medium text-ink-3 mb-1.5 border-b border-line pb-1">
                  Phản hồi từ Upbase B2C Zalo Bot:
                </div>
                <pre className="text-xs font-mono text-ink whitespace-pre-wrap leading-relaxed">
                  {simOutput ||
                    'Bấm vào một lệnh mẫu phía trên (ví dụ: /listing, /tiendo, /pnl clubclio, /koc @po.trann77) để xem kết quả truy xuất dữ liệu thực tế từ hệ thống.'}
                </pre>
              </div>
            </div>
          </Panel>

          <Panel title="Gửi thông báo theo Mẫu nghiệp vụ (Broadcast Message)">
            <div className="space-y-3">
              <Field label="Chọn nhanh mẫu thông báo chuẩn B2C (tùy chỉnh tại tab Kịch bản & Tin nhắn Bot)">
                <div className="flex flex-wrap gap-1.5">
                  {(replyConfig.broadcastTemplates?.length
                    ? replyConfig.broadcastTemplates
                    : MESSAGE_TEMPLATES
                  ).map((tpl) => (
                    <Button
                      key={tpl.id}
                      size="sm"
                      variant="secondary"
                      onClick={() => setBroadcastText(tpl.content)}
                    >
                      {tpl.label}
                    </Button>
                  ))}
                </div>
              </Field>

              <Field label="Chọn nhóm Zalo nhận thông báo">
                <Select
                  value={broadcastChatId}
                  onChange={(e) => setBroadcastChatId(e.target.value)}
                >
                  <option value="">-- Chọn nhóm Zalo đã kết nối --</option>
                  {mappings.map((m) => (
                    <option key={m.groupId} value={m.groupId}>
                      {m.groupName || m.groupId} ({GROUP_ROLE_LABEL[m.groupRole]})
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Hoặc nhập mã Chat/Group ID trực tiếp">
                <Input
                  placeholder="Nhập Chat ID từ Nhật ký Webhook..."
                  value={broadcastChatId}
                  onChange={(e) => setBroadcastChatId(e.target.value)}
                />
              </Field>

              <Field label="Nội dung tin nhắn gửi đi">
                <Textarea
                  rows={8}
                  placeholder="Nhập nội dung thông báo gửi tới nhóm Zalo..."
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                />
              </Field>

              <div className="flex justify-end">
                <Button
                  variant="primary"
                  icon={Send}
                  onClick={handleSendMessage}
                  disabled={isSendingMessage}
                >
                  {isSendingMessage ? 'Đang gửi...' : 'Gửi tin nhắn qua Bot'}
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* TAB 4: PHÂN QUYỀN NHÂN SỰ & BẢO MẬT NHÓM ZALO */}
      {activeTab === 'RBAC_USERS' && (
        <div className="space-y-4">
          <Panel title="Chính sách Bảo mật Tương tác theo Nhóm (Group Security Policy)">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded border border-line bg-sunken flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-medium text-ink flex items-center gap-2">
                    <span>1. Chặn tự nâng quyền nhóm từ khung chat Zalo</span>
                    <Status tone={securityPolicy.lockRoleElevationFromChat ? 'positive' : 'neutral'}>
                      {securityPolicy.lockRoleElevationFromChat ? 'Đang bật' : 'Đang tắt'}
                    </Status>
                  </div>
                  <div className="text-ink-2">
                    Khóa lệnh `/link INTERNAL` và `/link BOD` trên Zalo nếu người gõ không phải Quản lý. Chỉ cấp quyền nhóm Nội bộ / BOD trên Web Admin.
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleToggleSecurityPolicy('lockRoleElevationFromChat')}
                >
                  {securityPolicy.lockRoleElevationFromChat ? 'Tắt khóa' : 'Bật khóa'}
                </Button>
              </div>

              <div className="p-3 rounded border border-line bg-sunken flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-medium text-ink flex items-center gap-2">
                    <span>2. Cô lập phạm vi Thương hiệu trong Nhóm Nội bộ</span>
                    <Status tone={securityPolicy.enforceBrandScopeInInternalGroups ? 'positive' : 'neutral'}>
                      {securityPolicy.enforceBrandScopeInInternalGroups ? 'Đang bật' : 'Đang tắt'}
                    </Status>
                  </div>
                  <div className="text-ink-2">
                    Nhóm `INTERNAL_OPS` của Team nào chỉ được phép gõ `/pnl` tra cứu ngân sách của đúng danh sách Thương hiệu gắn với nhóm đó.
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleToggleSecurityPolicy('enforceBrandScopeInInternalGroups')}
                >
                  {securityPolicy.enforceBrandScopeInInternalGroups ? 'Tắt khóa' : 'Bật khóa'}
                </Button>
              </div>

              <div className="p-3 rounded border border-line bg-sunken flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-medium text-ink flex items-center gap-2">
                    <span>3. Cô lập Mã Deal trong Nhóm KOC 3 bên</span>
                    <Status tone={securityPolicy.isolateCrossDealLookupInKocGroup ? 'positive' : 'neutral'}>
                      {securityPolicy.isolateCrossDealLookupInKocGroup ? 'Đang bật' : 'Đang tắt'}
                    </Status>
                  </div>
                  <div className="text-ink-2">
                    Chặn thành viên trong nhóm KOC gõ `/brief [mã_deal_khác]` hoặc `/sla` để dò thông tin chiến dịch của KOC khác.
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleToggleSecurityPolicy('isolateCrossDealLookupInKocGroup')}
                >
                  {securityPolicy.isolateCrossDealLookupInKocGroup ? 'Tắt khóa' : 'Bật khóa'}
                </Button>
              </div>

              <div className="p-3 rounded border border-line bg-sunken flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-medium text-ink flex items-center gap-2">
                    <span>4. Bắt buộc duyệt Whitelist Nhóm mới trên Web</span>
                    <Status tone={securityPolicy.requireGroupWhitelist ? 'positive' : 'neutral'}>
                      {securityPolicy.requireGroupWhitelist ? 'Đang bật' : 'Đang tắt'}
                    </Status>
                  </div>
                  <div className="text-ink-2">
                    Khi Bot được thêm vào nhóm Zalo lạ chưa được duyệt (`APPROVED`) trên Web, Bot sẽ từ chối thực thi lệnh cho đến khi Quản lý mở khóa.
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleToggleSecurityPolicy('requireGroupWhitelist')}
                >
                  {securityPolicy.requireGroupWhitelist ? 'Tắt khóa' : 'Bật khóa'}
                </Button>
              </div>

              <div className="p-3 rounded border border-line bg-sunken flex items-center justify-between gap-3 md:col-span-2">
                <div className="space-y-1">
                  <div className="font-medium text-ink flex items-center gap-2">
                    <span>5. Giới hạn lệnh Duyệt / Sửa video nháp (`/duyetnhap`, `/suanhap`) cho Nhân sự nội bộ</span>
                    <Status tone={securityPolicy.restrictDraftReviewToStaff ? 'positive' : 'neutral'}>
                      {securityPolicy.restrictDraftReviewToStaff ? 'Đang bật' : 'Đang tắt'}
                    </Status>
                  </div>
                  <div className="text-ink-2">
                    Khi bật, chỉ tài khoản Zalo đã đăng ký trong bảng Phân quyền Nhân sự (`PIC`, `LEADER`, `LEAD_B2C`, `CEO`) mới được gõ lệnh duyệt bài nháp trong nhóm KOC.
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleToggleSecurityPolicy('restrictDraftReviewToStaff')}
                >
                  {securityPolicy.restrictDraftReviewToStaff ? 'Tắt khóa' : 'Bật khóa'}
                </Button>
              </div>
            </div>
          </Panel>

          <Panel title="Danh sách Chat ID & Người gửi tự động ghi nhận khi Bot nhận tin nhắn">
            <DataTable
              columns={discoveredSenderColumns}
              rows={discoveredSenders}
              rowKey={(r) => r.senderId}
              empty={
                <EmptyState title="Chưa có tin nhắn thực tế nào gửi tới Bot. Hãy vào nhóm Zalo gõ @Bot tttttttupbase /status để hệ thống tự động bắt Chat ID và Sender ID lên bảng này." />
              }
            />
          </Panel>

          <Panel
            title="Danh sách Phân quyền Nhân sự điều hành Bot trên Zalo"
            actions={
              <Button
                size="sm"
                variant="primary"
                icon={Users}
                onClick={() => setIsPermModalOpen(true)}
              >
                Thêm phân quyền
              </Button>
            }
          >
            <DataTable
              columns={permissionColumns}
              rows={userPermissions}
              rowKey={(r) => r.zaloUserId}
              empty={<EmptyState title="Chưa có nhân sự nào được phân quyền" />}
            />
          </Panel>
        </div>
      )}

      {/* TAB 5: CẤU HÌNH & NHẬT KÝ WEBHOOK */}
      {activeTab === 'WEBHOOK_LOGS' && (
        <div className="space-y-4">
          <Panel title="Thông tin kết nối Webhook Production">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-sunken rounded border border-line space-y-1">
                <span className="text-ink-3">Đường dẫn Webhook URL</span>
                <p className="font-mono font-medium text-ink select-all">
                  {webhookInfo.url || 'https://b2c-theta.vercel.app/api/integrations/zalo-bot/webhook'}
                </p>
              </div>
              <div className="p-3 bg-sunken rounded border border-line space-y-1">
                <span className="text-ink-3">Mã khóa bí mật (Secret Token)</span>
                <p className="font-mono font-medium text-ink">hDHD****3--U (Đã xác thực Header)</p>
              </div>
              <div className="p-3 bg-sunken rounded border border-line space-y-1">
                <span className="text-ink-3">Định danh Bot & Link mời nhóm</span>
                <p className="font-mono font-medium text-ink select-all">{inviteUrl}</p>
              </div>
              <div className="p-3 bg-sunken rounded border border-line space-y-1">
                <span className="text-ink-3">Quyền hoạt động nhóm</span>
                <p className="font-medium text-positive">Đã kích hoạt (can_join_groups: True)</p>
              </div>
            </div>
          </Panel>

          <Panel title="Nhật ký sự kiện nhận từ Zalo Server (Webhook Logs)">
            <DataTable
              columns={logColumns}
              rows={recentEvents}
              rowKey={(r) => `${r.time}-${r.extractedChatId || ''}`}
              empty={<EmptyState title="Chưa có gói tin mới từ Zalo" />}
            />
          </Panel>
        </div>
      )}

      {/* MODAL THÊM / SỬA LIÊN KẾT NHÓM */}
      <Modal
        open={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        title="Cấu hình liên kết nhóm chat Zalo & Brief chiến dịch"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Mã nhóm Zalo (Chat / Group ID) *">
              <Input
                placeholder="Ví dụ: 818e7bf147beaee0f7af"
                value={modalGroupId}
                onChange={(e) => setModalGroupId(e.target.value)}
              />
            </Field>
            <Field label="Cấp bảo mật nhóm chat">
              <Select
                value={modalGroupRole}
                onChange={(e) => setModalGroupRole(e.target.value as ZaloGroupRole)}
              >
                <option value="KOC_GROUP">Nhóm KOC 3 bên (Khóa lệnh PnL nội bộ)</option>
                <option value="BRAND_PARTNER">Nhóm làm việc với Brand (Duyệt KOC, Demo & Báo cáo Brand)</option>
                <option value="INTERNAL_OPS">Nhóm Vận hành nội bộ (Mở tra cứu KOC/PnL)</option>
                <option value="BOD_EXECUTIVE">Nhóm Điều hành BOD (Toàn quyền)</option>
              </Select>
            </Field>
            <Field label="Trạng thái cho phép Bot hoạt động">
              <Select
                value={modalAccessStatus}
                onChange={(e) => setModalAccessStatus(e.target.value as ZaloGroupAccessStatus)}
              >
                <option value="APPROVED">Đã phê duyệt (Cho phép chạy lệnh)</option>
                <option value="PENDING_APPROVAL">Chờ phê duyệt (Tạm khóa lệnh)</option>
                <option value="BLOCKED">Khóa nhóm (Chặn hoàn toàn)</option>
              </Select>
            </Field>
          </div>

          <Field label="Chọn nhanh Gian hàng chuẩn B2C (tự động điền Thương hiệu & PIC từ hồ sơ gốc)">
            <Select
              value=""
              onChange={(e) => handleSelectStoreForGroup(e.target.value)}
            >
              <option value="">-- Chọn trong 69 gian hàng B2C để tự động đồng bộ Brand & PIC --</option>
              {REAL_B2C_69_STORES.map((s) => (
                <option key={s.id} value={s.storeName}>
                  {s.storeName} — Brand: {s.brandName} ({s.primaryPic || s.b2cOwnerName})
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Phạm vi Thương hiệu cho phép nhóm này tra cứu (cách nhau dấu phẩy, nhập ALL nếu toàn bộ)">
            <Input
              placeholder="Ví dụ: ClubClio, EUPC (hoặc ALL cho nhóm BOD)"
              value={modalAllowedBrands}
              onChange={(e) => setModalAllowedBrands(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tên hiển thị nhóm">
              <Input
                placeholder="Ví dụ: [ClubClio x KOC po.trann77]"
                value={modalGroupName}
                onChange={(e) => setModalGroupName(e.target.value)}
              />
            </Field>
            <Field label="Mã Deal / Mã BO">
              <Input
                placeholder="Ví dụ: BO261067161"
                value={modalDealCode}
                onChange={(e) => setModalDealCode(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Thương hiệu (Brand)">
              <Input
                placeholder="Ví dụ: ClubClio, EUPC, Mine..."
                value={modalBrandName}
                onChange={(e) => setModalBrandName(e.target.value)}
              />
            </Field>
            <Field label="Tên gian hàng">
              <Input
                placeholder="Ví dụ: ClubClio_TikTok_Flagship"
                value={modalStoreName}
                onChange={(e) => setModalStoreName(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="ID kênh TikTok KOC">
              <Input
                placeholder="Ví dụ: po.trann77"
                value={modalKocHandle}
                onChange={(e) => setModalKocHandle(e.target.value)}
              />
            </Field>
            <Field label="Tên KOC">
              <Input
                placeholder="Ví dụ: Chu Thị Phương Thảo"
                value={modalKocName}
                onChange={(e) => setModalKocName(e.target.value)}
              />
            </Field>
            <Field label="Chuyên viên PIC phụ trách">
              <Select
                value={modalPicName}
                onChange={(e) => setModalPicName(e.target.value)}
              >
                <option value="">-- Chọn nhân sự B2C --</option>
                {INITIAL_INTERNAL_STAFF_RBAC.map((st) => (
                  <option key={st.id} value={st.name}>
                    {st.name} ({st.email})
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Sản phẩm trọng tâm trong Brief">
              <Input
                placeholder="Tên sản phẩm KOC cần gắn giỏ hàng..."
                value={modalProductName}
                onChange={(e) => setModalProductName(e.target.value)}
              />
            </Field>
            <Field label="Hashtag bắt buộc (cách nhau dấu phẩy)">
              <Input
                placeholder="ClubClio, ClioCushion, BeautyReview"
                value={modalHashtags}
                onChange={(e) => setModalHashtags(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Tóm tắt yêu cầu kịch bản & góc quay (Brief Summary)">
            <Textarea
              rows={2}
              placeholder="Mô tả ngắn gọn yêu cầu góc quay, thông điệp chính..."
              value={modalBriefSummary}
              onChange={(e) => setModalBriefSummary(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Hạn nộp bài (SLA DD/MM/YYYY)">
              <Input
                placeholder="31/10/2026"
                value={modalDeadlineDate}
                onChange={(e) => setModalDeadlineDate(e.target.value)}
              />
            </Field>
            <Field label="Trạng thái Deal hiện tại">
              <Select
                value={modalDealStatus}
                onChange={(e) => setModalDealStatus(e.target.value as ZaloDealWorkflowStatus)}
              >
                <option value="CHỜ_NHẬN_MẪU">Chờ nhận mẫu</option>
                <option value="ĐANG_QUAY_NHÁP">Đang quay nháp</option>
                <option value="ĐÃ_NỘP_NHÁP">Đã nộp nháp</option>
                <option value="ĐÃ_DUYỆT_NHÁP">Đã duyệt nháp</option>
                <option value="ĐÃ_NGHIỆM_THU_AIR">Đã nghiệm thu (Air)</option>
                <option value="CẦN_CHỈNH_SỬA">Cần chỉnh sửa</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Mã vận đơn gửi mẫu (/vandon)">
              <Input
                placeholder="Ví dụ: SPXVN048291823"
                value={modalTrackingCode}
                onChange={(e) => setModalTrackingCode(e.target.value)}
              />
            </Field>
            <Field label="Mã ủy quyền quảng cáo Spark Ads (/ads)">
              <Input
                placeholder="Ví dụ: #7F9A2B8C1D4E5F"
                value={modalSparkAdsCode}
                onChange={(e) => setModalSparkAdsCode(e.target.value)}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-line">
            <Button variant="secondary" onClick={() => setIsLinkModalOpen(false)}>
              Đóng
            </Button>
            <Button variant="primary" onClick={handleSaveMapping}>
              Lưu cấu hình nhóm
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL DUYỆT BÀI / CẬP NHẬT TRẠNG THÁI DEAL */}
      <Modal
        open={Boolean(reviewModalTarget)}
        onClose={() => setReviewModalTarget(null)}
        title={`Phê duyệt nội dung Deal: ${reviewModalTarget?.dealCode || reviewModalTarget?.groupName || ''}`}
      >
        <div className="space-y-3">
          {reviewModalTarget?.draftVideoUrl && (
            <div className="p-2.5 rounded bg-sunken border border-line text-xs">
              <span className="text-ink-3">Link video nháp KOC đã nộp: </span>
              <a
                href={reviewModalTarget.draftVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent font-mono hover:underline break-all"
              >
                {reviewModalTarget.draftVideoUrl}
              </a>
            </div>
          )}

          <Field label="Quyết định phê duyệt">
            <Select
              value={reviewNextStatus}
              onChange={(e) => setReviewNextStatus(e.target.value as ZaloDealWorkflowStatus)}
            >
              <option value="ĐÃ_DUYỆT_NHÁP">Duyệt video nháp — Cho phép KOC đăng bài</option>
              <option value="CẦN_CHỈNH_SỬA">Yêu cầu chỉnh sửa lại video nháp</option>
              <option value="ĐÃ_NGHIỆM_THU_AIR">Xác nhận đã nghiệm thu lên sóng (Air)</option>
            </Select>
          </Field>

          <Field label="Ghi chú phản hồi gửi vào nhóm Zalo cho KOC">
            <Textarea
              rows={3}
              placeholder="Nhập nhận xét hoặc yêu cầu chỉnh sửa gửi tới KOC..."
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-3 border-t border-line">
            <Button variant="secondary" onClick={() => setReviewModalTarget(null)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSubmitDealReview}>
              Xác nhận & Báo vào nhóm Zalo
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL THÊM PHÂN QUYỀN NHÂN SỰ */}
      <Modal
        open={isPermModalOpen}
        onClose={() => setIsPermModalOpen(false)}
        title="Cấp quyền Nhân sự điều hành trên Zalo Bot"
      >
        <div className="space-y-3">
          <Field label="Chọn nhanh từ Danh bạ Nhân sự B2C chuẩn (tự động điền Họ tên, Email, Cấp bậc & Thương hiệu)">
            <Select
              value=""
              onChange={(e) => handleSelectInternalStaffForPerm(e.target.value)}
            >
              <option value="">-- Chọn nhân sự trong ma trận RBAC gốc --</option>
              {INITIAL_INTERNAL_STAFF_RBAC.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.email}) — {st.position}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Mã người dùng Zalo (sender.id) *">
              <Input
                placeholder="Ví dụ: 8756287263669629130"
                value={permUserId}
                onChange={(e) => setPermUserId(e.target.value)}
              />
            </Field>
            <Field label="Cấp thẩm quyền nghiệp vụ">
              <Select
                value={permRole}
                onChange={(e) => setPermRole(e.target.value as ZaloStaffRole)}
              >
                <option value="CEO">Tổng Giám Đốc (CEO — Đỗ Văn Giang)</option>
                <option value="LEAD_B2C">Giám Đốc Marketing B2C (Đặng Thị Yến Nhi)</option>
                <option value="LEADER">Trưởng Nhóm Booking (Nguyễn Thị Ngọc Tâm)</option>
                <option value="PIC">Chuyên viên thực thi (PIC)</option>
                <option value="KOC">Đối tác KOC / Creator</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Họ tên nhân sự *">
              <Input
                placeholder="Ví dụ: Đinh Thị Bích Liên"
                value={permStaffName}
                onChange={(e) => setPermStaffName(e.target.value)}
              />
            </Field>
            <Field label="Email công ty">
              <Input
                placeholder="liendtb@upbase.vn"
                value={permStaffEmail}
                onChange={(e) => setPermStaffEmail(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Danh sách Thương hiệu phụ trách (cách nhau dấu phẩy)">
            <Input
              placeholder="ClubClio, EUPC, Mine, pHCare..."
              value={permBrands}
              onChange={(e) => setPermBrands(e.target.value)}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-3 border-t border-line">
            <Button variant="secondary" onClick={() => setIsPermModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSaveUserPermission}>
              Lưu phân quyền
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL XEM TRƯỚC NỘI DUNG VỪA PHÁT */}
      <Modal
        open={Boolean(previewModalData)}
        onClose={() => setPreviewModalData(null)}
        title={previewModalData?.title || 'Nội dung tin nhắn Bot'}
      >
        <div className="space-y-3">
          <div className="p-3 rounded border border-line bg-sunken">
            <pre className="text-xs font-mono text-ink whitespace-pre-wrap leading-relaxed">
              {previewModalData?.content}
            </pre>
          </div>
          {previewModalData?.photoUrl && (
            <div className="p-3 rounded border border-line bg-sunken space-y-1.5">
              <div className="text-2xs font-medium text-ink-2">Ảnh đính kèm Bot đã gửi:</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewModalData.photoUrl}
                alt="Ảnh Bot phản hồi"
                className="w-36 h-48 object-cover rounded border border-line bg-surface"
              />
            </div>
          )}
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => setPreviewModalData(null)}>
              Đóng
            </Button>
          </div>
        </div>
      </Modal>

      {/* CONFIRM DIALOG HỦY LIÊN KẾT */}
      <ConfirmDialog
        open={Boolean(unlinkTargetGroupId)}
        title="Hủy liên kết nhóm Zalo"
        message={`Bạn có chắc chắn muốn hủy liên kết cho nhóm ${unlinkTargetGroupId}? Bot sẽ ngừng tự động đồng bộ tiến độ deal cho nhóm này.`}
        confirmLabel="Hủy liên kết"
        tone="critical"
        onCancel={() => setUnlinkTargetGroupId(null)}
        onConfirm={handleConfirmUnlink}
      />
    </div>
  );
}
