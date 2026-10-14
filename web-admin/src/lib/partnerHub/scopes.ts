import { createHash } from 'node:crypto';
import { INITIAL_BRAND_PORTAL_DATA, INITIAL_KOCS, INITIAL_DEALS } from '../mockData';
import { INITIAL_CONTRIBUTORS, INITIAL_SELF_CHANNEL_TASKS } from '../selfChannelData';
import type { HubScope } from './types';
import { requireHub } from './domain';

// Resolve membership from the server-owned catalog, never from request metadata.
// Replace this adapter with the canonical job repository when jobs leave the prototype catalog.
export function hubScopes(): Array<HubScope & { root: string }> {
  const scopes: Array<HubScope & { root: string }> = [];
  for (const portal of INITIAL_BRAND_PORTAL_DATA) {
    const base = { partnerType: 'BRAND' as const, partnerId: portal.brandId, brandIds: [portal.brandId, portal.brandName], staffNames: [portal.accountPic, portal.bookingPic], root: `brand:${portal.id}` };
    scopes.push({ ...base, key: base.root, title: `Trao đổi chung · ${portal.campaignTitle}` });
    for (const candidate of portal.kocCandidates) {
      scopes.push({ ...base, key: `candidate:${portal.id}:${candidate.id}`, title: `Duyệt KOC · ${candidate.stageName}`,
        proposalVersion: createHash('sha256').update(JSON.stringify({ campaign: portal.campaignCode, candidate })).digest('hex').slice(0, 20),
        initialDecision: candidate.brandApprovalStatus === 'ĐÃ_DUYỆT' ? 'APPROVED' : candidate.brandApprovalStatus === 'TỪ_CHỐI' ? 'REJECTED' : 'PENDING' });
    }
  }
  for (const koc of INITIAL_KOCS) {
    const base = { partnerType: 'KOC' as const, partnerId: koc.id, brandIds: [koc.brandName || ''].filter(Boolean), staffNames: [koc.bookingPic || ''].filter(Boolean), root: `koc:${koc.id}` };
    scopes.push({ ...base, key: base.root, title: `Trao đổi · ${koc.stageName}` });
    for (const deal of INITIAL_DEALS.filter(d => d.kocId === koc.id)) scopes.push({ ...base, key: `deal:${deal.id}`, title: `${deal.dealCode} · ${koc.stageName}` });
  }
  for (const ctv of INITIAL_CONTRIBUTORS) {
    const base = { partnerType: 'CTV' as const, partnerId: ctv.id, brandIds: [] as string[], staffNames: [ctv.contentPic, ctv.partnershipPic].filter((x): x is string => !!x), root: `ctv:${ctv.id}` };
    scopes.push({ ...base, key: base.root, title: `Trao đổi · ${ctv.name}` });
    for (const task of INITIAL_SELF_CHANNEL_TASKS.filter(t => t.contributorId === ctv.id)) scopes.push({ ...base, key: `task:${task.id}`, brandIds: [task.brandId, task.brandName], staffNames: [...base.staffNames, task.contentPic || ''].filter(Boolean), title: `${task.id} · ${ctv.name}` });
  }
  return scopes;
}
export function resolveScope(key: string) {
  const scope = hubScopes().find(s => s.key === key);
  requireHub(scope, 'Chưa có hồ sơ trao đổi cho công việc này.', 404);
  return scope;
}
