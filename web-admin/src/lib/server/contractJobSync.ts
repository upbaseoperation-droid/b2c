import type { ContractRecord } from '../contracts/types';
import { extractSowPaymentScheduleAndAdvance } from '../contracts/contractRules';
import type { KocItem } from '../types';
import { documentOfTemplate, formatContractRecordNumber, recordSigned } from '../planDealLink';

interface KocDirectoryChangesData {
  itemsByHandle: Record<string, KocItem>;
  updatedAt: string;
}

const DEFAULT_KOC_CHANGES: KocDirectoryChangesData = {
  itemsByHandle: {},
  updatedAt: new Date(0).toISOString(),
};
import { EMPTY_DEAL_BOARD, sanitizeDealBoard, type DealBoardData, type DealJob } from '../dealBoardRules';
import { dealBoardKey } from './boardKeys';
import { readRecordsBatch, RecordError, readRecord, updateRecord } from './sharedRecords';
import { allPlanIdsForSync } from './monthlyPlanStore';

const reviewOf = (record: ContractRecord, role: 'LEGAL' | 'FINANCE'): 'APPROVED' | 'CHANGES' | null => {
  const step = [...(record.steps || [])].reverse().find(s => s.role === role && s.status !== 'PENDING');
  if (!step) return null;
  return step.status === 'APPROVED' ? 'APPROVED' : 'CHANGES';
};

/** Ghi kết quả của một hồ sơ SOW / BBNT vào Job (thuần, dùng cho đồng bộ và test). */
export function applyContractRecordToJob(job: DealJob, record: ContractRecord): DealJob {
  const doc = documentOfTemplate(record.templateId);
  const signed = recordSigned(record);
  const latestSigning = record.signing.at(-1);
  const signedUrl =
    latestSigning?.signedFileUrl ||
    record.contractSystem?.signedFileUrl ||
    `/api/contracts/${encodeURIComponent(record.id)}/document?signed=1`;
  const systemCode = record.contractSystem?.contractCode || formatContractRecordNumber(record);
  if (doc === 'SOW') {
    const legal = reviewOf(record, 'LEGAL');
    const finance = reviewOf(record, 'FINANCE');
    const sowPay = extractSowPaymentScheduleAndAdvance(record.values, record.templateId);
    const isAdvProcessed =
      job.advancePayment?.status === 'REQUESTED' ||
      job.advancePayment?.status === 'APPROVED' ||
      job.advancePayment?.status === 'PAID';
    const nextAdvancePayment: DealJob['advancePayment'] = isAdvProcessed
      ? {
          ...job.advancePayment!,
          amount:
            job.advancePayment?.amount && job.advancePayment.amount > 0
              ? job.advancePayment.amount
              : sowPay.advanceAmount > 0
                ? sowPay.advanceAmount
                : job.advancePayment?.amount ?? null,
        }
      : sowPay.paymentScheduleOption === 'TWO_TIMES'
        ? {
            status:
              job.advancePayment?.status && job.advancePayment.status !== 'NONE'
                ? job.advancePayment.status
                : 'REQUIRED',
            amount:
              sowPay.advanceAmount > 0
                ? sowPay.advanceAmount
                : job.advancePayment?.amount ?? null,
            requestedAt: job.advancePayment?.requestedAt || '',
            paidAt: job.advancePayment?.paidAt || '',
            larkSlipCode: job.advancePayment?.larkSlipCode || '',
            uncBillUrl: job.advancePayment?.uncBillUrl || '',
            note: job.advancePayment?.note,
          }
        : {
            status: 'NONE',
            amount: null,
            requestedAt: '',
            paidAt: '',
            larkSlipCode: '',
            uncBillUrl: '',
          };
    return {
      ...job,
      sowContractId: record.id,
      sowSigned: signed.signed || undefined,
      appendixNo: job.appendixNo.trim() || systemCode,
      sowGoogleDocsUrl: record.googleDocsUrl || record.contractSystem?.googleDocsUrl || job.sowGoogleDocsUrl,
      paymentScheduleOption: sowPay.paymentScheduleOption,
      advancePayment: nextAdvancePayment,
      ...(legal ? { legalReviewStatus: legal } : {}),
      ...(finance ? { financeReviewStatus: finance } : {}),
      ...(signed.signed
        ? {
            appendixDate: job.appendixDate || signed.at,
            appendixUrl:
              latestSigning?.signedFileUrl ||
              record.contractSystem?.signedFileUrl ||
              job.appendixUrl.trim() ||
              signedUrl,
          }
        : {}),
    };
  }
  if (doc === 'BBNT') {
    return {
      ...job,
      bbntContractId: record.id,
      bbntSigned: signed.signed || undefined,
      bbntNo: job.bbntNo?.trim() || systemCode,
      bbntGoogleDocsUrl: record.googleDocsUrl || record.contractSystem?.googleDocsUrl || job.bbntGoogleDocsUrl,
      ...(signed.signed
        ? {
            bbntDate: job.bbntDate || signed.at,
            bbntUrl: signedUrl,
          }
        : {}),
    };
  }
  return job;
}

