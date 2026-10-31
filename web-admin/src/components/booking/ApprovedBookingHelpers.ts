import type {
  ApprovedBookingListItem,
  ApprovedBookingPaymentStatus,
} from '../../lib/approvedBookingList';
import type { ContractRecord } from '../../lib/contracts/types';
import { extractSowPaymentScheduleAndAdvance } from '../../lib/contracts/contractRules';
import { documentOfTemplate } from '../../lib/planDealLink';
import { normalizeTikTokId } from '../../lib/staffBrandListingSheet';
import type { InputPlanBreakdownState } from '../../lib/types';
import { INITIAL_MONTHLY_PLANS } from '../../lib/monthlyPlanData';
import { resolveStoreBookingLeader } from '../../lib/larkPaymentRequestEngine';

export const MONTH_OPTIONS = ['ALL', '2026/11', '2026/10', '2026/09', '2026/08'];

export const PAYMENT_STATUS_OPTIONS: ApprovedBookingPaymentStatus[] = [
  'Chờ nghiệm thu',
  'Đủ điều kiện ĐNTT',
  'Đã lập ĐNTT',
  'Đã thanh toán',
];

export interface ParsedAcceptanceDraftRow {
  rawLine: string;
  channelHandle: string;
  explicitBoCode?: string;
  linkAir: string;
  videoId: string;
  actualAirDate: string;
  sparkAdsCode: string;
  views30d: number;
  gmv30d: number;
  orders30d: number;
  matchedItem?: ApprovedBookingListItem;
}

export interface SheetSyncDiffRow {
  id: string;
  dealCode: string;
  store: string;
  idKenh: string;
  tenKoc: string;
  sanPham: string;
  status: 'ADDED' | 'UPDATED' | 'UNCHANGED' | 'PRESERVED_SHEET' | 'UNMATCHED_SHEET';
  fieldDiffs: Array<{ field: string; oldVal: string; newVal: string }>;
  preservedMetricsNote?: string;
}

export interface SheetSyncComparisonReportState {
  mode: 'PUSH_REPORT_SHEET' | 'PULL_REPORT_SHEET' | 'PULL_LISTING_SHEET';
  stage: 'PREVIEW' | 'COMPLETED';
  title: string;
  targetStoresLabel: string;
  addedCount: number;
  updatedCount: number;
  unchangedCount: number;
  extraCount: number;
  extraLabel: string;
  diffRows: SheetSyncDiffRow[];
  missingSheetStores?: string[];
}

