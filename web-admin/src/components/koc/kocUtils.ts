/**
 * Logic dùng chung cho danh bạ KOC và hồ sơ KOC: loại hồ sơ pháp lý, che số nhạy cảm,
 * phát hiện hồ sơ trùng, quyền xem số đầy đủ, trạng thái booking.
 */

import type {
  BookingDealItem,
  KocBookingReadiness,
  KocItem,
  KocLegalProfile,
  KocPayeeProfile,
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
    tax.includes('doanh nghiệp') ||
    tax.includes('vat') ||
    /CONG TY|CÔNG TY|CTY|TNHH|CO PHAN|CỔ PHẦN|MEDIA|NETWORK|ENTERTAINMENT|AGENCY|GROUP/.test(holder)
  ) {
    return 'COMPANY';
  }
  if (
    tax.includes('hộ kinh doanh') ||
    tax.includes('hkd') ||
    /HO KINH DOANH|HỘ KINH DOANH|HKD/.test(holder)
  ) {
    return 'HOUSEHOLD';
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
      const numCode = k.id.replace(/\D/g, '') || '01';
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
        isOcrVerified: idx === 0 ? Boolean(k.isOcrVerified) : true,
        frameworkContractCode:
          hasSignedContract || (p.dealsCount && p.dealsCount > 0)
            ? `HĐNT-2026-${numCode.padStart(4, '0')}-${idx + 1}`
            : undefined,
        frameworkContractStatus: hasSignedContract
          ? 'ĐÃ_KÝ'
          : p.dealsCount && p.dealsCount > 0
            ? 'ĐÃ_KÝ'
            : 'CHƯA_KÝ',
        frameworkContractDriveUrl: idx === 0 ? k.contractDriveUrl : undefined,
        dealsUsedCount: p.dealsCount || (idx === 0 ? k.totalPastDeals : undefined),
        latestBrandUsed: p.latestBrand || (idx === 0 ? k.brandName : undefined),
      });
    });
    return profiles;
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
    const numCode = k.id.replace(/\D/g, '') || '01';
    const hasSigned = Boolean(k.contractDriveUrl || (k.totalPastDeals && k.totalPastDeals > 0 && primaryLegalId));
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
      frameworkContractCode: hasSigned ? `HĐNT-2026-${numCode.padStart(4, '0')}-1` : undefined,
      frameworkContractStatus: hasSigned ? 'ĐÃ_KÝ' : 'CHƯA_KÝ',
      frameworkContractDriveUrl: k.contractDriveUrl,
      dealsUsedCount: k.totalPastDeals || undefined,
      latestBrandUsed: k.brandName || undefined,
    });
  }

  return profiles;
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
  return `•••• ${v.slice(-4)}`;
}

/**
 * Ai được xem số CCCD / MST / tài khoản đầy đủ: quản trị, trưởng phòng, trưởng nhóm,
 * pháp chế, kế toán, quản trị ký số và PIC đang phụ trách hoặc từng làm việc với KOC đó.
 */
