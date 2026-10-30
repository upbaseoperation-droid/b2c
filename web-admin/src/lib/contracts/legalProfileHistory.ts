import type { BookingDealItem, KocItem, KocLegalProfile, LegalDocAttachment } from '../types';
import type { ContractRecord } from './types';

export type LegalProfileVerificationStatus =
  | 'SIGNED_VERIFIED'
  | 'FINANCE_VERIFIED'
  | 'PROFILE_CHANGED'
  | 'FIRST_TIME';

export interface MatchedPriorContractInfo {
  id: string;
  title: string;
  dealCode?: string;
  brand: string;
  templateId: string;
  signedAt?: string;
  financeApprover?: string;
  isFullySigned: boolean;
  bankAccount: string;
  bankName: string;
  cccdOrTaxCode: string;
}

export interface RecordLegalIdentity {
  kocId: string;
  partnerName: string;
  normalizedPartner: string;
  legalProfileId: string;
  legalEntityName: string;
  cccdOrTaxCode: string;
  normalizedCccdOrTax: string;
  bankAccount: string;
  normalizedBankAccount: string;
  bankName: string;
  attachments: LegalDocAttachment[];
}

export interface LegalProfileSigningHistorySummary {
  status: LegalProfileVerificationStatus;
  isSkipDeepCheckEligible: boolean;
  signedCount: number;
  financeApprovedCount: number;
  matchedContracts: MatchedPriorContractInfo[];
  latestMatch?: MatchedPriorContractInfo;
  priorKocContract?: MatchedPriorContractInfo;
  changedFields: string[];
  badgeLabel: string;
  headline: string;
  detailMessage: string;
  recommendedFinanceNote: string;
  identity: RecordLegalIdentity;
}

