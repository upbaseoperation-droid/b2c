import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSelfChannelPaymentSlip, selfSlipDealCode, SELF_PAYMENT_CATEGORY } from '../src/lib/selfChannelPaymentSlip';
import { createSelfChannelJob, type SelfChannelJob } from '../src/lib/selfChannelBoardRules';
import type { Contributor } from '../src/lib/types';

const plan = { id: 'plan-1', storeName: 'ClubClio_TikTok', brandName: 'ClubClio', month: '2026/10' };

const ctvOf = (over: Partial<Contributor> = {}): Contributor =>
  ({
    id: 'ctv-1',
    code: 'CTV001',
    name: 'CTV Một',
    cccd: '001199012345',
    bankName: 'Techcombank',
    bankAccount: '19036829104018',
    bankAccountName: 'NGUYEN VAN A',
    ...over,
  }) as Contributor;

const acceptedJob = (over: Partial<SelfChannelJob> = {}): SelfChannelJob =>
  createSelfChannelJob(
    {
      code: 'SC-01',
      productName: 'Kem nền',
      contributorId: 'ctv-1',
      contributorName: 'CTV Một',
      ctvConfirmStatus: 'CONFIRMED',
      legalId: '001199012345',
      bankName: 'Techcombank',
      bankAccount: '19036829104018',
      bankHolder: 'NGUYEN VAN A',
      videoQaStatus: 'INTERNAL_QA_PASSED',
      airLink: 'https://www.tiktok.com/@clubclio/video/7300000000000000001',
      airedAt: '2026-10-10',
      acceptanceStatus: 'PASSED',
      feeGross: 3_000_000,
      ...over,
    },
    []
  );

test('phiếu Content kênh: mỗi video một phiếu, thuế TNCN theo từng video', () => {
  const built = buildSelfChannelPaymentSlip({ job: acceptedJob(), plan, ctv: ctvOf() });
  assert.equal(built.canSubmit, true);
  assert.equal(built.larkPaymentCategory, SELF_PAYMENT_CATEGORY);
  assert.equal(built.lineItems.length, 1);
  assert.equal(built.totals.grossTotal, 3_000_000);
  assert.equal(built.totals.pitTax10PctTotal, 300_000);
  assert.equal(built.totals.netTransferTotal, 2_700_000);
  assert.equal(built.lineItems[0].dealCode, selfSlipDealCode(plan, { code: 'SC-01' }));
  assert.equal(built.approvalRoute.hasBookingLeader, true);
});

test('phiếu Content kênh: dưới 2.000.000đ không khấu trừ thuế', () => {
  const built = buildSelfChannelPaymentSlip({ job: acceptedJob({ feeGross: 1_500_000 }), plan, ctv: ctvOf() });
  assert.equal(built.totals.pitTax10PctTotal, 0);
  assert.equal(built.totals.netTransferTotal, 1_500_000);
});

test('phiếu Content kênh: hợp đồng từ 10tr và BBNT từ 20tr tính theo từng video', () => {
  const m12 = buildSelfChannelPaymentSlip({ job: acceptedJob({ feeGross: 12_000_000 }), plan, ctv: ctvOf() });
  assert.ok(m12.allIssues.some(i => i.issue.code === 'MISSING_SIGNED_CONTRACT'));
  assert.ok(!m12.allIssues.some(i => i.issue.code === 'MISSING_SIGNED_BBNT'));

  const withContract = ctvOf({ contractCode: 'HDCTV-01', contractStatus: 'ACTIVE' });
  const ok12 = buildSelfChannelPaymentSlip({ job: acceptedJob({ feeGross: 12_000_000 }), plan, ctv: withContract });
  assert.equal(ok12.canSubmit, true);

  const m21 = buildSelfChannelPaymentSlip({ job: acceptedJob({ feeGross: 21_000_000 }), plan, ctv: withContract });
  assert.ok(m21.allIssues.some(i => i.issue.code === 'MISSING_SIGNED_BBNT'));
  const ok21 = buildSelfChannelPaymentSlip({ job: acceptedJob({ feeGross: 21_000_000, bbntCode: 'BBNT-SC-01' }), plan, ctv: withContract });
  assert.equal(ok21.canSubmit, true);
});

