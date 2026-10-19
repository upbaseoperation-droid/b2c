import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateContractTax,
  evaluateContractRules,
  numberToVietnameseWords,
} from '../src/lib/contracts/contractRules';

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
