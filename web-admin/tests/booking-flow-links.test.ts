import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createDealJob, type DealBoardData, type DealJob, type PlanDeal } from '../src/lib/dealBoardRules';
import type { ContractRecord } from '../src/lib/contracts/types';
import type { LarkPaymentRequestSlip } from '../src/lib/larkPaymentRequestEngine';

before(async () => {
  process.env.SHARED_DATA_DIR = await mkdtemp(path.join(os.tmpdir(), 'booking-links-'));
});

const job = (id: string, pic: string, over: Partial<DealJob> = {}): DealJob => ({ ...createDealJob({ dealCode: 'DL1', existingJobs: [], pic }), id, code: `DL1-${id}`, ...over });
const deal = (id: string, pic: string, jobs: DealJob[]): PlanDeal =>
  ({ id, code: id, listingItemId: '', slotId: '', kocHandle: `koc_${id}`, kocName: id, grade: 'KL3', week: 'W1', pic, fee: 0, jobs, createdAt: '', createdBy: pic, history: [] }) as unknown as PlanDeal;

async function seedBoard(planId: string, board: DealBoardData) {
  const { readRecord, updateRecord } = await import('../src/lib/server/sharedRecords');
  const { dealBoardKey } = await import('../src/lib/server/boardKeys');
  const { EMPTY_DEAL_BOARD } = await import('../src/lib/dealBoardRules');
  const cur = await readRecord(dealBoardKey(planId), EMPTY_DEAL_BOARD);
  await updateRecord(dealBoardKey(planId), EMPTY_DEAL_BOARD, cur.revision, () => board);
}
async function readBoard(planId: string): Promise<DealBoardData> {
  const { readRecord } = await import('../src/lib/server/sharedRecords');
  const { dealBoardKey } = await import('../src/lib/server/boardKeys');
  const { EMPTY_DEAL_BOARD } = await import('../src/lib/dealBoardRules');
  return (await readRecord<DealBoardData>(dealBoardKey(planId), EMPTY_DEAL_BOARD)).data;
}

test('Bàn giao: chỉ chuyển Job chưa đề nghị thanh toán của người bị thay; Job người cùng làm giữ nguyên', async () => {
  const { transferDealOwner } = await import('../src/lib/server/dealOwnerTransfer');
  await seedBoard('P-HANDOVER', {
    deals: [
      deal('A', 'An', [job('1', 'An'), job('2', 'An', { payment: { ...createDealJob({ dealCode: 'x', existingJobs: [] }).payment, status: 'REQUESTED' } })]),
      deal('B', 'Bình', [job('3', 'Bình')]),
    ],
  });
  const moved = await transferDealOwner({ planIds: ['P-HANDOVER'], fromPic: 'An', toPic: 'Chi', actorName: 'Giám đốc' });
  assert.equal(moved, 1);
  const b = await readBoard('P-HANDOVER');
  assert.equal(b.deals[0].pic, 'Chi');
  assert.equal(b.deals[0].jobs[0].pic, 'Chi');
  assert.equal(b.deals[0].jobs[1].pic, 'An'); // đã đề nghị thanh toán: giữ người cũ để tất toán
  assert.equal(b.deals[1].pic, 'Bình');
});

test('Phiếu Lark: bước duyệt về Job; Kế toán chi xong thì Job Đã thanh toán; phiếu tạm ứng cập nhật tạm ứng', async () => {
  const { applySlipStatusToJobs } = await import('../src/lib/server/slipJobSync');
  await seedBoard('P-LARK', { deals: [deal('A', 'An', [job('1', 'An', { payment: { ...createDealJob({ dealCode: 'x', existingJobs: [] }).payment, status: 'REQUESTED' } }), job('2', 'An', { advancePayment: { status: 'REQUESTED', amount: 500_000 } })])] });
  const slip = (requestType: 'SETTLEMENT' | 'ADVANCE', status: string, jobId: string) =>
    ({ slipCode: 'DNTT-1', requestType, larkSync: { approvalStatus: status }, planJobRefs: [{ planId: 'P-LARK', dealId: 'A', jobId }] }) as unknown as LarkPaymentRequestSlip;
  await applySlipStatusToJobs(slip('SETTLEMENT', 'PENDING_DIRECTOR', '1'));
  let b = await readBoard('P-LARK');
  assert.equal(b.deals[0].jobs[0].payment.larkApprovalStatus, 'PENDING_DIRECTOR');
  assert.equal(b.deals[0].jobs[0].payment.status, 'REQUESTED');
  await applySlipStatusToJobs(slip('SETTLEMENT', 'PAID', '1'));
  b = await readBoard('P-LARK');
  assert.equal(b.deals[0].jobs[0].payment.status, 'PAID');
  assert.ok(b.deals[0].jobs[0].payment.paidAt);
  await applySlipStatusToJobs(slip('ADVANCE', 'APPROVED', '2'));
  b = await readBoard('P-LARK');
  assert.equal(b.deals[0].jobs[1].advancePayment?.status, 'APPROVED');
});

test('Hợp đồng: Pháp chế / Tài chính duyệt, SOW đã ký và BBNT đã ký tự cập nhật về đúng Job', async () => {
  const { syncContractToJob } = await import('../src/lib/server/contractJobSync');
  const rec = (templateId: string, jobId: string, over: Partial<ContractRecord> = {}): ContractRecord =>
    ({ id: `C-${templateId}-${jobId}`, templateId, dealId: `PJ-${jobId}`, steps: [], signing: [], values: { 'token:[dd.mm.yy]': '251026', 'token:[ID KOC]': 'koc_A' }, brand: 'Cocoon', ...over }) as unknown as ContractRecord;
  const signed = [{ status: 'COMPLETED', syncedAt: '2026-10-25T08:00:00Z', linkedAt: '' }] as unknown as ContractRecord['signing'];
  const { applyContractRecordToJob } = await import('../src/lib/server/contractJobSync');
  const j = job('2', 'An');
  const afterSow = applyContractRecordToJob(j, rec('IND-SOW', '2', { steps: [{ role: 'LEGAL', status: 'APPROVED' }, { role: 'FINANCE', status: 'CHANGES' }] as never, signing: signed }));
  assert.equal(afterSow.legalReviewStatus, 'APPROVED');
  assert.equal(afterSow.financeReviewStatus, 'CHANGES');
  assert.equal(afterSow.sowSigned, true);
  assert.match(afterSow.appendixNo, /SOW/);
  assert.equal(afterSow.appendixDate, '2026-10-25');
  const afterBbnt = applyContractRecordToJob(afterSow, rec('IND-VID-BBNT', '2', { signing: signed }));
  assert.equal(afterBbnt.bbntSigned, true);
  assert.match(afterBbnt.bbntUrl || '', /\/api\/contracts\/.+\/document\?signed=1/);
  // Hồ sơ chưa ký: không ghi link BBNT
  assert.equal(applyContractRecordToJob(j, rec('IND-VID-BBNT', '2')).bbntUrl, undefined);
  assert.equal(typeof syncContractToJob, 'function');
});
