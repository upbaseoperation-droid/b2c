'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bot,
  RefreshCw,
  Send,
  Link2,
  Trash2,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Play,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Check,
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
  type Column,
} from '@/components/ui';

interface ZaloGroupMappingItem {
  groupId: string;
  dealCode?: string;
  kocName?: string;
  brandName?: string;
  linkedAt: string;
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

export function ZaloBotManagerView({ currentUser, onNotify }: ZaloBotManagerProps) {
  const [activeTab, setActiveTab] = useState<'GROUPS' | 'AIR_CHECK' | 'BROADCAST' | 'WEBHOOK_LOGS'>('GROUPS');
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
  const [recentEvents, setRecentEvents] = useState<WebhookDebugEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Modal thêm/sửa liên kết nhóm
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [modalGroupId, setModalGroupId] = useState('');
  const [modalDealCode, setModalDealCode] = useState('');
  const [modalKocName, setModalKocName] = useState('');
  const [modalBrandName, setModalBrandName] = useState('');

  // Confirm dialog hủy liên kết
  const [unlinkTargetGroupId, setUnlinkTargetGroupId] = useState<string | null>(null);

  // Thử nghiệm Quét Air Check
  const [testVideoUrl, setTestVideoUrl] = useState('');
  const [isCheckingAir, setIsCheckingAir] = useState(false);
  const [airCheckResult, setAirCheckResult] = useState<any>(null);

  // Bắn tin nhắn qua Bot
  const [broadcastChatId, setBroadcastChatId] = useState('');
  const [broadcastText, setBroadcastText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

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
    onNotify?.('Đã sao chép liên kết mời Bot vào nhóm.', 'success');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSaveMapping = async () => {
    if (!modalGroupId.trim()) {
      onNotify?.('Vui lòng nhập Chat/Group ID', 'error');
      return;
    }
    try {
      const res = await fetch('/api/integrations/zalo-bot/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'LINK',
          groupId: modalGroupId.trim(),
          dealCode: modalDealCode.trim(),
          kocName: modalKocName.trim(),
          brandName: modalBrandName.trim(),
        }),
      });
      if (res.ok) {
        onNotify?.('Đã lưu liên kết nhóm Zalo thành công.', 'success');
        setIsLinkModalOpen(false);
        setModalGroupId('');
        setModalDealCode('');
        setModalKocName('');
        setModalBrandName('');
        void fetchBotStatus();
      } else {
        onNotify?.('Lưu liên kết thất bại.', 'error');
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
      const res = await fetch('/api/integrations/link-air-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links: [testVideoUrl.trim()] }),
      });
      const data = await res.json();
      if (res.ok && data?.results?.[0]) {
        setAirCheckResult(data.results[0]);
        onNotify?.('Đã quét dữ liệu video thành công.', 'success');
      } else {
        onNotify?.(data?.message || 'Không thể quét dữ liệu video.', 'error');
      }
    } catch {
      onNotify?.('Lỗi kết nối máy chủ quét video.', 'error');
    } finally {
      setIsCheckingAir(false);
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

  const filteredMappings = useMemo(() => {
    if (!searchQuery.trim()) return mappings;
    const q = searchQuery.toLowerCase();
    return mappings.filter(
      (m) =>
        m.groupId.toLowerCase().includes(q) ||
        (m.dealCode && m.dealCode.toLowerCase().includes(q)) ||
        (m.kocName && m.kocName.toLowerCase().includes(q)) ||
        (m.brandName && m.brandName.toLowerCase().includes(q))
    );
  }, [mappings, searchQuery]);

  const groupColumns: Column<ZaloGroupMappingItem>[] = [
    {
      key: 'groupId',
      header: 'Mã nhóm (Chat ID)',
      render: (row) => (
        <span className="font-mono text-xs text-ink select-all">
          {row.groupId}
        </span>
      ),
    },
    {
      key: 'dealCode',
      header: 'Mã Deal / Kế hoạch',
      render: (row) => (
        row.dealCode ? (
          <span className="inline-block px-2 py-0.5 rounded bg-sunken font-mono text-xs text-ink font-medium">
            {row.dealCode}
          </span>
        ) : (
          <span className="text-ink-3 italic text-xs">Chưa gán deal</span>
        )
      ),
    },
    {
      key: 'kocName',
      header: 'KOC phụ trách',
      render: (row) => (
        <span className="text-xs text-ink">
          {row.kocName || '—'}
        </span>
      ),
    },
    {
      key: 'brandName',
      header: 'Thương hiệu',
      render: (row) => (
        <span className="text-xs text-ink-2">
          {row.brandName || '—'}
        </span>
      ),
    },
    {
      key: 'linkedAt',
      header: 'Thời gian kết nối',
      render: (row) => (
        <span className="text-xs text-ink-3">
          {new Date(row.linkedAt).toLocaleString('vi-VN')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            icon={Send}
            onClick={() => {
              setBroadcastChatId(row.groupId);
              setActiveTab('BROADCAST');
            }}
          >
            Nhắn tin
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
          {row.body?.event_name || 'message'}
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
      render: (row) => (
        row.replySent ? (
          <Status tone="positive">Đã phản hồi</Status>
        ) : row.error ? (
          <Status tone="critical">{row.error}</Status>
        ) : (
          <Status tone="warning">Đã tiếp nhận</Status>
        )
      ),
    },
    {
      key: 'content',
      header: 'Nội dung tin nhắn',
      render: (row) => (
        <span className="text-xs text-ink truncate max-w-xs block" title={JSON.stringify(row.body)}>
          {row.body?.result?.message?.text || row.body?.message?.text || JSON.stringify(row.body)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* 4 Chỉ số đầu trang */}
      <StatRow>
        <Stat
          label="Trạng thái Webhook"
          value="Hoạt động"
          tone="positive"
        />
        <Stat
          label="Tên Zalo Bot"
          value={botInfo.display_name || 'Bot tttttttupbase'}
        />
        <Stat
          label="Nhóm chat đã liên kết"
          value={mappings.length}
        />
        <Stat
          label="Sự kiện tiếp nhận"
          value={recentEvents.length}
        />
      </StatRow>

      {/* Thanh điều hướng tab */}
      <div className="flex items-center justify-between border-b border-line pb-2">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={activeTab === 'GROUPS' ? 'primary' : 'secondary'}
            icon={MessageSquare}
            onClick={() => setActiveTab('GROUPS')}
          >
            Nhóm chat Zalo ({mappings.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'AIR_CHECK' ? 'primary' : 'secondary'}
            icon={Play}
            onClick={() => setActiveTab('AIR_CHECK')}
          >
            Quét nghiệm thu TikTok
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'BROADCAST' ? 'primary' : 'secondary'}
            icon={Send}
            onClick={() => setActiveTab('BROADCAST')}
          >
            Gửi tin nhắn nhóm
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'WEBHOOK_LOGS' ? 'primary' : 'secondary'}
            icon={ShieldCheck}
            onClick={() => setActiveTab('WEBHOOK_LOGS')}
          >
            Cấu hình & Nhật ký Webhook
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={RefreshCw}
            onClick={fetchBotStatus}
          >
            Làm mới
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

      {/* TAB 1: DANH SÁCH NHÓM CHAT */}
      {activeTab === 'GROUPS' && (
        <Panel
          title="Danh sách nhóm chat đã liên kết"
          actions={
            <Button
              size="sm"
              variant="primary"
              icon={Link2}
              onClick={() => setIsLinkModalOpen(true)}
            >
              Liên kết thủ công
            </Button>
          }
        >
          <div className="space-y-3">
            <FilterBar
              search={{
                value: searchQuery,
                onChange: setSearchQuery,
                placeholder: 'Tìm theo Chat ID, mã deal, tên KOC hoặc thương hiệu...',
              }}
            />

            <DataTable
              columns={groupColumns}
              rows={filteredMappings}
              rowKey={(r) => r.groupId}
              empty={
                <EmptyState
                  title="Chưa có nhóm Zalo nào được liên kết"
                  action={
                    <Button
                      variant="primary"
                      icon={Copy}
                      onClick={handleCopyInviteLink}
                    >
                      Sao chép link mời Bot vào nhóm
                    </Button>
                  }
                />
              }
            />
          </div>
        </Panel>
      )}

      {/* TAB 2: QUÉT NGHIỆM THU TIKTOK */}
      {activeTab === 'AIR_CHECK' && (
        <Panel title="Bộ máy kiểm tra nghiệm thu video TikTok (Air Check Simulator)">
          <div className="space-y-4 max-w-3xl">
            <Field label="Đường link video TikTok cần nghiệm thu">
              <div className="flex gap-2">
                <Input
                  placeholder="https://vt.tiktok.com/ZS... hoặc https://www.tiktok.com/@user/video/..."
                  value={testVideoUrl}
                  onChange={(e) => setTestVideoUrl(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="primary"
                  icon={Play}
                  onClick={handleRunAirCheck}
                  disabled={isCheckingAir}
                >
                  {isCheckingAir ? 'Đang quét...' : 'Quét nghiệm thu'}
                </Button>
              </div>
            </Field>

            {airCheckResult && (
              <div className="border border-line rounded p-4 bg-sunken space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-ink">Kết quả đánh giá:</span>
                    <Status tone={airCheckResult.verdict === 'PASS' ? 'positive' : airCheckResult.verdict === 'REVIEW' ? 'warning' : 'critical'}>
                      {airCheckResult.verdict === 'PASS' ? 'ĐẠT (PASS)' : airCheckResult.verdict === 'REVIEW' ? 'CẦN RÀ SOÁT (REVIEW)' : 'KHÔNG ĐẠT (FAIL)'}
                    </Status>
                  </div>
                  <span className="text-xs text-ink-3 font-mono">
                    ID: {airCheckResult.contentId || '—'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-ink-3">Tác giả kênh:</span>{' '}
                    <span className="font-medium text-ink">@{airCheckResult.author?.handle || '—'}</span>
                  </div>
                  <div>
                    <span className="text-ink-3">Tình trạng phát sóng:</span>{' '}
                    <span className="font-medium text-ink">{airCheckResult.status === 'LIVE' ? 'Đang công khai' : airCheckResult.status}</span>
                  </div>
                  <div>
                    <span className="text-ink-3">Giỏ hàng màu vàng:</span>{' '}
                    <span className="font-medium text-ink">
                      {airCheckResult.hasProductLink ? 'Đã gắn giỏ hàng' : 'Chưa phát hiện giỏ hàng'}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-3">Lượt xem video:</span>{' '}
                    <span className="font-medium text-ink">
                      {airCheckResult.metrics?.views ? airCheckResult.metrics.views.toLocaleString('vi-VN') : '—'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-ink-3">Hashtags:</span>{' '}
                    <span className="font-mono text-ink">
                      {airCheckResult.hashtags?.length ? airCheckResult.hashtags.map((h: string) => `#${h}`).join(' ') : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* TAB 3: BẮN TIN NHẮN VÀO NHÓM */}
      {activeTab === 'BROADCAST' && (
        <Panel title="Gửi tin nhắn hoặc thông báo trực tiếp qua Zalo Bot">
          <div className="space-y-4 max-w-2xl">
            <Field label="Chọn nhóm chat nhận tin">
              <select
                className="w-full h-9 rounded border border-line-strong bg-surface px-3 text-xs text-ink"
                value={broadcastChatId}
                onChange={(e) => setBroadcastChatId(e.target.value)}
              >
                <option value="">-- Chọn nhóm Zalo đã kết nối --</option>
                {mappings.map((m) => (
                  <option key={m.groupId} value={m.groupId}>
                    {m.dealCode ? `[${m.dealCode}] ` : ''}
                    {m.brandName ? `${m.brandName} - ` : ''}
                    {m.kocName ? `${m.kocName} ` : ''}
                    ({m.groupId})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Hoặc nhập Chat/Group ID thủ công">
              <Input
                placeholder="Nhập mã Chat ID người nhận hoặc ID nhóm..."
                value={broadcastChatId}
                onChange={(e) => setBroadcastChatId(e.target.value)}
              />
            </Field>

            <Field label="Nội dung tin nhắn">
              <Textarea
                rows={5}
                placeholder="Nhập nội dung cần gửi tới nhóm Zalo..."
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
                {isSendingMessage ? 'Đang gửi...' : 'Gửi tin nhắn ngay'}
              </Button>
            </div>
          </div>
        </Panel>
      )}

      {/* TAB 4: CẤU HÌNH & NHẬT KÝ WEBHOOK */}
      {activeTab === 'WEBHOOK_LOGS' && (
        <div className="space-y-4">
          <Panel title="Thông tin cấu hình Webhook">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-sunken rounded border border-line space-y-1">
                <span className="text-ink-3">Đường dẫn Webhook URL</span>
                <p className="font-mono font-medium text-ink select-all">
                  {webhookInfo.url || 'https://b2c-theta.vercel.app/api/integrations/zalo-bot/webhook'}
                </p>
              </div>
              <div className="p-3 bg-sunken rounded border border-line space-y-1">
                <span className="text-ink-3">Mã khóa bí mật (Secret Token)</span>
                <p className="font-mono font-medium text-ink">hDHD****3--U (Đã xác thực)</p>
              </div>
              <div className="p-3 bg-sunken rounded border border-line space-y-1">
                <span className="text-ink-3">Bot Account Name</span>
                <p className="font-mono font-medium text-ink">bot.qxQiPkja</p>
              </div>
              <div className="p-3 bg-sunken rounded border border-line space-y-1">
                <span className="text-ink-3">Quyền tham gia nhóm</span>
                <p className="font-medium text-positive">Đã cho phép (can_join_groups: True)</p>
              </div>
            </div>
          </Panel>

          <Panel title="Nhật ký các gói tin nhận từ Zalo (Webhook Logs)">
            <DataTable
              columns={logColumns}
              rows={recentEvents}
              rowKey={(r) => `${r.time}-${r.extractedChatId || ''}`}
              empty={
                <EmptyState
                  title="Chưa có gói tin mới từ Zalo"
                />
              }
            />
          </Panel>
        </div>
      )}

      {/* MODAL LIÊN KẾT NHÓM THỦ CÔNG */}
      <Modal
        open={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        title="Liên kết nhóm chat Zalo với Deal"
      >
        <div className="space-y-3">
          <Field label="Chat / Group ID (*)">
            <Input
              placeholder="Ví dụ: group_123456789"
              value={modalGroupId}
              onChange={(e) => setModalGroupId(e.target.value)}
            />
          </Field>
          <Field label="Mã Deal / Kế hoạch booking">
            <Input
              placeholder="Ví dụ: DEAL-108 hoặc BO2610-001"
              value={modalDealCode}
              onChange={(e) => setModalDealCode(e.target.value)}
            />
          </Field>
          <Field label="Tên KOC phụ trách">
            <Input
              placeholder="Ví dụ: Quỳnh Anh Beauty"
              value={modalKocName}
              onChange={(e) => setModalKocName(e.target.value)}
            />
          </Field>
          <Field label="Thương hiệu">
            <Input
              placeholder="Ví dụ: ClubClio, Cindy Bloom..."
              value={modalBrandName}
              onChange={(e) => setModalBrandName(e.target.value)}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-3 border-t border-line">
            <Button variant="secondary" onClick={() => setIsLinkModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSaveMapping}>
              Lưu liên kết
            </Button>
          </div>
        </div>
      </Modal>

      {/* CONFIRM DIALOG HỦY LIÊN KẾT */}
      <ConfirmDialog
        open={Boolean(unlinkTargetGroupId)}
        title="Hủy liên kết nhóm Zalo"
        message={`Bạn có chắc chắn muốn hủy liên kết cho nhóm ${unlinkTargetGroupId}? Bot sẽ ngừng nhận lệnh đối soát deal cho nhóm này.`}
        confirmLabel="Hủy liên kết"
        tone="critical"
        onCancel={() => setUnlinkTargetGroupId(null)}
        onConfirm={handleConfirmUnlink}
      />
    </div>
  );
}
