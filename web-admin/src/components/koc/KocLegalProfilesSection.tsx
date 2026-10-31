'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Check,
  Copy,
  CreditCard,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileScan,
  FileText,
  Plus,
  QrCode,
  ShieldCheck,
  Star,
  Trash2,
} from 'lucide-react';
import type {
  KocItem,
  KocLegalProfile,
  LegalDocAttachment,
  OcrExtractedFields,
  UserProfile,
} from '../../lib/types';
import { syncKocContactToStaffSheets } from '../../lib/staffBrandListingSheet';
import {
  LEGAL_DOC_CATEGORY_LABEL,
  LegalAttachmentsPanel,
  LegalDocPreviewModal,
} from '../contracts/LegalAttachmentsPanel';
import {
  ActionMenu,
  Button,
  EmptyState,
  Field,
  Input,
  Modal,
  Panel,
  Select,
  Stat,
  StatRow,
  Status,
  Textarea,
} from '../ui';
import {
  KOC_LEGAL_ATTACHMENTS_EVENT,
  KOC_PLATFORM_LABEL,
  LEGAL_TYPE_LABEL,
  canRevealSensitive,
  evaluateLegalProfileContractReadiness,
  getKocConnectedChannels,
  getKocLegalProfiles,
  mask,
  saveSyncedKocLegalAttachments,
  syncKocWithLegalProfiles,
  type LegalType,
} from './kocUtils';

interface KocLegalProfilesSectionProps {
  koc: KocItem;
  currentUser?: UserProfile;
  onUpdateKoc?: (updated: KocItem, message?: string) => void;
  onScanDocs?: (koc: KocItem) => void;
  onCreateContractForProfile?: (koc: KocItem, profile: KocLegalProfile) => void;
}

const TAX_ACCOUNT_OPTIONS: Record<LegalType, string[]> = {
  INDIVIDUAL: [
    '(Thuế TNCN 10%) Tài khoản cá nhân',
    'TK cá nhân tính thuế TNCN 10%',
    'Không tính thuế TNCN (Chưa đến ngưỡng)',
    'Người thân nhận ủy quyền (Khấu trừ TNCN 10%)',
  ],
  HOUSEHOLD: [
    'HKD xuất hóa đơn (Thuế 7%: 5% VAT + 2% TNCN)',
    'HKD không hóa đơn',
    'Hộ kinh doanh cá thể',
  ],
  COMPANY: [
    '(VAT 8%) Tài khoản doanh nghiệp',
    '(VAT 10%) Tài khoản doanh nghiệp / MCN',
  ],
};