test('phiếu Content kênh: lấy hồ sơ từ Danh bạ CTV, không dùng bản chép cũ trên việc', () => {
  const stale = acceptedJob({ bankAccount: '11111111', bankName: 'Cũ', contractNo: 'HD-CU' });
  const built = buildSelfChannelPaymentSlip({ job: stale, plan, ctv: ctvOf({ bankAccount: '22222222', bankName: 'Mới' }) });
  assert.equal(built.payee.bankAccount, '22222222');
  assert.equal(built.payee.bankName, 'Mới');
});

test('phiếu Content kênh: hợp đồng hết hạn hoặc chưa hiệu lực thì chặn', () => {
  const expired = ctvOf({ contractCode: 'HDCTV-01', contractStatus: 'ACTIVE', contractExpiryDate: '2020-01-01' });
  const a = buildSelfChannelPaymentSlip({ job: acceptedJob({ feeGross: 12_000_000 }), plan, ctv: expired });
  assert.ok(a.allIssues.some(i => i.issue.code === 'CONTRACT_NOT_ACTIVE'));
  const pending = ctvOf({ contractCode: 'HDCTV-01', contractStatus: 'PENDING_SIGN' });
  const b = buildSelfChannelPaymentSlip({ job: acceptedJob({ feeGross: 12_000_000 }), plan, ctv: pending });
  assert.ok(b.allIssues.some(i => i.issue.code === 'CONTRACT_NOT_ACTIVE'));
});

test('phiếu Content kênh: CTV không còn trong danh bạ thì chặn', () => {
  const built = buildSelfChannelPaymentSlip({ job: acceptedJob(), plan });
  assert.ok(built.allIssues.some(i => i.issue.code === 'CTV_NOT_IN_DIRECTORY'));
});

test('phiếu Content kênh: chặn khi chưa nghiệm thu, thiếu tài khoản, CTV chưa nhận việc hoặc đã có phiếu', () => {
  const ctv = ctvOf();
  const notAccepted = buildSelfChannelPaymentSlip({ job: acceptedJob({ acceptanceStatus: 'PENDING' }), plan, ctv });
  assert.ok(notAccepted.allIssues.some(i => i.issue.code === 'NOT_ACCEPTED'));

  const noBank = buildSelfChannelPaymentSlip({ job: acceptedJob({ bankAccount: '' }), plan, ctv: ctvOf({ bankAccount: '' }) });
  assert.ok(noBank.allIssues.some(i => i.issue.code === 'MISSING_BANK_ACCOUNT'));

  const unconfirmed = buildSelfChannelPaymentSlip({ job: acceptedJob({ ctvConfirmStatus: 'ASSIGNED' }), plan, ctv });
  assert.ok(unconfirmed.allIssues.some(i => i.issue.code === 'CTV_NOT_CONFIRMED'));

  const dup = buildSelfChannelPaymentSlip({ job: acceptedJob(), plan, ctv, ledger: { advanceRequestedAmount: 0, settlementRequested: true } });
  assert.ok(dup.allIssues.some(i => i.issue.code === 'SETTLEMENT_ALREADY_REQUESTED'));

  const inhouse = buildSelfChannelPaymentSlip({ job: acceptedJob({ productionMode: 'INHOUSE', feeGross: 0, contributorId: undefined }), plan });
  assert.ok(inhouse.allIssues.some(i => i.issue.code === 'FOC_ZERO_COST'));

  const shortLink = buildSelfChannelPaymentSlip({ job: acceptedJob({ airLink: 'https://vt.tiktok.com/abc' }), plan, ctv });
  assert.ok(shortLink.allIssues.some(i => i.issue.code === 'INVALID_AIR_LINK'));
});

test('gian Shopee không có Trưởng nhóm thì tuyến duyệt đi thẳng Giám đốc MKT', () => {
  const built = buildSelfChannelPaymentSlip({ job: acceptedJob(), plan: { ...plan, storeName: 'Abc_Shopee', brandName: 'Abc' }, ctv: ctvOf() });
  assert.equal(built.approvalRoute.hasBookingLeader, false);
});
