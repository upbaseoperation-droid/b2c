import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateContractTax,
  evaluateContractRules,
  numberToVietnameseWords,
} from '../src/lib/contracts/contractRules';
import {
  evaluateLegalProfileSigningHistory,
  resolveContractLegalAttachments,
} from '../src/lib/contracts/legalProfileHistory';
import type { ContractRecord } from '../src/lib/contracts/types';

test('Tax calculation: TNCN 10% for individual >= 2M, VAT for company', () => {
  // Case 1: Individual net 10M -> Gross is round(10M / 0.9) = 11,111,111
  const pitOver = calculateContractTax({ subjectKind: 'IND', baseAmount: 10_000_000, isNetPayment: true });
  assert.equal(pitOver.pitDeductionRate, 0.1);
  assert.equal(pitOver.netAmountToReceive, 10_000_000);
  assert.equal(pitOver.grossTotalContract, 11_111_111);
  assert.equal(pitOver.pitDeductionAmount, 1_111_111);

  // Case 2: Individual gross 10M -> Net payout = 9M
  const pitGross = calculateContractTax({ subjectKind: 'IND', baseAmount: 10_000_000, isNetPayment: false });
  assert.equal(pitGross.pitDeductionRate, 0.1);
  assert.equal(pitGross.pitDeductionAmount, 1_000_000);
  assert.equal(pitGross.netAmountToReceive, 9_000_000);

  // Case 3: Individual < 2M -> No PIT withholding
  const pitUnder = calculateContractTax({ subjectKind: 'IND', baseAmount: 1_500_000 });
  assert.equal(pitUnder.pitDeductionRate, 0);
  assert.equal(pitUnder.pitDeductionAmount, 0);
  assert.equal(pitUnder.netAmountToReceive, 1_500_000);

  // Case 4: Company with 10% VAT
  const comTax = calculateContractTax({ subjectKind: 'COM', baseAmount: 20_000_000, vatRatePercent: 10 });
  assert.equal(comTax.vatRate, 0.1);
  assert.equal(comTax.vatAmount, 2_000_000);
  assert.equal(comTax.grossTotalContract, 22_000_000);
});

test('BR-01: Under 50M requires UpBase template, >= 50M allows KOC form', () => {
  const under50M = evaluateContractRules({
    totalValue: 30_000_000,
    isKolForm: false,
  });
  assert.equal(under50M.isHighValueKoc, false);
  assert.equal(under50M.templateCompliance.useKolTemplateAllowed, false);
  assert.equal(under50M.templateCompliance.requiresUpbaseExceptionApproval, false);

  const under50MWithKocForm = evaluateContractRules({
    totalValue: 30_000_000,
    isKolForm: true,
  });
  assert.equal(under50MWithKocForm.isHighValueKoc, false);
  assert.equal(under50MWithKocForm.templateCompliance.requiresUpbaseExceptionApproval, true);

  const over50M = evaluateContractRules({
    totalValue: 80_000_000,
    isKolForm: true,
  });
  assert.equal(over50M.isHighValueKoc, true);
  assert.equal(over50M.templateCompliance.useKolTemplateAllowed, true);
});

test('BR-03: Contract signing mandatory conditions', () => {
  // Individual with small advance and small total: optional contract
  const smallInd = evaluateContractRules({
    totalValue: 5_000_000,
    advanceAmount: 1_000_000,
  });
  assert.equal(smallInd.isContractMandatory, false);

  // Advance >= 2M makes contract mandatory
  const advanceInd = evaluateContractRules({
    totalValue: 8_000_000,
    advanceAmount: 2_500_000,
  });
  assert.equal(advanceInd.isContractMandatory, true);

  // Total >= 10M makes contract mandatory
  const totalInd = evaluateContractRules({
    totalValue: 15_000_000,
    advanceAmount: 0,
  });
  assert.equal(totalInd.isContractMandatory, true);

  // Company is 100% mandatory even for small amounts
  const companyDeal = evaluateContractRules({
    koc: {
      id: 'k2', stageName: 'Creator B', legalType: 'COMPANY', channelId: '@creator',
      category: 'BEAUTY', followerCount: 100000, engagementRate: 5,
    },
    totalValue: 3_000_000,
    advanceAmount: 0,
  });
  assert.equal(companyDeal.subjectKind, 'COM');
  assert.equal(companyDeal.isContractMandatory, true);
});

test('BR-04: Acceptance liquidation mandatory conditions', () => {
  // Total >= 20M: mandatory BBNT
  const bigAcceptance = evaluateContractRules({
    totalValue: 25_000_000,
    actualSettledValue: 25_000_000,
  });
  assert.equal(bigAcceptance.isAcceptanceMandatory, true);

  // Discrepancy between settled and total: mandatory BBNT
  const varianceAcceptance = evaluateContractRules({
    totalValue: 10_000_000,
    actualSettledValue: 9_000_000,
  });
  assert.equal(varianceAcceptance.isAcceptanceMandatory, true);

  // Equal and < 20M: auto liquidation
  const smallEqual = evaluateContractRules({
    totalValue: 15_000_000,
    actualSettledValue: 15_000_000,
  });
  assert.equal(smallEqual.isAcceptanceMandatory, false);
});

