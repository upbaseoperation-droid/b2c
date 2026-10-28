'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Contributor } from './types';
import type { CtvDirectoryAccess, PartnershipStaffEntry } from './ctvDirectory';

const NO_ACCESS: CtvDirectoryAccess = { canEdit: false, canManagePartnership: false, canSeeSensitive: false };

interface DirectoryResponse {
  contributors?: Contributor[];
  partnershipStaff?: PartnershipStaffEntry[];
  access?: CtvDirectoryAccess;
  error?: string;
}

/** Danh bạ CTV dùng chung lưu trên máy chủ. Mỗi thao tác gửi một CTV; lỗi thì tải lại bản máy chủ và báo lỗi. */
export function useCtvDirectory(enabled: boolean, onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void) {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [partnershipStaff, setPartnershipStaff] = useState<PartnershipStaffEntry[]>([]);
  const [access, setAccess] = useState<CtvDirectoryAccess>(NO_ACCESS);
  const [loaded, setLoaded] = useState(false);

  const apply = (body: DirectoryResponse) => {
    if (Array.isArray(body.contributors)) setContributors(body.contributors);
    if (Array.isArray(body.partnershipStaff)) setPartnershipStaff(body.partnershipStaff);
    if (body.access) setAccess(body.access);
  };

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/contributors', { cache: 'no-store' });
      const body = (await res.json().catch(() => ({}))) as DirectoryResponse;
      if (res.ok) apply(body);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  const send = useCallback(
    async (payload: Record<string, unknown>): Promise<boolean> => {
      try {
        const res = await fetch('/api/contributors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = (await res.json().catch(() => ({}))) as DirectoryResponse;
        if (!res.ok) {
          onNotify?.(body.error || 'Không lưu được danh bạ CTV.', 'error');
          await reload();
          return false;
        }
        apply(body);
        return true;
      } catch {
        onNotify?.('Lỗi mạng khi lưu danh bạ CTV.', 'error');
        await reload();
        return false;
      }
    },
    [onNotify, reload]
  );

  const upsert = useCallback((contributor: Contributor) => send({ op: 'upsert', contributor }), [send]);
  const remove = useCallback((id: string) => send({ op: 'delete', id }), [send]);
  const savePartnershipStaff = useCallback((staff: PartnershipStaffEntry[]) => send({ op: 'setPartnershipStaff', staff }), [send]);

  return { contributors, partnershipStaff, access, loaded, reload, upsert, remove, savePartnershipStaff };
}
