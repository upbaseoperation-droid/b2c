import { createHash } from 'node:crypto';
import { INITIAL_BRAND_PORTAL_DATA, INITIAL_KOCS, INITIAL_DEALS } from '../mockData';
import { INITIAL_CONTRIBUTORS, INITIAL_SELF_CHANNEL_TASKS } from '../selfChannelData';
import type { HubScope } from './types';
import { requireHub } from './domain';

// Cache danh mục scopes và Map tra cứu theo key để tối ưu hiệu năng O(1), tránh quét lặp hàng vạn bản ghi trên mỗi request
let cachedScopes: Array<HubScope & { root: string }> | null = null;
let cachedScopesByKey: Map<string, HubScope & { root: string }> | null = null;

function buildHubScopes(): { scopes: Array<HubScope & { root: string }>; byKey: Map<string, HubScope & { root: string }> } {
  const scopes: Array<HubScope & { root: string }> = [];
  const byKey = new Map<string, HubScope & { root: string }>();

  for (const portal of INITIAL_BRAND_PORTAL_DATA) {
    const base = { partnerType: 'BRAND' as const, partnerId: portal.brandId, brandIds: [portal.brandId, portal.brandName], staffNames: [portal.accountPic, portal.bookingPic], root: `brand:${portal.id}` };
    const rootScope = { ...base, key: base.root, title: `Trao đổi chung · ${portal.campaignTitle}` };
    scopes.push(rootScope);
    byKey.set(rootScope.key, rootScope);

    for (const candidate of portal.kocCandidates) {
      const candidateScope = {
        ...base,
        key: `candidate:${portal.id}:${candidate.id}`,
        title: `Duyệt KOC · ${candidate.stageName}`,
        proposalVersion: createHash('sha256').update(JSON.stringify({ campaign: portal.campaignCode, candidate })).digest('hex').slice(0, 20),
        initialDecision: candidate.brandApprovalStatus === 'ĐÃ_DUYỆT' ? ('APPROVED' as const) : candidate.brandApprovalStatus === 'TỪ_CHỐI' ? ('REJECTED' as const) : ('PENDING' as const),
      };
      scopes.push(candidateScope);
      byKey.set(candidateScope.key, candidateScope);
    }
  }

  // Tiền xử lý Map deals theo kocId để loại bỏ vòng lặp lồng O(N*M)
  const dealsByKoc = new Map<string, typeof INITIAL_DEALS>();
  for (const deal of INITIAL_DEALS) {
    const list = dealsByKoc.get(deal.kocId);
    if (list) list.push(deal);
    else dealsByKoc.set(deal.kocId, [deal]);
  }

  for (const koc of INITIAL_KOCS) {
    const base = { partnerType: 'KOC' as const, partnerId: koc.id, brandIds: [koc.brandName || ''].filter(Boolean), staffNames: [koc.bookingPic || ''].filter(Boolean), root: `koc:${koc.id}` };
    const rootScope = { ...base, key: base.root, title: `Trao đổi · ${koc.stageName}` };
    scopes.push(rootScope);
    byKey.set(rootScope.key, rootScope);

    const kocDeals = dealsByKoc.get(koc.id) || [];
    for (const deal of kocDeals) {
      const dealScope = { ...base, key: `deal:${deal.id}`, title: `${deal.dealCode} · ${koc.stageName}` };
      scopes.push(dealScope);
      byKey.set(dealScope.key, dealScope);
    }
  }

  // Tiền xử lý Map self-channel tasks theo contributorId
  const tasksByCtv = new Map<string, typeof INITIAL_SELF_CHANNEL_TASKS>();
  for (const task of INITIAL_SELF_CHANNEL_TASKS) {
    if (!task.contributorId) continue;
    const list = tasksByCtv.get(task.contributorId);
    if (list) list.push(task);
    else tasksByCtv.set(task.contributorId, [task]);
  }

  for (const ctv of INITIAL_CONTRIBUTORS) {
    const base = { partnerType: 'CTV' as const, partnerId: ctv.id, brandIds: [] as string[], staffNames: [ctv.contentPic, ctv.partnershipPic].filter((x): x is string => !!x), root: `ctv:${ctv.id}` };
    const rootScope = { ...base, key: base.root, title: `Trao đổi · ${ctv.name}` };
    scopes.push(rootScope);
    byKey.set(rootScope.key, rootScope);

    const ctvTasks = tasksByCtv.get(ctv.id) || [];
    for (const task of ctvTasks) {
      const taskScope = { ...base, key: `task:${task.id}`, brandIds: [task.brandId, task.brandName], staffNames: [...base.staffNames, task.contentPic || ''].filter(Boolean), title: `${task.id} · ${ctv.name}` };
      scopes.push(taskScope);
      byKey.set(taskScope.key, taskScope);
    }
  }

  return { scopes, byKey };
}

function getOrBuildCatalog() {
  if (!cachedScopes || !cachedScopesByKey) {
    const built = buildHubScopes();
    cachedScopes = built.scopes;
    cachedScopesByKey = built.byKey;
  }
  return { scopes: cachedScopes, byKey: cachedScopesByKey };
}

// Resolve membership from the server-owned catalog, never from request metadata.
// Replace this adapter with the canonical job repository when jobs leave the prototype catalog.
export function hubScopes(): Array<HubScope & { root: string }> {
  return getOrBuildCatalog().scopes;
}

export function resolveScope(key: string) {
  const scope = getOrBuildCatalog().byKey.get(key);
  requireHub(scope, 'Chưa có hồ sơ trao đổi cho công việc này.', 404);
  return scope;
}
