'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, ExternalLink, Loader2, RefreshCw, Search, Sliders, X } from 'lucide-react';
import { InlinePurposeApiSetup } from '../InlinePurposeApiSetup';
import type { KocItem } from '../../lib/types';
import {
  extractHandleFromSocialInput,
  formatSocialChannelUrl,
  type KocSocialDiscoveryResult,
  type SocialChannelCandidate,
  type SocialConfidenceLevel,
  type SocialPlatformKey,
} from '../../lib/kocSocialDiscovery';
import {
  type ApiProviderId,
  PROVIDER_MODELS_CATALOG,
  getEffectiveConfigForPurpose,
  loadApiWorkspaceConfig,
} from '../../lib/apiKeyConfig';
import {
  Avatar,
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

interface KocSocialChannelsModalProps {
  open: boolean;
  onClose: () => void;
  koc: KocItem | null;
  onConfirmSave: (
    kocId: string,
    updates: {
      shopeeChannel?: string;
      facebookChannel?: string;
      instagramChannel?: string;
      threadsChannel?: string;
      platforms: ('TIKTOK' | 'SHOPEE' | 'FACEBOOK' | 'INSTAGRAM' | 'THREADS')[];
    }
  ) => void;
}

const PLATFORM_META: Array<{
  key: SocialPlatformKey;
  label: string;
  fieldKey: 'shopeeChannel' | 'facebookChannel' | 'instagramChannel' | 'threadsChannel';
  placeholder: string;
  renderLogo: () => React.ReactNode;
}> = [
  {
    key: 'SHOPEE',
    label: 'Shopee',
    fieldKey: 'shopeeChannel',
    placeholder: 'Nhập username hoặc link Shopee...',
    renderLogo: () => <ShopeeLogo className="w-4 h-4 shrink-0" />,
  },
  {
    key: 'FACEBOOK',
    label: 'Facebook',
    fieldKey: 'facebookChannel',
    placeholder: 'Nhập username hoặc link Facebook...',
    renderLogo: () => <FacebookLogo className="w-4 h-4 shrink-0" />,
  },
  {
    key: 'INSTAGRAM',
    label: 'Instagram',
    fieldKey: 'instagramChannel',
    placeholder: 'Nhập @username hoặc link Instagram...',
    renderLogo: () => <InstagramLogo className="w-4 h-4 shrink-0" />,
  },
  {
    key: 'THREADS',
    label: 'Threads',
    fieldKey: 'threadsChannel',
    placeholder: 'Nhập @username hoặc link Threads...',
    renderLogo: () => <ThreadsLogo className="w-4 h-4 shrink-0" />,
  },
];

const CONFIDENCE_BADGE: Record<
  SocialConfidenceLevel,
  { label: string; tone: 'positive' | 'info' | 'neutral' }
> = {
  CAO: { label: 'Khớp cao', tone: 'positive' },
  TRUNG_BÌNH: { label: 'Cùng tên kênh', tone: 'info' },
  GỢI_Ý: { label: 'Gợi ý dò tìm', tone: 'neutral' },
};

export const KocSocialChannelsModal: React.FC<KocSocialChannelsModalProps> = ({
  open,
  onClose,
  koc,
  onConfirmSave,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [discoveryResult, setDiscoveryResult] = useState<KocSocialDiscoveryResult | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ApiProviderId>('GOOGLE');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.8-flash');
  const [showApiSetup, setShowApiSetup] = useState<boolean>(false);

  // Giá trị người dùng chọn / chỉnh sửa trước khi bấm Xác nhận
  const [selectedValues, setSelectedValues] = useState<Record<SocialPlatformKey, string>>({
    SHOPEE: '',
    FACEBOOK: '',
    INSTAGRAM: '',
    THREADS: '',
  });

  // Trạng thái bật/tắt xác nhận cho từng kênh
  const [confirmedFlags, setConfirmedFlags] = useState<Record<SocialPlatformKey, boolean>>({
    SHOPEE: false,
    FACEBOOK: false,
    INSTAGRAM: false,
    THREADS: false,
  });

  const availableModels = useMemo(
    () => PROVIDER_MODELS_CATALOG[selectedProvider] || [],
    [selectedProvider]
  );

  const handleProviderChange = (prov: ApiProviderId) => {
    setSelectedProvider(prov);
    const models = PROVIDER_MODELS_CATALOG[prov] || [];
    if (models.length > 0) {
      setSelectedModel(models[0].id);
    }
  };

  const resolveLlmConfig = (provOverride?: ApiProviderId, modelOverride?: string) => {
    const workspaceCfg = loadApiWorkspaceConfig();
    const effective = getEffectiveConfigForPurpose('KOC_MATCHING', workspaceCfg);
    const provider = provOverride || selectedProvider || effective.primaryProvider || 'GOOGLE';
    const model =
      modelOverride ||
      selectedModel ||
      (provider === effective.primaryProvider
        ? effective.primaryModel
        : provider === 'INTERNAL'
        ? 'upbase-social-discovery-v2'
        : workspaceCfg.providers[provider]?.defaultModel || 'gemini-3.8-flash');
    const apiKey =
      provider === effective.primaryProvider && effective.primaryApiKey
        ? effective.primaryApiKey
        : provider === 'INTERNAL'
        ? ''
        : workspaceCfg.providers[provider]?.apiKey || '';
    const baseUrl =
      provider === 'INTERNAL' ? undefined : workspaceCfg.providers[provider]?.baseUrl;

    return { provider, model, apiKey, baseUrl };
  };

  const runSearch = async (
    target: KocItem,
    provOverride?: ApiProviderId,
    modelOverride?: string
  ) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const llmConfig = resolveLlmConfig(provOverride, modelOverride);
      const res = await fetch('/api/integrations/tiktok-koc/social-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kocId: target.id,
          tiktokHandle: target.channelId,
          stageName: target.stageName,
          realName: target.realName,
          phone: target.phone,
          niche: target.niche || target.kocCategory,
          bio: target.bio,
          llmConfig,
          existingChannels: {
            shopeeChannel: target.shopeeChannel,
            facebookChannel: target.facebookChannel,
            instagramChannel: target.instagramChannel,
            threadsChannel: target.threadsChannel,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        setErrorMsg(json.message || 'Không dò tìm được tài khoản mạng xã hội.');
        return;
      }

      const data: KocSocialDiscoveryResult = json.data;
      setDiscoveryResult(data);

      const nextValues: Record<SocialPlatformKey, string> = {
        SHOPEE: target.shopeeChannel || data.candidatesByPlatform.SHOPEE[0]?.handle || '',
        FACEBOOK: target.facebookChannel || data.candidatesByPlatform.FACEBOOK[0]?.handle || '',
        INSTAGRAM: target.instagramChannel || data.candidatesByPlatform.INSTAGRAM[0]?.handle || '',
        THREADS: target.threadsChannel || data.candidatesByPlatform.THREADS[0]?.handle || '',
      };
      setSelectedValues(nextValues);

      setConfirmedFlags({
        SHOPEE: Boolean(
          target.shopeeChannel ||
            data.candidatesByPlatform.SHOPEE.some((c) => c.confidence === 'CAO' || c.confidence === 'TRUNG_BÌNH')
        ),
        FACEBOOK: Boolean(
          target.facebookChannel ||
            data.candidatesByPlatform.FACEBOOK.some((c) => c.confidence === 'CAO' || c.confidence === 'TRUNG_BÌNH')
        ),
        INSTAGRAM: Boolean(
          target.instagramChannel ||
            data.candidatesByPlatform.INSTAGRAM.some((c) => c.confidence === 'CAO' || c.confidence === 'TRUNG_BÌNH')
        ),
        THREADS: Boolean(
          target.threadsChannel ||
            data.candidatesByPlatform.THREADS.some((c) => c.confidence === 'CAO' || c.confidence === 'TRUNG_BÌNH')
        ),
      });
    } catch {
      setErrorMsg('Lỗi kết nối khi dò tìm kênh mạng xã hội.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !koc) return;
    const workspaceCfg = loadApiWorkspaceConfig();
    const effective = getEffectiveConfigForPurpose('KOC_MATCHING', workspaceCfg);
    const initProv = effective.primaryProvider === 'INTERNAL' ? 'GOOGLE' : effective.primaryProvider;
    const initModel =
      effective.primaryProvider === 'INTERNAL'
        ? workspaceCfg.providers.GOOGLE?.defaultModel || 'gemini-3.8-flash'
        : effective.primaryModel;
    setSelectedProvider(initProv);
    setSelectedModel(initModel);
    setSelectedValues({
      SHOPEE: koc.shopeeChannel || '',
      FACEBOOK: koc.facebookChannel || '',
      INSTAGRAM: koc.instagramChannel || '',
      THREADS: koc.threadsChannel || '',
    });
    setConfirmedFlags({
      SHOPEE: Boolean(koc.shopeeChannel),
      FACEBOOK: Boolean(koc.facebookChannel),
      INSTAGRAM: Boolean(koc.instagramChannel),
      THREADS: Boolean(koc.threadsChannel),
    });
    void runSearch(koc, initProv, initModel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, koc]);

  if (!koc) return null;

  const handleSelectCandidate = (platform: SocialPlatformKey, cand: SocialChannelCandidate) => {
    setSelectedValues((prev) => ({ ...prev, [platform]: cand.handle }));
    setConfirmedFlags((prev) => ({ ...prev, [platform]: true }));
  };

  const handleInputChange = (platform: SocialPlatformKey, val: string) => {
    setSelectedValues((prev) => ({ ...prev, [platform]: val }));
    setConfirmedFlags((prev) => ({ ...prev, [platform]: Boolean(val.trim()) }));
  };

  const handleConfirm = () => {
    const shopee = confirmedFlags.SHOPEE
      ? extractHandleFromSocialInput('SHOPEE', selectedValues.SHOPEE)
      : undefined;
    const facebook = confirmedFlags.FACEBOOK
      ? extractHandleFromSocialInput('FACEBOOK', selectedValues.FACEBOOK)
      : undefined;
    const instagram = confirmedFlags.INSTAGRAM
      ? extractHandleFromSocialInput('INSTAGRAM', selectedValues.INSTAGRAM)
      : undefined;
    const threads = confirmedFlags.THREADS
      ? extractHandleFromSocialInput('THREADS', selectedValues.THREADS)
      : undefined;

    const platforms: ('TIKTOK' | 'SHOPEE' | 'FACEBOOK' | 'INSTAGRAM' | 'THREADS')[] = ['TIKTOK'];
    if (shopee) platforms.push('SHOPEE');
    if (facebook) platforms.push('FACEBOOK');
    if (instagram) platforms.push('INSTAGRAM');
    if (threads) platforms.push('THREADS');

    onConfirmSave(koc.id, {
      shopeeChannel: shopee || undefined,
      facebookChannel: facebook || undefined,
      instagramChannel: instagram || undefined,
      threadsChannel: threads || undefined,
      platforms,
    });
    onClose();
  };

  const tiktokHandle = koc.channelId.replace(/^@+/, '');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Tìm & xác nhận kênh của ${koc.stageName}`}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="secondary"
            icon={RefreshCw}
            onClick={() => runSearch(koc)}
            disabled={loading}
          >
            {loading ? 'Đang tìm...' : 'Quét lại'}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Hủy
            </Button>
            <Button variant="primary" icon={Check} onClick={handleConfirm} disabled={loading}>
              Xác nhận lưu kênh
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Thông tin gốc KOC */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-sunken/50 border border-line">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={koc.stageName} src={koc.avatarUrl} size={36} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-ink text-xs truncate">{koc.stageName}</span>
                {koc.realName && koc.realName !== koc.stageName && (
                  <span className="text-2xs text-ink-3 truncate">({koc.realName})</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-2xs text-ink-2 mt-0.5">
                <span className="inline-flex items-center gap-1 font-medium text-ink">
                  <TikTokLogo className="w-3.5 h-3.5" />@{tiktokHandle}
                </span>
                {koc.phone && <span>· SĐT: {koc.phone}</span>}
              </div>
            </div>
          </div>
          <a
            href={koc.channelLink || `https://www.tiktok.com/@${tiktokHandle}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            Mở kênh TikTok
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {errorMsg && (
          <div className="px-3 py-2 rounded-lg bg-critical-soft text-critical text-xs">
            {errorMsg}
          </div>
        )}

        {/* Thanh cấu hình mô hình ngôn ngữ & tìm kiếm sâu */}
        <div className="p-3 rounded-xl border border-line bg-surface space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-ink">Công cụ phân tích & tìm kiếm:</span>
              <Select
                value={selectedProvider}
                onChange={(e) => handleProviderChange(e.target.value as ApiProviderId)}
                aria-label="Nhà cung cấp mô hình"
                className="w-auto text-xs"
              >
                <option value="GOOGLE">Google Gemini + Google Search</option>
                <option value="OPENAI">OpenAI (ChatGPT)</option>
                <option value="CLAUDE">Anthropic (Claude)</option>
                <option value="INTERNAL">Bộ phân tích đa nguồn nội bộ</option>
              </Select>
              {selectedProvider !== 'INTERNAL' && availableModels.length > 0 && (
                <Select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  aria-label="Mô hình phân tích"
                  className="w-auto text-xs"
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                icon={Sliders}
                onClick={() => setShowApiSetup((v) => !v)}
              >
                {showApiSetup ? 'Ẩn cấu hình API' : 'Cấu hình API & Khóa'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={Search}
                onClick={() => void runSearch(koc)}
                disabled={loading}
              >
                {loading ? 'Đang dò tìm...' : 'Quét qua mô hình & Google'}
              </Button>
            </div>
          </div>

          {showApiSetup && (
            <InlinePurposeApiSetup
              purposeId="KOC_MATCHING"
              onConfigSaved={() => {
                const eff = getEffectiveConfigForPurpose('KOC_MATCHING');
                if (eff.primaryProvider !== 'INTERNAL') {
                  setSelectedProvider(eff.primaryProvider);
                  setSelectedModel(eff.primaryModel);
                }
              }}
            />
          )}

          {discoveryResult?.llmAnalysis && (
            <div className="pt-2 border-t border-line flex flex-col gap-1 text-2xs text-ink-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink">
                  {discoveryResult.llmAnalysis.providerUsed} ({discoveryResult.llmAnalysis.modelUsed})
                </span>
                {discoveryResult.llmAnalysis.groundedSearchUsed && (
                  <Status tone="info">Kết hợp tìm kiếm Web</Status>
                )}
                <Status tone={discoveryResult.llmAnalysis.candidatesFoundCount > 0 ? 'positive' : 'neutral'}>
                  {discoveryResult.llmAnalysis.candidatesFoundCount} tài khoản xác thực
                </Status>
              </div>
              <div>{discoveryResult.llmAnalysis.reasoningSummary}</div>
            </div>
          )}
        </div>

        {(discoveryResult?.bioExtracted || discoveryResult?.bioLinkExtracted) && (
          <div className="px-3 py-2 rounded-lg bg-surface border border-line text-2xs text-ink-2 space-y-1">
            {discoveryResult.bioExtracted && (
              <div>
                <span className="font-semibold text-ink">Tiểu sử kênh TikTok: </span>
                {discoveryResult.bioExtracted}
              </div>
            )}
            {discoveryResult.bioLinkExtracted && (
              <div>
                <span className="font-semibold text-ink">Liên kết gắn trên TikTok: </span>
                <a
                  href={discoveryResult.bioLinkExtracted}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline break-all"
                >
                  {discoveryResult.bioLinkExtracted}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Danh sách 4 nền tảng */}
        <div className="grid gap-3">
          {PLATFORM_META.map((meta) => {
            const candidates = discoveryResult?.candidatesByPlatform[meta.key] || [];
            const currentVal = selectedValues[meta.key] || '';
            const isConfirmed = confirmedFlags[meta.key];
            const previewUrl = formatSocialChannelUrl(meta.key, currentVal);

            return (
              <div
                key={meta.key}
                className="p-3.5 rounded-xl border border-line bg-surface space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isConfirmed}
                      onChange={(e) =>
                        setConfirmedFlags((prev) => ({
                          ...prev,
                          [meta.key]: e.target.checked,
                        }))
                      }
                      aria-label={`Xác nhận có kênh ${meta.label}`}
                      className="h-4 w-4 rounded border-line-strong text-primary focus:ring-0 cursor-pointer"
                    />
                    {meta.renderLogo()}
                    <span className="font-semibold text-xs text-ink">{meta.label}</span>
                    {isConfirmed && currentVal.trim() ? (
                      <Status tone="positive">Đã chọn xác nhận</Status>
                    ) : (
                      <Status tone="neutral">Chưa xác nhận</Status>
                    )}
                  </div>

                  {currentVal.trim() && (
                    <div className="flex items-center gap-2">
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-2xs font-medium text-accent hover:underline"
                      >
                        Kiểm tra trang {meta.label}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedValues((prev) => ({ ...prev, [meta.key]: '' }));
                          setConfirmedFlags((prev) => ({ ...prev, [meta.key]: false }));
                        }}
                        className="inline-flex items-center gap-0.5 text-2xs text-ink-3 hover:text-critical"
                        title="Bỏ kênh này"
                      >
                        <X className="w-3.5 h-3.5" />
                        Không có
                      </button>
                    </div>
                  )}
                </div>

                {/* Ô nhập / chỉnh sửa trực tiếp */}
                <div className="flex items-center gap-2">
                  <Input
                    value={currentVal}
                    onChange={(e) => handleInputChange(meta.key, e.target.value)}
                    placeholder={meta.placeholder}
                    className="flex-1"
                  />
                </div>

                {/* Các kết quả đã xác thực tồn tại để bấm chọn nhanh */}
                {loading ? (
                  <div className="text-2xs text-ink-3 flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Đang dò tìm và xác thực tài khoản {meta.label}...
                  </div>
                ) : candidates.length > 0 ? (
                  <div className="grid gap-1.5 pt-0.5">
                    {candidates.map((cand) => {
                      const active =
                        currentVal.trim().toLowerCase().replace(/^@+/, '') ===
                          cand.handle.toLowerCase().replace(/^@+/, '') && isConfirmed;
                      const badge = CONFIDENCE_BADGE[cand.confidence];

                      return (
                        <div
                          key={cand.handle}
                          className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-2xs transition-colors ${
                            active
                              ? 'border-primary bg-accent-soft/50 text-ink'
                              : 'border-line bg-sunken/40 text-ink-2 hover:border-line-strong'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectCandidate(meta.key, cand)}
                            className="flex-1 min-w-0 text-left space-y-0.5"
                          >
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-mono font-semibold text-ink">
                                {cand.handle}
                              </span>
                              {cand.displayName && (
                                <span className="font-semibold text-ink">
                                  · {cand.displayName}
                                </span>
                              )}
                              <Status tone={badge.tone}>{badge.label}</Status>
                              {cand.isVerifiedLive && (
                                <Status tone="positive">Đã xác thực tồn tại</Status>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-ink-3">
                              {cand.evidence && (
                                <span className="text-ink-2 font-medium">{cand.evidence}</span>
                              )}
                              <span>· Nguồn: {cand.sourceLabel}</span>
                            </div>
                          </button>
                          <a
                            href={cand.url}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded border border-line bg-surface text-accent hover:text-primary hover:border-line-strong font-medium"
                            title={`Mở ${cand.url} để kiểm tra`}
                          >
                            Mở link
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  discoveryResult && (
                    <div className="text-2xs text-ink-3">
                      Không phát hiện tài khoản {meta.label} công khai khớp với KOC. Có thể dán trực tiếp link hoặc username nếu có.
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
