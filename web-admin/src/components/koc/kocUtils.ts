/**
 * Logic dùng chung cho danh bạ KOC và hồ sơ KOC: loại hồ sơ pháp lý, che số nhạy cảm,
 * phát hiện hồ sơ trùng, quyền xem số đầy đủ, trạng thái booking.
 */

import type {
  BookingDealItem,
  KocBookingReadiness,
  KocConnectedChannel,
  KocPlatformType,
  KocItem,
  KocLegalProfile,
  KocPayeeProfile,
  LegalDocAttachment,
  UserProfile,
} from '../../lib/types';
import type { StatusTone } from '../ui';

/* ------------------------------------------------------------- Pháp lý */

export type LegalType = 'INDIVIDUAL' | 'HOUSEHOLD' | 'COMPANY';

export const LEGAL_TYPE_LABEL: Record<LegalType, string> = {
  INDIVIDUAL: 'Cá nhân',
  HOUSEHOLD: 'Hộ kinh doanh',
  COMPANY: 'Công ty',
};

export const READINESS_LABEL: Record<KocBookingReadiness, { label: string; tone: StatusTone }> = {
  SẴN_SÀNG_BOOKING: { label: 'Sẵn sàng booking', tone: 'positive' },
  TIẾP_CẬN_BỔ_SUNG_PHÁP_LÝ: { label: 'Có liên hệ · Bổ sung pháp lý', tone: 'info' },
  CẦN_XIN_LIÊN_HỆ: { label: 'Cần xin SĐT/Zalo', tone: 'warning' },
  CHỜ_TIẾP_CẬN: { label: 'Chờ tiếp cận', tone: 'neutral' },
};

/**
 * Xác định loại pháp nhân từ tên đơn vị thụ hưởng hoặc chế độ thuế.
 */
export function inferLegalTypeFromText(holderName?: string, taxAccountType?: string): LegalType {
  const tax = (taxAccountType || '').toLowerCase();
  const holder = (holderName || '').toUpperCase();
  if (
    tax.includes('hộ kinh doanh') ||
    tax.includes('hkd') ||
    /HO KINH DOANH|HỘ KINH DOANH|HKD/.test(holder)
  ) {
    return 'HOUSEHOLD';
  }
  if (
    tax.includes('doanh nghiệp') ||
    tax.includes('vat') ||
    /CONG TY|CÔNG TY|CTY|TNHH|CO PHAN|CỔ PHẦN|MEDIA|NETWORK|ENTERTAINMENT|AGENCY|GROUP/.test(holder)
  ) {
    return 'COMPANY';
  }
  return 'INDIVIDUAL';
}

export function legalTypeOf(k: KocItem): LegalType {
  if (k.legalProfiles && k.legalProfiles.length > 0) {
    const def = k.legalProfiles.find((p) => p.isDefault) || k.legalProfiles[0];
    if (def) return def.legalType;
  }
  if (k.ocrDocumentType === 'BUSINESS_LICENSE') return 'COMPANY';
  if (k.ocrDocumentType === 'BUSINESS_HOUSEHOLD') return 'HOUSEHOLD';
  return inferLegalTypeFromText(k.companyName || k.realName, k.taxAccountType);
}

/** Số định danh dùng để ký hợp đồng: MST cho hộ kinh doanh / công ty, CCCD cho cá nhân. */
export function legalIdOf(k: KocItem): string {
  if (k.legalProfiles && k.legalProfiles.length > 0) {
    const def = k.legalProfiles.find((p) => p.isDefault) || k.legalProfiles[0];
    if (def) {
      const idVal = def.legalType !== 'INDIVIDUAL' ? def.taxCode || def.cccd : def.cccd || def.taxCode;
      if (idVal && idVal.trim()) return idVal.trim();
    }
  }
  const digits = (s?: string) => (s || '').replace(/\D/g, '');
  if (legalTypeOf(k) !== 'INDIVIDUAL' && digits(k.taxCode).length >= 7) return k.taxCode!.trim();
  const cccd = digits(k.cccd);
  if (cccd.length >= 9 && !/^0+$/.test(cccd)) return (k.cccd || '').trim();
  if (digits(k.taxCode).length >= 7 && !/^0+$/.test(digits(k.taxCode))) return k.taxCode!.trim();
  return '';
}

export const hasLegalId = (k: KocItem) => legalIdOf(k) !== '';

export const KOC_LEGAL_ATTACHMENTS_STORAGE_KEY = 'upbase_b2c_koc_legal_attachments_v1';
export const KOC_LEGAL_ATTACHMENTS_EVENT = 'upbase-koc-legal-attachments-updated';

const inMemoryKocLegalAttachments = new Map<string, LegalDocAttachment[]>();
let hydratedFromLocalStorage = false;

