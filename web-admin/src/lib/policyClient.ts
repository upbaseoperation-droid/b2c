'use client';
import type { AccessPolicy } from './server/accessPolicy';
import { hydrateRbacPolicy } from './rbacData';

export async function loadAccessPolicy() {
  const response = await fetch('/api/admin/access-policy', { cache: 'no-store' });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Không tải được quyền.');
  hydrateRbacPolicy(body.data);
  return body as { revision: number; data: AccessPolicy; user: import('./types').UserProfile };
}
export async function saveAccessPolicy(revision: number, data: AccessPolicy) {
  const response = await fetch('/api/admin/access-policy', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision, data }) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Không lưu được quyền.');
  hydrateRbacPolicy(body.data);
  return body as { revision: number; data: AccessPolicy };
}