export function mergeContractsIntoApprovedBookingItems(
  sourceItems: ApprovedBookingListItem[],
  records: ContractRecord[]
): { mergedItems: ApprovedBookingListItem[]; matchedDealsCount: number } {
  if (records.length === 0) return { mergedItems: sourceItems, matchedDealsCount: 0 };
  const recordById = new Map<string, ContractRecord>();
  const sowByDeal = new Map<string, ContractRecord>();
  const bbntByDeal = new Map<string, ContractRecord>();
  const bbntByParentId = new Map<string, ContractRecord>();
  const hdntByKoc = new Map<string, ContractRecord>();
  const hdntByPartner = new Map<string, ContractRecord>();

  for (const r of records) {
    if (r.id) recordById.set(r.id, r);
    const docKind = documentOfTemplate(r.templateId);
    const idKey = (r.dealId || '').trim().toUpperCase();
    const codeKey = (r.dealCode || '').trim().toUpperCase();
    if (docKind === 'SOW') {
      if (idKey && !sowByDeal.has(idKey)) sowByDeal.set(idKey, r);
      if (codeKey && !sowByDeal.has(codeKey)) sowByDeal.set(codeKey, r);
    } else if (docKind === 'BBNT') {
      if (idKey && !bbntByDeal.has(idKey)) bbntByDeal.set(idKey, r);
      if (codeKey && !bbntByDeal.has(codeKey)) bbntByDeal.set(codeKey, r);
      if (r.parentId && !bbntByParentId.has(r.parentId)) bbntByParentId.set(r.parentId, r);
    } else if (docKind === 'HDNT') {
      if (r.kocId && !hdntByKoc.has(r.kocId)) hdntByKoc.set(r.kocId, r);
      const partnerKey = normalizeTikTokId(r.partner || '').toLowerCase();
      if (partnerKey && !hdntByPartner.has(partnerKey)) hdntByPartner.set(partnerKey, r);
    }
  }

  let matchedDealsCount = 0;
  const mergedItems = sourceItems.map((it) => {
    const codeKey = (it.maBooking || '').trim().toUpperCase();
    const dealIdKey = (it.linkedDealId || `deal-from-32-${it.id}`).trim().toUpperCase();
    const handleKey = normalizeTikTokId(it.idKenh || '').toLowerCase();
    const nameKey = normalizeTikTokId(it.tenKenh || '').toLowerCase();

    const matchedSow = (codeKey ? sowByDeal.get(codeKey) : undefined) || sowByDeal.get(dealIdKey);
    const matchedBbnt =
      (codeKey ? bbntByDeal.get(codeKey) : undefined) ||
      bbntByDeal.get(dealIdKey) ||
      (matchedSow ? bbntByParentId.get(matchedSow.id) : undefined);
    const matchedHdnt =
      (it.kocId ? hdntByKoc.get(it.kocId) : undefined) ||
      (handleKey ? hdntByPartner.get(handleKey) : undefined) ||
      (nameKey ? hdntByPartner.get(nameKey) : undefined) ||
      (matchedSow?.parentId ? recordById.get(matchedSow.parentId) : undefined);

    if (!matchedSow && !matchedHdnt && !matchedBbnt) return it;
    matchedDealsCount++;

    const isHdntSigned = matchedHdnt?.signing.at(-1)?.status === 'COMPLETED';
    const isSowSigned = matchedSow?.signing.at(-1)?.status === 'COMPLETED';
    const isBbntSigned = matchedBbnt?.signing.at(-1)?.status === 'COMPLETED';

    const matchedSowCode = matchedSow?.contractSystem?.contractCode || matchedSow?.title || '';
    const isAmendmentPending =
      it.contractAppendixStatus === 'CHỜ_KÝ' &&
      Boolean(it.contractAppendixCode) &&
      Boolean(matchedSowCode) &&
      (it.contractAppendixCode || '').trim().toUpperCase() !== matchedSowCode.trim().toUpperCase();

    const hdntSignedUrl =
      matchedHdnt?.signing.at(-1)?.signedFileUrl ||
      matchedHdnt?.contractSystem?.signedFileUrl ||
      (isHdntSigned && matchedHdnt
        ? `/api/contracts/${matchedHdnt.id}/document?version=${matchedHdnt.version}`
        : undefined);
    const sowSignedUrl =
      matchedSow?.signing.at(-1)?.signedFileUrl ||
      matchedSow?.contractSystem?.signedFileUrl ||
      (isSowSigned && matchedSow
        ? `/api/contracts/${matchedSow.id}/document?version=${matchedSow.version}`
        : undefined);
    const bbntSignedUrl =
      matchedBbnt?.signing.at(-1)?.signedFileUrl ||
      matchedBbnt?.contractSystem?.signedFileUrl ||
      (isBbntSigned && matchedBbnt
        ? `/api/contracts/${matchedBbnt.id}/document?version=${matchedBbnt.version}`
        : undefined);

    const sowPay = matchedSow
      ? extractSowPaymentScheduleAndAdvance(matchedSow.values, matchedSow.templateId)
      : undefined;
    const isAdvAlreadyProcessed =
      it.larkAdvanceStatus === 'ĐÃ_CHI_TẠM_ỨNG' ||
      it.larkAdvanceStatus === 'ĐÃ_DUYỆT_TẠM_ỨNG' ||
      it.larkAdvanceStatus === 'CHỜ_DUYỆT_TẠM_ỨNG';
    const syncedTamUng =
      sowPay?.paymentScheduleOption === 'ONE_TIME' && !isAdvAlreadyProcessed
        ? 0
        : sowPay?.paymentScheduleOption === 'TWO_TIMES' && sowPay.advanceAmount > 0
          ? sowPay.advanceAmount
          : it.soTienTamUngTruoc;

    return {
      ...it,
      paymentScheduleOption: sowPay?.paymentScheduleOption || it.paymentScheduleOption,
      soTienTamUngTruoc: syncedTamUng,
      soTienCanThanhToan: Math.max(
        0,
        (Number(it.chiPhiBookingNetCuoi) || 0) -
          (Number(it.khauTruHangMucHuy) || 0) -
          syncedTamUng
      ),
      masterContractCode:
        matchedHdnt?.contractSystem?.contractCode || matchedHdnt?.title || it.masterContractCode,
      masterContractStatus: isHdntSigned
        ? ('ĐÃ_KÝ' as const)
        : matchedHdnt
          ? ('CHỜ_KÝ' as const)
          : it.masterContractStatus,
      masterContractGoogleDocsUrl:
        matchedHdnt?.contractSystem?.googleDocsUrl || it.masterContractGoogleDocsUrl,
      masterContractSignedUrl: hdntSignedUrl || it.masterContractSignedUrl,

      contractAppendixCode: isAmendmentPending
        ? it.contractAppendixCode
        : matchedSowCode || it.contractAppendixCode,
      contractAppendixStatus: isAmendmentPending
        ? ('CHỜ_KÝ' as const)
        : isSowSigned
          ? ('ĐÃ_KÝ' as const)
          : matchedSow
            ? ('CHỜ_KÝ' as const)
            : it.contractAppendixStatus,
      contractAppendixGoogleDocsUrl:
        matchedSow?.contractSystem?.googleDocsUrl || it.contractAppendixGoogleDocsUrl,
      contractAppendixSignedUrl: sowSignedUrl || it.contractAppendixSignedUrl,

      bbntCode:
        matchedBbnt?.contractSystem?.contractCode || matchedBbnt?.title || it.bbntCode,
      bbntStatus: isBbntSigned
        ? ('ĐÃ_KÝ' as const)
        : matchedBbnt
          ? ('CHỜ_KÝ' as const)
          : it.bbntStatus,
      bbntGoogleDocsUrl:
        matchedBbnt?.contractSystem?.googleDocsUrl || it.bbntGoogleDocsUrl,
      bbntSignedUrl: bbntSignedUrl || it.bbntSignedUrl,
    };
  });

  return { mergedItems, matchedDealsCount };
}