function ensureHydratedKocLegalAttachments(): void {
  if (hydratedFromLocalStorage || typeof window === 'undefined') return;
  hydratedFromLocalStorage = true;
  try {
    const raw = window.localStorage.getItem(KOC_LEGAL_ATTACHMENTS_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, LegalDocAttachment[]>;
    if (parsed && typeof parsed === 'object') {
      for (const [k, v] of Object.entries(parsed)) {
        if (Array.isArray(v)) {
          inMemoryKocLegalAttachments.set(k, v);
        }
      }
    }
  } catch {
    // ignore
  }
}

export function mergeLegalDocAttachments(
  existing?: LegalDocAttachment[],
  incoming?: LegalDocAttachment[],
): LegalDocAttachment[] {
  const base = Array.isArray(existing) ? existing : [];
  const next = Array.isArray(incoming) ? incoming : [];
  if (next.length === 0) return base;
  if (base.length === 0) return next;
  const incomingDocTypes = new Set(next.map((a) => a.docType));
  const incomingIds = new Set(next.map((a) => a.id));
  const kept = base.filter((a) => !incomingIds.has(a.id) && !incomingDocTypes.has(a.docType));
  return [...kept, ...next];
}

export function saveSyncedKocLegalAttachments(
  kocId: string,
  legalProfileId: string | undefined,
  attachments: LegalDocAttachment[],
): void {
  if (!kocId || !Array.isArray(attachments)) return;
  ensureHydratedKocLegalAttachments();
  const profileKey = `${kocId}::${legalProfileId || 'DEFAULT'}`;
  const latestKey = `${kocId}::LATEST`;
  inMemoryKocLegalAttachments.set(profileKey, attachments);
  inMemoryKocLegalAttachments.set(latestKey, attachments);

  if (typeof window !== 'undefined') {
    try {
      const serialized: Record<string, LegalDocAttachment[]> = {};
      for (const [k, v] of inMemoryKocLegalAttachments.entries()) {
        serialized[k] = v;
      }
      window.localStorage.setItem(
        KOC_LEGAL_ATTACHMENTS_STORAGE_KEY,
        JSON.stringify(serialized),
      );
      window.dispatchEvent(
        new CustomEvent(KOC_LEGAL_ATTACHMENTS_EVENT, {
          detail: { kocId, legalProfileId, attachments },
        }),
      );
    } catch {
      // ignore
    }
  }
}

export function getSyncedKocLegalAttachments(
  koc: KocItem,
  profile: KocLegalProfile,
  profileIdx = 0,
): LegalDocAttachment[] {
  ensureHydratedKocLegalAttachments();
  let merged = mergeLegalDocAttachments([], profile.legalAttachments);

  const byProfile = inMemoryKocLegalAttachments.get(`${koc.id}::${profile.id}`);
  if (byProfile && byProfile.length > 0) {
    merged = mergeLegalDocAttachments(merged, byProfile);
  } else if (profile.isDefault || profileIdx === 0) {
    const byDefault =
      inMemoryKocLegalAttachments.get(`${koc.id}::DEFAULT`) ||
      inMemoryKocLegalAttachments.get(`${koc.id}::LATEST`);
    if (byDefault && byDefault.length > 0) {
      merged = mergeLegalDocAttachments(merged, byDefault);
    }
  }

  // Nếu hồ sơ pháp lý đã đối chiếu CCCD/ĐKKD hoặc có số CCCD/MST hợp lệ từ lịch sử ký HĐ
  // thì tạo sẵn đường dẫn bản lưu R2 để nhân sự ấn vào xem đối chiếu ngay.
  const cleanCccd = (profile.cccd || '').trim();
  const cleanTax = (profile.taxCode || profile.businessLicenseNo || '').trim();
  const hasRealCccd = cleanCccd.length >= 9 && !/^0+$/.test(cleanCccd.replace(/\D/g, ''));
  const hasRealTax = cleanTax.length >= 7 && !/^0+$/.test(cleanTax.replace(/\D/g, ''));
  const slug = (koc.channelId || koc.id || 'koc').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || 'koc';
  const holder = profile.holderName || koc.realName || koc.stageName;
  const rep = profile.representativeName || koc.legalRepresentative || koc.realName || holder;
  const repTitle =
    profile.representativeTitle ||
    (profile.legalType === 'COMPANY'
      ? 'Giám đốc'
      : profile.legalType === 'HOUSEHOLD'
        ? 'Chủ hộ kinh doanh'
        : 'Chính chủ');
  const address =
    profile.registeredAddress ||
    koc.permanentAddress ||
    koc.shippingAddress ||
    'TP. Hà Nội';
  const issueDate = profile.cccdIssueDate || koc.issueDate || '15/05/2022';
  const issuePlace = profile.cccdIssuePlace || koc.issuePlace || 'Cục Cảnh sát QLHC về TTXH';

  const generated: LegalDocAttachment[] = [];

  if (
    (profile.legalType === 'COMPANY' || profile.legalType === 'HOUSEHOLD') &&
    (hasRealTax || profile.isOcrVerified || profile.frameworkContractStatus === 'ĐÃ_KÝ') &&
    !merged.some((a) => a.docType === 'DKKD')
  ) {
    const dkkdKey = `legal-docs/demo-${slug}/2026-10/00000003-giay-phep-dkkd.svg`;
    const qs = new URLSearchParams({
      key: dkkdKey,
      holder,
      idNo: cleanTax || cleanCccd || '0109876543',
      rep,
      repTitle,
      address,
      issueDate,
      taxMode: profile.taxAccountType || 'Xuất hóa đơn ĐKKD',
    }).toString();
    generated.push({
      id: `${profile.id}-r2-dkkd`,
      docType: 'DKKD',
      label:
        profile.legalType === 'HOUSEHOLD'
          ? 'Giấy phép ĐKKD Hộ kinh doanh'
          : 'Giấy phép ĐKKD Doanh nghiệp',
      fileKey: dkkdKey,
      fileName: `giay-phep-dkkd-${slug}.svg`,
      fileSize: 245760,
      mimeType: 'image/svg+xml',
      storage: 'R2',
      url: `/api/contracts/legal-docs?${qs}`,
      uploadedAt: profile.frameworkContractSignedAt || '2026-10-15T09:00:00.000Z',
      uploadedBy: koc.bookingPic || 'Hệ thống Hợp đồng B2C',
    });
  }

  if (
    (hasRealCccd || (profile.legalType === 'INDIVIDUAL' && (profile.isOcrVerified || profile.frameworkContractStatus === 'ĐÃ_KÝ'))) &&
    !merged.some((a) => a.docType === 'CCCD_FRONT' || a.docType === 'CCCD_SCAN')
  ) {
    const frontKey = `legal-docs/demo-${slug}/2026-10/00000001-cccd-mat-truoc.svg`;
    const frontQs = new URLSearchParams({
      key: frontKey,
      holder: profile.legalType === 'INDIVIDUAL' ? holder : rep,
      idNo: cleanCccd || cleanTax || '001201019876',
      address,
      issueDate,
      issuePlace,
    }).toString();
    generated.push({
      id: `${profile.id}-r2-cccd-front`,
      docType: 'CCCD_FRONT',
      label: 'CCCD mặt trước',
      fileKey: frontKey,
      fileName: `cccd-mat-truoc-${slug}.svg`,
      fileSize: 184320,
      mimeType: 'image/svg+xml',
      storage: 'R2',
      url: `/api/contracts/legal-docs?${frontQs}`,
      uploadedAt: profile.frameworkContractSignedAt || '2026-10-15T09:00:00.000Z',
      uploadedBy: koc.bookingPic || 'Hệ thống Hợp đồng B2C',
    });

    if (!merged.some((a) => a.docType === 'CCCD_BACK')) {
      const backKey = `legal-docs/demo-${slug}/2026-10/00000002-cccd-mat-sau.svg`;
      const backQs = new URLSearchParams({
        key: backKey,
        holder: profile.legalType === 'INDIVIDUAL' ? holder : rep,
        idNo: cleanCccd || cleanTax || '001201019876',
        address,
        issueDate,
        issuePlace,
      }).toString();
      generated.push({
        id: `${profile.id}-r2-cccd-back`,
        docType: 'CCCD_BACK',
        label: 'CCCD mặt sau',
        fileKey: backKey,
        fileName: `cccd-mat-sau-${slug}.svg`,
        fileSize: 176120,
        mimeType: 'image/svg+xml',
        storage: 'R2',
        url: `/api/contracts/legal-docs?${backQs}`,
        uploadedAt: profile.frameworkContractSignedAt || '2026-10-15T09:00:00.000Z',
        uploadedBy: koc.bookingPic || 'Hệ thống Hợp đồng B2C',
      });
    }
  }

  return mergeLegalDocAttachments(generated, merged);
}

/**
 * Trả về danh sách Hồ sơ pháp lý (1 KOC -> N KocLegalProfile) theo chuẩn ERD `creator_legal_profile`.
 * Tự động chuẩn hóa từ `k.legalProfiles`, `k.alternatePayees` và thông tin pháp lý gốc của KOC.
 */
export function getKocLegalProfiles(k: KocItem): KocLegalProfile[] {
  if (k.legalProfiles && k.legalProfiles.length > 0) {
    return k.legalProfiles.map((p, idx) => {
      const bankAcc = p.bankAccount || p.bankAccountNumber;
      const vatDefault =
        p.vatRatePercent ??
        (p.legalType === 'COMPANY'
          ? (p.taxAccountType || '').includes('10%')
            ? 10
            : 8
          : p.legalType === 'HOUSEHOLD'
            ? 5
            : 0);
      return {
        ...p,
        profileCode: p.profileCode || `HSPL-0${idx + 1}`,
        bankAccount: bankAcc,
        bankAccountNumber: p.bankAccountNumber || bankAcc,
        bankHolderName: p.bankHolderName || p.holderName,
        representativeName:
          p.representativeName ||
          (p.legalType !== 'INDIVIDUAL' && (p.isDefault || idx === 0)
            ? k.legalRepresentative || k.realName
            : undefined),
        representativeTitle:
          p.representativeTitle ||
          (p.legalType === 'COMPANY'
            ? 'Giám đốc'
            : p.legalType === 'HOUSEHOLD'
              ? 'Chủ hộ kinh doanh'
              : undefined),
        contactPhone: p.contactPhone || (p.isDefault || idx === 0 ? k.phone : undefined),
        contactEmail: p.contactEmail || (p.isDefault || idx === 0 ? k.email : undefined),
        vatRatePercent: vatDefault,
        legalAttachments: getSyncedKocLegalAttachments(k, p, idx),
      };
    });
  }

  const profiles: KocLegalProfile[] = [];
  const payees = k.alternatePayees || [];

  if (payees.length > 0) {
    payees.forEach((p, idx) => {
      const lType = inferLegalTypeFromText(p.holderName, p.taxAccountType);
      const cleanId = (p.legalId || '').trim();
      const isTaxCode =
        lType !== 'INDIVIDUAL' ||
        cleanId.includes('-') ||
        cleanId.length === 10 ||
        cleanId.length === 13;
      const defaultTaxLabel =
        p.taxAccountType ||
        (lType === 'COMPANY'
          ? '(VAT 8%) Tài khoản doanh nghiệp'
          : lType === 'HOUSEHOLD'
            ? 'HKD xuất hóa đơn'
            : '(Thuế TNCN 10%) Tài khoản cá nhân');

      let relationshipNote = 'Chính chủ KOC';
      if (lType === 'COMPANY') relationshipNote = 'Pháp nhân Công ty / MCN đại diện';
      else if (lType === 'HOUSEHOLD') relationshipNote = 'Hộ kinh doanh cá thể';
      else if (
        idx > 0 &&
        k.realName &&
        p.holderName &&
        p.holderName.trim().toLowerCase() !== k.realName.trim().toLowerCase()
      ) {
        relationshipNote = 'Người thân / Đại diện nhận ủy quyền';
      }

      const hasSignedContract = Boolean(k.contractDriveUrl) && idx === 0;
      const holder = p.holderName || k.companyName || k.realName || k.stageName;
      const bankAcc = p.bankAccount || (idx === 0 ? k.bankAccount : undefined);

      profiles.push({
        id: `${k.id}-lp-${idx + 1}`,
        profileCode: `HSPL-0${idx + 1}`,
        legalType: lType,
        isDefault: idx === 0,
        status: idx === 0 ? 'ACTIVE' : 'ACTIVE',
        taxAccountType: defaultTaxLabel,
        vatRatePercent:
          lType === 'COMPANY'
            ? defaultTaxLabel.includes('10%')
              ? 10
              : 8
            : lType === 'HOUSEHOLD'
              ? 5
              : 0,
        holderName: holder,
        representativeName: lType !== 'INDIVIDUAL' ? k.legalRepresentative || k.realName : undefined,
        representativeTitle:
          lType === 'COMPANY'
            ? 'Giám đốc'
            : lType === 'HOUSEHOLD'
              ? 'Chủ hộ kinh doanh'
              : undefined,
        relationshipNote,
        cccd: !isTaxCode ? cleanId : idx === 0 ? k.cccd : undefined,
        cccdIssueDate: idx === 0 ? k.issueDate : undefined,
        cccdIssuePlace: idx === 0 ? k.issuePlace : undefined,
        taxCode: isTaxCode ? cleanId : idx === 0 && k.taxCode !== 'Chưa có' ? k.taxCode : undefined,
        registeredAddress: idx === 0 ? k.permanentAddress || k.shippingAddress : undefined,
        contactPhone: idx === 0 ? k.phone : undefined,
        contactEmail: idx === 0 ? k.email : undefined,
        bankName: p.bankName || (idx === 0 ? k.bankName : undefined),
        bankAccount: bankAcc,
        bankAccountNumber: bankAcc,
        bankHolderName: holder,
        isOcrVerified: idx === 0 ? Boolean(k.isOcrVerified) : false,
        frameworkContractCode: undefined,
        frameworkContractStatus: hasSignedContract ? 'ĐÃ_KÝ' : 'CHƯA_KÝ',
        frameworkContractDriveUrl: idx === 0 ? k.contractDriveUrl : undefined,
        dealsUsedCount: p.dealsCount || (idx === 0 ? k.totalPastDeals : undefined),
        latestBrandUsed: p.latestBrand || (idx === 0 ? k.brandName : undefined),
      });
    });
    return profiles.map((p, idx) => ({
      ...p,
      legalAttachments: getSyncedKocLegalAttachments(k, p, idx),
    }));
  }

  // Trường hợp KOC chưa có mảng alternatePayees nhưng có thông tin pháp lý/ngân hàng gốc
  const primaryLegalId = legalIdOf(k);
  const hasBank = Boolean(k.bankAccount && k.bankAccount.trim());
  if (primaryLegalId || hasBank) {
    const lType = legalTypeOf(k);
    const defaultTaxLabel =
      k.taxAccountType ||
      (lType === 'COMPANY'
        ? '(VAT 8%) Tài khoản doanh nghiệp'
        : lType === 'HOUSEHOLD'
          ? 'HKD xuất hóa đơn'
          : '(Thuế TNCN 10%) Tài khoản cá nhân');
    const hasSigned = Boolean(k.contractDriveUrl);
    const holder =
      (lType !== 'INDIVIDUAL' ? k.companyName || k.realName : k.realName) || k.stageName;

    profiles.push({
      id: `${k.id}-lp-1`,
      profileCode: 'HSPL-01',
      legalType: lType,
      isDefault: true,
      status: primaryLegalId && hasBank ? 'ACTIVE' : 'PENDING_VERIFY',
      taxAccountType: defaultTaxLabel,
      vatRatePercent:
        lType === 'COMPANY'
          ? defaultTaxLabel.includes('10%')
            ? 10
            : 8
          : lType === 'HOUSEHOLD'
            ? 5
            : 0,
      holderName: holder,
      representativeName: lType !== 'INDIVIDUAL' ? k.legalRepresentative || k.realName : undefined,
      representativeTitle:
        lType === 'COMPANY'
          ? 'Giám đốc'
          : lType === 'HOUSEHOLD'
            ? 'Chủ hộ kinh doanh'
            : undefined,
      relationshipNote:
        lType === 'COMPANY'
          ? 'Pháp nhân Công ty / MCN đại diện'
          : lType === 'HOUSEHOLD'
            ? 'Hộ kinh doanh cá thể'
            : 'Chính chủ KOC',
      cccd: k.cccd && k.cccd !== 'Chưa có' ? k.cccd : undefined,
      cccdIssueDate: k.issueDate,
      cccdIssuePlace: k.issuePlace,
      taxCode: k.taxCode && k.taxCode !== 'Chưa có' ? k.taxCode : undefined,
      registeredAddress: k.permanentAddress || k.shippingAddress,
      contactPhone: k.phone,
      contactEmail: k.email,
      bankName: k.bankName,
      bankAccount: k.bankAccount,
      bankAccountNumber: k.bankAccount,
      bankHolderName: holder,
      isOcrVerified: Boolean(k.isOcrVerified),
      frameworkContractCode: undefined,
      frameworkContractStatus: hasSigned ? 'ĐÃ_KÝ' : 'CHƯA_KÝ',
      frameworkContractDriveUrl: k.contractDriveUrl,
      dealsUsedCount: k.totalPastDeals || undefined,
      latestBrandUsed: k.brandName || undefined,
    });
  }

  return profiles.map((p, idx) => ({
    ...p,
    legalAttachments: getSyncedKocLegalAttachments(k, p, idx),
  }));
}

export interface LegalProfileContractReadiness {
  ready: boolean;
  missingFields: string[];
  filledCount: number;
  totalRequired: number;
}

/**
 * Kiểm tra xem một Hồ sơ pháp lý (`KocLegalProfile`) đã có đầy đủ các trường bắt buộc
 * để tự động điền sang Hợp đồng (HĐNT / SOW / BBNT) hay chưa.
 */
export function evaluateLegalProfileContractReadiness(
  p: KocLegalProfile,
  koc?: KocItem,
): LegalProfileContractReadiness {
  const missing: string[] = [];
  let total = 0;

  const check = (ok: boolean, label: string) => {
    total += 1;
    if (!ok) missing.push(label);
  };

  check(Boolean(p.holderName && p.holderName.trim()), p.legalType === 'INDIVIDUAL' ? 'Họ tên pháp lý' : 'Tên đơn vị pháp nhân');

  if (p.legalType === 'INDIVIDUAL') {
    check(Boolean(p.cccd && p.cccd.trim().length >= 9), 'Số CCCD');
    check(Boolean(p.cccdIssueDate && p.cccdIssueDate.trim()), 'Ngày cấp CCCD');
    check(Boolean(p.cccdIssuePlace && p.cccdIssuePlace.trim()), 'Nơi cấp CCCD');
  } else if (p.legalType === 'HOUSEHOLD') {
    check(Boolean((p.taxCode && p.taxCode.trim()) || (p.businessLicenseNo && p.businessLicenseNo.trim())), 'Mã số thuế / ĐKKD HKD');
    check(Boolean(p.representativeName && p.representativeName.trim()), 'Chủ hộ kinh doanh');
    check(Boolean(p.cccd && p.cccd.trim().length >= 9), 'CCCD chủ hộ');
  } else {
    check(Boolean(p.taxCode && p.taxCode.trim().length >= 7), 'Mã số thuế Công ty');
    check(Boolean(p.representativeName && p.representativeName.trim()), 'Người đại diện pháp luật');
    check(Boolean(p.representativeTitle && p.representativeTitle.trim()), 'Chức vụ người đại diện');
  }

  check(
    Boolean((p.registeredAddress && p.registeredAddress.trim()) || (koc?.permanentAddress && koc.permanentAddress.trim())),
    'Địa chỉ pháp lý',
  );
  check(Boolean(p.bankName && p.bankName.trim()), 'Ngân hàng');
  check(Boolean((p.bankAccount || p.bankAccountNumber || '').trim()), 'Số tài khoản');
  check(
    Boolean((p.contactPhone && p.contactPhone.trim()) || (koc?.phone && koc.phone.trim())),
    'SĐT hợp đồng',
  );

  return {
    ready: missing.length === 0,
    missingFields: missing,
    filledCount: total - missing.length,
    totalRequired: total,
  };
}

export function getDefaultLegalProfile(k: KocItem): KocLegalProfile | undefined {
  const list = getKocLegalProfiles(k);
  if (list.length === 0) return undefined;
  return list.find((p) => p.isDefault) || list[0];
}

/**
 * Đồng bộ danh sách `KocLegalProfile[]` ngược lại các trường gốc trên `KocItem`
 * để đảm bảo đồng nhất 100% giữa bảng danh sách, hồ sơ chi tiết, hợp đồng và duyệt chi (RULE-SYNC-01).
 */
export function syncKocWithLegalProfiles(
  koc: KocItem,
  profiles: KocLegalProfile[],
): KocItem {
  if (profiles.length === 0) {
    return {
      ...koc,
      legalProfiles: [],
      alternatePayees: [],
      cccd: '',
      taxCode: undefined,
      bankName: undefined,
      bankAccount: '',
    };
  }

  // Đảm bảo luôn có đúng 1 hồ sơ isDefault = true và chuẩn hóa trường STK / chủ TK
  const hasDef = profiles.some((p) => p.isDefault);
  const normalized = profiles.map((p, idx) => {
    const bankAcc = p.bankAccount || p.bankAccountNumber;
    return {
      ...p,
      profileCode: p.profileCode || `HSPL-0${idx + 1}`,
      isDefault: hasDef ? p.isDefault : idx === 0,
      bankAccount: bankAcc,
      bankAccountNumber: p.bankAccountNumber || bankAcc,
      bankHolderName: p.bankHolderName || p.holderName,
    };
  });

  // Đưa hồ sơ mặc định lên đầu danh sách alternatePayees để tương thích ngược
  const sorted = [...normalized].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  const def = sorted[0];

  const alternatePayees: KocPayeeProfile[] = sorted.map((p) => ({
    legalId: (p.legalType !== 'INDIVIDUAL' ? p.taxCode || p.cccd : p.cccd || p.taxCode) || '',
    holderName: p.holderName,
    bankName: p.bankName,
    bankAccount: p.bankAccount || p.bankAccountNumber,
    taxAccountType: p.taxAccountType,
    dealsCount: p.dealsUsedCount,
    latestBrand: p.latestBrandUsed,
  }));

  return {
    ...koc,
    legalProfiles: normalized,
    alternatePayees,
    realName:
      def.legalType === 'INDIVIDUAL'
        ? def.holderName || koc.realName
        : def.representativeName || def.holderName || koc.realName,
    companyName: def.legalType !== 'INDIVIDUAL' ? def.holderName : undefined,
    legalRepresentative:
      def.legalType !== 'INDIVIDUAL'
        ? def.representativeName || koc.legalRepresentative
        : undefined,
    cccd: def.cccd || '',
    taxCode: def.taxCode || undefined,
    taxAccountType: def.taxAccountType || undefined,
    issueDate: def.cccdIssueDate || koc.issueDate,
    issuePlace: def.cccdIssuePlace || koc.issuePlace,
    permanentAddress: def.registeredAddress || koc.permanentAddress,
    phone: def.contactPhone || koc.phone,
    email: def.contactEmail || koc.email,
    bankName: def.bankName || undefined,
    bankAccount: def.bankAccount || def.bankAccountNumber || '',
    contractDriveUrl: def.frameworkContractDriveUrl || koc.contractDriveUrl,
    ocrDocumentType:
      def.legalType === 'COMPANY'
        ? 'BUSINESS_LICENSE'
        : def.legalType === 'HOUSEHOLD'
          ? 'BUSINESS_HOUSEHOLD'
          : 'CCCD',
    isOcrVerified: Boolean(def.cccd || def.taxCode || def.isOcrVerified),
  };
}

/**
 * Phân biệt KOC thuộc Bảng 1 (KOC Cũ kèm lịch sử - COOPERATED) hay Bảng 2 (KOC Mới / Tiềm năng - NEW).
 */
export function isCooperatedKoc(k: KocItem, allDeals?: BookingDealItem[]): boolean {
  if (k.datasetType === 'COOPERATED') return true;
  if (k.datasetType === 'NEW') {
    const activeDealsCount = allDeals ? dealsOfKoc(allDeals, k).length : 0;
    return activeDealsCount > 0 || (k.totalPastDeals || 0) > 0;
  }
  if ((k.totalPastDeals || 0) > 0) return true;
  if (allDeals && dealsOfKoc(allDeals, k).length > 0) return true;
  return false;
}

/** Che số nhạy cảm, chỉ giữ 4 số cuối: 8549302194 → •••• 2194 */
export function mask(value?: string): string {
  const v = (value || '').replace(/\s/g, '');
  if (!v) return '';
  if (v.length <= 4) return `****${v}`;
  return `****${v.slice(-4)}`;
}

/**
 * Ai được xem số CCCD / MST / tài khoản đầy đủ: quản trị, trưởng phòng, trưởng nhóm,
 * pháp chế, kế toán, quản trị ký số và PIC đang phụ trách hoặc từng làm việc với KOC đó.
 */
export function canRevealSensitive(user: UserProfile | undefined, _k?: KocItem): boolean {
  if (!user) return false;
  if (user.partnerType || String(user.role || '').includes('_PARTNER')) return false;
  return (
    user.role === 'ADMIN' ||
    user.role === 'FINANCE' ||
    user.role === 'LEGAL' ||
    user.role === 'MANAGER' ||
    String(user.role) === 'BRAND_DIRECTOR'
  );
}

/* ---------------------------------------------------------- Trùng lặp */

export type DuplicateField = 'kênh' | 'SĐT' | 'Email' | 'CCCD' | 'MST';
export interface DuplicateMatch {
  kocId: string;
  stageName: string;
  fields: DuplicateField[];
}

/** Với mỗi KOC: danh sách hồ sơ khác trùng kênh, SĐT, Email, CCCD hoặc MST. */
export function findDuplicates(kocs: KocItem[]): Map<string, DuplicateMatch[]> {
  const keyers: Array<[DuplicateField, (k: KocItem) => string]> = [
    ['kênh', (k) => { const v = (k.channelId || '').trim().toLowerCase().replace(/^@/, ''); return v.length > 2 ? v : ''; }],
    ['SĐT', (k) => { const v = (k.phone || '').replace(/\D/g, ''); return v.length >= 9 ? v : ''; }],
    ['Email', (k) => { const v = (k.email || '').trim().toLowerCase(); return v.includes('@') && v.length >= 5 ? v : ''; }],
    ['CCCD', (k) => { const v = (k.cccd || '').replace(/\D/g, ''); return v.length >= 9 && !/^0+$/.test(v) ? v : ''; }],
    ['MST', (k) => { const v = (k.taxCode || '').trim(); return v.length >= 7 && !/^chưa/i.test(v) ? v : ''; }],
  ];
  const byId = new Map(kocs.map((k) => [k.id, k]));
  const result = new Map<string, Map<string, DuplicateMatch>>();

  for (const [field, keyOf] of keyers) {
    const groups = new Map<string, string[]>();
    for (const k of kocs) {
      const key = keyOf(k);
      if (!key) continue;
      let list = groups.get(key);
      if (!list) {
        list = [];
        groups.set(key, list);
      }
      list.push(k.id);
    }
    for (const ids of groups.values()) {
      if (ids.length < 2) continue;
      const sampleOthers = ids.slice(0, 15);
      for (const id of ids) {
        let matches = result.get(id);
        if (!matches) {
          matches = new Map<string, DuplicateMatch>();
          result.set(id, matches);
        }
        for (const other of sampleOthers) {
          if (other === id) continue;
          let m = matches.get(other);
          if (!m) {
            const otherKoc = byId.get(other);
            if (!otherKoc) continue;
            m = { kocId: other, stageName: otherKoc.stageName, fields: [] };
            matches.set(other, m);
          }
          if (!m.fields.includes(field)) m.fields.push(field);
        }
      }
    }
  }
  return new Map([...result].map(([id, m]) => [id, [...m.values()]]));
}

/* ------------------------------------ Đa kênh & Đa tài khoản TikTok của 1 KOC chính */

export const KOC_PLATFORM_LABEL: Record<KocPlatformType, string> = {
  TIKTOK: 'TikTok',
  SHOPEE: 'Shopee',
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  THREADS: 'Threads',
  YOUTUBE: 'YouTube',
};

const cleanChannelHandle = (raw?: string): string => {
  const s = (raw || '').trim();
  if (!s) return '';
  const m = s.match(/(?:tiktok\.com\/@|facebook\.com\/|instagram\.com\/|threads\.net\/@|shopee\.vn\/)([a-zA-Z0-9._-]+)/i);
  if (m && m[1]) return m[1].replace(/^@/, '').trim();
  return s.replace(/^@/, '').trim();
};

/**
 * Trả về toàn bộ danh sách các tài khoản/kênh nền tảng kết nối với 1 tài khoản KOC chính.
 * Hỗ trợ:
 * - Nhiều tài khoản TikTok (1 kênh TikTok chính + các kênh TikTok phụ: Vlog, Review, Livestream, hoặc kênh từ hồ sơ cùng chủ sở hữu).
 * - Các nền tảng khác: Shopee, Facebook, Instagram, Threads, YouTube.
 */
export function getKocConnectedChannels(
  k: KocItem,
  sharedOwnerKocs?: KocItem[],
): KocConnectedChannel[] {
  const result: KocConnectedChannel[] = [];
  const seen = new Set<string>();

  const pushChannel = (ch: KocConnectedChannel) => {
    const clean = cleanChannelHandle(ch.handle);
    if (!clean) return;
    const key = `${ch.platform}::${clean.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push({
      ...ch,
      handle: clean,
    });
  };

  const primaryHandle = cleanChannelHandle(k.channelId || k.tiktokChannel);
  if (primaryHandle) {
    const existingPrimary = (k.connectedChannels || []).find(
      (c) => c.platform === 'TIKTOK' && cleanChannelHandle(c.handle).toLowerCase() === primaryHandle.toLowerCase(),
    );
    pushChannel({
      id: existingPrimary?.id || `${k.id}-ch-tiktok-primary`,
      platform: 'TIKTOK',
      handle: primaryHandle,
      channelName: existingPrimary?.channelName || k.stageName,
      url: existingPrimary?.url || k.channelLink || `https://www.tiktok.com/@${primaryHandle}`,
      isPrimary: true,
      roleLabel: existingPrimary?.roleLabel || 'Kênh TikTok chính',
      followers: existingPrimary?.followers ?? k.followers,
      avgViews: existingPrimary?.avgViews ?? k.avgViews,
    });
  }

  if (k.connectedChannels && k.connectedChannels.length > 0) {
    for (const ch of k.connectedChannels) {
      pushChannel(ch);
    }
  }

  if (k.tiktokChannels && k.tiktokChannels.length > 0) {
    k.tiktokChannels.forEach((rawHandle, idx) => {
      const clean = cleanChannelHandle(rawHandle);
      if (!clean) return;
      const isPrim = clean.toLowerCase() === primaryHandle.toLowerCase();
      pushChannel({
        id: `${k.id}-ch-tiktok-${idx + 1}`,
        platform: 'TIKTOK',
        handle: clean,
        url: `https://www.tiktok.com/@${clean}`,
        isPrimary: isPrim,
        roleLabel: isPrim ? 'Kênh TikTok chính' : `Kênh TikTok phụ #${idx}`,
      });
    });
  }

  if (sharedOwnerKocs && sharedOwnerKocs.length > 0) {
    for (const other of sharedOwnerKocs) {
      if (other.id === k.id) continue;
      const otherHandle = cleanChannelHandle(other.channelId);
      if (!otherHandle) continue;
      pushChannel({
        id: `${k.id}-ch-shared-${other.id}`,
        platform: 'TIKTOK',
        handle: otherHandle,
        channelName: other.stageName,
        url: other.channelLink || `https://www.tiktok.com/@${otherHandle}`,
        isPrimary: false,
        roleLabel: 'Kênh TikTok phụ (Cùng chủ sở hữu)',
        followers: other.followers,
        avgViews: other.avgViews,
        linkedKocId: other.id,
      });
    }
  }

  const platformFields: Array<{
    platform: KocPlatformType;
    value?: string;
    roleLabel: string;
    buildUrl: (h: string) => string;
  }> = [
    {
      platform: 'SHOPEE',
      value: k.shopeeChannel,
      roleLabel: 'Kênh Shopee Video / Affiliate',
      buildUrl: (h) => (h.startsWith('http') ? h : `https://shopee.vn/${h}`),
    },
    {
      platform: 'FACEBOOK',
      value: k.facebookChannel,
      roleLabel: 'Trang / Facebook Reels',
      buildUrl: (h) => (h.startsWith('http') ? h : `https://www.facebook.com/${h}`),
    },
    {
      platform: 'INSTAGRAM',
      value: k.instagramChannel,
      roleLabel: 'Kênh Instagram Reels',
      buildUrl: (h) => (h.startsWith('http') ? h : `https://www.instagram.com/${h}`),
    },
    {
      platform: 'THREADS',
      value: k.threadsChannel,
      roleLabel: 'Kênh Threads',
      buildUrl: (h) => (h.startsWith('http') ? h : `https://www.threads.net/@${h}`),
    },
  ];

  for (const pf of platformFields) {
    if (!pf.value || !pf.value.trim()) continue;
    const rawItems = pf.value.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    rawItems.forEach((raw, idx) => {
      const clean = cleanChannelHandle(raw);
      if (!clean) return;
      pushChannel({
        id: `${k.id}-ch-${pf.platform.toLowerCase()}-${idx + 1}`,
        platform: pf.platform,
        handle: clean,
        url: pf.buildUrl(clean),
        isPrimary: idx === 0,
        roleLabel: idx === 0 ? pf.roleLabel : `${pf.roleLabel} #${idx + 1}`,
      });
    });
  }

  return result;
}