export const KocLegalProfilesSection: React.FC<KocLegalProfilesSectionProps> = ({
  koc,
  currentUser,
  onUpdateKoc,
  onScanDocs,
  onCreateContractForProfile,
}) => {
  const [, setAttachmentSyncTick] = useState(0);
  const profiles = getKocLegalProfiles(koc);
  const allowed = canRevealSensitive(currentUser, koc);
  const [revealed, setRevealed] = useState(false);
  const [editingProfile, setEditingProfile] = useState<KocLegalProfile | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [previewState, setPreviewState] = useState<{
    attachments: LegalDocAttachment[];
    activeDoc: LegalDocAttachment;
    profileLabel: string;
  } | null>(null);
  const [qrTargetProfile, setQrTargetProfile] = useState<KocLegalProfile | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleSync = () => setAttachmentSyncTick((t) => t + 1);
    window.addEventListener(KOC_LEGAL_ATTACHMENTS_EVENT, handleSync);
    return () => window.removeEventListener(KOC_LEGAL_ATTACHMENTS_EVENT, handleSync);
  }, []);

  const show = (val?: string) => {
    if (!val) return '—';
    return revealed ? val : mask(val);
  };

  const defaultProfile = profiles.find((p) => p.isDefault) || profiles[0];
  const distinctTypes = Array.from(new Set(profiles.map((p) => p.legalType)));
  const signedHdntCount = profiles.filter((p) => p.frameworkContractStatus === 'ĐÃ_KÝ').length;

  const handleSetDefault = (profileId: string) => {
    if (!onUpdateKoc) return;
    const nextProfiles = profiles.map((p) => ({
      ...p,
      isDefault: p.id === profileId,
    }));
    const target = nextProfiles.find((p) => p.id === profileId);
    const updatedKoc = syncKocWithLegalProfiles(koc, nextProfiles);
    syncKocContactToStaffSheets(updatedKoc);
    onUpdateKoc(
      updatedKoc,
      `Đã đặt hồ sơ pháp lý "${target?.holderName || target?.profileCode}" làm mặc định cho ${koc.stageName}`,
    );
  };

  const handleDeleteProfile = (profileId: string) => {
    if (!onUpdateKoc || profiles.length <= 1) return;
    const remaining = profiles.filter((p) => p.id !== profileId);
    if (!remaining.some((p) => p.isDefault) && remaining.length > 0) {
      remaining[0] = { ...remaining[0], isDefault: true };
    }
    const updatedKoc = syncKocWithLegalProfiles(koc, remaining);
    syncKocContactToStaffSheets(updatedKoc);
    onUpdateKoc(updatedKoc, `Đã xóa 1 hồ sơ pháp lý của ${koc.stageName}`);
  };

  const handleSaveProfile = (saved: KocLegalProfile) => {
    if (!onUpdateKoc) return;
    let nextProfiles: KocLegalProfile[];
    const exists = profiles.some((p) => p.id === saved.id);
    if (exists) {
      nextProfiles = profiles.map((p) => (p.id === saved.id ? saved : p));
    } else {
      nextProfiles = [...profiles, saved];
    }

    if (saved.isDefault) {
      nextProfiles = nextProfiles.map((p) => ({
        ...p,
        isDefault: p.id === saved.id,
      }));
    } else if (!nextProfiles.some((p) => p.isDefault) && nextProfiles.length > 0) {
      nextProfiles[0] = { ...nextProfiles[0], isDefault: true };
    }

    const updatedKoc = syncKocWithLegalProfiles(koc, nextProfiles);
    syncKocContactToStaffSheets(updatedKoc);
    onUpdateKoc(
      updatedKoc,
      exists
        ? `Đã cập nhật hồ sơ pháp lý ${saved.profileCode} (${saved.holderName})`
        : `Đã thêm hồ sơ pháp lý mới ${saved.profileCode} (${saved.holderName}) cho ${koc.stageName}`,
    );
    setEditingProfile(null);
    setIsCreatingNew(false);
  };

  return (
    <div className="space-y-4">
      <StatRow>
        <Stat
          label="Tổng số hồ sơ pháp lý"
          value={`${profiles.length} hồ sơ`}
          note={
            distinctTypes.length > 1
              ? `Đa pháp nhân: ${distinctTypes.map((t) => LEGAL_TYPE_LABEL[t]).join(' · ')}`
              : defaultProfile
                ? LEGAL_TYPE_LABEL[defaultProfile.legalType]
                : 'Chưa khai báo pháp lý'
          }
          tone={profiles.length > 0 ? 'positive' : 'warning'}
        />
        <Stat
          label="Hồ sơ mặc định hiện hành"
          value={defaultProfile ? defaultProfile.holderName : 'Chưa thiết lập'}
          note={
            defaultProfile
              ? `${defaultProfile.profileCode} · ${defaultProfile.taxAccountType}`
              : 'Cần bổ sung trước khi tạo hợp đồng'
          }
        />
        <Stat
          label="Tài khoản thụ hưởng mặc định"
          value={
            defaultProfile?.bankAccount
              ? `${defaultProfile.bankName || 'Ngân hàng'} · ${show(defaultProfile.bankAccount)}`
              : 'Chưa có STK'
          }
          note={
            defaultProfile?.cccd || defaultProfile?.taxCode
              ? `Định danh: ${show(defaultProfile.taxCode || defaultProfile.cccd)}`
              : 'Thiếu CCCD / MST'
          }
        />
        <Stat
          label="Hợp đồng nguyên tắc (HĐNT)"
          value={signedHdntCount > 0 ? `Đã ký (${signedHdntCount} bản)` : 'Chưa ký HĐNT'}
          note={
            defaultProfile?.frameworkContractCode
              ? `Mã: ${defaultProfile.frameworkContractCode}`
              : 'Mỗi pháp nhân ký HĐNT độc lập'
          }
          tone={signedHdntCount > 0 ? 'positive' : undefined}
        />
      </StatRow>

      {/* Thanh công cụ quản lý danh sách hồ sơ pháp lý */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-ink">
            Danh sách hồ sơ pháp lý &amp; tài khoản thụ hưởng ({profiles.length})
          </h3>
          {koc.sharedMcnInfo && <Status tone="warning">{koc.sharedMcnInfo}</Status>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {allowed && profiles.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              icon={revealed ? EyeOff : Eye}
              onClick={() => setRevealed((v) => !v)}
            >
              {revealed ? 'Ẩn số CCCD / STK' : 'Hiện số CCCD / STK'}
            </Button>
          )}
          {onScanDocs && (
            <Button size="sm" variant="secondary" icon={FileScan} onClick={() => onScanDocs(koc)}>
              Đọc ảnh CCCD / ĐKKD
            </Button>
          )}
          {onUpdateKoc && (
            <Button
              size="sm"
              variant="primary"
              icon={Plus}
              onClick={() => {
                setEditingProfile(null);
                setIsCreatingNew(true);
              }}
            >
              Thêm hồ sơ pháp lý
            </Button>
          )}
        </div>
      </div>

      {/* Danh sách thẻ Hồ sơ pháp lý (1 -> N) */}
      {profiles.length === 0 ? (
        <Panel>
          <EmptyState
            title="KOC chưa có hồ sơ pháp lý & tài khoản thụ hưởng"
            action={
              <div className="flex items-center justify-center gap-2">
                {onScanDocs && (
                  <Button variant="secondary" icon={FileScan} onClick={() => onScanDocs(koc)}>
                    Đọc ảnh CCCD / ĐKKD
                  </Button>
                )}
                {onUpdateKoc && (
                  <Button
                    variant="primary"
                    icon={Plus}
                    onClick={() => {
                      setEditingProfile(null);
                      setIsCreatingNew(true);
                    }}
                  >
                    Thêm hồ sơ pháp lý đầu tiên
                  </Button>
                )}
              </div>
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-4">
          {profiles.map((p, idx) => {
            const isComp = p.legalType === 'COMPANY';
            const isHkd = p.legalType === 'HOUSEHOLD';
            const readiness = evaluateLegalProfileContractReadiness(p, koc);
            const docs = p.legalAttachments || [];

            const extraMenuItems = [
              ...(!p.isDefault && onUpdateKoc
                ? [
                    {
                      label: 'Đặt làm hồ sơ mặc định',
                      icon: Star,
                      onSelect: () => handleSetDefault(p.id),
                    },
                  ]
                : []),
              ...(p.bankAccount
                ? [
                    {
                      label: 'Mã QR thanh toán',
                      icon: QrCode,
                      onSelect: () => setQrTargetProfile(p),
                    },
                  ]
                : []),
              ...(onUpdateKoc && profiles.length > 1
                ? [
                    {
                      label: 'Xóa hồ sơ pháp lý này',
                      icon: Trash2,
                      tone: 'critical' as const,
                      onSelect: () => handleDeleteProfile(p.id),
                    },
                  ]
                : []),
            ];

            return (
              <div
                key={p.id || idx}
                className={`rounded-xl border bg-surface overflow-hidden transition-colors ${
                  p.isDefault ? 'border-line-strong' : 'border-line'
                }`}
              >
                {/* Header gọn gàng: Mã HSPL, Tên chủ thể, Loại pháp nhân, Trạng thái & tối đa 2 nút chính */}
                <div className="px-4 py-3 border-b border-line bg-sunken/35 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="font-code text-xs font-semibold px-2 py-0.5 rounded-md bg-surface border border-line text-ink">
                      {p.profileCode || `HSPL-0${idx + 1}`}
                    </span>
                    <span className="text-sm font-semibold text-ink">{p.holderName}</span>
                    <Status tone={isComp ? 'info' : isHkd ? 'warning' : 'neutral'}>
                      {LEGAL_TYPE_LABEL[p.legalType]}
                    </Status>
                    {p.isDefault && <Status tone="positive">Mặc định</Status>}
                    {readiness.ready ? (
                      <Status tone="positive">
                        Đủ thông tin ký HĐ ({readiness.filledCount}/{readiness.totalRequired})
                      </Status>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProfile(p);
                          setIsCreatingNew(false);
                        }}
                        title={`Cần bổ sung: ${readiness.missingFields.join(', ')}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-warning-soft text-warning border border-warning/30 text-2xs font-medium hover:bg-warning-soft/80 cursor-pointer"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Thiếu {readiness.missingFields.length} trường HĐ</span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {onUpdateKoc && (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={Edit3}
                        onClick={() => {
                          setEditingProfile(p);
                          setIsCreatingNew(false);
                        }}
                      >
                        Sửa hồ sơ
                      </Button>
                    )}
                    {onCreateContractForProfile && (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={FileText}
                        onClick={() => onCreateContractForProfile(koc, p)}
                      >
                        Ký hợp đồng
                      </Button>
                    )}
                    {extraMenuItems.length > 0 && (
                      <ActionMenu label="Thao tác" items={extraMenuItems} />
                    )}
                  </div>
                </div>

                {/* Body 3 cột rõ ràng, không viết hoa toàn bộ tiêu đề */}
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-line text-xs">
                  {/* Cột 1: Định danh Pháp lý & Thuế */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2 font-semibold text-ink">
                      <Building2 className="w-3.5 h-3.5 text-accent shrink-0" />
                      <span>1. Định danh pháp nhân &amp; thuế</span>
                    </div>
                    <dl className="grid gap-2">
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-3">Chế độ thuế</dt>
                        <dd className="font-medium text-ink text-right">{p.taxAccountType}</dd>
                      </div>
                      {p.cccd && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-ink-3">Số CCCD</dt>
                          <dd>
                            <CopyableCode text={show(p.cccd)} raw={revealed ? p.cccd : undefined} />
                          </dd>
                        </div>
                      )}
                      {p.taxCode && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-ink-3">
                            {p.legalType === 'INDIVIDUAL' ? 'MST cá nhân' : 'Mã số thuế ĐKKD'}
                          </dt>
                          <dd>
                            <CopyableCode
                              text={show(p.taxCode)}
                              raw={revealed ? p.taxCode : undefined}
                            />
                          </dd>
                        </div>
                      )}
                      {p.representativeName && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-ink-3">Người đại diện</dt>
                          <dd className="font-medium text-ink text-right">
                            {p.representativeName}
                            {p.representativeTitle ? ` (${p.representativeTitle})` : ''}
                          </dd>
                        </div>
                      )}
                      {(p.cccdIssueDate || p.cccdIssuePlace) && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-ink-3">Ngày &amp; nơi cấp</dt>
                          <dd className="text-ink-2 text-right">
                            {[p.cccdIssueDate, p.cccdIssuePlace].filter(Boolean).join(' · ')}
                          </dd>
                        </div>
                      )}
                      {p.registeredAddress && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-ink-3 shrink-0">Địa chỉ đăng ký</dt>
                          <dd
                            className="text-ink-2 text-right truncate max-w-[200px]"
                            title={p.registeredAddress}
                          >
                            {p.registeredAddress}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Cột 2: Tài khoản Ngân hàng Thụ hưởng */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-semibold text-ink">
                        <CreditCard className="w-3.5 h-3.5 text-positive shrink-0" />
                        <span>2. Tài khoản nhận thanh toán</span>
                      </div>
                      {p.bankAccount && (
                        <button
                          type="button"
                          onClick={() => setQrTargetProfile(p)}
                          className="inline-flex items-center gap-1 text-2xs font-medium text-accent hover:underline"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          Mã QR
                        </button>
                      )}
                    </div>
                    <dl className="grid gap-2">
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-3">Ngân hàng</dt>
                        <dd className="font-semibold text-ink">{p.bankName || 'Chưa cập nhật'}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-3">Số tài khoản</dt>
                        <dd>
                          {p.bankAccount ? (
                            <CopyableCode
                              text={show(p.bankAccount)}
                              raw={revealed ? p.bankAccount : undefined}
                            />
                          ) : (
                            <span className="text-warning font-medium">Chưa bổ sung STK</span>
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-3">Chủ tài khoản</dt>
                        <dd className="font-medium text-ink text-right">
                          {p.bankHolderName || p.holderName}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-3">Quan hệ với KOC</dt>
                        <dd className="text-ink-2 text-right">
                          {p.relationshipNote || 'Chính chủ KOC'}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Cột 3: Hợp đồng Nguyên tắc (HĐNT) & Lịch sử sử dụng */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2 font-semibold text-ink">
                      <ShieldCheck className="w-3.5 h-3.5 text-accent shrink-0" />
                      <span>3. Hợp đồng nguyên tắc (HĐNT)</span>
                    </div>
                    <dl className="grid gap-2">
                      <div className="flex justify-between items-center gap-2">
                        <dt className="text-ink-3">Trạng thái HĐNT</dt>
                        <dd>
                          <Status
                            tone={
                              p.frameworkContractStatus === 'ĐÃ_KÝ'
                                ? 'positive'
                                : p.frameworkContractStatus === 'ĐANG_TRÌNH_KÝ'
                                  ? 'info'
                                  : 'warning'
                            }
                          >
                            {p.frameworkContractStatus === 'ĐÃ_KÝ'
                              ? 'Đã ký HĐNT'
                              : p.frameworkContractStatus === 'ĐANG_TRÌNH_KÝ'
                                ? 'Đang trình ký'
                                : 'Chưa ký HĐNT'}
                          </Status>
                        </dd>
                      </div>
                      {p.frameworkContractCode && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-ink-3">Mã HĐNT</dt>
                          <dd className="font-code font-semibold text-ink">
                            {p.frameworkContractCode}
                          </dd>
                        </div>
                      )}
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-3">Lịch sử sử dụng</dt>
                        <dd className="font-medium text-ink">
                          {p.dealsUsedCount ? `${p.dealsUsedCount} đợt book` : 'Chưa phát sinh đợt chi'}
                          {p.latestBrandUsed ? ` (${p.latestBrandUsed})` : ''}
                        </dd>
                      </div>
                      {p.frameworkContractDriveUrl && (
                        <div className="pt-0.5">
                          <a
                            href={p.frameworkContractDriveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-accent hover:underline font-medium text-2xs"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Mở thư mục hợp đồng Drive
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>

                {/* Khối thẻ giấy tờ CCCD / ĐKKD liền mạch ở chân thẻ (Ấn vào từng tệp để xem phóng to) */}
                <LegalAttachmentsPanel
                  flush
                  attachments={docs}
                  entitySlug={`${koc.channelId || koc.id}-${p.profileCode || 'hspl'}`}
                  legalType={p.legalType}
                  editable={Boolean(onUpdateKoc)}
                  onChange={
                    onUpdateKoc
                      ? (nextAttachments) => {
                          saveSyncedKocLegalAttachments(
                            koc.id || koc.channelId,
                            p.id,
                            nextAttachments,
                          );
                          handleSaveProfile({
                            ...p,
                            legalAttachments: nextAttachments,
                            isOcrVerified: p.isOcrVerified || nextAttachments.length > 0,
                          });
                        }
                      : undefined
                  }
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Hộp thoại Thêm / Sửa Hồ sơ pháp lý */}
      {(isCreatingNew || editingProfile) && (
        <LegalProfileFormModal
          koc={koc}
          initialProfile={editingProfile}
          nextIndex={profiles.length + 1}
          onClose={() => {
            setEditingProfile(null);
            setIsCreatingNew(false);
          }}
          onSave={handleSaveProfile}
        />
      )}

      {previewState && (
        <LegalDocPreviewModal
          attachments={previewState.attachments}
          activeDoc={previewState.activeDoc}
          profileLabel={previewState.profileLabel}
          onSelectDoc={(doc) =>
            setPreviewState((prev) => (prev ? { ...prev, activeDoc: doc } : null))
          }
          onClose={() => setPreviewState(null)}
        />
      )}

      {qrTargetProfile && (
        <Modal
          open
          onClose={() => setQrTargetProfile(null)}
          title={`Mã QR thụ hưởng: ${qrTargetProfile.profileCode}`}
          size="sm"
        >
          <div className="flex flex-col items-center justify-center p-4 space-y-4">
            <div className="p-3 bg-surface rounded-xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://img.vietqr.io/image/${encodeURIComponent(
                  qrTargetProfile.bankName || 'MB Bank',
                )}-${encodeURIComponent(
                  qrTargetProfile.bankAccount || '',
                )}-compact2.png?amount=0&addInfo=${encodeURIComponent(
                  `Upbase B2C ${koc.stageName} ${qrTargetProfile.profileCode}`,
                )}&accountName=${encodeURIComponent(qrTargetProfile.holderName)}`}
                alt="Mã VietQR"
                className="w-56 h-auto"
              />
            </div>
            <div className="text-center space-y-1 text-xs">
              <Status
                tone={
                  qrTargetProfile.legalType === 'COMPANY'
                    ? 'info'
                    : qrTargetProfile.legalType === 'HOUSEHOLD'
                      ? 'warning'
                      : 'positive'
                }
              >
                {LEGAL_TYPE_LABEL[qrTargetProfile.legalType]} · {qrTargetProfile.taxAccountType}
              </Status>
              <p className="font-semibold text-ink pt-1">{qrTargetProfile.holderName}</p>
              <p className="font-code text-sm text-ink font-semibold tabular-nums">
                {qrTargetProfile.bankAccount}
              </p>
              <p className="text-ink-3">{qrTargetProfile.bankName}</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

/* =========================================================================
   MODAL THÊM / SỬA HỒ SƠ PHÁP LÝ (1 KOC -> N HỒ SƠ PHÁP LÝ)
   ========================================================================= */

function LegalProfileFormModal({
  koc,
  initialProfile,
  nextIndex,
  onClose,
  onSave,
}: {
  koc: KocItem;
  initialProfile: KocLegalProfile | null;
  nextIndex: number;
  onClose: () => void;
  onSave: (profile: KocLegalProfile) => void;
}) {
  const isEdit = Boolean(initialProfile);
  const [legalType, setLegalType] = useState<LegalType>(initialProfile?.legalType || 'INDIVIDUAL');
  const [taxAccountType, setTaxAccountType] = useState(
    initialProfile?.taxAccountType || TAX_ACCOUNT_OPTIONS.INDIVIDUAL[0],
  );
  const [holderName, setHolderName] = useState(
    initialProfile?.holderName || koc.realName || koc.stageName,
  );
  const [representativeName, setRepresentativeName] = useState(
    initialProfile?.representativeName || '',
  );
  const [representativeTitle, setRepresentativeTitle] = useState(
    initialProfile?.representativeTitle || '',
  );
  const [authorizationNumber, setAuthorizationNumber] = useState(
    initialProfile?.authorizationNumber || '',
  );
  const [authorizationDate, setAuthorizationDate] = useState(
    initialProfile?.authorizationDate || '',
  );
  const [relationshipNote, setRelationshipNote] = useState(
    initialProfile?.relationshipNote || 'Chính chủ KOC',
  );
  const [cccd, setCccd] = useState(initialProfile?.cccd || '');
  const [cccdIssueDate, setCccdIssueDate] = useState(initialProfile?.cccdIssueDate || '');
  const [cccdIssuePlace, setCccdIssuePlace] = useState(initialProfile?.cccdIssuePlace || '');
  const [taxCode, setTaxCode] = useState(initialProfile?.taxCode || '');
  const [businessLicenseNo, setBusinessLicenseNo] = useState(
    initialProfile?.businessLicenseNo || '',
  );
  const [vatRatePercent, setVatRatePercent] = useState<number>(
    initialProfile?.vatRatePercent ??
      (initialProfile?.legalType === 'COMPANY'
        ? (initialProfile?.taxAccountType || '').includes('10%')
          ? 10
          : 8
        : initialProfile?.legalType === 'HOUSEHOLD'
          ? 5
          : 0),
  );
  const [registeredAddress, setRegisteredAddress] = useState(
    initialProfile?.registeredAddress || koc.permanentAddress || koc.shippingAddress || '',
  );
  const [contactPhone, setContactPhone] = useState(
    initialProfile?.contactPhone || koc.phone || '',
  );
  const [contactEmail, setContactEmail] = useState(
    initialProfile?.contactEmail || koc.email || '',
  );
  const [bankName, setBankName] = useState(initialProfile?.bankName || 'Techcombank');
  const [bankAccount, setBankAccount] = useState(
    initialProfile?.bankAccount || initialProfile?.bankAccountNumber || '',
  );
  const [bankHolderName, setBankHolderName] = useState(
    initialProfile?.bankHolderName || initialProfile?.holderName || '',
  );
  const [frameworkContractCode, setFrameworkContractCode] = useState(
    initialProfile?.frameworkContractCode || '',
  );
  const [frameworkContractStatus, setFrameworkContractStatus] = useState<
    'CHƯA_KÝ' | 'ĐANG_TRÌNH_KÝ' | 'ĐÃ_KÝ' | 'HẾT_HẠN'
  >(initialProfile?.frameworkContractStatus || 'CHƯA_KÝ');
  const [frameworkContractDriveUrl, setFrameworkContractDriveUrl] = useState(
    initialProfile?.frameworkContractDriveUrl || koc.contractDriveUrl || '',
  );
  const [isDefault, setIsDefault] = useState(
    initialProfile ? initialProfile.isDefault : nextIndex === 1,
  );
  const [notes, setNotes] = useState(initialProfile?.notes || '');
  const [legalAttachments, setLegalAttachments] = useState<LegalDocAttachment[]>(
    initialProfile?.legalAttachments || [],
  );

  const handleApplyOcrFields = (extracted: OcrExtractedFields) => {
    if (extracted.companyName) {
      setHolderName(extracted.companyName);
      if (!bankHolderName) setBankHolderName(extracted.companyName);
    } else if (extracted.fullName && legalType === 'INDIVIDUAL') {
      setHolderName(extracted.fullName);
      if (!bankHolderName) setBankHolderName(extracted.fullName);
    }
    if (extracted.legalRepresentative) {
      setRepresentativeName(extracted.legalRepresentative);
    }
    if (extracted.legalRepTitle) {
      setRepresentativeTitle(extracted.legalRepTitle);
    }
    if (extracted.idNumber) {
      setCccd(extracted.idNumber);
    }
    if (extracted.issueDate) {
      setCccdIssueDate(extracted.issueDate);
    }
    if (extracted.issuePlace) {
      setCccdIssuePlace(extracted.issuePlace);
    }
    if (extracted.taxCode) {
      setTaxCode(extracted.taxCode);
    }
    const addr =
      extracted.headquartersAddress ||
      extracted.permanentAddress ||
      extracted.originAddress;
    if (addr) {
      setRegisteredAddress(addr);
    }
  };

  const handleChangeLegalType = (next: LegalType) => {
    setLegalType(next);
    setTaxAccountType(TAX_ACCOUNT_OPTIONS[next][0]);
    if (next === 'COMPANY') {
      setRelationshipNote('Pháp nhân Công ty / MCN đại diện');
      setVatRatePercent(8);
      if (!representativeTitle) setRepresentativeTitle('Giám đốc');
    } else if (next === 'HOUSEHOLD') {
      setRelationshipNote('Hộ kinh doanh cá thể');
      setVatRatePercent(5);
      if (!representativeTitle) setRepresentativeTitle('Chủ hộ kinh doanh');
    } else {
      setRelationshipNote('Chính chủ KOC');
      setVatRatePercent(0);
    }
  };

  const handleSubmit = () => {
    const profileCode = initialProfile?.profileCode || `HSPL-0${nextIndex}`;
    const cleanBankAcc = bankAccount.trim() || undefined;
    const targetId = initialProfile?.id || `${koc.id}-lp-${Date.now()}`;
    if (legalAttachments.length > 0) {
      saveSyncedKocLegalAttachments(koc.id || koc.channelId, targetId, legalAttachments);
    }
    const saved: KocLegalProfile = {
      id: targetId,
      profileCode,
      legalType,
      isDefault,
      status: cccd.trim() || taxCode.trim() ? 'ACTIVE' : 'PENDING_VERIFY',
      taxAccountType: taxAccountType.trim(),
      vatRatePercent,
      holderName: holderName.trim() || koc.stageName,
      representativeName: representativeName.trim() || undefined,
      representativeTitle: representativeTitle.trim() || undefined,
      authorizationNumber: authorizationNumber.trim() || undefined,
      authorizationDate: authorizationDate.trim() || undefined,
      relationshipNote: relationshipNote.trim() || undefined,
      cccd: cccd.trim() || undefined,
      cccdIssueDate: cccdIssueDate.trim() || undefined,
      cccdIssuePlace: cccdIssuePlace.trim() || undefined,
      taxCode: taxCode.trim() || undefined,
      businessLicenseNo: businessLicenseNo.trim() || undefined,
      registeredAddress: registeredAddress.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      bankName: bankName.trim() || undefined,
      bankAccount: cleanBankAcc,
      bankAccountNumber: cleanBankAcc,
      bankHolderName: bankHolderName.trim() || holderName.trim() || undefined,
      isOcrVerified: Boolean(
        cccd.trim() || taxCode.trim() || legalAttachments.length > 0 || initialProfile?.isOcrVerified,
      ),
      legalAttachments,
      frameworkContractCode: frameworkContractCode.trim() || undefined,
      frameworkContractStatus,
      frameworkContractDriveUrl: frameworkContractDriveUrl.trim() || undefined,
      dealsUsedCount: initialProfile?.dealsUsedCount || 0,
      latestBrandUsed: initialProfile?.latestBrandUsed,
      notes: notes.trim() || undefined,
    };
    onSave(saved);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={
        isEdit
          ? `Sửa hồ sơ pháp lý ${initialProfile?.profileCode} — ${koc.stageName}`
          : `Thêm hồ sơ pháp lý mới (HSPL-0${nextIndex}) — ${koc.stageName}`
      }
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <label className="inline-flex items-center gap-2 text-xs text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-line text-accent focus:ring-accent"
            />
            <span className="font-medium">
              Đặt làm hồ sơ pháp lý mặc định khi tạo Booking Deal &amp; Hợp đồng mới
            </span>
          </label>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Hủy
            </Button>
            <Button variant="primary" icon={Check} onClick={handleSubmit}>
              {isEdit ? 'Lưu thay đổi' : 'Thêm hồ sơ pháp lý'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Loại hình pháp nhân">
            <Select
              value={legalType}
              onChange={(e) => handleChangeLegalType(e.target.value as LegalType)}
              className="w-full"
            >
              <option value="INDIVIDUAL">Cá nhân (CCCD - TNCN 10%)</option>
              <option value="HOUSEHOLD">Hộ kinh doanh (HKD)</option>
              <option value="COMPANY">Công ty / MCN (VAT 8%/10%)</option>
            </Select>
          </Field>

          <Field label="Chế độ khấu trừ thuế">
            <Select
              value={taxAccountType}
              onChange={(e) => setTaxAccountType(e.target.value)}
              className="w-full"
            >
              {TAX_ACCOUNT_OPTIONS[legalType].map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Vai trò / Quan hệ với KOC">
            <Select
              value={relationshipNote}
              onChange={(e) => setRelationshipNote(e.target.value)}
              className="w-full"
            >
              <option value="Chính chủ KOC">Chính chủ KOC</option>
              <option value="Hộ kinh doanh cá thể">Hộ kinh doanh cá thể</option>
              <option value="Pháp nhân Công ty / MCN đại diện">Pháp nhân Công ty / MCN đại diện</option>
              <option value="Người thân / Đại diện nhận ủy quyền">Người thân / Đại diện nhận ủy quyền</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field
            label={
              legalType === 'INDIVIDUAL'
                ? 'Họ và tên cá nhân đứng tên HĐ & Chủ TK'
                : 'Tên Công ty / Hộ kinh doanh đứng tên HĐ & Chủ TK'
            }
          >
            <Input
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              placeholder={
                legalType === 'INDIVIDUAL'
                  ? 'VD: NGUYỄN VĂN A'
                  : 'VD: CÔNG TY TNHH MEDIA / HKD...'
              }
            />
          </Field>

          <Field label="Người đại diện ký hợp đồng (Nếu là Công ty / HKD / Ủy quyền)">
            <Input
              value={representativeName}
              onChange={(e) => setRepresentativeName(e.target.value)}
              placeholder="Họ tên người đại diện pháp luật..."
            />
          </Field>
        </div>

        {(legalType !== 'INDIVIDUAL' || relationshipNote.includes('ủy quyền')) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Chức vụ người đại diện">
              <Input
                value={representativeTitle}
                onChange={(e) => setRepresentativeTitle(e.target.value)}
                placeholder={legalType === 'HOUSEHOLD' ? 'Chủ hộ kinh doanh' : 'Giám đốc'}
              />
            </Field>
            <Field label="Số văn bản ủy quyền (Nếu ký thay)">
              <Input
                value={authorizationNumber}
                onChange={(e) => setAuthorizationNumber(e.target.value)}
                placeholder="VD: 01/2026/UQ"
              />
            </Field>
            <Field label="Ngày văn bản ủy quyền">
              <Input
                value={authorizationDate}
                onChange={(e) => setAuthorizationDate(e.target.value)}
                placeholder="VD: 15/01/2026"
              />
            </Field>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Field label="Số CCCD / CMND (9 hoặc 12 số)">
            <Input
              value={cccd}
              onChange={(e) => setCccd(e.target.value)}
              placeholder="001..."
            />
          </Field>

          <Field label="Ngày cấp CCCD">
            <Input
              value={cccdIssueDate}
              onChange={(e) => setCccdIssueDate(e.target.value)}
              placeholder="VD: 12/05/2022"
            />
          </Field>

          <Field label="Nơi cấp CCCD">
            <Input
              value={cccdIssuePlace}
              onChange={(e) => setCccdIssuePlace(e.target.value)}
              placeholder="VD: Cục CS QLHC về TTXH"
            />
          </Field>

          <Field label="Mã số thuế (Cá nhân / HKD / Công ty)">
            <Input
              value={taxCode}
              onChange={(e) => setTaxCode(e.target.value)}
              placeholder="010... hoặc 854..."
            />
          </Field>
        </div>

        {legalType !== 'INDIVIDUAL' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Số Giấy phép ĐKKD / Đăng ký Hộ kinh doanh (nếu khác MST)">
              <Input
                value={businessLicenseNo}
                onChange={(e) => setBusinessLicenseNo(e.target.value)}
                placeholder="VD: 41A8045129 hoặc mã số DN..."
              />
            </Field>
            <Field label="Thuế suất VAT áp dụng trên hợp đồng (%)">
              <Select
                value={String(vatRatePercent)}
                onChange={(e) => setVatRatePercent(Number(e.target.value))}
                className="w-full"
              >
                {legalType === 'COMPANY' ? (
                  <>
                    <option value="8">VAT 8% (Doanh nghiệp)</option>
                    <option value="10">VAT 10% (Doanh nghiệp)</option>
                    <option value="0">0% (Không chịu VAT)</option>
                  </>
                ) : (
                  <>
                    <option value="5">HKD xuất hóa đơn (5% VAT + 2% TNCN)</option>
                    <option value="0">HKD không xuất hóa đơn</option>
                  </>
                )}
              </Select>
            </Field>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <Field label="Số điện thoại liên hệ trên Hợp đồng">
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="VD: 0987654321"
              />
            </Field>
          </div>
          <div className="sm:col-span-1">
            <Field label="Email nhận thông báo & Ký số WeSign">
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="VD: legal@company.vn"
              />
            </Field>
          </div>
          <div className="sm:col-span-1">
            <Field label="Địa chỉ thường trú / Trụ sở đăng ký trên HĐ">
              <Input
                value={registeredAddress}
                onChange={(e) => setRegisteredAddress(e.target.value)}
                placeholder="Địa chỉ ghi trên CCCD hoặc ĐKKD..."
              />
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-line">
          <Field label="Ngân hàng thụ hưởng">
            <Input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Techcombank, MB Bank, Vietcombank, ACB..."
            />
          </Field>

          <Field label="Số tài khoản ngân hàng nhận tiền">
            <Input
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              placeholder="Nhập chính xác số tài khoản..."
            />
          </Field>

          <Field label="Chủ tài khoản ngân hàng">
            <Input
              value={bankHolderName}
              onChange={(e) => setBankHolderName(e.target.value)}
              placeholder={holderName || 'Tên in hoa trên thẻ/tài khoản...'}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-line">
          <Field label="Mã Hợp đồng nguyên tắc (HĐNT)">
            <Input
              value={frameworkContractCode}
              onChange={(e) => setFrameworkContractCode(e.target.value)}
              placeholder="VD: HĐNT-2026-0028"
            />
          </Field>

          <Field label="Trạng thái ký HĐNT của pháp nhân này">
            <Select
              value={frameworkContractStatus}
              onChange={(e) =>
                setFrameworkContractStatus(
                  e.target.value as 'CHƯA_KÝ' | 'ĐANG_TRÌNH_KÝ' | 'ĐÃ_KÝ' | 'HẾT_HẠN',
                )
              }
              className="w-full"
            >
              <option value="CHƯA_KÝ">Chưa ký HĐNT</option>
              <option value="ĐANG_TRÌNH_KÝ">Đang trình ký WeSign</option>
              <option value="ĐÃ_KÝ">Đã ký HĐNT còn hiệu lực</option>
              <option value="HẾT_HẠN">Hết hạn hiệu lực</option>
            </Select>
          </Field>

          <Field label="Link thư mục Hợp đồng Google Drive">
            <Input
              value={frameworkContractDriveUrl}
              onChange={(e) => setFrameworkContractDriveUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
            />
          </Field>
        </div>

        <LegalAttachmentsPanel
          attachments={legalAttachments}
          onChange={setLegalAttachments}
          entitySlug={`${koc.channelId || koc.id}-hspl-${nextIndex}`}
          legalType={legalType}
          editable
          onExtractOcrFields={(fields) => handleApplyOcrFields(fields)}
          title="Giấy tờ pháp lý đính kèm (CCCD / ĐKKD)"
        />

        <Field label="Ghi chú vận hành / Ủy quyền thanh toán">
          <Textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="VD: Dùng pháp nhân HKD từ tháng 08/2026 cho các nhãn hàng yêu cầu hóa đơn..."
          />
        </Field>
      </div>
    </Modal>
  );
}

function CopyableCode({ text, raw }: { text: string; raw?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex items-center gap-1 font-code font-semibold text-ink tabular-nums">
      {text}
      {raw && (
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(raw);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="p-0.5 rounded text-ink-3 hover:text-ink"
          title="Sao chép"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-positive" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      )}
    </span>
  );
}

export interface KocContractLegalPickerModalProps {
  open: boolean;
  onClose: () => void;
  koc: KocItem | null;
  currentUser?: UserProfile;
  onUpdateKoc?: (updated: KocItem, message?: string) => void;
  onConfirmSelectProfile: (koc: KocItem, legalProfileId: string) => void;
}

export function KocContractLegalPickerModal({
  open,
  onClose,
  koc,
  currentUser,
  onUpdateKoc,
  onConfirmSelectProfile,
}: KocContractLegalPickerModalProps) {
  const profiles = React.useMemo(() => (koc ? getKocLegalProfiles(koc) : []), [koc]);
  const connectedChannels = React.useMemo(
    () => (koc ? getKocConnectedChannels(koc) : []),
    [koc],
  );
  const defaultProfile = profiles.find((p) => p.isDefault) || profiles[0];
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [selectedChannelKeys, setSelectedChannelKeys] = useState<string[]>([]);
  const [isAddingOrEditing, setIsAddingOrEditing] = useState(false);
  const [editingProfile, setEditingProfile] = useState<KocLegalProfile | null>(null);
  const [previewState, setPreviewState] = useState<{
    attachments: LegalDocAttachment[];
    activeDoc: LegalDocAttachment;
    profileLabel: string;
  } | null>(null);

  const activeProfileId =
    selectedProfileId && profiles.some((p) => p.id === selectedProfileId)
      ? selectedProfileId
      : defaultProfile?.id || '';

  const activeChannelKeys =
    selectedChannelKeys.length > 0
      ? selectedChannelKeys
      : connectedChannels.map((c) => `${c.platform}::${c.handle}`);

  if (!open || !koc) return null;

  const canSeeFull = canRevealSensitive(currentUser, koc);
  const showNumber = (val?: string) => {
    if (!val) return '—';
    return canSeeFull ? val : mask(val);
  };

  const toggleChannelKey = (key: string) => {
    setSelectedChannelKeys((prev) => {
      const base =
        prev.length > 0 ? prev : connectedChannels.map((c) => `${c.platform}::${c.handle}`);
      if (base.includes(key)) {
        if (base.length <= 1) return base;
        return base.filter((k) => k !== key);
      }
      return [...base, key];
    });
  };

  const handleSaveNewOrEditedProfile = (savedProfile: KocLegalProfile) => {
    const exists = profiles.some((p) => p.id === savedProfile.id);
    let nextList: KocLegalProfile[];
    if (exists) {
      nextList = profiles.map((p) => (p.id === savedProfile.id ? savedProfile : p));
    } else {
      nextList = [...profiles, savedProfile];
    }
    if (savedProfile.isDefault) {
      nextList = nextList.map((p) => ({ ...p, isDefault: p.id === savedProfile.id }));
    }
    const updatedKoc = syncKocWithLegalProfiles(koc, nextList);
    onUpdateKoc?.(
      updatedKoc,
      `Đã lưu hồ sơ pháp lý ${savedProfile.profileCode} (${savedProfile.holderName}).`,
    );
    setSelectedProfileId(savedProfile.id);
    setIsAddingOrEditing(false);
    setEditingProfile(null);
  };

  const selectedProfile = profiles.find((p) => p.id === activeProfileId) || defaultProfile;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={`Chọn hồ sơ pháp lý & kênh ký hợp đồng — ${koc.stageName}`}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="secondary"
              icon={Plus}
              onClick={() => {
                setEditingProfile(null);
                setIsAddingOrEditing(true);
              }}
            >
              Thêm hồ sơ pháp lý mới
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={onClose}>
                Hủy
              </Button>
              <Button
                variant="primary"
                icon={FileText}
                disabled={!selectedProfile}
                onClick={() => {
                  if (!selectedProfile) return;
                  onConfirmSelectProfile(koc, selectedProfile.id);
                  onClose();
                }}
              >
                Tiếp tục soạn hợp đồng ({selectedProfile?.profileCode || 'Chưa chọn'})
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {/* Bước 1: Chọn Hồ sơ pháp lý đứng tên ký hợp đồng */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-ink">
                1. Chọn hồ sơ pháp lý đứng tên ký hợp đồng ({profiles.length} hồ sơ)
              </span>
              <Status tone="info">Chọn đúng pháp nhân &amp; tài khoản thụ hưởng</Status>
            </div>

            {profiles.length === 0 ? (
              <EmptyState
                title="KOC chưa có hồ sơ pháp lý nào được thiết lập"
                action={
                  <Button
                    size="sm"
                    variant="primary"
                    icon={Plus}
                    onClick={() => {
                      setEditingProfile(null);
                      setIsAddingOrEditing(true);
                    }}
                  >
                    Tạo hồ sơ pháp lý đầu tiên
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-3">
                {profiles.map((p) => {
                  const isSelected = p.id === selectedProfile?.id;
                  const readiness = evaluateLegalProfileContractReadiness(p, koc);
                  const legalIdVal =
                    p.legalType !== 'INDIVIDUAL' ? p.taxCode || p.cccd : p.cccd || p.taxCode;
                  const bankAcc = p.bankAccount || p.bankAccountNumber;
                  const docs = p.legalAttachments || [];

                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProfileId(p.id)}
                      className={`p-4 rounded-xl border transition-colors cursor-pointer space-y-3 ${
                        isSelected
                          ? 'border-primary bg-sunken/70'
                          : 'border-line bg-surface hover:border-line-strong'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <input
                            type="radio"
                            name="koc-contract-legal-profile"
                            checked={isSelected}
                            onChange={() => setSelectedProfileId(p.id)}
                            className="h-4 w-4 text-primary border-line-strong focus:ring-0"
                          />
                          <span className="font-code font-semibold text-ink">{p.profileCode}</span>
                          <span className="font-semibold text-ink">{p.holderName}</span>
                          <Status
                            tone={
                              p.legalType === 'COMPANY'
                                ? 'info'
                                : p.legalType === 'HOUSEHOLD'
                                  ? 'warning'
                                  : 'neutral'
                            }
                          >
                            {LEGAL_TYPE_LABEL[p.legalType]}
                          </Status>
                          {p.isDefault && <Status tone="positive">Mặc định</Status>}
                          <Status
                            tone={
                              p.frameworkContractStatus === 'ĐÃ_KÝ'
                                ? 'positive'
                                : p.frameworkContractStatus === 'ĐANG_TRÌNH_KÝ'
                                  ? 'info'
                                  : 'warning'
                            }
                          >
                            {p.frameworkContractStatus === 'ĐÃ_KÝ'
                              ? `Đã ký HĐNT (${p.frameworkContractCode || 'Còn hiệu lực'})`
                              : 'Chưa ký HĐNT'}
                          </Status>
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Edit3}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProfile(p);
                            setIsAddingOrEditing(true);
                          }}
                        >
                          Sửa
                        </Button>
                      </div>

                      <div className="pl-6 grid grid-cols-1 sm:grid-cols-3 gap-2 text-2xs text-ink-2">
                        <div>
                          <span className="text-ink-3">
                            {p.legalType === 'INDIVIDUAL' ? 'Số CCCD:' : 'Mã số thuế:'}{' '}
                          </span>
                          <strong className="font-code text-ink">{showNumber(legalIdVal)}</strong>
                        </div>
                        <div>
                          <span className="text-ink-3">Tài khoản: </span>
                          <strong className="text-ink">{p.bankName || '—'}</strong> ·{' '}
                          <strong className="font-code text-ink">{showNumber(bankAcc)}</strong>
                        </div>
                        <div>
                          <span className="text-ink-3">Thuế: </span>
                          <strong className="text-ink">{p.taxAccountType}</strong>
                        </div>
                      </div>

                      {!readiness.ready && (
                        <div className="pl-6 text-2xs text-warning font-medium">
                          Cần bổ sung: {readiness.missingFields.join(', ')}
                        </div>
                      )}

                      {docs.length > 0 && (
                        <div className="pl-6 pt-1 flex flex-wrap items-center gap-2">
                          <span className="text-2xs text-ink-3">Giấy tờ đính kèm:</span>
                          {docs.map((doc) => (
                            <button
                              key={doc.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewState({
                                  attachments: docs,
                                  activeDoc: doc,
                                  profileLabel: `${p.profileCode} · ${p.holderName}`,
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-line bg-surface text-ink hover:border-accent hover:text-accent font-medium text-2xs transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-accent shrink-0" />
                              <span>{doc.label || LEGAL_DOC_CATEGORY_LABEL[doc.docType]}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bước 2: Phạm vi các kênh của KOC kết nối với hợp đồng */}
          <div className="p-4 rounded-xl border border-line bg-surface space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-ink">
                2. Các tài khoản kênh áp dụng trong hợp đồng ({activeChannelKeys.length}/
                {connectedChannels.length} kênh)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedChannelKeys(
                      connectedChannels.map((c) => `${c.platform}::${c.handle}`),
                    )
                  }
                  className="px-2 py-0.5 rounded border border-line bg-canvas text-2xs font-medium text-ink-2 hover:text-ink"
                >
                  Chọn tất cả kênh
                </button>
                {connectedChannels.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const prim =
                        connectedChannels.find((c) => c.isPrimary) || connectedChannels[0];
                      if (prim) setSelectedChannelKeys([`${prim.platform}::${prim.handle}`]);
                    }}
                    className="px-2 py-0.5 rounded border border-line bg-canvas text-2xs font-medium text-ink-2 hover:text-ink"
                  >
                    Chỉ kênh TikTok chính
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {connectedChannels.map((ch) => {
                const key = `${ch.platform}::${ch.handle}`;
                const checked = activeChannelKeys.includes(key);
                const platLabel = KOC_PLATFORM_LABEL[ch.platform] || ch.platform;
                return (
                  <label
                    key={key}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-2xs cursor-pointer transition-colors ${
                      checked
                        ? 'border-primary bg-sunken text-ink font-semibold'
                        : 'border-line bg-canvas text-ink-2 hover:border-line-strong'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleChannelKey(key)}
                      className="h-3.5 w-3.5 rounded border-line-strong text-primary focus:ring-0"
                    />
                    <span>{platLabel}:</span>
                    <span className="font-code">@{ch.handle}</span>
                    {ch.isPrimary && ch.platform === 'TIKTOK' && (
                      <span className="text-positive font-medium">(Kênh chính)</span>
                    )}
                    {!ch.isPrimary && ch.platform === 'TIKTOK' && (
                      <span className="text-ink-3">({ch.roleLabel || 'Kênh phụ'})</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {isAddingOrEditing && (
        <LegalProfileFormModal
          onClose={() => {
            setIsAddingOrEditing(false);
            setEditingProfile(null);
          }}
          koc={koc}
          initialProfile={editingProfile}
          nextIndex={profiles.length + 1}
          onSave={handleSaveNewOrEditedProfile}
        />
      )}

      {previewState && (
        <LegalDocPreviewModal
          attachments={previewState.attachments}
          activeDoc={previewState.activeDoc}
          profileLabel={previewState.profileLabel}
          onSelectDoc={(doc) =>
            setPreviewState((prev) => (prev ? { ...prev, activeDoc: doc } : null))
          }
          onClose={() => setPreviewState(null)}
        />
      )}
    </>
  );
}
