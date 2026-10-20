'use client';
import type { AccessPolicy } from './server/accessPolicy';
import { hydrateRbacPolicy } from './rbacData';
import { clearBrandProfilesCache } from './brands/useBrandProfiles';

let actorScope = '';
let inflightPolicyPromise: Promise<{ revision: number; data: AccessPolicy; user: import('./types').UserProfile }> | null = null;

function buildActorScopeKey(user: import('./types').UserProfile | null | undefined): string {
  if (!user) return '';
  return `${user.id}|${user.role}|${(user.assignedBrands || []).join(',')}|${user.linkedEntityName || ''}`;
}

export async function loadAccessPolicy() {
  if (inflightPolicyPromise) return inflightPolicyPromise;
  inflightPolicyPromise = fetch('/api/admin/access-policy', { cache: 'no-store' })
    .then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Không tải được quyền.');
      const nextScope = buildActorScopeKey(body.user);
      if (actorScope && nextScope && nextScope !== actorScope) {
        clearBrandProfilesCache();
      }
      if (nextScope) {
        actorScope = nextScope;
      }
      hydrateRbacPolicy(body.data, body.user);
      return body as { revision: number; data: AccessPolicy; user: import('./types').UserProfile };
    })
    .finally(() => {
      inflightPolicyPromise = null;
    });
  return inflightPolicyPromise;
}
export async function saveAccessPolicy(revision: number, data: AccessPolicy) {
  const response = await fetch('/api/admin/access-policy', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision, data }) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Không lưu được quyền.');
  hydrateRbacPolicy(body.data);
  return body as { revision: number; data: AccessPolicy };
}