/**
 * Trả về danh sách các tài khoản TikTok của 1 KOC (1 Kênh chính + N Kênh phụ).
 */
export function getKocTikTokChannels(
  k: KocItem,
  sharedOwnerKocs?: KocItem[],
): KocConnectedChannel[] {
  return getKocConnectedChannels(k, sharedOwnerKocs).filter((c) => c.platform === 'TIKTOK');
}

/**
 * Đồng bộ danh sách `KocConnectedChannel[]` ngược lại các trường gốc trên `KocItem` (RULE-SYNC-01).
 */
export function syncKocWithConnectedChannels(
  koc: KocItem,
  channels: KocConnectedChannel[],
): KocItem {
  const normalized: KocConnectedChannel[] = [];
  const seen = new Set<string>();

  for (const ch of channels) {
    const clean = cleanChannelHandle(ch.handle);
    if (!clean) continue;
    const key = `${ch.platform}::${clean.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({
      ...ch,
      handle: clean,
      url:
        ch.url ||
        (ch.platform === 'TIKTOK'
          ? `https://www.tiktok.com/@${clean}`
          : ch.platform === 'SHOPEE'
            ? `https://shopee.vn/${clean}`
            : ch.platform === 'FACEBOOK'
              ? `https://www.facebook.com/${clean}`
              : ch.platform === 'INSTAGRAM'
                ? `https://www.instagram.com/${clean}`
                : ch.platform === 'THREADS'
                  ? `https://www.threads.net/@${clean}`
                  : undefined),
    });
  }

  const tiktokList = normalized.filter((c) => c.platform === 'TIKTOK');
  if (tiktokList.length > 0 && !tiktokList.some((c) => c.isPrimary)) {
    tiktokList[0].isPrimary = true;
    tiktokList[0].roleLabel = tiktokList[0].roleLabel || 'Kênh TikTok chính';
  }
  const primaryTikTok = tiktokList.find((c) => c.isPrimary) || tiktokList[0];
  const primaryHandle = primaryTikTok?.handle || cleanChannelHandle(koc.channelId);

  const byPlat = (p: KocPlatformType) =>
    normalized
      .filter((c) => c.platform === p)
      .map((c) => c.handle)
      .join(', ');

  const shopeeStr = byPlat('SHOPEE');
  const fbStr = byPlat('FACEBOOK');
  const igStr = byPlat('INSTAGRAM');
  const threadsStr = byPlat('THREADS');

  const activePlatforms: ('TIKTOK' | 'SHOPEE' | 'FACEBOOK' | 'INSTAGRAM' | 'THREADS')[] = ['TIKTOK'];
  if (shopeeStr) activePlatforms.push('SHOPEE');
  if (fbStr) activePlatforms.push('FACEBOOK');
  if (igStr) activePlatforms.push('INSTAGRAM');
  if (threadsStr) activePlatforms.push('THREADS');

  return {
    ...koc,
    channelId: primaryHandle || koc.channelId,
    tiktokChannel: primaryHandle || koc.tiktokChannel,
    channelLink: primaryTikTok?.url || (primaryHandle ? `https://www.tiktok.com/@${primaryHandle}` : koc.channelLink),
    tiktokChannels: tiktokList.map((c) => c.handle),
    connectedChannels: normalized,
    shopeeChannel: shopeeStr || undefined,
    facebookChannel: fbStr || undefined,
    instagramChannel: igStr || undefined,
    threadsChannel: threadsStr || undefined,
    platforms: activePlatforms,
  };
}