const matches = (job: DealJob, record: ContractRecord, _isFirstJob: boolean, dealCode: string, dealId: string) => {
  if (
    job.sowContractId === record.id ||
    job.bbntContractId === record.id ||
    record.dealId === `PJ-${job.id}` ||
    (Boolean(record.dealCode) && record.dealCode === job.code) ||
    (Boolean(record.dealCode) && record.dealCode === dealCode) ||
    record.dealId === `PD-${dealId}` ||
    record.dealId === dealId
  ) {
    return true;
  }
  const rawSowJobs = record.values?.['meta:sowJobsJson'];
  if (rawSowJobs && (rawSowJobs.includes(`"${job.id}"`) || (job.code && rawSowJobs.includes(`"${job.code}"`)))) {
    return true;
  }
  return false;
};

/**
 * Đưa kết quả của hồ sơ Phụ lục SOW / BBNT (module Hợp đồng) về Job trên bảng Deal:
 * duyệt Pháp chế / Tài chính, đã ký, số và link phụ lục, link BBNT đã ký. Máy chủ ghi, không qua quyền người dùng.
 */
export async function syncFrameworkContractToKoc(record: ContractRecord): Promise<number> {
  const signed = recordSigned(record);
  const systemCode = record.contractSystem?.contractCode || formatContractRecordNumber(record);
  const latestSigning = record.signing.at(-1);
  const signedUrl =
    latestSigning?.signedFileUrl ||
    record.contractSystem?.signedFileUrl ||
    `/api/contracts/${encodeURIComponent(record.id)}/document?signed=1`;

  const targetKocId = record.kocId || record.values?.['KOC_ID'];
  const targetProfileId = record.legalProfileId || record.values?.['LEGAL_PROFILE_ID'];
  const targetChannel = (record.values?.['CHANNEL_ID'] || record.partner || '').toLowerCase().replace(/^@+/, '');

  let kocTouched = 0;
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const current = await readRecord<KocDirectoryChangesData>('koc-directory-changes', DEFAULT_KOC_CHANGES);
      const items = { ...current.data.itemsByHandle };
      let changed = false;

      for (const [key, koc] of Object.entries(items)) {
        const kId = koc.id;
        const kChan = (koc.channelId || '').toLowerCase().replace(/^@+/, '');
        const kName = (koc.stageName || '').toLowerCase().trim();
        const isMatch = Boolean(
          (targetKocId && kId === targetKocId) ||
          (targetChannel && (kChan === targetChannel || kName === targetChannel))
        );

        if (isMatch) {
          const updatedProfiles = (koc.legalProfiles || []).map(p => {
            if (!targetProfileId || p.id === targetProfileId || (p.isDefault && !targetProfileId)) {
              return {
                ...p,
                frameworkContractCode: systemCode,
                frameworkContractStatus: (signed.signed ? 'ĐÃ_KÝ' : 'ĐANG_TRÌNH_KÝ') as 'ĐÃ_KÝ' | 'ĐANG_TRÌNH_KÝ',
                ...(signed.signed ? { frameworkContractSignedAt: signed.at, frameworkContractDriveUrl: signedUrl } : {}),
              };
            }
            return p;
          });

          items[key] = {
            ...koc,
            legalProfiles: updatedProfiles.length > 0 ? updatedProfiles : koc.legalProfiles,
          };
          changed = true;
          kocTouched++;
        }
      }

      if (changed) {
        try {
          await updateRecord<KocDirectoryChangesData>('koc-directory-changes', DEFAULT_KOC_CHANGES, current.revision, prev => ({
            ...prev,
            itemsByHandle: items,
            updatedAt: new Date().toISOString(),
          }));
          break;
        } catch (e) {
          if (!(e instanceof RecordError) || e.status !== 409 || attempt === 2) throw e;
        }
      } else {
        break;
      }
    }
  } catch (err) {
    console.error('Error syncing framework contract to KOC directory:', err);
  }

  return kocTouched;
}

export async function syncContractToJob(record: ContractRecord): Promise<number> {
  const doc = documentOfTemplate(record.templateId);
  if (doc === 'HDNT') {
    return await syncFrameworkContractToKoc(record);
  }
  if (doc !== 'SOW' && doc !== 'BBNT') return 0;
  if (!record.dealId && !record.dealCode) return 0;
  const planIds = await allPlanIdsForSync();
  const boards = await readRecordsBatch<DealBoardData>(planIds.map(dealBoardKey), EMPTY_DEAL_BOARD);
  let touched = 0;
  for (const planId of planIds) {
    const rec = boards.get(dealBoardKey(planId));
    if (!rec) continue;
    const hit = sanitizeDealBoard(rec.data).deals.some(d => (d.jobs || []).some((j, i) => matches(j, record, i === 0, d.code, d.id)));
    if (!hit) continue;
    for (let attempt = 0; attempt < 3; attempt++) {
      const current = await readRecord<DealBoardData>(dealBoardKey(planId), EMPTY_DEAL_BOARD);
      try {
        await updateRecord<DealBoardData>(dealBoardKey(planId), EMPTY_DEAL_BOARD, current.revision, prev => {
          const board = sanitizeDealBoard(prev);
          return {
            ...board,
            deals: board.deals.map(d => ({
              ...d,
              jobs: (d.jobs || []).map((j, i) => {
                if (!matches(j, record, i === 0, d.code, d.id)) return j;
                touched++;
                return applyContractRecordToJob(j, record);
              }),
            })),
          };
        });
        break;
      } catch (e) {
        if (!(e instanceof RecordError) || e.status !== 409 || attempt === 2) throw e;
      }
    }
  }
  return touched;
}