function normalizeText(raw?: string | null): string {
  if (!raw) return '';
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function normalizeCode(raw?: string | null): string {
  if (!raw) return '';
  const firstToken = raw.trim().split(/\s+/)[0] || '';
  const digits = firstToken.replace(/[^\dA-Za-z]/g, '');
  return digits.toUpperCase();
}

function normalizeAccount(raw?: string | null): string {
  if (!raw) return '';
  return raw.replace(/[^\dA-Za-z]/g, '').toUpperCase();
}

function extractKocProfiles(koc?: KocItem): KocLegalProfile[] {
  if (!koc) return [];
  if (Array.isArray(koc.legalProfiles) && koc.legalProfiles.length > 0) {
    return koc.legalProfiles;
  }
  return [];
}

function lookupDeal(
  record: ContractRecord,
  deals?: Map<string, BookingDealItem> | BookingDealItem[],
): BookingDealItem | undefined {
  if (!deals) return undefined;
  if (deals instanceof Map) {
    return (
      (record.dealId && deals.get(record.dealId)) ||
      (record.dealCode && deals.get(record.dealCode)) ||
      undefined
    );
  }
  return deals.find(
    d =>
      (record.dealId && d.id === record.dealId) ||
      (record.dealCode && d.dealCode === record.dealCode),
  );
}

function lookupKoc(
  record: ContractRecord,
  deal?: BookingDealItem,
  kocs?: Map<string, KocItem> | KocItem[],
): KocItem | undefined {
  if (!kocs) return undefined;
  const targetKocId = record.kocId || deal?.kocId;
  if (kocs instanceof Map) {
    if (targetKocId && kocs.get(targetKocId)) return kocs.get(targetKocId);
    const normPartner = normalizeText(record.partner);
    if (!normPartner) return undefined;
    for (const k of kocs.values()) {
      if (
        normalizeText(k.fullName) === normPartner ||
        normalizeText(k.stageName) === normPartner ||
        normPartner.includes(normalizeText(k.stageName))
      ) {
        return k;
      }
    }
    return undefined;
  }
  if (targetKocId) {
    const byId = kocs.find(k => k.id === targetKocId);
    if (byId) return byId;
  }
  const normPartner = normalizeText(record.partner);
  if (!normPartner) return undefined;
  return kocs.find(
    k =>
      normalizeText(k.fullName) === normPartner ||
      normalizeText(k.stageName) === normPartner ||
      (k.stageName && normPartner.includes(normalizeText(k.stageName))),
  );
}

export function resolveContractLegalAttachments(
  record: ContractRecord,
  deals?: Map<string, BookingDealItem> | BookingDealItem[],
  kocs?: Map<string, KocItem> | KocItem[],
  allRecords?: ContractRecord[],
): LegalDocAttachment[] {
  if (record.legalAttachments && record.legalAttachments.length > 0) {
    return record.legalAttachments;
  }
  const deal = lookupDeal(record, deals);
  const koc = lookupKoc(record, deal, kocs);
  if (koc) {
    const profiles = extractKocProfiles(koc);
    const matchedProfile =
      (record.legalProfileId ? profiles.find(p => p.id === record.legalProfileId) : undefined) ||
      profiles.find(p => p.isDefault) ||
      profiles[0];
    if (matchedProfile?.legalAttachments && matchedProfile.legalAttachments.length > 0) {
      return matchedProfile.legalAttachments;
    }
  }
  if (
    deal?.legalProfileSnapshot?.legalAttachments &&
    deal.legalProfileSnapshot.legalAttachments.length > 0
  ) {
    return deal.legalProfileSnapshot.legalAttachments;
  }
  // Kế thừa tệp đính kèm từ hợp đồng trước đó của cùng KOC / Hồ sơ pháp lý nếu có
  if (allRecords && allRecords.length > 0) {
    const normPartner = normalizeText(record.partner);
    const siblingWithDocs = allRecords.find(
      other =>
        other.id !== record.id &&
        other.legalAttachments &&
        other.legalAttachments.length > 0 &&
        ((record.kocId && other.kocId === record.kocId) ||
          (normPartner && normalizeText(other.partner) === normPartner)),
    );
    if (siblingWithDocs?.legalAttachments) {
      return siblingWithDocs.legalAttachments;
    }
  }
  return [];
}

export function extractRecordLegalIdentity(
  record: ContractRecord,
  deals?: Map<string, BookingDealItem> | BookingDealItem[],
  kocs?: Map<string, KocItem> | KocItem[],
  allRecords?: ContractRecord[],
): RecordLegalIdentity {
  const v = record.values || {};
  const deal = lookupDeal(record, deals);
  const koc = lookupKoc(record, deal, kocs);
  const profiles = extractKocProfiles(koc);
  const matchedProfile =
    (record.legalProfileId ? profiles.find(p => p.id === record.legalProfileId) : undefined) ||
    profiles.find(p => p.isDefault) ||
    profiles[0];

  const cccdOrTaxCodeRaw =
    v['src:cccd'] ||
    v['src:taxCode'] ||
    v['word/document.xml:p39:cell'] ||
    matchedProfile?.taxCode ||
    deal?.legalProfileSnapshot?.taxCode ||
    koc?.cccd ||
    koc?.taxCode ||
    '';

  const bankAccountRaw =
    v['src:bankAccount'] ||
    v['SO_TAI_KHOAN'] ||
    matchedProfile?.bankAccountNumber ||
    deal?.legalProfileSnapshot?.bankAccountNumber ||
    koc?.bankAccount ||
    '';

  const bankNameRaw =
    v['src:bankName'] ||
    v['NGAN_HANG'] ||
    matchedProfile?.bankName ||
    deal?.legalProfileSnapshot?.bankName ||
    koc?.bankName ||
    '';

  const legalProfileId =
    record.legalProfileId ||
    deal?.legalProfileId ||
    matchedProfile?.id ||
    '';

  const legalEntityName =
    matchedProfile?.entityName ||
    deal?.legalProfileSnapshot?.entityName ||
    record.partner ||
    '';

  return {
    kocId: record.kocId || deal?.kocId || koc?.id || '',
    partnerName: record.partner || koc?.fullName || koc?.stageName || '',
    normalizedPartner: normalizeText(record.partner || koc?.fullName || koc?.stageName),
    legalProfileId,
    legalEntityName,
    cccdOrTaxCode: cccdOrTaxCodeRaw.trim(),
    normalizedCccdOrTax: normalizeCode(cccdOrTaxCodeRaw),
    bankAccount: bankAccountRaw.trim(),
    normalizedBankAccount: normalizeAccount(bankAccountRaw),
    bankName: bankNameRaw.trim(),
    attachments: resolveContractLegalAttachments(record, deals, kocs, allRecords),
  };
}

function isContractFullySigned(r: ContractRecord): boolean {
  return (
    r.signing.some(s => s.status === 'COMPLETED') ||
    r.contractSystem?.status === 'COMPLETED'
  );
}

function isContractFinanceApproved(r: ContractRecord): boolean {
  return (
    r.approval === 'APPROVED' ||
    r.steps.some(s => s.role === 'FINANCE' && s.status === 'APPROVED') ||
    Boolean(r.googleDocsAuditTrail?.approvedByFinance)
  );
}

function getContractSignedOrApprovedDate(r: ContractRecord): string | undefined {
  const completedSign = r.signing.find(s => s.status === 'COMPLETED');
  if (completedSign?.updatedAt) return completedSign.updatedAt;
  if (r.contractSystem?.completedAt) return r.contractSystem.completedAt;
  const finStep = r.steps.find(s => s.role === 'FINANCE' && s.status === 'APPROVED');
  if (finStep?.decidedAt) return finStep.decidedAt;
  if (r.googleDocsAuditTrail?.approvedByFinanceAt) return r.googleDocsAuditTrail.approvedByFinanceAt;
  return r.updatedAt;
}

function getFinanceApproverName(r: ContractRecord): string | undefined {
  const finStep = r.steps.find(s => s.role === 'FINANCE' && s.status === 'APPROVED');
  if (finStep?.reviewerName) return finStep.reviewerName;
  if (r.googleDocsAuditTrail?.approvedByFinance) return r.googleDocsAuditTrail.approvedByFinance;
  return undefined;
}

/**
 * Đánh giá lịch sử ký hợp đồng theo đúng Hồ sơ pháp lý của KOC (RULE-SYNC-01 & RULE-DATA-01).
 * Giúp Kế toán nhận biết ngay hợp đồng này đã từng ký với đúng bộ hồ sơ pháp lý (CCCD/ĐKKD, MST, STK) của KOC
 * để không phải kiểm tra lại giấy tờ gốc từ đầu.
 */
export function evaluateLegalProfileSigningHistory(
  record: ContractRecord,
  allRecords: ContractRecord[],
  deals?: Map<string, BookingDealItem> | BookingDealItem[],
  kocs?: Map<string, KocItem> | KocItem[],
): LegalProfileSigningHistorySummary {
  const currentId = extractRecordLegalIdentity(record, deals, kocs, allRecords);

  const exactMatches: MatchedPriorContractInfo[] = [];
  const sameKocDiffProfileMatches: Array<{
    info: MatchedPriorContractInfo;
    changedFields: string[];
  }> = [];

  for (const other of allRecords) {
    if (other.id === record.id) continue;

    const fullySigned = isContractFullySigned(other);
    const financeApproved = isContractFinanceApproved(other);
    if (!fullySigned && !financeApproved) continue;

    const otherId = extractRecordLegalIdentity(other, deals, kocs, allRecords);

    const sameKocById = Boolean(currentId.kocId && otherId.kocId && currentId.kocId === otherId.kocId);
    const samePartnerByName = Boolean(
      currentId.normalizedPartner &&
        otherId.normalizedPartner &&
        currentId.normalizedPartner === otherId.normalizedPartner,
    );
    const sameTaxOrCccd = Boolean(
      currentId.normalizedCccdOrTax &&
        otherId.normalizedCccdOrTax &&
        currentId.normalizedCccdOrTax === otherId.normalizedCccdOrTax,
    );

    if (!sameKocById && !samePartnerByName && !sameTaxOrCccd) {
      continue;
    }

    // Kiểm tra độ khớp Hồ sơ pháp lý (CCCD/MST & Số tài khoản ngân hàng)
    const profileIdMatch =
      !currentId.legalProfileId ||
      !otherId.legalProfileId ||
      currentId.legalProfileId === otherId.legalProfileId;

    const taxOrCccdMatch =
      !currentId.normalizedCccdOrTax ||
      !otherId.normalizedCccdOrTax ||
      currentId.normalizedCccdOrTax === otherId.normalizedCccdOrTax;

    const bankMatch =
      !currentId.normalizedBankAccount ||
      !otherId.normalizedBankAccount ||
      currentId.normalizedBankAccount === otherId.normalizedBankAccount;

    const matchInfo: MatchedPriorContractInfo = {
      id: other.id,
      title: other.title,
      dealCode: other.dealCode,
      brand: other.brand,
      templateId: other.templateId,
      signedAt: getContractSignedOrApprovedDate(other),
      financeApprover: getFinanceApproverName(other),
      isFullySigned: fullySigned,
      bankAccount: otherId.bankAccount,
      bankName: otherId.bankName,
      cccdOrTaxCode: otherId.cccdOrTaxCode,
    };

    if (profileIdMatch && taxOrCccdMatch && bankMatch) {
      exactMatches.push(matchInfo);
    } else {
      const diffs: string[] = [];
      if (!taxOrCccdMatch || !profileIdMatch) {
        diffs.push('Mã số thuế / CCCD pháp nhân');
      }
      if (!bankMatch) {
        diffs.push('Số tài khoản ngân hàng thụ hưởng');
      }
      sameKocDiffProfileMatches.push({ info: matchInfo, changedFields: diffs });
    }
  }

  // Ưu tiên sắp xếp các hợp đồng đã ký hoàn tất 2 bên lên đầu
  exactMatches.sort((a, b) => {
    if (a.isFullySigned !== b.isFullySigned) return a.isFullySigned ? -1 : 1;
    return (b.signedAt || '').localeCompare(a.signedAt || '');
  });

  const signedCount = exactMatches.filter(m => m.isFullySigned).length;
  const financeApprovedCount = exactMatches.length;
  const latestMatch = exactMatches[0];

  if (signedCount > 0 && latestMatch) {
    return {
      status: 'SIGNED_VERIFIED',
      isSkipDeepCheckEligible: true,
      signedCount,
      financeApprovedCount,
      matchedContracts: exactMatches,
      latestMatch,
      changedFields: [],
      badgeLabel: `Đã từng ký ${signedCount} lần · Khớp HSPL`,
      headline: `Hồ sơ pháp lý này của KOC đã từng ký ${signedCount} hợp đồng trước đó`,
      detailMessage: `Khớp 100% CCCD/ĐKKD, Mã số thuế và STK ngân hàng với hợp đồng đã ký "${latestMatch.title}" (${latestMatch.id}). Kế toán không cần kiểm tra lại giấy tờ pháp lý từ đầu.`,
      recommendedFinanceNote: `Đã đối chiếu khớp Hồ sơ pháp lý KOC từng ký tại HĐ ${latestMatch.id} (${latestMatch.title}) và xác nhận hạn mức Booking, thuế khấu trừ hợp lệ.`,
      identity: currentId,
    };
  }

  if (financeApprovedCount > 0 && latestMatch) {
    return {
      status: 'FINANCE_VERIFIED',
      isSkipDeepCheckEligible: true,
      signedCount: 0,
      financeApprovedCount,
      matchedContracts: exactMatches,
      latestMatch,
      changedFields: [],
      badgeLabel: `KT đã duyệt ${financeApprovedCount} lần · Khớp HSPL`,
      headline: `Hồ sơ pháp lý này của KOC đã được Kế toán thẩm định ở ${financeApprovedCount} hồ sơ trước`,
      detailMessage: `Khớp 100% CCCD/ĐKKD, Mã số thuế và STK ngân hàng với hồ sơ "${latestMatch.title}" (${latestMatch.id}). Kế toán chỉ cần đối soát giá trị thanh toán đợt này.`,
      recommendedFinanceNote: `Hồ sơ pháp lý KOC trùng khớp với hồ sơ đã duyệt ${latestMatch.id}. Đã kiểm tra khớp hạn mức Booking và thuế khấu trừ.`,
      identity: currentId,
    };
  }

  if (sameKocDiffProfileMatches.length > 0) {
    const firstDiff = sameKocDiffProfileMatches[0];
    return {
      status: 'PROFILE_CHANGED',
      isSkipDeepCheckEligible: false,
      signedCount: 0,
      financeApprovedCount: 0,
      matchedContracts: [],
      priorKocContract: firstDiff.info,
      changedFields: firstDiff.changedFields,
      badgeLabel: 'Đổi STK / Pháp nhân so với HĐ cũ',
      headline: `KOC đã từng ký hợp đồng nhưng thay đổi ${firstDiff.changedFields.join(' & ')}`,
      detailMessage: `So với hợp đồng trước đó "${firstDiff.info.title}" (${firstDiff.info.id}), hồ sơ này thay đổi ${firstDiff.changedFields.join(', ')}. Kế toán cần mở xem CCCD / ĐKKD / Giấy ủy quyền đính kèm trước khi duyệt.`,
      recommendedFinanceNote: '',
      identity: currentId,
    };
  }

  return {
    status: 'FIRST_TIME',
    isSkipDeepCheckEligible: false,
    signedCount: 0,
    financeApprovedCount: 0,
    matchedContracts: [],
    changedFields: [],
    badgeLabel: 'Ký lần đầu · Cần đối chiếu CCCD/ĐKKD',
    headline: 'Hồ sơ pháp lý ký lần đầu tiên — Chưa có lịch sử hợp đồng đã ký',
    detailMessage:
      'KOC / Pháp nhân thụ hưởng này chưa có hợp đồng đã ký trước đó trên hệ thống. Kế toán vui lòng mở xem ảnh chụp CCCD / ĐKKD đính kèm bên dưới để đối chiếu Mã số thuế và Tài khoản ngân hàng.',
    recommendedFinanceNote:
      'Đã kiểm tra CCCD/ĐKKD gốc trên Cloudflare R2, đối chiếu khớp Mã số thuế, STK thụ hưởng và hạn mức Booking.',
    identity: currentId,
  };
}