test('Number to Vietnamese words conversion', () => {
  assert.equal(numberToVietnameseWords(0), 'Không đồng');
  assert.equal(numberToVietnameseWords(10_000_000), 'Mười triệu đồng');
  assert.equal(numberToVietnameseWords(55_500_000), 'Năm mươi lăm triệu năm trăm nghìn đồng');
});

test('Gợi ý Kế toán: Đối chiếu lịch sử ký theo Hồ sơ pháp lý của KOC & kế thừa CCCD/ĐKKD (RULE-SYNC-01)', () => {
  const now = new Date().toISOString();
  const baseSignedRecord: ContractRecord = {
    id: 'CTR-SIGNED-01',
    title: 'Hợp đồng nguyên tắc · Chanh Beauty · Kutieskin',
    brand: 'Kutieskin',
    partner: 'Đặng Mai Phương (Chanh Beauty)',
    templateId: 'IND-HDNT',
    templateHash: 'hash-1',
    kocId: 'koc-1',
    ownerId: 'u-1',
    ownerName: 'Chuyên viên A',
    version: 1,
    revision: 1,
    approval: 'APPROVED',
    legalAttachments: [
      {
        id: 'doc-1',
        docType: 'CCCD_FRONT',
        label: 'CCCD mặt trước',
        fileKey: 'legal-docs/chanh-beauty/2026-10/0001-cccd.svg',
        fileName: 'cccd-mat-truoc.svg',
        fileSize: 120000,
        mimeType: 'image/svg+xml',
        storage: 'R2',
        url: '/api/contracts/legal-docs?key=legal-docs%2Fchanh-beauty%2F2026-10%2F0001-cccd.svg',
        uploadedAt: now,
      },
    ],
    steps: [
      {
        role: 'FINANCE',
        reviewerId: 'fin-1',
        reviewerName: 'Lê Thị Thu Hà',
        version: 1,
        status: 'APPROVED',
        decidedAt: now,
      },
    ],
    values: {
      'src:cccd': '001198012345',
      'src:taxCode': '8451239876',
      'src:bankAccount': '19036789123456',
      'src:bankName': 'Techcombank',
    },
    versions: [],
    signing: [
      {
        documentId: 'ws-01',
        version: 1,
        provider: 'DEMO',
        status: 'COMPLETED',
        sourceStatus: 2,
        linkedBy: 'u-1',
        linkedAt: now,
        syncedAt: now,
        evidenceConfirmedBy: 'fin-1',
        evidenceHash: 'h-1',
        people: [],
      },
    ],
    checks: [],
    createdAt: now,
    updatedAt: now,
    history: [],
  };

  const pendingSameProfile: ContractRecord = {
    ...baseSignedRecord,
    id: 'CTR-PENDING-02',
    title: 'Phụ lục SOW Đợt 2 · Chanh Beauty · Kutieskin',
    templateId: 'IND-SOW',
    approval: 'IN_REVIEW',
    legalAttachments: undefined,
    signing: [],
    steps: [
      {
        role: 'FINANCE',
        reviewerId: 'fin-1',
        reviewerName: 'Lê Thị Thu Hà',
        version: 1,
        status: 'PENDING',
      },
    ],
  };

  const pendingChangedBank: ContractRecord = {
    ...pendingSameProfile,
    id: 'CTR-PENDING-03',
    values: {
      ...pendingSameProfile.values,
      'src:bankAccount': '99998888777766',
      'src:bankName': 'Vietcombank',
    },
  };

  const pendingFirstTime: ContractRecord = {
    ...pendingSameProfile,
    id: 'CTR-PENDING-04',
    kocId: 'koc-new-99',
    partner: 'Nguyễn Ngọc Ánh',
    values: {
      'src:cccd': '079200001122',
      'src:bankAccount': '1029384756',
      'src:bankName': 'MBBank',
    },
  };

  const allRecords = [
    baseSignedRecord,
    pendingSameProfile,
    pendingChangedBank,
    pendingFirstTime,
  ];

  const verifiedHist = evaluateLegalProfileSigningHistory(pendingSameProfile, allRecords);
  assert.equal(verifiedHist.status, 'SIGNED_VERIFIED');
  assert.equal(verifiedHist.isSkipDeepCheckEligible, true);
  assert.equal(verifiedHist.signedCount, 1);
  assert.equal(verifiedHist.latestMatch?.id, 'CTR-SIGNED-01');

  const inheritedDocs = resolveContractLegalAttachments(pendingSameProfile, undefined, undefined, allRecords);
  assert.equal(inheritedDocs.length, 1);
  assert.equal(inheritedDocs[0].docType, 'CCCD_FRONT');

  const changedHist = evaluateLegalProfileSigningHistory(pendingChangedBank, allRecords);
  assert.equal(changedHist.status, 'PROFILE_CHANGED');
  assert.equal(changedHist.isSkipDeepCheckEligible, false);
  assert.ok(changedHist.changedFields.some(f => f.includes('Số tài khoản')));

  const firstTimeHist = evaluateLegalProfileSigningHistory(pendingFirstTime, allRecords);
  assert.equal(firstTimeHist.status, 'FIRST_TIME');
  assert.equal(firstTimeHist.isSkipDeepCheckEligible, false);
});
