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
  Field,
  Textarea,
  EmptyState,
  Status,
  Person,
  Chips,
  type Column,
} from '@/components/ui';

type ZaloGroupRole = 'KOC_GROUP' | 'INTERNAL_OPS' | 'BOD_EXECUTIVE';

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
  linkedAt: string;
  updatedAt?: string;
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
  error?: string;
}

interface ZaloBotManagerProps {
  currentUser: UserProfile;
  onNotify?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const GROUP_ROLE_LABEL: Record<ZaloGroupRole, string> = {
  KOC_GROUP: 'Nhóm KOC 3 bên',
  INTERNAL_OPS: 'Nhóm Vận hành nội bộ',
  BOD_EXECUTIVE: 'Nhóm Điều hành BOD',
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
  { cmd: '/pnl', label: 'Tổng hợp PnL 69 gian hàng', role: 'BOD_EXECUTIVE' },
  { cmd: '/pnl clubclio', label: 'Chi tiết PnL ClubClio', role: 'INTERNAL_OPS' },
  { cmd: '/pnl eupc', label: 'Chi tiết PnL EUPC', role: 'INTERNAL_OPS' },
  { cmd: '/overbudget', label: 'Quét gian hàng vượt trần', role: 'BOD_EXECUTIVE' },
  { cmd: '/koc @po.trann77', label: 'Tra cứu KOC @po.trann77', role: 'INTERNAL_OPS' },
  { cmd: '/koc @chutieuhan10012001', label: 'Tra cứu KOC @chutieuhan10012001', role: 'INTERNAL_OPS' },
  { cmd: '/brief', label: 'Xem Brief nhóm hiện tại', role: 'KOC_GROUP' },
  { cmd: '/sla', label: 'Báo cáo tiến độ SLA', role: 'INTERNAL_OPS' },
  { cmd: '/digest', label: 'Báo cáo tổng hợp cuối ngày', role: 'BOD_EXECUTIVE' },
  { cmd: '/status', label: 'Kiểm tra trạng thái nhóm', role: 'KOC_GROUP' },
  { cmd: '/help', label: 'Danh sách lệnh hỗ trợ', role: 'INTERNAL_OPS' },
];

export function ZaloBotManagerView({ currentUser, onNotify }: ZaloBotManagerProps) {
  const [activeTab, setActiveTab] = useState<
    'GROUPS' | 'AIR_CHECK' | 'COMMAND_BROADCAST' | 'RBAC_USERS' | 'WEBHOOK_LOGS'
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
  const [airHistory, setAirHistory] = useState<ZaloAirCheckHistoryItem[]>([]);
  const [recentEvents, setRecentEvents] = useState<WebhookDebugEvent[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | ZaloGroupRole>('ALL');
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

  // Modal duyệt / cập nhật trạng thái nháp
  const [reviewModalTarget, setReviewModalTarget] = useState<ZaloGroupMappingItem | null>(null);
  const [reviewNextStatus, setReviewNextStatus] = useState<ZaloDealWorkflowStatus>('ĐÃ_DUYỆT_NHÁP');
  const [reviewNote, setReviewNote] = useState('');

  // Modal xem trước nội dung vừa gửi
  const [previewModalData, setPreviewModalData] = useState<{ title: string; content: string } | null>(null);

  // Confirm dialog hủy liên kết
  const [unlinkTargetGroupId, setUnlinkTargetGroupId] = useState<string | null>(null);

  // Thử nghiệm Quét Air Check
  const [testVideoUrl, setTestVideoUrl] = useState('');
  const [airCheckTargetChatId, setAirCheckTargetChatId] = useState('');
  const [isCheckingAir, setIsCheckingAir] = useState(false);
  const [airCheckResult, setAirCheckResult] = useState<any>(null);

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
        if (data.securityPolicy) setSecurityPolicy(data.securityPolicy);
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
    action: 'SEND_BRIEF' | 'SEND_SLA_REMINDER'
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
            title: action === 'SEND_BRIEF' ? 'Nội dung Brief đã phát đi' : 'Nội dung Nhắc hạn SLA đã phát đi',
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

  const filteredMappings = useMemo(() => {
    return mappings.filter((m) => {
      if (roleFilter !== 'ALL' && m.groupRole !== roleFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.groupId.toLowerCase().includes(q) ||
        (m.groupName && m.groupName.toLowerCase().includes(q)) ||
        (m.dealCode && m.dealCode.toLowerCase().includes(q)) ||
        (m.kocName && m.kocName.toLowerCase().includes(q)) ||
        (m.kocHandle && m.kocHandle.toLowerCase().includes(q)) ||
        (m.brandName && m.brandName.toLowerCase().includes(q)) ||
        (m.picName && m.picName.toLowerCase().includes(q))
      );
    });
  }, [mappings, roleFilter, searchQuery]);

  const groupColumns: Column<ZaloGroupMappingItem>[] = [
    {
      key: 'groupInfo',
      header: 'Nhóm chat Zalo',
      render: (row) => (
        <div className="space-y-0.5">
          <div className="text-xs font-medium text-ink">
            {row.groupName || row.groupId}
          </div>
          <div className="font-mono text-2xs text-ink-3 select-all">
            ID: {row.groupId}
          </div>
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
            : row.groupRole === 'INTERNAL_OPS'
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

  const airHistoryColumns: Column<ZaloAirCheckHistoryItem>[] = [
    {
      key: 'checkedAt',
      header: 'Thời gian quét',
      render: (row) => (
        <span className="text-xs font-mono text-ink-3">
          {new Date(row.checkedAt).toLocaleString('vi-VN')}
        </span>
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
      header: 'Giỏ hàng & Hashtag',
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <div className={row.hasProductLink ? 'text-positive font-medium' : 'text-critical'}>
            {row.hasProductLink ? 'Đã gắn giỏ hàng' : 'Thiếu giỏ hàng'}
          </div>
          <div className="text-2xs font-mono text-ink-3 truncate max-w-xs">
            {row.hashtags?.length ? row.hashtags.map((h) => `#${h}`).join(' ') : 'Không có hashtag'}
          </div>
        </div>
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
      header: 'Nội dung tin nhắn',
      render: (row) => (
        <span className="text-xs text-ink truncate max-w-md block" title={JSON.stringify(row.body)}>
          {row.body?.result?.message?.text || row.body?.message?.text || JSON.stringify(row.body)}
        </span>
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
        <Stat label="Nhân sự được cấp quyền" value={userPermissions.length} />
      </StatRow>

      {/* Thanh điều hướng phân hệ */}
      <div className="flex items-center justify-between border-b border-line pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant={activeTab === 'GROUPS' ? 'primary' : 'secondary'}
            icon={MessageSquare}
            onClick={() => setActiveTab('GROUPS')}
          >
            Nhóm chat & Tiến độ Deal ({mappings.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'AIR_CHECK' ? 'primary' : 'secondary'}
            icon={Play}
            onClick={() => setActiveTab('AIR_CHECK')}
          >
            Nghiệm thu Video TikTok ({airHistory.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'COMMAND_BROADCAST' ? 'primary' : 'secondary'}
            icon={Terminal}
            onClick={() => setActiveTab('COMMAND_BROADCAST')}
          >
            Lệnh Bot & Gửi thông báo
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'RBAC_USERS' ? 'primary' : 'secondary'}
            icon={Users}
            onClick={() => setActiveTab('RBAC_USERS')}
          >
            Phân quyền Nhân sự ({userPermissions.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'WEBHOOK_LOGS' ? 'primary' : 'secondary'}
            icon={ShieldCheck}
            onClick={() => setActiveTab('WEBHOOK_LOGS')}
          >
            Cấu hình & Nhật ký ({recentEvents.length})
          </Button>
        </div>

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
      </div>

      {/* TAB 1: QUẢN LÝ NHÓM CHAT & TIẾN ĐỘ DEAL */}
      {activeTab === 'GROUPS' && (
        <Panel
          title="Danh sách nhóm chat Zalo & Điều phối Deal KOC"
          actions={
            <Button
              size="sm"
              variant="primary"
              icon={Link2}
              onClick={() => openEditGroupModal()}
            >
              Thêm liên kết nhóm
            </Button>
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
                  onChange={(v) => setRoleFilter(v as 'ALL' | ZaloGroupRole)}
                  items={[
                    { key: 'ALL', label: 'Tất cả nhóm', count: mappings.length },
                    {
                      key: 'KOC_GROUP',
                      label: 'Nhóm KOC 3 bên',
                      count: mappings.filter((m) => m.groupRole === 'KOC_GROUP').length,
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
                    <select
                      className="w-full h-9 rounded border border-line-strong bg-surface px-3 text-xs text-ink"
                      value={airCheckTargetChatId}
                      onChange={(e) => setAirCheckTargetChatId(e.target.value)}
                    >
                      <option value="">-- Chỉ quét trên Web (Không bắn tin) --</option>
                      {mappings.map((m) => (
                        <option key={m.groupId} value={m.groupId}>
                          {m.groupName || m.groupId} ({m.dealCode || '—'})
                        </option>
                      ))}
                    </select>
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
                <div className="p-3 rounded border border-line bg-sunken">
                  <pre className="text-xs font-mono text-ink whitespace-pre-wrap">
                    {airCheckResult}
                  </pre>
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
                  <select
                    className="w-full h-9 rounded border border-line-strong bg-surface px-3 text-xs text-ink"
                    value={simGroupRole}
                    onChange={(e) => setSimGroupRole(e.target.value as ZaloGroupRole)}
                  >
                    <option value="INTERNAL_OPS">Nhóm Vận hành nội bộ (Mở PnL/KOC)</option>
                    <option value="BOD_EXECUTIVE">Nhóm Điều hành BOD (Toàn quyền)</option>
                    <option value="KOC_GROUP">Nhóm KOC 3 bên (Chặn lệnh PnL nội bộ)</option>
                  </select>
                </Field>

                <Field label="Ngữ cảnh nhóm áp dụng">
                  <select
                    className="w-full h-9 rounded border border-line-strong bg-surface px-3 text-xs text-ink"
                    value={simChatId}
                    onChange={(e) => setSimChatId(e.target.value)}
                  >
                    {mappings.map((m) => (
                      <option key={m.groupId} value={m.groupId}>
                        {m.groupName || m.groupId}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Nhập cú pháp lệnh Bot (hoặc dán link Google Drive / TikTok)">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ví dụ: /pnl clubclio, /koc @po.trann77, /overbudget, /brief, /digest..."
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
                    'Bấm vào một lệnh mẫu phía trên (ví dụ: /pnl, /pnl clubclio, /overbudget, /koc @po.trann77) để xem kết quả truy xuất dữ liệu thực tế từ hệ thống.'}
                </pre>
              </div>
            </div>
          </Panel>

          <Panel title="Gửi thông báo theo Mẫu nghiệp vụ (Broadcast Message)">
            <div className="space-y-3">
              <Field label="Chọn nhanh mẫu thông báo chuẩn B2C">
                <div className="flex flex-wrap gap-1.5">
                  {MESSAGE_TEMPLATES.map((tpl) => (
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
                <select
                  className="w-full h-9 rounded border border-line-strong bg-surface px-3 text-xs text-ink"
                  value={broadcastChatId}
                  onChange={(e) => setBroadcastChatId(e.target.value)}
                >
                  <option value="">-- Chọn nhóm Zalo đã kết nối --</option>
                  {mappings.map((m) => (
                    <option key={m.groupId} value={m.groupId}>
                      {m.groupName || m.groupId} ({GROUP_ROLE_LABEL[m.groupRole]})
                    </option>
                  ))}
                </select>
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
                <div className="space-y-0.5">
                  <div className="font-medium text-ink">
                    1. Chặn tự nâng quyền nhóm từ khung chat Zalo
                  </div>
                  <div className="text-ink-3">
                    Khóa lệnh `/link INTERNAL` và `/link BOD` trên Zalo nếu người gõ không phải Quản lý. Chỉ cấp quyền nhóm Nội bộ / BOD trên Web Admin.
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={securityPolicy.lockRoleElevationFromChat ? 'primary' : 'secondary'}
                  onClick={() => handleToggleSecurityPolicy('lockRoleElevationFromChat')}
                >
                  {securityPolicy.lockRoleElevationFromChat ? 'Đang bật' : 'Đang tắt'}
                </Button>
              </div>

              <div className="p-3 rounded border border-line bg-sunken flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="font-medium text-ink">
                    2. Cô lập phạm vi Thương hiệu trong Nhóm Nội bộ
                  </div>
                  <div className="text-ink-3">
                    Nhóm `INTERNAL_OPS` của Team nào chỉ được phép gõ `/pnl` tra cứu ngân sách của đúng danh sách Thương hiệu gắn với nhóm đó.
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={securityPolicy.enforceBrandScopeInInternalGroups ? 'primary' : 'secondary'}
                  onClick={() => handleToggleSecurityPolicy('enforceBrandScopeInInternalGroups')}
                >
                  {securityPolicy.enforceBrandScopeInInternalGroups ? 'Đang bật' : 'Đang tắt'}
                </Button>
              </div>

              <div className="p-3 rounded border border-line bg-sunken flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="font-medium text-ink">
                    3. Cô lập Mã Deal trong Nhóm KOC 3 bên
                  </div>
                  <div className="text-ink-3">
                    Chặn thành viên trong nhóm KOC gõ `/brief [mã_deal_khác]` hoặc `/sla` để dò thông tin chiến dịch của KOC khác.
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={securityPolicy.isolateCrossDealLookupInKocGroup ? 'primary' : 'secondary'}
                  onClick={() => handleToggleSecurityPolicy('isolateCrossDealLookupInKocGroup')}
                >
                  {securityPolicy.isolateCrossDealLookupInKocGroup ? 'Đang bật' : 'Đang tắt'}
                </Button>
              </div>

              <div className="p-3 rounded border border-line bg-sunken flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="font-medium text-ink">
                    4. Bắt buộc duyệt Whitelist Nhóm mới trên Web
                  </div>
                  <div className="text-ink-3">
                    Khi Bot được thêm vào nhóm Zalo lạ chưa được duyệt (`APPROVED`) trên Web, Bot sẽ từ chối thực thi lệnh cho đến khi Quản lý mở khóa.
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={securityPolicy.requireGroupWhitelist ? 'primary' : 'secondary'}
                  onClick={() => handleToggleSecurityPolicy('requireGroupWhitelist')}
                >
                  {securityPolicy.requireGroupWhitelist ? 'Đang bật' : 'Đang tắt'}
                </Button>
              </div>

              <div className="p-3 rounded border border-line bg-sunken flex items-center justify-between gap-3 md:col-span-2">
                <div className="space-y-0.5">
                  <div className="font-medium text-ink">
                    5. Giới hạn lệnh Duyệt / Sửa video nháp (`/duyetnhap`, `/suanhap`) cho Nhân sự nội bộ
                  </div>
                  <div className="text-ink-3">
                    Khi bật, chỉ tài khoản Zalo đã đăng ký trong bảng Phân quyền Nhân sự (`PIC`, `LEADER`, `LEAD_B2C`, `CEO`) mới được gõ lệnh duyệt bài nháp trong nhóm KOC.
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={securityPolicy.restrictDraftReviewToStaff ? 'primary' : 'secondary'}
                  onClick={() => handleToggleSecurityPolicy('restrictDraftReviewToStaff')}
                >
                  {securityPolicy.restrictDraftReviewToStaff ? 'Đang bật' : 'Đang tắt'}
                </Button>
              </div>
            </div>
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

          <Panel title="Quy chuẩn Thẩm quyền Phê duyệt & Bảo mật dữ liệu trên Zalo Bot">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded border border-line bg-sunken space-y-1">
                <div className="font-medium text-ink">1. Cấp Giám Đốc & CEO</div>
                <div className="text-ink-2">
                  Tổng Giám Đốc (Đỗ Văn Giang) & Giám Đốc B2C (Đặng Thị Yến Nhi): Toàn quyền truy xuất PnL 69 gian hàng, nhận cảnh báo vượt trần ngân sách và ký duyệt kế hoạch tháng.
                </div>
              </div>
              <div className="p-3 rounded border border-line bg-sunken space-y-1">
                <div className="font-medium text-ink">2. Cấp Trưởng Nhóm (Leader)</div>
                <div className="text-ink-2">
                  Nguyễn Thị Ngọc Tâm: Phụ trách 8 gian hàng trọng điểm (ClubClio, Cindy Bloom, Mine, EUPC, L&apos;Occitane, Bye Bye Blemish, Rejuran). Các gian hàng khác PIC trình thẳng Giám Đốc B2C.
                </div>
              </div>
              <div className="p-3 rounded border border-line bg-sunken space-y-1">
                <div className="font-medium text-ink">3. Cơ chế Khóa bảo mật Nhóm KOC</div>
                <div className="text-ink-2">
                  Trong các nhóm phân loại là Nhóm KOC 3 bên, Bot tự động chặn mọi lệnh `/pnl`, `/overbudget`, `/digest` và che mờ 4 số cuối CCCD / Tài khoản ngân hàng (`****5678`).
                </div>
              </div>
            </div>
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
              <select
                className="w-full h-9 rounded border border-line-strong bg-surface px-3 text-xs text-ink"
                value={modalGroupRole}
                onChange={(e) => setModalGroupRole(e.target.value as ZaloGroupRole)}
              >
                <option value="KOC_GROUP">Nhóm KOC 3 bên (Khóa lệnh PnL nội bộ)</option>
                <option value="INTERNAL_OPS">Nhóm Vận hành nội bộ (Mở tra cứu KOC/PnL)</option>
                <option value="BOD_EXECUTIVE">Nhóm Điều hành BOD (Toàn quyền)</option>
              </select>
            </Field>
            <Field label="Trạng thái cho phép Bot hoạt động">
              <select
                className="w-full h-9 rounded border border-line-strong bg-surface px-3 text-xs text-ink"
                value={modalAccessStatus}
                onChange={(e) => setModalAccessStatus(e.target.value as ZaloGroupAccessStatus)}
              >
                <option value="APPROVED">Đã phê duyệt (Cho phép chạy lệnh)</option>
                <option value="PENDING_APPROVAL">Chờ phê duyệt (Tạm khóa lệnh)</option>
                <option value="BLOCKED">Khóa nhóm (Chặn hoàn toàn)</option>
              </select>
            </Field>
          </div>

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
              <Input
                placeholder="Ví dụ: Hà Thị Thủy"
                value={modalPicName}
                onChange={(e) => setModalPicName(e.target.value)}
              />
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
              <select
                className="w-full h-9 rounded border border-line-strong bg-surface px-3 text-xs text-ink"
                value={modalDealStatus}
                onChange={(e) => setModalDealStatus(e.target.value as ZaloDealWorkflowStatus)}
              >
                <option value="CHỜ_NHẬN_MẪU">Chờ nhận mẫu</option>
                <option value="ĐANG_QUAY_NHÁP">Đang quay nháp</option>
                <option value="ĐÃ_NỘP_NHÁP">Đã nộp nháp</option>
                <option value="ĐÃ_DUYỆT_NHÁP">Đã duyệt nháp</option>
                <option value="ĐÃ_NGHIỆM_THU_AIR">Đã nghiệm thu (Air)</option>
                <option value="CẦN_CHỈNH_SỬA">Cần chỉnh sửa</option>
              </select>
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
            <select
              className="w-full h-9 rounded border border-line-strong bg-surface px-3 text-xs text-ink"
              value={reviewNextStatus}
              onChange={(e) => setReviewNextStatus(e.target.value as ZaloDealWorkflowStatus)}
            >
              <option value="ĐÃ_DUYỆT_NHÁP">Duyệt video nháp — Cho phép KOC đăng bài</option>
              <option value="CẦN_CHỈNH_SỬA">Yêu cầu chỉnh sửa lại video nháp</option>
              <option value="ĐÃ_NGHIỆM_THU_AIR">Xác nhận đã nghiệm thu lên sóng (Air)</option>
            </select>
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mã người dùng Zalo (sender.id) *">
              <Input
                placeholder="Ví dụ: 8756287263669629130"
                value={permUserId}
                onChange={(e) => setPermUserId(e.target.value)}
              />
            </Field>
            <Field label="Cấp thẩm quyền nghiệp vụ">
              <select
                className="w-full h-9 rounded border border-line-strong bg-surface px-3 text-xs text-ink"
                value={permRole}
                onChange={(e) => setPermRole(e.target.value as ZaloStaffRole)}
              >
                <option value="CEO">Tổng Giám Đốc (CEO — Đỗ Văn Giang)</option>
                <option value="LEAD_B2C">Giám Đốc Marketing B2C (Đặng Thị Yến Nhi)</option>
                <option value="LEADER">Trưởng Nhóm Booking (Nguyễn Thị Ngọc Tâm)</option>
                <option value="PIC">Chuyên viên thực thi (PIC)</option>
                <option value="KOC">Đối tác KOC / Creator</option>
              </select>
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
