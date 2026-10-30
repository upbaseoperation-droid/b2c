'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
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
  UserCheck,
} from 'lucide-react';
import type { KocItem, KocLegalProfile, LegalDocAttachment, OcrExtractedFields, UserProfile } from '../../lib/types';
import { syncKocContactToStaffSheets } from '../../lib/staffBrandListingSheet';
import { LegalAttachmentsPanel } from '../contracts/LegalAttachmentsPanel';
import { Button, Field, Input, Modal, Panel, Select, Stat, StatRow, Status, Textarea } from '../ui';
import {
  LEGAL_TYPE_LABEL,
  canRevealSensitive,
  evaluateLegalProfileContractReadiness,
  getKocLegalProfiles,
  mask,
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
  const profiles = getKocLegalProfiles(koc);
  const allowed = canRevealSensitive(currentUser, koc);
  const [revealed, setRevealed] = useState(false);
  const [editingProfile, setEditingProfile] = useState<KocLegalProfile | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [qrTargetProfile, setQrTargetProfile] = useState<KocLegalProfile | null>(null);

  const show = (val?: string) => {
    if (!val) return '—';
    return revealed ? val : mask(val);
  };

  const defaultProfile = profiles.find((p) => p.isDefault) || profiles[0];
  const distinctTypes = Array.from(new Set(profiles.map((p) => p.legalType)));
  const hasMultipleProfiles = profiles.length > 1;
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
    <div className="space-y-5">
      {/* Thống kê tổng quan Hồ sơ pháp lý 1:N */}
      <StatRow>
        <Stat
          label="Tổng số hồ sơ pháp lý"
          value={`${profiles.length} hồ sơ`}
          note={
            distinctTypes.length > 1
              ? `Đa pháp nhân: ${distinctTypes.map((t) => LEGAL_TYPE_LABEL[t]).join(' + ')}`
              : defaultProfile
                ? `Loại hình: ${LEGAL_TYPE_LABEL[defaultProfile.legalType]}`
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

      {/* Cảnh báo nghiệp vụ khi KOC có nhiều pháp nhân / chuyển đổi thuế */}
      {hasMultipleProfiles && (
        <div className="p-3.5 rounded-xl border border-warning/40 bg-warning-soft/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-semibold text-ink">
                KOC có {profiles.length} hồ sơ pháp lý &amp; tài khoản thụ hưởng qua các đợt hợp tác
              </div>
              <div className="text-ink-2">
                Nguyên tắc Kế toán &amp; Thuế: <b>Chủ thể ký hợp đồng ≡ Người đứng tên CCCD/MST ≡ Chủ tài khoản nhận tiền</b>. Khi KOC chuyển đổi giữa Cá nhân (TNCN 10%), Hộ kinh doanh (HKD) và Công ty/MCN (VAT 8%), cần chọn đúng hồ sơ pháp lý mặc định trước khi lập Đề nghị thanh toán (ĐNTT).
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Thanh công cụ quản lý danh sách hồ sơ pháp lý */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-ink">
            Danh sách Hồ sơ pháp lý &amp; Tài khoản thụ hưởng ({profiles.length})
          </h3>
          {koc.sharedMcnInfo && (
            <span className="px-2 py-0.5 rounded-md bg-warning-soft text-warning border border-warning/30 text-2xs font-medium">
              {koc.sharedMcnInfo}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {allowed && profiles.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              icon={revealed ? EyeOff : Eye}
              onClick={() => setRevealed((v) => !v)}
            >
              {revealed ? 'Ẩn số CCCD / STK' : 'Hiện đầy đủ số CCCD / STK'}
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
          <div className="py-8 text-center space-y-3">
            <p className="text-sm font-semibold text-ink">
              KOC chưa có hồ sơ pháp lý &amp; tài khoản thụ hưởng
            </p>
            <p className="text-xs text-ink-3 max-w-md mx-auto">
              Bổ sung hồ sơ pháp lý (Cá nhân CCCD, Hộ kinh doanh hoặc Công ty/MCN) kèm số tài khoản ngân hàng chính chủ để phục vụ ký Hợp đồng nguyên tắc và thanh toán.
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
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
          </div>
        </Panel>
      ) : (
        <div className="grid gap-4">
          {profiles.map((p, idx) => {
            const isComp = p.legalType === 'COMPANY';
            const isHkd = p.legalType === 'HOUSEHOLD';
            const readiness = evaluateLegalProfileContractReadiness(p, koc);
            return (
              <div
                key={p.id || idx}
                className={`rounded-xl border transition-colors ${
                  p.isDefault
                    ? 'border-accent bg-accent-soft/15 shadow-xs'
                    : 'border-line bg-surface hover:border-line-strong'
                }`}
              >
                {/* Header của từng Hồ sơ pháp lý */}
                <div className="px-4 py-3 border-b border-line flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface-2 border border-line text-ink">
                      {p.profileCode || `HSPL-0${idx + 1}`}
                    </span>
                    <Status tone={isComp ? 'info' : isHkd ? 'warning' : 'positive'}>
                      {LEGAL_TYPE_LABEL[p.legalType]}
                    </Status>
                    <span className="text-sm font-semibold text-ink">{p.holderName}</span>
                    {p.relationshipNote && (
                      <span className="text-2xs px-2 py-0.5 rounded-full bg-sunken text-ink-2 border border-line">
                        {p.relationshipNote}
                      </span>
                    )}
                    {p.isDefault && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-white text-2xs font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        Mặc định hiện hành
                      </span>
                    )}
                    {readiness.ready ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-positive-soft text-positive border border-positive/30 text-2xs font-semibold">
                        <Check className="w-3 h-3" />
                        Đủ trường ký HĐ ({readiness.filledCount}/{readiness.totalRequired})
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProfile(p);
                          setIsCreatingNew(false);
                        }}
                        title={`Thiếu: ${readiness.missingFields.join(', ')}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning-soft text-warning border border-warning/30 text-2xs font-semibold hover:bg-warning-soft/80 cursor-pointer"
                      >
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>
                          Thiếu {readiness.missingFields.length} trường HĐ: {readiness.missingFields.slice(0, 2).join(', ')}
                          {readiness.missingFields.length > 2 ? '…' : ''}
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {onCreateContractForProfile && (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={FileText}
                        onClick={() => onCreateContractForProfile(koc, p)}
                      >
                        Ký HĐ theo pháp nhân này
                      </Button>
                    )}
                    {!p.isDefault && onUpdateKoc && (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={Star}
                        onClick={() => handleSetDefault(p.id)}
                      >
                        Đặt làm mặc định
                      </Button>
                    )}
                    {p.bankAccount && (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={QrCode}
                        onClick={() => setQrTargetProfile(p)}
                      >
                        Mã QR
                      </Button>
                    )}
                    {onUpdateKoc && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Edit3}
                        onClick={() => {
                          setEditingProfile(p);
                          setIsCreatingNew(false);
                        }}
                      >
                        Sửa
                      </Button>
                    )}
                    {onUpdateKoc && profiles.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Trash2}
                        onClick={() => handleDeleteProfile(p.id)}
                      >
                        Xóa
                      </Button>
                    )}
                  </div>
                </div>

                {/* Body 3 cột chuẩn ERD: Pháp nhân - Tài khoản ngân hàng - Hợp đồng nguyên tắc */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Cột 1: Định danh Pháp lý & Thuế */}
                  <div className="space-y-2 md:border-r md:border-line md:pr-4">
                    <div className="flex items-center gap-1.5 font-semibold text-ink-2 text-2xs uppercase tracking-wider">
                      <Building2 className="w-3.5 h-3.5 text-accent" />
                      <span>1. Định danh Pháp nhân &amp; Thuế</span>
                    </div>
                    <div className="grid gap-1.5 pt-1">
                      <div className="flex justify-between gap-2">
                        <span className="text-ink-3">Chế độ thuế:</span>
                        <span className="font-medium text-ink text-right">{p.taxAccountType}</span>
                      </div>
                      {p.cccd && (
                        <div className="flex justify-between gap-2">
                          <span className="text-ink-3">Số CCCD/CMND:</span>
                          <CopyableCode text={show(p.cccd)} raw={revealed ? p.cccd : undefined} />
                        </div>
                      )}
                      {p.taxCode && (
                        <div className="flex justify-between gap-2">
                          <span className="text-ink-3">
                            {p.legalType === 'INDIVIDUAL' ? 'MST cá nhân:' : 'Mã số thuế ĐKKD:'}
                          </span>
                          <CopyableCode text={show(p.taxCode)} raw={revealed ? p.taxCode : undefined} />
                        </div>
                      )}
                      {p.representativeName && (
                        <div className="flex justify-between gap-2">
                          <span className="text-ink-3">Người đại diện:</span>
                          <span className="font-medium text-ink text-right">
                            {p.representativeName}
                            {p.representativeTitle ? ` (${p.representativeTitle})` : ''}
                          </span>
                        </div>
                      )}
                      {(p.authorizationNumber || p.authorizationDate) && (
                        <div className="flex justify-between gap-2">
                          <span className="text-ink-3">Văn bản ủy quyền:</span>
                          <span className="text-ink-2 text-right">
                            {[p.authorizationNumber, p.authorizationDate].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                      )}
                      {(p.cccdIssueDate || p.cccdIssuePlace) && (
                        <div className="flex justify-between gap-2">
                          <span className="text-ink-3">Ngày &amp; Nơi cấp:</span>
                          <span className="text-ink-2 text-right">
                            {[p.cccdIssueDate, p.cccdIssuePlace].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                      )}
                      {p.registeredAddress && (
                        <div className="flex justify-between gap-2">
                          <span className="text-ink-3 shrink-0">Địa chỉ pháp lý:</span>
                          <span className="text-ink-2 text-right truncate max-w-[180px]" title={p.registeredAddress}>
                            {p.registeredAddress}
                          </span>
                        </div>
                      )}
                      {p.businessLicenseNo && (
                        <div className="flex justify-between gap-2">
                          <span className="text-ink-3">Số GP ĐKKD:</span>
                          <span className="font-mono text-ink-2 text-right">{p.businessLicenseNo}</span>
                        </div>
                      )}
                      {(p.contactPhone || p.contactEmail) && (
                        <div className="flex justify-between gap-2">
                          <span className="text-ink-3 shrink-0">SĐT / Email HĐ:</span>
                          <span className="text-ink-2 text-right truncate max-w-[180px]" title={[p.contactPhone, p.contactEmail].filter(Boolean).join(' · ')}>
                            {[p.contactPhone, p.contactEmail].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cột 2: Tài khoản Ngân hàng Thụ hưởng */}
                  <div className="space-y-2 md:border-r md:border-line md:pr-4">
                    <div className="flex items-center gap-1.5 font-semibold text-ink-2 text-2xs uppercase tracking-wider">
                      <CreditCard className="w-3.5 h-3.5 text-positive" />
                      <span>2. Tài khoản Thụ hưởng Chính chủ</span>
                    </div>
                    <div className="grid gap-1.5 pt-1">
                      <div className="flex justify-between gap-2">
                        <span className="text-ink-3">Ngân hàng:</span>
                        <span className="font-semibold text-ink">{p.bankName || 'Chưa cập nhật'}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-ink-3">Số tài khoản:</span>
                        {p.bankAccount ? (
                          <CopyableCode
                            text={show(p.bankAccount)}
                            raw={revealed ? p.bankAccount : undefined}
                          />
                        ) : (
                          <span className="text-warning font-medium">Chưa bổ sung STK</span>
                        )}
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-ink-3">Chủ tài khoản:</span>
                        <span className="font-medium text-ink text-right">{p.bankHolderName || p.holderName}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-ink-3">Xác thực giấy tờ:</span>
                        <span className={p.isOcrVerified ? 'text-positive font-medium' : 'text-ink-3'}>
                          {p.isOcrVerified ? 'Đã đối chiếu CCCD/ĐKKD' : 'Chưa đối chiếu ảnh'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cột 3: Hợp đồng Nguyên tắc (HĐNT) & Lịch sử sử dụng */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 font-semibold text-ink-2 text-2xs uppercase tracking-wider">
                      <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                      <span>3. Hợp đồng Nguyên tắc &amp; Lịch sử</span>
                    </div>
                    <div className="grid gap-1.5 pt-1">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-ink-3">Trạng thái HĐNT:</span>
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
                      </div>
                      {p.frameworkContractCode && (
                        <div className="flex justify-between gap-2">
                          <span className="text-ink-3">Mã HĐNT:</span>
                          <span className="font-mono font-semibold text-ink">{p.frameworkContractCode}</span>
                        </div>
                      )}
                      <div className="flex justify-between gap-2">
                        <span className="text-ink-3">Lịch sử nghiệm thu:</span>
                        <span className="font-medium text-ink">
                          {p.dealsUsedCount ? `${p.dealsUsedCount} đợt book` : 'Chưa phát sinh đợt chi'}
                          {p.latestBrandUsed ? ` (${p.latestBrandUsed})` : ''}
                        </span>
                      </div>
                      {p.frameworkContractDriveUrl && (
                        <div className="pt-0.5">
                          <a
                            href={p.frameworkContractDriveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-accent hover:underline font-medium text-2xs"
                          >
                            <FileText className="w-3 h-3" />
                            Mở thư mục Hợp đồng Drive
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      )}
                      {onCreateContractForProfile && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => onCreateContractForProfile(koc, p)}
                            className="inline-flex items-center gap-1 text-accent hover:underline font-semibold text-2xs"
                          >
                            <FileText className="w-3 h-3" />
                            {p.frameworkContractStatus === 'ĐÃ_KÝ'
                              ? 'Mở / Tạo Phụ lục từ pháp nhân này'
                              : 'Soạn Hợp đồng nguyên tắc (HĐNT) cho pháp nhân này'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Khối đính kèm CCCD & ĐKKD lưu trữ trên Cloudflare R2 */}
                <div className="px-4 pb-4">
                  <LegalAttachmentsPanel
                    attachments={p.legalAttachments || []}
                    entitySlug={`${koc.channelId || koc.id}-${p.profileCode || 'hspl'}`}
                    legalType={p.legalType}
                    editable={Boolean(onUpdateKoc)}
                    onChange={
                      onUpdateKoc
                        ? (nextAttachments) => {
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

      {/* Hộp thoại Mã QR VietQR theo đúng Hồ sơ pháp lý được chọn */}
      {qrTargetProfile && (
        <Modal
          open
          onClose={() => setQrTargetProfile(null)}
          title={`Mã QR thụ hưởng: ${qrTargetProfile.profileCode}`}
          size="sm"
        >
          <div className="flex flex-col items-center justify-center p-4 space-y-4">
            <div className="p-3 bg-white rounded-xl border border-line shadow-xs">
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
              <p className="font-mono text-sm text-ink font-semibold tabular-nums">
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
    const saved: KocLegalProfile = {
      id: initialProfile?.id || `${koc.id}-lp-${Date.now()}`,
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
          title="Tải lên & Đính kèm CCCD / ĐKKD (Lưu trữ Cloudflare R2)"
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
    <span className="inline-flex items-center gap-1 font-mono font-semibold text-ink tabular-nums">
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
          {copied ? <Check className="w-3 h-3 text-positive" /> : <Copy className="w-3 h-3" />}
        </button>
      )}
    </span>
  );
}
