import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateAndRankKocs,
  computeMissingPlanQuotas,
  autoPickKocsForMissingQuotas,
} from '../src/lib/kocRecommendationEngine';
import { INITIAL_STORE_PORTFOLIOS, INITIAL_KOCS, INITIAL_DEALS } from '../src/lib/mockData';

test('evaluateAndRankKocs: tính điểm 4 trụ cột trên thang 100 và phân loại 4 nhóm đề xuất', () => {
  const store = INITIAL_STORE_PORTFOLIOS[0];
  const results = evaluateAndRankKocs({
    store,
    kocs: INITIAL_KOCS,
    deals: INITIAL_DEALS,
    currentUserName: store.b2cOwnerName,
  });

  assert.ok(results.length > 0, 'Phải trả về danh sách KOC đề xuất');

  for (const r of results) {
    assert.ok(r.matchPercent >= 15 && r.matchPercent <= 100, 'Tổng điểm phải nằm trong [15, 100]');
    assert.ok(
      r.scoreBreakdown.perfTotal >= 0 && r.scoreBreakdown.perfTotal <= 35,
      'Trụ cột Hiệu quả phải nằm trong [0, 35]'
    );
    assert.ok(
      r.scoreBreakdown.fitTotal >= 0 && r.scoreBreakdown.fitTotal <= 25,
      'Trụ cột Độ khớp phải nằm trong [0, 25]'
    );
    assert.ok(
      r.scoreBreakdown.costTotal >= 0 && r.scoreBreakdown.costTotal <= 20,
      'Trụ cột Ngân sách phải nằm trong [0, 20]'
    );
    assert.ok(
      r.scoreBreakdown.opsTotal >= 0 && r.scoreBreakdown.opsTotal <= 20,
      'Trụ cột Vận hành phải nằm trong [0, 20]'
    );
    assert.ok(r.evidenceTags.length > 0, 'Mỗi KOC phải có dẫn chứng lý do đề xuất');
  }

  for (let i = 1; i < results.length; i++) {
    assert.ok(
      results[i - 1].matchPercent >= results[i].matchPercent,
      'Danh sách phải được sắp xếp giảm dần theo tổng điểm'
    );
  }
});

test('evaluateAndRankKocs: Bộ lọc cứng HF-01 loại trừ KOC từng bị Brand từ chối', () => {
  const store = INITIAL_STORE_PORTFOLIOS[0];
  const rejectedKoc = {
    ...INITIAL_KOCS[0],
    id: 'koc-test-rejected',
    channelId: 'rejected_creator_test',
    brandName: store.brandName,
    brandApprovalStatus: 'TỪ_CHỐI' as const,
  };

  const withExclusion = evaluateAndRankKocs({
    store,
    kocs: [rejectedKoc],
    deals: [],
    excludeBrandRejected: true,
  });
  assert.equal(withExclusion.length, 0, 'KOC bị Brand từ chối phải bị loại bỏ khi bật HF-01');
});

test('computeMissingPlanQuotas & autoPickKocsForMissingQuotas: Tự động nhặt đúng định mức KL thiếu', () => {
  const store = INITIAL_STORE_PORTFOLIOS[0];
  const mockPlan = {
    id: 'PLAN-TEST-10',
    storeId: store.id,
    storeName: store.storeName,
    brandName: store.brandName,
    month: '2026/10',
    pic: store.b2cOwnerName,
    items: [
      {
        id: 'row-kl2',
        channel: 'TIKTOK' as const,
        category: 'KOC_TIER' as const,
        tierCode: 'KL2',
        salaryGrade: 'KL2' as const,
        qty: 2,
        unitCost: 1_000_000,
        totalBudget: 2_000_000,
      },
    ],
  };

  const quotas = computeMissingPlanQuotas(mockPlan as never, [], store.storeName);
  const kl2Quota = quotas.find((q) => q.grade === 'KL2');
  assert.ok(kl2Quota);
  assert.equal(kl2Quota.missingQty, 2);

  const ranked = evaluateAndRankKocs({
    store,
    kocs: INITIAL_KOCS,
    deals: INITIAL_DEALS,
    activePlan: mockPlan as never,
  });

  const { pickedIds } = autoPickKocsForMissingQuotas(ranked, quotas, [], store.storeName);
  assert.ok(pickedIds.length > 0, 'Phải tự động nhặt được KOC cho định mức thiếu');
});
