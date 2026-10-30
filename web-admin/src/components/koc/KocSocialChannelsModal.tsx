'use client';

import React, { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ExternalLink,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Star,
  Trash2,
} from 'lucide-react';
import type { KocConnectedChannel, KocItem, KocPlatformType } from '../../lib/types';
import {
  Button,
  FacebookLogo,
  Input,
  InstagramLogo,
  Modal,
  Select,
  ShopeeLogo,
  Status,
  ThreadsLogo,
  TikTokLogo,
} from '../ui';
import {
  formatFollowers,
  getKocConnectedChannels,
  syncKocWithConnectedChannels,
} from './kocUtils';

interface DiscoveredCandidate {
  handle: string;
  url: string;
  title: string;
  snippet: string;
  confidence: 'CAO' | 'TRUNG_BÌNH' | 'GỢI_Ý';
  reason: string;
  verifiedExists?: boolean;
  followerHint?: string;
}

interface DiscoveryResponse {
  queryInfo: {
    baseHandle: string;
    stageName: string;
    realName: string;
    bioText?: string;
    bioLinksFetched?: string[];
  };
  platforms: {
    SHOPEE: DiscoveredCandidate[];
    FACEBOOK: DiscoveredCandidate[];
    INSTAGRAM: DiscoveredCandidate[];
    THREADS: DiscoveredCandidate[];
  };
  fetchedAt: string;
}

interface KocSocialChannelsModalProps {
  open: boolean;
  koc: KocItem | null;
  sharedOwnerKocs?: KocItem[];
  onClose: () => void;
  onSave?: (updated: KocItem) => void;
  onConfirmSave?: (
    kocId: string,
    updates: {
      channelId?: string;
      tiktokChannel?: string;
      tiktokChannels?: string[];
      connectedChannels?: KocConnectedChannel[];
      shopeeChannel?: string;
      facebookChannel?: string;
      instagramChannel?: string;
      threadsChannel?: string;
      platforms: ('TIKTOK' | 'SHOPEE' | 'FACEBOOK' | 'INSTAGRAM' | 'THREADS')[];
    },
  ) => void;
}

type SocialKey = 'SHOPEE' | 'FACEBOOK' | 'INSTAGRAM' | 'THREADS';

const PLATFORM_META: Array<{
  key: SocialKey;
  label: string;
  roleLabel: string;
  placeholder: string;
  urlPrefix: string;
  Logo: React.FC<{ className?: string }>;
}> = [
  {
    key: 'SHOPEE',
    label: 'Shopee Video / Affiliate',
    roleLabel: 'Kênh Shopee Video / Affiliate',
    placeholder: 'username hoặc link shopee.vn/...',
    urlPrefix: 'https://shopee.vn/',
    Logo: ShopeeLogo,
  },
  {
    key: 'FACEBOOK',
    label: 'Facebook / Reels',
    roleLabel: 'Trang / Facebook Reels',
    placeholder: 'username hoặc link facebook.com/...',
    urlPrefix: 'https://www.facebook.com/',
    Logo: FacebookLogo,
  },
  {
    key: 'INSTAGRAM',
    label: 'Instagram Reels',
    roleLabel: 'Kênh Instagram Reels',
    placeholder: '@username hoặc link instagram.com/...',
    urlPrefix: 'https://www.instagram.com/',
    Logo: InstagramLogo,
  },
  {
    key: 'THREADS',
    label: 'Threads',
    roleLabel: 'Kênh Threads',
    placeholder: '@username hoặc link threads.net/@...',
    urlPrefix: 'https://www.threads.net/@',
    Logo: ThreadsLogo,
  },
];

const TIKTOK_ROLE_OPTIONS = [
  { value: 'Kênh TikTok phụ (Vlog / Đời sống)', label: 'Kênh phụ · Vlog / Đời sống' },
  { value: 'Kênh TikTok phụ (Review / Chuyên môn)', label: 'Kênh phụ · Review / Chuyên môn' },
  { value: 'Kênh TikTok phụ (Livestream / Bán hàng)', label: 'Kênh phụ · Livestream / Bán hàng' },
  { value: 'Kênh TikTok phụ (Cùng chủ sở hữu)', label: 'Kênh phụ · Cùng chủ sở hữu' },
];

