'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  History,
  Plus,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import { REAL_B2C_42_BRANDS } from '../../lib/realB2cBrandsData';
import {
  deleteKocChannelReview,
  getReasonPresetsByVerdict,
  getVerdictTone,
  KOC_REVIEW_VERDICT_OPTIONS,
  normalizeKocChannelHandle,
  submitKocChannelReview,
  useKocChannelReviews,
  type KocChannelReviewItem,
  type KocChannelReviewSummary,
  type KocChannelReviewVerdict,
} from '../../lib/kocChannelReviewService';
import {
  Avatar,
  Button,
  Chips,
  DataTable,
  Field,
  Input,
  Modal,
  Panel,
  SearchInput,
  Select,
  Status,
  Tabs,
  Textarea,
} from '../ui';
import type { Column } from '../ui';

export interface KocChannelReviewTarget {
  handle: string;
  channelName?: string;
  channelUrl?: string;
  avatarUrl?: string;
  defaultBrandScope?: string;
  initialBrandName?: string;
  initialVerdict?: KocChannelReviewVerdict;
  sourceScreen?: string;
}

interface KocChannelReviewModalProps {
  open: boolean;
  onClose: () => void;
  target: KocChannelReviewTarget | null;
  reviews: KocChannelReviewItem[];
  currentUserName?: string;
  currentUserRole?: string;
  currentUserEmail?: string;
  initialMode?: 'CHANNEL_DETAIL' | 'ALL_HISTORY';
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const KocChannelReviewBadge: React.FC<{
  summary?: KocChannelReviewSummary;
  onClick?: (e: React.MouseEvent) => void;
  compact?: boolean;
}> = ({ summary, onClick, compact = false }) => {
  if (!summary || summary.totalReviews === 0) return null;

  const brandItems = summary.byBrand && summary.byBrand.length > 0
    ? summary.byBrand
    : [
        {
          brandScope: summary.latestReview.brandScope || 'Toàn hệ thống B2C',
          verdict: summary.latestReview.verdict,
          verdictLabel: summary.latestReview.verdictLabel,
          latestReview: summary.latestReview,
          reviewCount: summary.totalReviews,
        },
      ];

  const visibleBrands = compact ? brandItems.slice(0, 2) : brandItems.slice(0, 3);
  const extraCount = brandItems.length - visibleBrands.length;

  const tooltip = [
    `Kênh @${summary.handle} (${summary.totalReviews} lượt đánh giá):`,
    ...brandItems.map(
      (b) =>
        `• [${b.brandScope}] ${b.verdictLabel} — ĐG bởi ${b.latestReview.reviewerName} (${b.latestReview.timeLabel} ${b.latestReview.dateLabel})${
          b.latestReview.note ? `: "${b.latestReview.note}"` : ''
        }`
    ),
  ].join('\n');

  return (
    <span className="inline-flex flex-wrap items-center gap-1" title={tooltip}>
      {visibleBrands.map((b) => {
        const tone = getVerdictTone(b.verdict);
        const shortBrand =
          b.brandScope === 'Toàn hệ thống B2C' ? 'Toàn B2C' : b.brandScope;
        return (
          <button
            key={b.brandScope}
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-1 h-5 px-2 rounded-full text-2xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer border ${
              tone === 'critical'
                ? 'bg-critical-soft text-critical border-critical/30 hover:bg-critical hover:text-white'
                : tone === 'warning'
                  ? 'bg-warning-soft text-warning border-warning/30 hover:bg-warning hover:text-white'
                  : 'bg-positive-soft text-positive border-positive/30 hover:bg-positive hover:text-white'
            }`}
          >
            {tone === 'critical' ? (
              <XCircle className="w-3 h-3 shrink-0" />
            ) : tone === 'positive' ? (
              <CheckCircle2 className="w-3 h-3 shrink-0" />
            ) : (
              <History className="w-3 h-3 shrink-0" />
            )}
            <span>
              {shortBrand}: {b.verdictLabel}
            </span>
          </button>
        );
      })}
      {extraCount > 0 && (
        <button
          type="button"
          onClick={onClick}
          className="inline-flex items-center h-5 px-1.5 rounded-full text-2xs font-semibold bg-sunken text-ink-2 border border-line hover:bg-ink hover:text-white cursor-pointer"
        >
          +{extraCount} Brand
        </button>
      )}
    </span>
  );
};

export const KocChannelReviewModal: React.FC<KocChannelReviewModalProps> = ({
  open,
  onClose,
  target,
  reviews,
  currentUserName = 'Nhân sự B2C',
  currentUserRole = 'Chuyên viên Booking B2C',
  currentUserEmail,
  initialMode = 'CHANNEL_DETAIL',
  onNotify,
}) => {
  const defaultBrandList = useMemo(() => {
    const names = Array.from(
      new Set(REAL_B2C_42_BRANDS.map((b) => b.name).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, 'vi'));
    return [...names, 'Toàn hệ thống B2C'];
  }, []);

  const resolveInitialBrand = (raw?: string) => {
    if (raw && raw !== 'ALL' && raw !== 'TOÀN_HỆ_THỐNG') return raw;
    return defaultBrandList[0] || 'Kutieskin';
  };

  const [activeTab, setActiveTab] = useState<'CHANNEL_DETAIL' | 'ALL_HISTORY'>(
    target?.handle ? initialMode : 'ALL_HISTORY'
  );
  const [channelHandleInput, setChannelHandleInput] = useState<string>(
    target?.handle || ''
  );
  const [channelNameInput, setChannelNameInput] = useState<string>(
    target?.channelName || ''
  );
  const [verdict, setVerdict] = useState<KocChannelReviewVerdict>(
    target?.initialVerdict || 'NOT_SUITABLE'
  );
  const [selectedReasons, setSelectedReasons] = useState<string[]>([
    getReasonPresetsByVerdict(target?.initialVerdict || 'NOT_SUITABLE')[0],
  ]);
  const [note, setNote] = useState<string>('');
  const [brandScope, setBrandScope] = useState<string>(
    resolveInitialBrand(target?.defaultBrandScope || target?.initialBrandName)
  );
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [justSavedId, setJustSavedId] = useState<string | null>(null);
  const [justSavedNotice, setJustSavedNotice] = useState<string | null>(null);
  const { reviews: liveHookReviews } = useKocChannelReviews();
  const [localReviews, setLocalReviews] = useState<KocChannelReviewItem[]>(reviews);

  const effectiveReviews = useMemo(() => {
    const byId = new Map<string, KocChannelReviewItem>();
    for (const item of [...localReviews, ...liveHookReviews, ...reviews]) {
      if (!item || !item.id) continue;
      if (!byId.has(item.id)) {
        byId.set(item.id, item);
      }
    }
    return Array.from(byId.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [localReviews, liveHookReviews, reviews]);

  // Bộ lọc tab Tất cả lịch sử đánh giá
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyVerdictFilter, setHistoryVerdictFilter] = useState<
    'ALL' | KocChannelReviewVerdict
  >('ALL');
  const [historyBrandFilter, setHistoryBrandFilter] = useState<string>('ALL');

  const preferredTargetBrand = target?.defaultBrandScope || target?.initialBrandName || '';
  const syncKey = `${open}-${target?.handle || ''}-${initialMode}-${target?.initialVerdict || ''}-${preferredTargetBrand}`;
  const [prevSyncKey, setPrevSyncKey] = useState<string>(syncKey);
  if (syncKey !== prevSyncKey) {
    setPrevSyncKey(syncKey);
    if (open) {
      const clean = normalizeKocChannelHandle(target?.handle);
      const initVerdict = target?.initialVerdict || 'NOT_SUITABLE';
      setChannelHandleInput(clean ? `@${clean}` : '');
      setChannelNameInput(target?.channelName || '');
      setBrandScope(resolveInitialBrand(preferredTargetBrand));
      setVerdict(initVerdict);
      setSelectedReasons([getReasonPresetsByVerdict(initVerdict)[0]]);
      setNote('');
      setErrorMsg(null);
      setJustSavedId(null);
      setJustSavedNotice(null);
      setActiveTab(clean ? initialMode : 'ALL_HISTORY');
    }
  }

  const handleSelectVerdict = (nextVerdict: KocChannelReviewVerdict) => {
    setVerdict(nextVerdict);
    const nextPresets = getReasonPresetsByVerdict(nextVerdict);
    setSelectedReasons([nextPresets[0]]);
  };

  const activeCleanHandle = useMemo(
    () => normalizeKocChannelHandle(channelHandleInput || target?.handle),
    [channelHandleInput, target?.handle]
  );

  const channelReviews = useMemo(() => {
    if (!activeCleanHandle) return [];
    return effectiveReviews
      .filter((r) => normalizeKocChannelHandle(r.handle) === activeCleanHandle)
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [effectiveReviews, activeCleanHandle]);

  const channelBrandSummaryRows = useMemo(() => {
    const map = new Map<
      string,
      { brandScope: string; latest: KocChannelReviewItem; count: number }
    >();
    for (const r of channelReviews) {
      const b = (r.brandScope || 'Toàn hệ thống B2C').trim();
      const key = b.toLowerCase();
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { brandScope: b, latest: r, count: 1 });
      } else {
        existing.count += 1;
      }
    }
    return Array.from(map.values());
  }, [channelReviews]);

  const filteredAllReviews = useMemo(() => {
    const q = historySearch.trim().toLowerCase().replace(/^@+/, '');
    return effectiveReviews.filter((r) => {
      if (historyVerdictFilter !== 'ALL' && r.verdict !== historyVerdictFilter) {
        return false;
      }
      if (
        historyBrandFilter !== 'ALL' &&
        (r.brandScope || '').toLowerCase() !== historyBrandFilter.toLowerCase()
      ) {
        return false;
      }
      if (q) {
        const hitHandle = r.handle.toLowerCase().includes(q);
        const hitName = (r.channelName || '').toLowerCase().includes(q);
        const hitReviewer = (r.reviewerName || '').toLowerCase().includes(q);
        const hitNote = (r.note || '').toLowerCase().includes(q);
        const hitBrand = (r.brandScope || '').toLowerCase().includes(q);
        const hitReason = r.reasonTags.some((t) => t.toLowerCase().includes(q));
        if (
          !hitHandle &&
          !hitName &&
          !hitReviewer &&
          !hitNote &&
          !hitBrand &&
          !hitReason
        ) {
          return false;
        }
      }
      return true;
    });
  }, [effectiveReviews, historySearch, historyVerdictFilter, historyBrandFilter]);

  const brandOptions = defaultBrandList;

  const currentReasonPresets = useMemo(
    () => getReasonPresetsByVerdict(verdict),
    [verdict]
  );

  const historyColumns: Column<KocChannelReviewItem>[] = [
    {
      key: 'koc',
      header: 'Kênh KOC (@handle)',
      width: 190,
      render: (r) => (
        <div className="min-w-0 leading-tight space-y-0.5">
          <div className="font-code text-xs font-semibold text-accent truncate">
            @{r.handle}
          </div>
          {r.channelName && r.channelName !== `@${r.handle}` && (
            <div className="text-2xs text-ink-2 truncate">{r.channelName}</div>
          )}
        </div>
      ),
    },
    {
      key: 'brand',
      header: 'Brand (Nhãn hàng)',
      width: 150,
      render: (r) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-sunken border border-line text-xs font-semibold text-ink">
          {r.brandScope || 'Toàn hệ thống B2C'}
        </span>
      ),
    },
    {
      key: 'verdict',
      header: 'Đánh giá',
      width: 145,
      render: (r) => (
        <Status tone={getVerdictTone(r.verdict)}>{r.verdictLabel}</Status>
      ),
    },
    {
      key: 'opinion',
      header: 'Ý kiến nhân viên & Lý do',
      render: (r) => (
        <div className="space-y-1 min-w-0">
          {r.note && (
            <div className="text-xs text-ink leading-snug">
              <span className="font-semibold text-ink-2">Ý kiến: </span>
              <span>{r.note}</span>
            </div>
          )}
          {r.reasonTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {r.reasonTags.map((t) => (
                <span
                  key={t}
                  className="px-1.5 py-0.5 rounded bg-sunken/80 border border-line text-2xs text-ink-2"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'reviewer',
      header: 'Người đánh giá & Thời gian',
      width: 185,
      render: (r) => (
        <div className="text-2xs leading-tight space-y-0.5 tabular-nums">
          <div className="font-semibold text-ink text-xs">{r.reviewerName}</div>
          <div className="text-ink-3">
            {r.timeLabel} · {r.dateLabel}
          </div>
        </div>
      ),
    },
  ];

  const toggleReason = (reason: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  };

  const handleSaveReview = async () => {
    if (!activeCleanHandle) {
      setErrorMsg('Vui lòng nhập @handle hoặc đường dẫn kênh KOC cần đánh giá.');
      return;
    }
    const effectiveReasons =
      selectedReasons.length > 0
        ? selectedReasons
        : [getReasonPresetsByVerdict(verdict)[0]];
    const cleanNote = note.trim() || effectiveReasons.join(', ');

    setSubmitting(true);
    setErrorMsg(null);
    setJustSavedNotice(null);
    try {
      const resolvedName =
        channelNameInput.trim() ||
        target?.channelName ||
        channelReviews[0]?.channelName ||
        `@${activeCleanHandle}`;

      const result = await submitKocChannelReview({
        handle: activeCleanHandle,
        channelName: resolvedName,
        channelUrl:
          target?.channelUrl || `https://www.tiktok.com/@${activeCleanHandle}`,
        avatarUrl: target?.avatarUrl,
        verdict,
        reasonTags: effectiveReasons,
        note: cleanNote,
        brandScope,
        sourceScreen: target?.sourceScreen || 'Tìm kiếm KOC',
        reviewerName: currentUserName,
        reviewerRole: currentUserRole,
        reviewerEmail: currentUserEmail,
      });

      if (!result.success) {
        setErrorMsg(result.message || 'Không lưu được đánh giá kênh KOC.');
        return;
      }

      setLocalReviews(result.items);
      if (result.item?.id) {
        setJustSavedId(result.item.id);
      }
      const verdictShort =
        verdict === 'NOT_SUITABLE'
          ? 'Không phù hợp'
          : verdict === 'CAUTION'
            ? 'Cân nhắc'
            : 'Phù hợp';
      setJustSavedNotice(
        `Đã lưu "${verdictShort}" (${brandScope}) cho @${activeCleanHandle}`
      );
      setNote('');
      onNotify?.(
        `Đã lưu lịch sử đánh giá (${verdictShort}) cho kênh @${activeCleanHandle}`,
        verdict === 'NOT_SUITABLE' ? 'warning' : 'success'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (item: KocChannelReviewItem) => {
    setLocalReviews((prev) => prev.filter((it) => it.id !== item.id));
    const res = await deleteKocChannelReview(item.id);
    setLocalReviews(res.items);
    onNotify?.(`Đã xóa lượt đánh giá của ${item.reviewerName} trên kênh @${item.handle}`, 'info');
  };

  const handleSelectChannelFromHistory = (item: KocChannelReviewItem) => {
    setChannelHandleInput(`@${item.handle}`);
    setChannelNameInput(item.channelName);
    setActiveTab('CHANNEL_DETAIL');
  };

  const nowPreview = useMemo(() => {
    const now = new Date();
    const d = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(now);
    const t = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);
    return `${t} - ${d}`;
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        activeCleanHandle
          ? `Đánh giá Kênh & Lịch sử đánh giá — @${activeCleanHandle}`
          : 'Lịch sử đánh giá Kênh KOC toàn hệ thống'
      }
      size="xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <div className="text-2xs text-ink-3">
              Người đánh giá: <strong className="text-ink">{currentUserName}</strong> · Thời gian:{' '}
              <strong className="text-ink font-code">{nowPreview}</strong>
            </div>
            {errorMsg && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-critical-soft border border-critical/30 text-2xs font-semibold text-critical">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </span>
            )}
            {!errorMsg && justSavedNotice && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-positive-soft border border-positive/30 text-2xs font-semibold text-positive">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{justSavedNotice}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Đóng
            </Button>
            {activeTab === 'CHANNEL_DETAIL' && (
              <Button
                variant="primary"
                icon={Check}
                disabled={submitting}
                onClick={() => void handleSaveReview()}
              >
                {submitting ? 'Đang lưu...' : 'Lưu đánh giá vào lịch sử'}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <Tabs<'CHANNEL_DETAIL' | 'ALL_HISTORY'>
          items={[
            {
              key: 'CHANNEL_DETAIL',
              label: activeCleanHandle
                ? `Đánh giá & Lịch sử @${activeCleanHandle}`
                : 'Ghi nhận đánh giá kênh',
              count: channelReviews.length > 0 ? channelReviews.length : undefined,
            },
            {
              key: 'ALL_HISTORY',
              label: 'Tất cả lịch sử đánh giá KOC',
              count: effectiveReviews.length > 0 ? effectiveReviews.length : undefined,
            },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'CHANNEL_DETAIL' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Cột trái: Form đánh giá không phù hợp */}
            <div className="lg:col-span-6 space-y-3">
              <Panel title="Ghi nhận đánh giá mới">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-end">
                    <Field label="Mã kênh (@handle) *">
                      <Input
                        value={channelHandleInput}
                        onChange={(e) => setChannelHandleInput(e.target.value)}
                        placeholder="VD: @quinskincareholic"
                        className="font-code text-xs"
                      />
                    </Field>
                    <Field label="Tên hiển thị của kênh">
                      <Input
                        value={channelNameInput}
                        onChange={(e) => setChannelNameInput(e.target.value)}
                        placeholder="VD: Quin Skincare Holic"
                        className="text-xs"
                      />
                    </Field>
                  </div>

                  <Field label="Nhãn hàng (Brand) đánh giá *">
                    <Select
                      value={brandScope}
                      onChange={(e) => setBrandScope(e.target.value)}
                      className="text-xs font-semibold"
                    >
                      {brandOptions.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Kết luận đánh giá cho Brand *">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {KOC_REVIEW_VERDICT_OPTIONS.map((opt) => {
                        const isSelected = verdict === opt.key;
                        const shortBtnLabel =
                          opt.key === 'SUITABLE'
                            ? '✓ Phù hợp'
                            : opt.key === 'CAUTION'
                              ? 'Cân nhắc'
                              : '✕ Không phù hợp';
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => handleSelectVerdict(opt.key)}
                            className={`h-9 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 whitespace-nowrap transition cursor-pointer ${
                              isSelected
                                ? opt.tone === 'critical'
                                  ? 'bg-critical text-white border-critical shadow-xs'
                                  : opt.tone === 'warning'
                                    ? 'bg-warning text-white border-warning shadow-xs'
                                    : 'bg-positive text-white border-positive shadow-xs'
                                : 'bg-surface border-line text-ink-2 hover:bg-sunken'
                            }`}
                          >
                            <span>{shortBtnLabel}</span>
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  <Field label="Ý kiến đánh giá của nhân viên">
                    <Textarea
                      rows={3}
                      autoFocus={Boolean(activeCleanHandle)}
                      value={note}
                      onChange={(e) => {
                        setNote(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      placeholder={
                        verdict === 'SUITABLE'
                          ? 'Ghi rõ ý kiến vì sao kênh phù hợp với Brand này (VD: Tệp mẹ bỉm tương tác hỏi mua tốt, hình ảnh hợp nhãn, đơn giá hợp lý)...'
                          : verdict === 'CAUTION'
                            ? 'Ghi rõ điểm cần lưu ý khi book kênh này cho Brand (VD: Cần deal lại giá hoặc duyệt kỹ kịch bản trước khi quay)...'
                            : 'Ghi rõ ý kiến vì sao kênh không phù hợp với Brand này (VD: Đã liên hệ báo giá quá cao so với view thực tế, kênh đang gắn giỏ độc quyền đối thủ)...'
                      }
                      className="text-xs"
                    />
                  </Field>

                  <Field label="Nhóm lý do đi kèm (chọn một hoặc nhiều)">
                    <div className="flex flex-wrap gap-1.5">
                      {currentReasonPresets.map((reason) => {
                        const active = selectedReasons.includes(reason);
                        return (
                          <button
                            key={reason}
                            type="button"
                            onClick={() => toggleReason(reason)}
                            className={`px-2.5 py-1 rounded-md border text-2xs font-medium transition cursor-pointer ${
                              active
                                ? verdict === 'NOT_SUITABLE'
                                  ? 'bg-critical-soft text-critical border-critical/40 font-semibold'
                                  : verdict === 'SUITABLE'
                                    ? 'bg-positive-soft text-positive border-positive/40 font-semibold'
                                    : 'bg-warning-soft text-warning border-warning/40 font-semibold'
                                : 'bg-surface border-line text-ink-2 hover:bg-sunken'
                            }`}
                          >
                            {active ? '✓ ' : '+ '}
                            {reason}
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  {errorMsg && (
                    <div className="px-3 py-2 rounded-lg bg-critical-soft border border-critical-line text-xs text-critical flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {justSavedNotice && !errorMsg && (
                    <div className="px-3 py-2 rounded-lg bg-positive-soft border border-positive/30 text-xs text-positive font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{justSavedNotice} — Đã cập nhật sang bảng bên phải.</span>
                    </div>
                  )}

                  <div className="pt-1 flex justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Check}
                      disabled={submitting}
                      onClick={() => void handleSaveReview()}
                    >
                      {submitting ? 'Đang lưu...' : 'Lưu đánh giá vào lịch sử'}
                    </Button>
                  </div>
                </div>
              </Panel>
            </div>

            {/* Cột phải: Lịch sử đánh giá của kênh này */}
            <div className="lg:col-span-6 space-y-3">
              <Panel
                title={
                  activeCleanHandle
                    ? `Lịch sử đánh giá kênh @${activeCleanHandle} (${channelReviews.length})`
                    : 'Lịch sử đánh giá của kênh'
                }
                actions={
                  activeCleanHandle ? (
                    <a
                      href={`https://www.tiktok.com/@${activeCleanHandle}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-2xs font-medium text-accent hover:underline font-code"
                    >
                      <span>Mở TikTok</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : undefined
                }
              >
                {channelReviews.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <History className="w-7 h-7 text-ink-3 mx-auto stroke-[1.5]" />
                    <div className="text-xs font-medium text-ink-2">
                      {activeCleanHandle
                        ? `Kênh @${activeCleanHandle} chưa có lịch sử đánh giá nào.`
                        : 'Nhập @handle kênh ở cột bên trái để xem hoặc ghi nhận lịch sử đánh giá.'}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Bảng tổng hợp theo từng cột Brand */}
                    <div className="rounded-lg border border-line overflow-hidden bg-surface">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-sunken/60 border-b border-line text-2xs font-semibold text-ink-2">
                            <th className="px-2.5 py-1.5">Brand</th>
                            <th className="px-2.5 py-1.5">Kết luận</th>
                            <th className="px-2.5 py-1.5">Ý kiến &amp; Lý do</th>
                            <th className="px-2.5 py-1.5">Người ĐG &amp; Thời gian</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {channelBrandSummaryRows.map((row) => {
                            const isJustSaved = row.latest.id === justSavedId;
                            return (
                              <tr
                                key={row.brandScope}
                                className={
                                  isJustSaved
                                    ? 'bg-accent-soft/25 transition-colors'
                                    : 'hover:bg-sunken/30'
                                }
                              >
                                <td className="px-2.5 py-1.5 font-semibold text-ink whitespace-nowrap">
                                  {row.brandScope}
                                </td>
                                <td className="px-2.5 py-1.5 whitespace-nowrap">
                                  <Status tone={getVerdictTone(row.latest.verdict)}>
                                    {row.latest.verdictLabel}
                                  </Status>
                                </td>
                                <td className="px-2.5 py-1.5 text-2xs text-ink max-w-[180px]">
                                  <div className="line-clamp-2 leading-snug">
                                    {row.latest.note || row.latest.reasonTags.join(', ')}
                                  </div>
                                </td>
                                <td className="px-2.5 py-1.5 text-2xs text-ink-2 tabular-nums whitespace-nowrap">
                                  <div className="font-medium text-ink">
                                    {row.latest.reviewerName}
                                  </div>
                                  <div className="text-ink-3">
                                    {row.latest.timeLabel} · {row.latest.dateLabel}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                      {channelReviews.map((rev) => {
                        const isJustSaved = rev.id === justSavedId;
                        return (
                          <div
                            key={rev.id}
                            className={`p-3 rounded-xl border space-y-2 ${
                              rev.verdict === 'NOT_SUITABLE'
                                ? 'bg-critical-soft/35 border-critical/30'
                                : rev.verdict === 'CAUTION'
                                  ? 'bg-warning-soft/35 border-warning/30'
                                  : 'bg-positive-soft/35 border-positive/30'
                            } ${isJustSaved ? 'ring-2 ring-accent/50' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar name={rev.reviewerName} size={28} />
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs font-semibold text-ink">
                                      {rev.reviewerName}
                                    </span>
                                    {rev.reviewerRole && (
                                      <span className="text-2xs text-ink-3">
                                        · {rev.reviewerRole}
                                      </span>
                                    )}
                                      {isJustSaved && (
                                        <span className="px-1.5 py-0.5 rounded bg-accent text-white text-3xs font-semibold">
                                          Mới lưu
                                        </span>
                                      )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 text-2xs text-ink-3 tabular-nums">
                                    <Clock className="w-3 h-3 text-ink-3 shrink-0" />
                                    <span>
                                      {rev.timeLabel} · {rev.dateLabel}
                                    </span>
                                    <span>·</span>
                                    <span className="px-1.5 py-0.5 rounded bg-surface border border-line font-semibold text-ink">
                                      Brand: {rev.brandScope}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <Status tone={getVerdictTone(rev.verdict)}>
                                  {rev.verdictLabel}
                                </Status>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteReview(rev)}
                                  title="Xóa lượt đánh giá này"
                                  className="p-1 rounded hover:bg-sunken text-ink-3 hover:text-critical transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {rev.reasonTags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {rev.reasonTags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-2 py-0.5 rounded bg-surface border border-line text-2xs font-medium text-ink"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {rev.note && (
                              <div className="text-xs text-ink leading-relaxed bg-surface/90 px-2.5 py-2 rounded-lg border border-line/70">
                                <span className="font-semibold text-ink-2">Ý kiến đánh giá: </span>
                                <span>{rev.note}</span>
                              </div>
                            )}

                            <div className="text-2xs text-ink-3 flex items-center justify-between">
                              <span>Nguồn ghi nhận: {rev.sourceScreen}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Panel>
            </div>
          </div>
        ) : (
          /* Tab 2: Danh sách toàn bộ lịch sử đánh giá KOC trên hệ thống */
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-sunken/40 p-2.5 rounded-xl border border-line">
              <Chips<'ALL' | KocChannelReviewVerdict>
                items={[
                  { key: 'ALL', label: 'Tất cả đánh giá', count: effectiveReviews.length },
                  {
                    key: 'SUITABLE',
                    label: 'Phù hợp',
                    count: effectiveReviews.filter((r) => r.verdict === 'SUITABLE').length,
                  },
                  {
                    key: 'CAUTION',
                    label: 'Cân nhắc / Lưu ý',
                    count: effectiveReviews.filter((r) => r.verdict === 'CAUTION').length,
                  },
                  {
                    key: 'NOT_SUITABLE',
                    label: 'Không phù hợp',
                    count: effectiveReviews.filter((r) => r.verdict === 'NOT_SUITABLE').length,
                  },
                ]}
                value={historyVerdictFilter}
                onChange={setHistoryVerdictFilter}
              />

              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={historyBrandFilter}
                  onChange={(e) => setHistoryBrandFilter(e.target.value)}
                  aria-label="Lọc theo Brand"
                  className="w-auto h-8 text-xs"
                >
                  <option value="ALL">Mọi Brand (Nhãn hàng)</option>
                  {brandOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </Select>
                <SearchInput
                  value={historySearch}
                  onChange={setHistorySearch}
                  placeholder="Tìm @handle, tên kênh, người đánh giá, ý kiến..."
                  className="w-56 [&_input]:h-8 [&_input]:text-xs"
                />
                <Button
                  size="sm"
                  variant="primary"
                  icon={Plus}
                  onClick={() => {
                    if (historySearch.trim()) {
                      setChannelHandleInput(historySearch.trim());
                    }
                    setActiveTab('CHANNEL_DETAIL');
                  }}
                >
                  Thêm đánh giá kênh
                </Button>
              </div>
            </div>

            {filteredAllReviews.length === 0 ? (
              <div className="py-10 text-center space-y-2 border border-line rounded-xl bg-surface">
                <Search className="w-6 h-6 text-ink-3 mx-auto" />
                <div className="text-xs text-ink-2">
                  Không tìm thấy lịch sử đánh giá kênh KOC nào khớp bộ lọc.
                </div>
              </div>
            ) : (
              <div className="border border-line rounded-xl overflow-hidden bg-surface">
                <DataTable
                  columns={historyColumns}
                  rows={filteredAllReviews}
                  rowKey={(r) => r.id}
                  onRowClick={(r) => handleSelectChannelFromHistory(r)}
                  compact
                />
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