export function canRevealSensitive(user: UserProfile | undefined, k: KocItem): boolean {
  if (!user) return false;
  if (
    user.role === 'ADMIN' ||
    user.role === 'MANAGER' ||
    user.role === 'LEADER' ||
    user.role === 'FINANCE' ||
    user.role === 'LEGAL' ||
    user.role === 'SIGN_ADMIN'
  ) {
    return true;
  }
  const uName = user.name.trim().toLowerCase();
  if (!uName) return false;
  const picRaw = (k.bookingPic || '').toLowerCase();
  const workedRaw = (k.workedPicsList || '').toLowerCase();
  return picRaw.includes(uName) || workedRaw.includes(uName);
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
  k: KocItem,
  existingDeals: BookingDealItem[],
): BookingDealItem[] {
  const targetTotal = Math.max(
    k.totalPastDeals || 0,
    (k.totalPaidVideos || 0) + (k.totalFocVideos || 0),
    k.latestBoCode && existingDeals.length === 0 ? 1 : 0,
  );
  const missingCount = Math.max(0, targetTotal - existingDeals.length);
  if (missingCount <= 0) return [];

  const validExisting = existingDeals.filter((d) => d.status !== 'CANCELLED');
  const existingPaidCount = validExisting.filter((d) => (d.totalValue || 0) > 0).length;
  const existingCost = validExisting.reduce((s, d) => s + (d.totalValue || 0), 0);
  const existingGmv = validExisting.reduce((s, d) => s + (d.gmv30 || d.affiliateGmv || 0), 0);
  const existingCodes = new Set(existingDeals.map((d) => (d.dealCode || '').toUpperCase()));

  const hasPaidHistory =
    (k.totalPaidVideos || 0) > 0 ||
    (k.totalPastCost || 0) > 0 ||
    ((k.totalFocVideos || 0) === 0 && ((k.minRate || 0) > 0 || (k.rateCardVideo || 0) > 0));
  const targetPaidTotal =
    k.totalPaidVideos !== undefined
      ? k.totalPaidVideos
      : k.totalFocVideos !== undefined
        ? Math.max(0, targetTotal - k.totalFocVideos)
        : hasPaidHistory
          ? targetTotal
          : 0;
  const missingPaidCount = Math.min(missingCount, Math.max(0, targetPaidTotal - existingPaidCount));

  let remainingCost = Math.max(0, (k.totalPastCost || 0) - existingCost);
  if (remainingCost === 0 && missingPaidCount > 0) {
    const unitRate = k.minRate || k.rateCardVideo || k.maxRate || 0;
    remainingCost = unitRate * missingPaidCount;
  }
  const estimatedTotalGmv =
    k.totalPastGmv ||
    (k.historicalRoi && (k.totalPastCost || remainingCost + existingCost) > 0
      ? Math.round((k.totalPastCost || remainingCost + existingCost) * k.historicalRoi)
      : k.gmvBestCase || 0);
  const remainingGmv = Math.max(0, estimatedTotalGmv - existingGmv);

  const brands = Array.from(
    new Set(
      [
        ...(k.brandName ? k.brandName.split(/[,;/]/).map((s) => s.trim()) : []),
        ...(k.workedBrands || []),
        ...((k.alternatePayees || []).map((p) => (p.latestBrand || '').trim())),
      ].filter(Boolean),
    ),
  );
  if (brands.length === 0) brands.push('UpBase B2C');

  const pics = Array.from(
    new Set(
      (k.workedPicsList || k.bookingPic || '')
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
  const defaultPic = pics[0] || 'Chuyên viên Booking';
  const payees = k.alternatePayees || [];
  const baseMonth = k.latestBookMonth || '2026/04';
  const [yearStr = '2026', monthStr = '04'] = baseMonth.split('/');
  const postedDateStr = `${yearStr}-${monthStr.padStart(2, '0')}-15`;
  const cleanHandle = normHandle(k.channelId) || k.id;

  const synthesized: BookingDealItem[] = [];
  let allocatedCostSoFar = 0;
  let allocatedGmvSoFar = 0;

  for (let i = 0; i < missingCount; i++) {
    const isPaid = i < missingPaidCount;
    let dealValue = 0;
    if (isPaid && missingPaidCount > 0) {
      if (i === missingPaidCount - 1) {
        dealValue = Math.max(0, remainingCost - allocatedCostSoFar);
      } else {
        dealValue = Math.round(remainingCost / missingPaidCount);
        allocatedCostSoFar += dealValue;
      }
    }

    let dealGmv = 0;
    if (remainingGmv > 0) {
      if (i === missingCount - 1) {
        dealGmv = Math.max(0, remainingGmv - allocatedGmvSoFar);
      } else {
        dealGmv = Math.round(remainingGmv / missingCount);
        allocatedGmvSoFar += dealGmv;
      }
    }

    const brand = brands[i % brands.length];
    const pic = pics[i % Math.max(1, pics.length)] || defaultPic;
    const payee = payees.length > 0 ? payees[i % payees.length] : undefined;

    let boCode = '';
    if (i === 0 && k.latestBoCode && !existingCodes.has(k.latestBoCode.toUpperCase())) {
      boCode = k.latestBoCode;
    } else if (k.latestBoCode && /^BO\d+$/i.test(k.latestBoCode)) {
      const prefix = k.latestBoCode.slice(0, 6);
      const baseNum = parseInt(k.latestBoCode.slice(6), 10) || 10000;
      boCode = `${prefix}${String(Math.max(1, baseNum - (i + 1))).padStart(5, '0')}`;
    } else {
      const ym = `${yearStr.slice(-2)}${monthStr.padStart(2, '0')}`;
      const numId = parseInt(k.id.replace(/\D/g, ''), 10) || 1;
      boCode = `BO${ym}${String(numId * 10 + i + 1).padStart(5, '0')}`;
    }
    existingCodes.add(boCode.toUpperCase());

    const dealRoi = dealValue > 0 && dealGmv > 0 ? Number((dealGmv / dealValue).toFixed(2)) : 0;
    const aov = k.aov || 260000;
    const ordersCount = dealGmv > 0 ? Math.max(1, Math.round(dealGmv / aov)) : 0;

    synthesized.push({
      id: `deal-hist-master-${k.id}-${i + 1}`,
      dealCode: boCode,
      jobId: `ID-${boCode}`,
      campaignCode: `CAMP-${brand.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'B2C'}-${yearStr.slice(-2)}${monthStr}`,
      campaignTitle: `Chiến dịch Booking ${brand} (${baseMonth})`,
      brandName: brand,
      storeName: `${brand}_TikTok_Shop`,
      productName: `Sản phẩm chiến dịch ${brand}`,
      bookingBatch: baseMonth,
      bookingFormat: isPaid ? (k.bookingFormat || 'Booking Video KOC') : 'Affiliate Thuần',
      kocId: k.id,
      kocStageName: k.stageName || cleanHandle,
      kocChannelId: `@${cleanHandle}`,
      kocTier: k.tier || 'TIER_3_MICRO',
      salaryGrade: isPaid ? (k.salaryGrade || 'KL3') : 'TAP UpAffiliate',
      segment: k.segment || 'Mid Creator',
      tepKenh: k.tepKenh || k.creatorCategory || 'Chưa phân loại',
      creatorCategory: k.creatorCategory || k.tepKenh,
      kocCategory: k.kocCategory || 'Personal care',
      contentPillar: 'Review trực tiếp',
      brandApprovalStatus: 'ĐÃ_DUYỆT',
      kocResponseStatus: 'ĐỒNG_Ý',
      pipelineText: 'Hoàn tất',
      status: 'COMPLETED',
      statusLabel: isPaid ? 'Hoàn Tất (Lịch Sử Master KOC)' : 'Hoàn Tất (Suất Gửi Mẫu FOC)',
      sampleStatus: 'ĐÃ_NHẬN',
      adsCodeStatus: 'ĐÃ_NGHIỆM_THU',
      assignedStaff: pic,
      bookingPic: pic,
      totalValue: dealValue,
      advanceAmount: 0,
      finalAmount: dealValue,
      deadlinePost: postedDateStr,
      postedDate: postedDateStr,
      viewsCount: k.avgViews || 0,
      affiliateGmv: dealGmv,
      gmv30: dealGmv,
      roi: dealRoi,
      ordersCount,
      publishedDays: 30,
      isWinnerTop20: Boolean(k.isWinnerTop20 && i === 0),
      hasGmv: dealGmv > 0,
      isBreakEven: dealValue > 0 ? dealGmv >= dealValue : dealGmv > 0,
      remainingSlaHours: 0,
      isSlaWarning: false,
      kocBankHolder: payee?.holderName || k.realName || undefined,
      kocBankName: payee?.bankName || k.bankName || undefined,
      kocBankAccount: payee?.bankAccount || k.bankAccount || undefined,
      kocIdCardNumber: payee?.legalId || k.cccd || k.taxCode || undefined,
      hasIdCardScan: Boolean(payee?.legalId || k.cccd || k.taxCode),
    });
  }

  return synthesized;
}

/** Các booking của một KOC, khớp theo id (có kiểm chứng handle), tên kênh / handle và đồng bộ lịch sử Master KOC. */
export function dealsOfKoc(deals: BookingDealItem[] | undefined, k: KocItem): BookingDealItem[] {
  if (!deals || deals.length === 0) {
    return buildHistoricalDealsFromKocSummary(k, []);
  }
  const idx = getKocDealIndex(deals);
  const cacheKey = `${k.id}::${normHandle(k.channelId)}::${k.totalPastDeals || 0}::${k.totalPastGmv || 0}::${k.totalPastCost || 0}`;
  const cachedResult = idx.resolvedByKocKey.get(cacheKey);
  if (cachedResult) return cachedResult;

  const byIdList = idx.byId.get(k.id);
  const h = normHandle(k.channelId);
  const byHandleList = h ? idx.byHandle.get(h) : undefined;
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
      if (h && dh && dh !== h) continue;
      addDeal(d);
    }
  }
  if (byHandleList) {
    for (const d of byHandleList) addDeal(d);
  }
  if (byStageList) {
    for (const d of byStageList) {
      const dh = normHandle(d.kocChannelId);
      if (h && dh && dh !== h) continue;
      addDeal(d);
    }
  }

  if ((k.totalPastDeals || 0) > out.length || (out.length === 0 && Boolean(k.latestBoCode))) {
    const synthesized = buildHistoricalDealsFromKocSummary(k, out);
    for (const sd of synthesized) {
      out.push(sd);
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

export function calculateKocPerformanceStats(deals: BookingDealItem[], koc: KocItem): KocPerformanceSummary {
  const kocDeals = dealsOfKoc(deals, koc);
  const validDeals = kocDeals.filter((d) => d.status !== 'CANCELLED');
  const completedDeals = kocDeals.filter((d) => d.status === 'COMPLETED' || d.status === 'FINAL_PAID');
  const runningDeals = kocDeals.filter(isDealOpen);
  const cancelledDeals = kocDeals.filter((d) => d.status === 'CANCELLED');

  const dealsPaidCount = validDeals.filter((d) => (d.totalValue || 0) > 0).length;
  const dealsFocCount = validDeals.filter((d) => (d.totalValue || 0) === 0).length;
  const paidDealsCount = Math.max(dealsPaidCount, koc.totalPaidVideos || 0);
  const focDealsCount = Math.max(dealsFocCount, koc.totalFocVideos || 0);

  const dealsSpentNet = validDeals.reduce((s, d) => s + (d.totalValue || 0), 0);
  const totalSpentNet = Math.max(dealsSpentNet, koc.totalPastCost || 0);
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

  const totalDealsCount = Math.max(kocDeals.length, koc.totalPastDeals || 0);
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