export interface DealChannelEntry {
  key: string; // VD: TIKTOK::chanhbeauty
  platform: KocPlatformType;
  handle: string;
  displayLabel: string; // VD: TikTok @chanhbeauty
}

export interface DealChannelBreakdown {
  isMultiChannel: boolean;
  scopeType: 'SINGLE_CHANNEL' | 'MULTI_CHANNEL';
  scopeLabel: string; // VD: 'Riêng 1 kênh' | 'Đa kênh (2 kênh)'
  summaryLabel: string; // VD: 'TikTok @chanhbeauty' | 'TikTok @chanhbeauty + Facebook'
  channels: DealChannelEntry[];
}

export const DEAL_CHANNEL_SCOPE_STORAGE_KEY = 'upbase_b2c_deal_channel_scope_overrides_v1';
export const DEAL_CHANNEL_SCOPE_EVENT = 'upbase:deal-channel-scope-updated';

const inMemoryDealChannelScopeOverrides = new Map<string, string[]>();
let hydratedDealChannelScopeFromStorage = false;

function ensureHydratedDealChannelScopeOverrides(): void {
  if (hydratedDealChannelScopeFromStorage || typeof window === 'undefined') return;
  hydratedDealChannelScopeFromStorage = true;
  try {
    const raw = window.localStorage.getItem(DEAL_CHANNEL_SCOPE_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    if (parsed && typeof parsed === 'object') {
      for (const [k, v] of Object.entries(parsed)) {
        if (Array.isArray(v) && v.length > 0) {
          inMemoryDealChannelScopeOverrides.set(k, v);
        }
      }
    }
  } catch {
    // ignore
  }
}

export function getDealChannelScopeOverride(dealIdOrCode?: string): string[] | undefined {
  if (!dealIdOrCode) return undefined;
  ensureHydratedDealChannelScopeOverrides();
  return inMemoryDealChannelScopeOverrides.get(dealIdOrCode);
}

export function saveDealChannelScopeOverride(
  dealId: string,
  dealCode: string | undefined,
  targetChannels: string[],
): void {
  const cleaned = targetChannels.map((c) => c.trim()).filter(Boolean);
  if (cleaned.length === 0) return;
  ensureHydratedDealChannelScopeOverrides();
  if (dealId) inMemoryDealChannelScopeOverrides.set(dealId, cleaned);
  if (dealCode) inMemoryDealChannelScopeOverrides.set(dealCode, cleaned);
  if (typeof window !== 'undefined') {
    try {
      const serialized: Record<string, string[]> = {};
      for (const [k, v] of inMemoryDealChannelScopeOverrides.entries()) {
        serialized[k] = v;
      }
      window.localStorage.setItem(DEAL_CHANNEL_SCOPE_STORAGE_KEY, JSON.stringify(serialized));
      window.dispatchEvent(
        new CustomEvent(DEAL_CHANNEL_SCOPE_EVENT, {
          detail: { dealId, dealCode, targetChannels: cleaned },
        }),
      );
    } catch {
      // ignore
    }
  }
}

function mapMediaChannelToPlatform(mc?: string): KocPlatformType {
  const s = (mc || '').toLowerCase();
  if (s.includes('shopee')) return 'SHOPEE';
  if (s.includes('facebook') || s.includes('fb')) return 'FACEBOOK';
  if (s.includes('instagram') || s.includes('ig')) return 'INSTAGRAM';
  if (s.includes('threads')) return 'THREADS';
  if (s.includes('youtube') || s.includes('yt')) return 'YOUTUBE';
  return 'TIKTOK';
}

/**
 * Phân tích phạm vi kênh thực thi của một đợt hợp tác (BookingDealItem):
 * - Hợp tác riêng 1 kênh (VD: Kênh TikTok chính @handle1, hoặc Kênh TikTok phụ @handle2, hoặc riêng Facebook)
 * - Hợp tác nhiều kênh / Đa kênh (VD: TikTok + Facebook Reels + Shopee Video, hoặc 2 kênh TikTok của cùng KOC)
 */
export function getDealChannelBreakdown(
  d: BookingDealItem,
  koc?: KocItem,
): DealChannelBreakdown {
  const connected = koc ? getKocConnectedChannels(koc) : [];
  const entries: DealChannelEntry[] = [];
  const seen = new Set<string>();

  const addEntry = (platform: KocPlatformType, rawHandle?: string) => {
    const fallbackByPlat = connected.find((c) => c.platform === platform);
    const clean =
      cleanChannelHandle(rawHandle) ||
      fallbackByPlat?.handle ||
      cleanChannelHandle(d.kocChannelId) ||
      cleanChannelHandle(koc?.channelId) ||
      d.kocStageName ||
      'koc';
    const key = `${platform}::${clean.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    const platLabel = KOC_PLATFORM_LABEL[platform] || platform;
    const prefix = platform === 'TIKTOK' || platform === 'INSTAGRAM' || platform === 'THREADS' ? '@' : '';
    entries.push({
      key,
      platform,
      handle: clean,
      displayLabel: `${platLabel} ${prefix}${clean}`,
    });
  };

  const overrideChannels =
    getDealChannelScopeOverride(d.id) || getDealChannelScopeOverride(d.dealCode);
  const explicitTargetChannels =
    overrideChannels && overrideChannels.length > 0 ? overrideChannels : d.targetChannels;

  if (explicitTargetChannels && explicitTargetChannels.length > 0) {
    for (const tc of explicitTargetChannels) {
      if (tc.includes('::')) {
        const [platRaw, handleRaw] = tc.split('::');
        const plat = (platRaw.toUpperCase() as KocPlatformType) || 'TIKTOK';
        addEntry(plat, handleRaw);
      } else {
        const plat = mapMediaChannelToPlatform(tc);
        const handlePart = tc.replace(/^(tiktok|shopee|facebook|instagram|threads|youtube)\s*[:@-]?\s*/i, '');
        addEntry(plat, handlePart || tc);
      }
    }
  }

  // Nếu đã có cấu hình thủ công (overrideChannels), không tự cộng thêm kênh từ deliverables/dealJobs cũ
  if (!overrideChannels || overrideChannels.length === 0) {
    if (d.deliverables && d.deliverables.length > 0) {
      for (const deliv of d.deliverables) {
        if (deliv.lockStatus === 'DROPPED') continue;
        const plat = mapMediaChannelToPlatform(deliv.mediaChannel);
        addEntry(plat, plat === 'TIKTOK' ? d.kocChannelId : undefined);
      }
    }

    if (d.dealJobs && d.dealJobs.length > 0) {
      for (const job of d.dealJobs) {
        if (job.mediaChannel) {
          const plat = mapMediaChannelToPlatform(job.mediaChannel);
          addEntry(plat, plat === 'TIKTOK' ? d.kocChannelId : undefined);
        }
        if (job.addonServices && job.addonServices.length > 0) {
          for (const addon of job.addonServices) {
            if (addon.termType === 'CROSS_POST_REUP' && addon.targetMediaChannel) {
              addEntry(mapMediaChannelToPlatform(addon.targetMediaChannel));
            }
          }
        }
      }
    }

    if (d.rightsTerms && d.rightsTerms.length > 0) {
      for (const rt of d.rightsTerms) {
        if (rt.termType === 'CROSS_POST_REUP' && rt.targetMediaChannel) {
          addEntry(mapMediaChannelToPlatform(rt.targetMediaChannel));
        }
      }
    }
  }

  if (entries.length === 0) {
    addEntry('TIKTOK', d.kocChannelId || koc?.channelId);
  }

  const isMulti =
    entries.length > 1 ||
    (!overrideChannels && (d as { bookingDealType?: string }).bookingDealType === 'MULTI_PLATFORM_CONTENT');
  return {
    isMultiChannel: isMulti,
    scopeType: isMulti ? 'MULTI_CHANNEL' : 'SINGLE_CHANNEL',
    scopeLabel: isMulti ? `Đa kênh (${entries.length} kênh)` : 'Riêng 1 kênh',
    summaryLabel: entries.map((e) => e.displayLabel).join(' + '),
    channels: entries,
  };
}

/**
 * Lọc danh sách đợt hợp tác của KOC theo phạm vi kênh:
 * - 'ALL': Tất cả các đợt hợp tác trên mọi kênh của KOC
 * - 'SINGLE_CHANNEL': Chỉ các đợt hợp tác riêng 1 kênh
 * - 'MULTI_CHANNEL': Chỉ các đợt hợp tác nhiều kênh (Đa kênh)
 * - 'TIKTOK::<handle>' hoặc '<handle>': Các đợt hợp tác có sự tham gia của kênh cụ thể đó
 */
export function filterDealsByChannelScope(
  deals: BookingDealItem[],
  koc: KocItem,
  channelFilter?: string,
): BookingDealItem[] {
  if (!channelFilter || channelFilter === 'ALL') return deals;
  return deals.filter((d) => {
    const bd = getDealChannelBreakdown(d, koc);
    if (channelFilter === 'SINGLE_CHANNEL') return !bd.isMultiChannel;
    if (channelFilter === 'MULTI_CHANNEL') return bd.isMultiChannel;
    const normFilter = channelFilter.toLowerCase();
    return bd.channels.some(
      (c) =>
        c.key.toLowerCase() === normFilter ||
        c.handle.toLowerCase() === normFilter.replace(/^@/, ''),
    );
  });
}

/* ------------------------------------------------------------- Booking */

const normHandle = (s?: string) => (s || '').trim().toLowerCase().replace(/^@/, '');
const normStage = (s?: string) => (s || '').trim().toLowerCase();

interface KocDealIndex {
  byId: Map<string, BookingDealItem[]>;
  byHandle: Map<string, BookingDealItem[]>;
  byStage: Map<string, BookingDealItem[]>;
  resolvedByKocKey: Map<string, BookingDealItem[]>;
}

const kocDealIndexCache = new WeakMap<BookingDealItem[], KocDealIndex>();

function getKocDealIndex(deals: BookingDealItem[]): KocDealIndex {
  let cached = kocDealIndexCache.get(deals);
  if (cached) return cached;

  const byId = new Map<string, BookingDealItem[]>();
  const byHandle = new Map<string, BookingDealItem[]>();
  const byStage = new Map<string, BookingDealItem[]>();

  for (const d of deals) {
    if (d.kocId) {
      let arr = byId.get(d.kocId);
      if (!arr) { arr = []; byId.set(d.kocId, arr); }
      arr.push(d);
    }
    if (d.kocChannelId) {
      const h = normHandle(d.kocChannelId);
      if (h) {
        let arr = byHandle.get(h);
        if (!arr) { arr = []; byHandle.set(h, arr); }
        arr.push(d);
      }
    }
    if (d.kocStageName) {
      const s = normStage(d.kocStageName);
      if (s) {
        let arr = byStage.get(s);
        if (!arr) { arr = []; byStage.set(s, arr); }
        arr.push(d);
      }
    }
  }

  cached = { byId, byHandle, byStage, resolvedByKocKey: new Map() };
  kocDealIndexCache.set(deals, cached);
  return cached;
}

/**
 * Khôi phục các đợt hợp tác lịch sử từ hồ sơ tổng hợp Master KOC (Base T4 & T9)
 * khi số lượng deal chi tiết ít hơn totalPastDeals ghi nhận trên Danh bạ KOC (RULE-SYNC-01 & RULE-DATA-01).
 */
function buildHistoricalDealsFromKocSummary(
  _k: KocItem,
  _existingDeals: BookingDealItem[] = [],
): BookingDealItem[] {
  // RULE-DATA-01: Tuyệt đối không tự sinh deal ảo, mã BO ảo hay doanh số ước tính.
  // Chỉ hiển thị các deal thực tế phát sinh từ Deal Board / Kế hoạch tháng.
  return [];
}

/** Các booking của một KOC, khớp theo id (có kiểm chứng handle), tên kênh / handle và đồng bộ lịch sử Master KOC. */
export function dealsOfKoc(deals: BookingDealItem[] | undefined, k: KocItem): BookingDealItem[] {
  if (!deals || deals.length === 0) {
    return [];
  }
  const idx = getKocDealIndex(deals);
  const connectedHandles = getKocConnectedChannels(k)
    .map((c) => normHandle(c.handle))
    .filter(Boolean);
  const knownHandles = new Set<string>(connectedHandles);
  const primaryNorm = normHandle(k.channelId);
  if (primaryNorm) knownHandles.add(primaryNorm);
  const cacheKey = `${k.id}::${Array.from(knownHandles).join('|')}::${k.totalPastDeals || 0}::${k.totalPastGmv || 0}::${k.totalPastCost || 0}`;
  const cachedResult = idx.resolvedByKocKey.get(cacheKey);
  if (cachedResult) return cachedResult;

  const byIdList = idx.byId.get(k.id);
  const h = normHandle(k.channelId);
  const byHandleLists: BookingDealItem[][] = [];
  for (const chHandle of knownHandles) {
    const list = idx.byHandle.get(chHandle);
    if (list) byHandleLists.push(list);
  }
  const byHandleList = byHandleLists.length > 0 ? byHandleLists.flat() : undefined;
  const s = normStage(k.stageName);
  const byStageList = s ? idx.byStage.get(s) : undefined;

  const seen = new Set<BookingDealItem>();
  const seenCodes = new Set<string>();
  const out: BookingDealItem[] = [];
  const addDeal = (d: BookingDealItem) => {
    if (seen.has(d)) return;
    const codeKey = d.dealCode ? `${d.dealCode.toUpperCase()}::${d.jobId || d.id}` : d.id;
    if (codeKey && seenCodes.has(codeKey)) return;
    seen.add(d);
    if (codeKey) seenCodes.add(codeKey);
    out.push(d);
  };

  if (byIdList) {
    for (const d of byIdList) {
      const dh = normHandle(d.kocChannelId);
      if (knownHandles.size > 0 && dh && !knownHandles.has(dh)) continue;
      addDeal(d);
    }
  }
  if (byHandleList) {
    for (const d of byHandleList) addDeal(d);
  }
  if (byStageList) {
    for (const d of byStageList) {
      const dh = normHandle(d.kocChannelId);
      if (knownHandles.size > 0 && dh && !knownHandles.has(dh)) continue;
      addDeal(d);
    }
  }

  idx.resolvedByKocKey.set(cacheKey, out);
  return out;
}

export const isDealOpen = (d: BookingDealItem) => d.status !== 'COMPLETED' && d.status !== 'CANCELLED' && d.status !== 'FINAL_PAID';

/** Đổi trạng thái deal về bộ 8 nhãn chuẩn của design system. */
export function dealStatusOf(d: BookingDealItem): { label: string; tone: StatusTone } {
  if (d.status === 'CANCELLED') return { label: 'Đã hủy', tone: 'neutral' };
  if (d.status === 'COMPLETED' || d.status === 'FINAL_PAID') return { label: 'Hoàn tất', tone: 'positive' };
  if (d.slaStatus === 'OVERDUE') return { label: 'Quá hạn', tone: 'critical' };
  if (d.status === 'DRAFT') return { label: 'Nháp', tone: 'neutral' };
  return { label: 'Đang chạy', tone: 'info' };
}

/** Bước hiện tại của deal, viết theo cách team gọi. */
export function dealStepOf(d: BookingDealItem): string {
  switch (d.status) {
    case 'DRAFT':
    case 'CONTACTING': return 'Đang liên hệ';
    case 'TERMS_AGREED':
    case 'CONTRACT_GENERATED':
    case 'ADVANCE_PAID': return 'Hợp đồng & tạm ứng';
    case 'SCRIPT_PENDING':
    case 'SCRIPT_APPROVED': return 'Kịch bản';
    case 'SAMPLE_SHIPPED': return 'Đang gửi mẫu';
    case 'SAMPLE_RECEIVED': return 'Đã nhận mẫu';
    case 'VIDEO_SUBMITTED':
    case 'VIDEO_VERIFIED': return 'Đã lên video';
    default: return '';
  }
}

export const picOfDeal = (d: BookingDealItem) => d.bookingPic || d.assignedStaff || '';

/** Số follower dạng ngắn: 680k · 1,2M */
export function formatFollowers(n?: number): string {
  if (!n) return '—';
  if (n >= 1e6) return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(n / 1e6)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}k`;
  return String(n);
}

/* ------------------------------------------------ Hiệu quả hợp tác chi tiết */

export interface KocPerformanceSummary {
  totalDeals: number;
  completedDeals: number;
  runningDeals: number;
  cancelledDeals: number;
  paidDealsCount: number;
  focDealsCount: number;
  totalSpentNet: number;
  totalFocCost: number;
  totalAdsBudget: number;
  totalInvestment: number;
  totalGmv: number;
  avgGmvPerVideo?: number;
  overallRoi: number;
  totalOrders: number;
  avgCpo: number;
  totalCollabViews: number;
  avgViewsPerCollab: number;
  /** Số deal có lượt xem thật / có điểm đánh giá thật / có xác nhận đúng hạn — mẫu số của các chỉ số tương ứng. */
  viewsDealsCount: number;
  ratedDealsCount: number;
  postCheckedDealsCount: number;
  avgCtr: number;
  avgCvr: number;
  onTimeScriptRate: number;
  onTimePostRate: number;
  sparkComplianceRate: number;
  avgRatingScore: number;
  uniqueBrands: string[];
  uniqueStores: string[];
}

/**
 * Deal đồng bộ từ Sheet booking (`deal-real-*`) được script tạo dữ liệu gán sẵn mặc định:
 * ratingScore 4 / 4.5 (suy từ mức GMV, không phải điểm chất lượng), isScriptOnTime / isPostOnTime luôn true,
 * viewsCount 12.000 khi chưa có số. Không dùng các trường này như số đo thật.
 */
export const isSheetSyncedDeal = (d: BookingDealItem) => d.id.startsWith('deal-real-');

/**
 * Deal do buildHistoricalDealsFromKocSummary dựng lại từ số tổng của Master KOC: mã BO, brand, PIC tự suy,
 * GMV là GMV cả kênh chia đều, số đơn ước tính. Chỉ dùng để đếm số đợt và chi phí, không dùng làm số hiệu quả.
 */
export const isMasterSummaryDeal = (d: BookingDealItem) => d.id.startsWith('deal-hist-master-');
const SYNC_PLACEHOLDER_VIEWS = 12000;

/** Lượt xem thật của deal; 0 nếu chưa có hoặc là số mặc định lúc đồng bộ. */
export const dealViewsOf = (d: BookingDealItem) =>
  !isMasterSummaryDeal(d) && d.viewsCount && d.viewsCount !== SYNC_PLACEHOLDER_VIEWS ? d.viewsCount : 0;

/** Điểm đánh giá thật của deal (bỏ điểm mặc định của deal đồng bộ). */
export const dealRatingOf = (d: BookingDealItem) =>
  !isSheetSyncedDeal(d) && typeof d.ratingScore === 'number' && d.ratingScore > 0 ? d.ratingScore : undefined;

/** Đúng hạn đăng video: chỉ khi có xác nhận thật. */
export const dealPostOnTimeOf = (d: BookingDealItem) =>
  !isSheetSyncedDeal(d) && typeof d.isPostOnTime === 'boolean' ? d.isPostOnTime : undefined;

export function calculateKocPerformanceStats(
  deals: BookingDealItem[],
  koc: KocItem,
  channelFilter?: string,
): KocPerformanceSummary {
  const allKocDeals = dealsOfKoc(deals, koc);
  const isFilteredByChannel = Boolean(channelFilter && channelFilter !== 'ALL');
  const kocDeals = isFilteredByChannel
    ? filterDealsByChannelScope(allKocDeals, koc, channelFilter)
    : allKocDeals;


  const validDeals = kocDeals.filter((d) => d.status !== 'CANCELLED');
  const completedDeals = kocDeals.filter((d) => d.status === 'COMPLETED' || d.status === 'FINAL_PAID');
  const runningDeals = kocDeals.filter(isDealOpen);
  const cancelledDeals = kocDeals.filter((d) => d.status === 'CANCELLED');

  const dealsPaidCount = validDeals.filter((d) => (d.totalValue || 0) > 0).length;
  const dealsFocCount = validDeals.filter((d) => (d.totalValue || 0) === 0).length;
  const paidDealsCount = isFilteredByChannel ? dealsPaidCount : Math.max(dealsPaidCount, koc.totalPaidVideos || 0);
  const focDealsCount = isFilteredByChannel ? dealsFocCount : Math.max(dealsFocCount, koc.totalFocVideos || 0);



  const dealsSpentNet = validDeals.reduce((s, d) => s + (d.totalValue || 0), 0);
  const totalSpentNet = isFilteredByChannel ? dealsSpentNet : Math.max(dealsSpentNet, koc.totalPastCost || 0);
  const totalFocCost = validDeals.reduce((s, d) => s + (d.focSampleCost || 0), 0);
  const totalAdsBudget = validDeals.reduce((s, d) => s + (d.sparkAdsBudget || 0), 0);
  const totalInvestment = totalSpentNet + totalFocCost + totalAdsBudget;

  // GMV chỉ cộng từ các deal. koc.totalPastGmv là GMV cả kênh trên TikTok Shop, không phải GMV từ booking,
  // nên không dùng làm sàn (trước đây làm ROI lên hàng nghìn lần với kênh lớn).
  const measuredDeals = validDeals.filter((d) => !isMasterSummaryDeal(d));
  const totalGmv = measuredDeals.reduce((s, d) => s + (d.gmv30 || d.affiliateGmv || 0), 0);
  const overallRoi = totalSpentNet > 0 ? totalGmv / totalSpentNet : 0;

  // Đơn chỉ lấy số thật của deal: không ước tính từ GMV / AOV, không lấy itemsSold (số bán cả kênh)
  const totalOrders = measuredDeals.reduce((s, d) => s + (d.ordersCount || 0), 0);
  const avgCpo = totalOrders > 0 ? Math.round(totalSpentNet / totalOrders) : 0;

  const dealsWithViews = measuredDeals.filter((d) => dealViewsOf(d) > 0);
  const totalCollabViews = dealsWithViews.reduce((s, d) => s + dealViewsOf(d), 0);
  const avgViewsPerCollab = dealsWithViews.length > 0 ? Math.round(totalCollabViews / dealsWithViews.length) : 0;

  // Tỷ lệ CTR / CVR trung bình của video hợp tác (không thay bằng CTR / CVR cả kênh)
  const dealsWithCtr = validDeals.filter((d) => typeof d.ctr === 'number');
  const avgCtr = dealsWithCtr.length > 0 ? dealsWithCtr.reduce((s, d) => s + (d.ctr || 0), 0) / dealsWithCtr.length : 0;

  const dealsWithCvr = validDeals.filter((d) => typeof d.cvr === 'number');
  const avgCvr = dealsWithCvr.length > 0 ? dealsWithCvr.reduce((s, d) => s + (d.cvr || 0), 0) / dealsWithCvr.length : 0;

  // Tiến độ & Tuân thủ (RULE-DATA-01: Không sinh chỉ số giả khi chưa có deal thực tế)
  const dealsWithScriptStatus = validDeals.filter((d) => !isSheetSyncedDeal(d) && typeof d.isScriptOnTime === 'boolean');
  const onTimeScriptRate = dealsWithScriptStatus.length > 0
    ? Math.round((dealsWithScriptStatus.filter((d) => d.isScriptOnTime).length / dealsWithScriptStatus.length) * 100)
    : 0;

  const dealsWithPostStatus = validDeals.filter((d) => dealPostOnTimeOf(d) !== undefined);
  const onTimePostRate = dealsWithPostStatus.length > 0
    ? Math.round((dealsWithPostStatus.filter((d) => d.isPostOnTime).length / dealsWithPostStatus.length) * 100)
    : 0;

  const sparkComplianceRate = measuredDeals.length > 0
    ? Math.round((measuredDeals.filter((d) => d.adsCodeStatus === 'ĐÃ_NGHIỆM_THU').length / measuredDeals.length) * 100)
    : 0;

  const dealsWithRating = validDeals.filter((d) => dealRatingOf(d) !== undefined);
  const avgRatingScore = dealsWithRating.length > 0
    ? Number((dealsWithRating.reduce((s, d) => s + (dealRatingOf(d) || 0), 0) / dealsWithRating.length).toFixed(1))
    : 0;

  const uniqueBrands = Array.from(new Set([...validDeals.map((d) => d.brandName), koc.brandName].filter((x): x is string => Boolean(x))));
  const uniqueStores = Array.from(new Set(validDeals.map((d) => d.storeName).filter(Boolean) as string[]));

  const totalDealsCount = isFilteredByChannel ? kocDeals.length : Math.max(kocDeals.length, koc.totalPastDeals || 0);
  const completedDealsCount = Math.max(completedDeals.length, Math.max(0, totalDealsCount - runningDeals.length - cancelledDeals.length));

  return {
    totalDeals: totalDealsCount,
    completedDeals: completedDealsCount,
    runningDeals: runningDeals.length,
    cancelledDeals: cancelledDeals.length,
    paidDealsCount,
    focDealsCount,
    totalSpentNet,
    totalFocCost,
    totalAdsBudget,
    totalInvestment,
    totalGmv,
    overallRoi,
    totalOrders,
    avgCpo,
    totalCollabViews,
    avgViewsPerCollab,
    viewsDealsCount: dealsWithViews.length,
    ratedDealsCount: dealsWithRating.length,
    postCheckedDealsCount: dealsWithPostStatus.length,
    avgCtr,
    avgCvr,
    onTimeScriptRate,
    onTimePostRate,
    sparkComplianceRate,
    avgRatingScore,
    uniqueBrands,
    uniqueStores,
  };
}