function cleanInputHandle(raw: string): string {
  const s = (raw || '').trim();
  if (!s) return '';
  const m = s.match(/(?:tiktok\.com\/@|facebook\.com\/|instagram\.com\/|threads\.net\/@|shopee\.vn\/)([a-zA-Z0-9._-]+)/i);
  if (m && m[1]) return m[1].replace(/^@/, '').trim();
  return s.replace(/^@/, '').trim();
}

export const KocSocialChannelsModal: React.FC<KocSocialChannelsModalProps> = ({
  open,
  koc,
  sharedOwnerKocs,
  onClose,
  onSave,
  onConfirmSave,
}) => {
  const [tiktokChannels, setTiktokChannels] = useState<KocConnectedChannel[]>([]);
  const [newTiktokHandle, setNewTiktokHandle] = useState('');
  const [newTiktokRole, setNewTiktokRole] = useState('Kênh TikTok phụ (Vlog / Đời sống)');

  const [values, setValues] = useState<Record<SocialKey, string>>({
    SHOPEE: koc?.shopeeChannel || '',
    FACEBOOK: koc?.facebookChannel || '',
    INSTAGRAM: koc?.instagramChannel || '',
    THREADS: koc?.threadsChannel || '',
  });
  const [confirmed, setConfirmed] = useState<Record<SocialKey, boolean>>({
    SHOPEE: Boolean(koc?.shopeeChannel),
    FACEBOOK: Boolean(koc?.facebookChannel),
    INSTAGRAM: Boolean(koc?.instagramChannel),
    THREADS: Boolean(koc?.threadsChannel),
  });

  const [showBioInput, setShowBioInput] = useState(false);
  const [bioHubUrl, setBioHubUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [discovery, setDiscovery] = useState<DiscoveryResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !koc) return;
    const allConnected = getKocConnectedChannels(koc, sharedOwnerKocs);
    const ttList = allConnected.filter((c) => c.platform === 'TIKTOK');
    setTiktokChannels(ttList);
    setNewTiktokHandle('');

    const byPlat = (p: SocialKey) =>
      allConnected
        .filter((c) => c.platform === p)
        .map((c) => c.handle)
        .join(', ');

    const initVals: Record<SocialKey, string> = {
      SHOPEE: byPlat('SHOPEE') || koc.shopeeChannel || '',
      FACEBOOK: byPlat('FACEBOOK') || koc.facebookChannel || '',
      INSTAGRAM: byPlat('INSTAGRAM') || koc.instagramChannel || '',
      THREADS: byPlat('THREADS') || koc.threadsChannel || '',
    };
    setValues(initVals);
    setConfirmed({
      SHOPEE: Boolean(initVals.SHOPEE),
      FACEBOOK: Boolean(initVals.FACEBOOK),
      INSTAGRAM: Boolean(initVals.INSTAGRAM),
      THREADS: Boolean(initVals.THREADS),
    });
    setDiscovery(null);
    setErrorMsg(null);
  }, [open, koc, sharedOwnerKocs]);

  if (!koc) return null;

  // RULE-API-02: Chỉ gọi API khi người dùng chủ động bấm nút hành động tường minh
  const runAutoDiscover = async (overrideBioUrl?: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams({
        handle: koc.channelId || '',
        stageName: koc.stageName || '',
        realName: koc.realName || '',
      });
      const bioToUse = overrideBioUrl !== undefined ? overrideBioUrl : bioHubUrl;
      if (bioToUse.trim()) {
        params.set('bioUrl', bioToUse.trim());
      }
      const res = await fetch(`/api/integrations/koc-channels?${params.toString()}`);
      if (!res.ok) throw new Error('Không thể tra cứu tự động lúc này');
      const data = (await res.json()) as DiscoveryResponse;
      setDiscovery(data);

      // RULE-UX-01: Chỉ tự động điền ứng viên có độ tin cậy CAO / TRUNG_BÌNH và đã xác thực tồn tại
      setValues((prev) => {
        const next = { ...prev };
        for (const meta of PLATFORM_META) {
          if (!next[meta.key] || !next[meta.key].trim()) {
            const top = data.platforms?.[meta.key]?.[0];
            if (
              top &&
              (top.confidence === 'CAO' || top.confidence === 'TRUNG_BÌNH') &&
              top.verifiedExists
            ) {
              next[meta.key] = top.handle;
            }
          }
        }
        return next;
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi kết nối tra cứu kênh');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTiktokChannel = () => {
    const clean = cleanInputHandle(newTiktokHandle);
    if (!clean) return;
    if (tiktokChannels.some((c) => c.handle.toLowerCase() === clean.toLowerCase())) {
      setNewTiktokHandle('');
      return;
    }
    const isFirst = tiktokChannels.length === 0;
    const nextChannel: KocConnectedChannel = {
      id: `${koc.id}-ch-tiktok-${Date.now()}`,
      platform: 'TIKTOK',
      handle: clean,
      channelName: isFirst ? koc.stageName : `${koc.stageName} (@${clean})`,
      url: `https://www.tiktok.com/@${clean}`,
      isPrimary: isFirst,
      roleLabel: isFirst ? 'Kênh TikTok chính' : newTiktokRole,
    };
    setTiktokChannels((prev) => [...prev, nextChannel]);
    setNewTiktokHandle('');
  };

  const handleSetPrimaryTiktok = (handle: string) => {
    setTiktokChannels((prev) =>
      prev.map((c) => {
        const isTarget = c.handle.toLowerCase() === handle.toLowerCase();
        return {
          ...c,
          isPrimary: isTarget,
          roleLabel: isTarget
            ? 'Kênh TikTok chính'
            : c.roleLabel === 'Kênh TikTok chính'
              ? 'Kênh TikTok phụ'
              : c.roleLabel,
        };
      }),
    );
  };

  const handleRemoveTiktok = (handle: string) => {
    setTiktokChannels((prev) => {
      if (prev.length <= 1) return prev;
      const filtered = prev.filter((c) => c.handle.toLowerCase() !== handle.toLowerCase());
      if (filtered.length > 0 && !filtered.some((c) => c.isPrimary)) {
        filtered[0] = {
          ...filtered[0],
          isPrimary: true,
          roleLabel: 'Kênh TikTok chính',
        };
      }
      return filtered;
    });
  };

  const handleSelectCandidate = (key: SocialKey, cand: DiscoveredCandidate) => {
    setValues((prev) => ({ ...prev, [key]: cand.handle }));
    setConfirmed((prev) => ({ ...prev, [key]: true }));
  };

  const handleSave = () => {
    const allChannels: KocConnectedChannel[] = [...tiktokChannels];

    for (const meta of PLATFORM_META) {
      const rawVal = values[meta.key].trim();
      if (!rawVal) continue;
      const handles = rawVal
        .split(/[,;]/)
        .map((s) => cleanInputHandle(s))
        .filter(Boolean);
      handles.forEach((h, idx) => {
        allChannels.push({
          id: `${koc.id}-ch-${meta.key.toLowerCase()}-${idx + 1}`,
          platform: meta.key,
          handle: h,
          url: h.startsWith('http') ? h : `${meta.urlPrefix}${h}`,
          isPrimary: idx === 0,
          roleLabel: idx === 0 ? meta.roleLabel : `${meta.roleLabel} #${idx + 1}`,
        });
      });
    }

    const updatedKoc = syncKocWithConnectedChannels(koc, allChannels);
    onSave?.(updatedKoc);
    onConfirmSave?.(koc.id, {
      channelId: updatedKoc.channelId,
      tiktokChannel: updatedKoc.tiktokChannel,
      tiktokChannels: updatedKoc.tiktokChannels,
      connectedChannels: updatedKoc.connectedChannels,
      shopeeChannel: updatedKoc.shopeeChannel,
      facebookChannel: updatedKoc.facebookChannel,
      instagramChannel: updatedKoc.instagramChannel,
      threadsChannel: updatedKoc.threadsChannel,
      platforms: (updatedKoc.platforms || ['TIKTOK']).filter(
        (p): p is 'TIKTOK' | 'SHOPEE' | 'FACEBOOK' | 'INSTAGRAM' | 'THREADS' =>
          p === 'TIKTOK' ||
          p === 'SHOPEE' ||
          p === 'FACEBOOK' ||
          p === 'INSTAGRAM' ||
          p === 'THREADS',
      ),
    });
    onClose();
  };

  const connectedPlatformsCount =
    (tiktokChannels.length > 0 ? 1 : 0) +
    PLATFORM_META.filter((m) => values[m.key].trim().length > 0).length;

  const totalAccountsCount =
    tiktokChannels.length +
    PLATFORM_META.reduce((sum, m) => {
      const raw = values[m.key].trim();
      if (!raw) return sum;
      return sum + raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean).length;
    }, 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Quản lý tài khoản & kênh kết nối · ${koc.stageName}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Lưu cấu hình ({totalAccountsCount} tài khoản)
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Thanh tóm tắt Tài khoản KOC chính & Công cụ dò tìm */}
        <div className="rounded-lg border border-line bg-sunken/40 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-sm font-semibold text-ink">
                {(koc.stageName || 'K').slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{koc.stageName}</span>
                  {koc.realName && koc.realName !== koc.stageName && (
                    <span className="text-xs text-ink-2">({koc.realName})</span>
                  )}
                  <span className="font-mono text-2xs text-ink-3">{koc.id}</span>
                  <Status tone="info">{totalAccountsCount} tài khoản</Status>
                  <Status tone="neutral">{connectedPlatformsCount}/5 nền tảng</Status>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={Link2}
                onClick={() => setShowBioInput((v) => !v)}
              >
                {showBioInput ? 'Ẩn link Bio' : 'Nhập link Bio'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={loading ? Loader2 : RefreshCw}
                onClick={() => runAutoDiscover()}
                disabled={loading}
              >
                {loading ? 'Đang dò kênh...' : 'Dò tìm kênh tự động'}
              </Button>
            </div>
          </div>

          {showBioInput && (
            <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3 sm:flex-row sm:items-center">
              <div className="flex-1">
                <Input
                  value={bioHubUrl}
                  onChange={(e) => setBioHubUrl(e.target.value)}
                  placeholder="Dán link Bio.link / Linktree / Beacons / InstaBio của KOC..."
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => runAutoDiscover(bioHubUrl)}
                disabled={loading || !bioHubUrl.trim()}
              >
                Trích xuất từ Bio
              </Button>
            </div>
          )}

          {discovery?.queryInfo?.bioText && (
            <div className="mt-2.5 rounded border border-line bg-surface px-2.5 py-1.5 text-2xs text-ink-2">
              <span className="font-medium text-ink">Tiểu sử TikTok: </span>
              {discovery.queryInfo.bioText}
            </div>
          )}

          {errorMsg && (
            <div className="mt-2.5 rounded border border-critical/30 bg-critical-soft px-3 py-1.5 text-xs text-critical">
              {errorMsg}
            </div>
          )}
        </div>

        {/* PHẦN 1: Hệ thống tài khoản TikTok (1 Kênh chính + N Kênh phụ) */}
        <div className="rounded-lg border border-line bg-surface p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-line bg-sunken">
                <TikTokLogo className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm font-semibold text-ink">
                1. Hệ thống tài khoản TikTok ({tiktokChannels.length} kênh)
              </span>
            </div>
            <Status tone={tiktokChannels.length > 1 ? 'info' : 'neutral'}>
              {tiktokChannels.length > 1
                ? `1 Kênh chính · ${tiktokChannels.length - 1} Kênh phụ`
                : '1 Kênh TikTok chính'}
            </Status>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {tiktokChannels.map((ch, idx) => {
              const clean = cleanInputHandle(ch.handle);
              const href = ch.url || `https://www.tiktok.com/@${clean}`;
              return (
                <div
                  key={`${ch.handle}-${idx}`}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2.5 transition-colors ${
                    ch.isPrimary
                      ? 'border-line-strong bg-sunken/30'
                      : 'border-line bg-surface'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-surface">
                      <TikTokLogo className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-accent hover:underline"
                        >
                          @{clean}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <Status tone={ch.isPrimary ? 'positive' : 'info'}>
                          {ch.isPrimary
                            ? 'Kênh TikTok chính'
                            : ch.roleLabel || `Kênh TikTok phụ #${idx}`}
                        </Status>
                        {ch.followers ? (
                          <span className="text-2xs text-ink-3 tabular-nums">
                            {formatFollowers(ch.followers)} follow
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!ch.isPrimary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Star}
                        onClick={() => handleSetPrimaryTiktok(ch.handle)}
                      >
                        Đặt làm kênh chính
                      </Button>
                    )}
                    {tiktokChannels.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        onClick={() => handleRemoveTiktok(ch.handle)}
                      >
                        Gỡ
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Thanh thêm kênh TikTok phụ */}
          <div className="grid grid-cols-1 gap-2 border-t border-line pt-3 sm:grid-cols-12">
            <div className="sm:col-span-5">
              <Input
                value={newTiktokHandle}
                onChange={(e) => setNewTiktokHandle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTiktokChannel();
                  }
                }}
                placeholder="Nhập @handle hoặc link TikTok thứ 2, 3..."
              />
            </div>
            <div className="sm:col-span-4">
              <Select
                value={newTiktokRole}
                onChange={(e) => setNewTiktokRole(e.target.value)}
              >
                {TIKTOK_ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-3">
              <Button
                variant="secondary"
                className="w-full justify-center"
                icon={Plus}
                onClick={handleAddTiktokChannel}
                disabled={!newTiktokHandle.trim()}
              >
                Thêm kênh TikTok
              </Button>
            </div>
          </div>
        </div>

        {/* PHẦN 2: Tài khoản các nền tảng khác (Lưới 2x2) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">
              2. Tài khoản các nền tảng khác (Shopee · Facebook · Instagram · Threads)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PLATFORM_META.map((meta) => {
              const candidates = discovery?.platforms?.[meta.key] || [];
              const currentVal = values[meta.key];
              const isConfirmed = confirmed[meta.key] && Boolean(currentVal.trim());
              const firstHandle = cleanInputHandle(currentVal.split(/[,;]/)[0] || '');
              const previewUrl = firstHandle
                ? firstHandle.startsWith('http')
                  ? firstHandle
                  : `${meta.urlPrefix}${firstHandle}`
                : '';

              return (
                <div
                  key={meta.key}
                  className="flex flex-col justify-between rounded-lg border border-line bg-surface p-3.5 space-y-2.5"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line bg-sunken">
                          <meta.Logo className="h-3.5 w-3.5" />
                        </span>
                        <span className="truncate text-xs font-semibold text-ink">
                          {meta.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isConfirmed ? (
                          <Status tone="positive">Đã xác nhận</Status>
                        ) : currentVal.trim() ? (
                          <Status tone="warning">Chờ xác nhận</Status>
                        ) : (
                          <Status tone="neutral">Chưa kết nối</Status>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="flex-1">
                        <Input
                          value={currentVal}
                          onChange={(e) => {
                            const val = e.target.value;
                            setValues((prev) => ({ ...prev, [meta.key]: val }));
                            if (!val.trim()) {
                              setConfirmed((prev) => ({ ...prev, [meta.key]: false }));
                            }
                          }}
                          placeholder={meta.placeholder}
                        />
                      </div>
                      {currentVal.trim() && !isConfirmed && (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Check}
                          onClick={() =>
                            setConfirmed((prev) => ({ ...prev, [meta.key]: true }))
                          }
                        >
                          Xác nhận
                        </Button>
                      )}
                      {previewUrl && (
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-ink-2 hover:bg-sunken hover:text-ink"
                          title={`Mở ${meta.label}`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {candidates.length > 0 && (
                    <div className="border-t border-line pt-2 space-y-1.5">
                      <div className="text-2xs font-medium text-ink-3">
                        Ứng viên tìm thấy ({candidates.length}):
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {candidates.map((cand, idx) => {
                          const isSelected =
                            cleanInputHandle(currentVal).toLowerCase() ===
                            cand.handle.toLowerCase();
                          return (
                            <button
                              key={`${cand.handle}-${idx}`}
                              type="button"
                              onClick={() => handleSelectCandidate(meta.key, cand)}
                              className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-2xs transition-colors ${
                                isSelected
                                  ? 'border-accent bg-accent-soft font-semibold text-accent'
                                  : 'border-line bg-sunken/50 text-ink-2 hover:border-line-strong hover:text-ink'
                              }`}
                            >
                              {isSelected && <CheckCircle2 className="h-3 w-3 text-accent" />}
                              <span className="font-mono">@{cand.handle}</span>
                              <span className="text-ink-3">· {cand.confidence}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
};