export function computeApprovedBookingBudgetSummary(params: {
  rawMonthlyPlans?: InputPlanBreakdownState[];
  selectedMonth: string;
  selectedStore: string;
  filterAssigneeScope: string;
  totalFinalNet: number;
}): {
  targetBudget: number;
  isOverbudget: boolean;
  isUnbudgetedSpend: boolean;
} {
  const { rawMonthlyPlans, selectedMonth, selectedStore, filterAssigneeScope, totalFinalNet } =
    params;
  const plansList = Array.isArray(rawMonthlyPlans) ? rawMonthlyPlans : INITIAL_MONTHLY_PLANS;
  const targetMonth = selectedMonth === 'ALL' ? '2026/10' : selectedMonth;
  const sLower = selectedStore.trim().toLowerCase();
  const matchedPlans = plansList.filter((p) => {
    if (selectedMonth !== 'ALL' && p.month !== targetMonth) return false;
    if (selectedStore !== 'ALL') {
      const matchStore =
        (p.storeName && p.storeName.trim().toLowerCase() === sLower) ||
        (p.brandName && sLower.includes(p.brandName.trim().toLowerCase())) ||
        (p.brandName && p.brandName.trim().toLowerCase().includes(sLower.split('_')[0]));
      if (!matchStore) return false;
    }
    if (filterAssigneeScope === 'LEADER_NGOC_TAM') {
      return Boolean(resolveStoreBookingLeader(p.storeName || p.brandName));
    }
    if (filterAssigneeScope === 'DIRECT_YEN_NHI') {
      return !resolveStoreBookingLeader(p.storeName || p.brandName);
    }
    return true;
  });

  const targetBudget = matchedPlans.reduce((sum, p) => {
    const itemsList = Array.isArray(p.items) ? p.items : [];
    const planCap =
      Number(p.totalTargetBudget) ||
      itemsList.reduce((s, it) => s + (Number(it.totalBudget) || 0), 0);
    return sum + planCap;
  }, 0);

  const isOverbudget = targetBudget > 0 && totalFinalNet > targetBudget;
  const isUnbudgetedSpend =
    selectedStore !== 'ALL' && targetBudget === 0 && totalFinalNet > 0;

  return {
    targetBudget,
    isOverbudget,
    isUnbudgetedSpend,
  };
}
