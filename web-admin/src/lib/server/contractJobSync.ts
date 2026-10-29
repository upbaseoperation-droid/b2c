import type { ContractRecord } from '../contracts/types';
import { documentOfTemplate, formatContractRecordNumber, recordSigned } from '../planDealLink';
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
    return {
      ...job,
      sowContractId: record.id,
      sowSigned: signed.signed || undefined,
      appendixNo: job.appendixNo.trim() || systemCode,
      sowGoogleDocsUrl: record.contractSystem?.googleDocsUrl || job.sowGoogleDocsUrl,
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
      bbntGoogleDocsUrl: record.contractSystem?.googleDocsUrl || job.bbntGoogleDocsUrl,
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
export async function syncContractToJob(record: ContractRecord): Promise<number> {
  const doc = documentOfTemplate(record.templateId);
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
