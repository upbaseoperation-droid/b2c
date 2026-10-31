'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button, Field, Input, Status } from '../../ui';
import { formatNumber } from '../../../lib/format';
import type { SelfAirCheck } from '../../../lib/selfChannelBoardRules';

type Notify = (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
type HandleKey = 'tiktok' | 'shopee' | 'facebook' | 'instagram' | 'youtube';

const HANDLE_LABEL: Record<HandleKey, string> = {
  tiktok: 'TikTok',
  youtube: 'YouTube',
  facebook: 'Facebook',
  instagram: 'Instagram',
  shopee: 'Shopee Video',
};

const VERDICT: Record<SelfAirCheck['verdict'], { label: string; tone: 'positive' | 'warning' | 'critical' }> = {
  PASS: { label: 'Link đạt', tone: 'positive' },
  REVIEW: { label: 'Cần xem lại', tone: 'warning' },
  FAIL: { label: 'Không đạt', tone: 'critical' },
};

/** Kết quả kiểm link đăng: đúng kênh Brand, bài còn hiển thị; ảnh bìa dùng làm ảnh nghiệm thu. */
export function AirCheckResult({ check, currentLink }: { check?: SelfAirCheck; currentLink: string }) {
  if (!check) return <span className="text-xs text-ink-3">Chưa kiểm link đăng.</span>;
  const stale = check.checkedLink !== currentLink.trim();
  return (
    <div className="flex gap-3 items-start">
      {check.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- ảnh bìa từ CDN nền tảng, không qua bộ tối ưu ảnh
        <img src={check.coverUrl} alt="Ảnh bìa video đã đăng" className="h-24 w-16 rounded object-cover border border-line" />
      )}
      <div className="space-y-1 text-xs min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Status tone={stale ? 'warning' : VERDICT[check.verdict].tone}>{stale ? 'Link đã đổi, kiểm lại' : VERDICT[check.verdict].label}</Status>
          <span className="text-ink-3">
            Kênh đăng: <span className="text-ink">{check.authorHandle ? `@${check.authorHandle}` : '—'}</span>
            {check.expectedHandle && <> · Kênh Brand: <span className="text-ink">@{check.expectedHandle}</span></>}
            {typeof check.views === 'number' && <> · {formatNumber(check.views)} lượt xem</>}
          </span>
        </div>
        {check.issues.length > 0 && (
          <ul className="list-disc pl-4 text-ink-2 space-y-0.5">
            {check.issues.map(i => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        )}
        <div className="text-2xs text-ink-3">
          Kiểm lúc {new Date(check.checkedAt).toLocaleString('vi-VN')} bởi {check.checkedBy}
        </div>
      </div>
    </div>
  );
}

/** Kênh của Brand theo nền tảng (lưu ở Dữ liệu gốc của gian), dùng để kiểm video đăng đúng kênh. */
export function BrandChannelHandlesBar({ planId, onNotify }: { planId: string; onNotify?: Notify }) {
  const [state, setState] = useState<{ storeId: string | null; storeName: string; handles: Partial<Record<HandleKey, string>>; canEdit: boolean } | null>(null);
  const [draft, setDraft] = useState<Partial<Record<HandleKey, string>> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/self-channel-board/air-check?planId=${encodeURIComponent(planId)}`, { cache: 'no-store' }).catch(() => null);
    const body = res ? await res.json().catch(() => null) : null;
    setState(res?.ok && body ? body : null);
  }, [planId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  if (!state) return null;
  const filled = (Object.keys(HANDLE_LABEL) as HandleKey[]).filter(k => state.handles[k]?.trim());

  const save = async () => {
    if (!draft || !state.storeId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/master-data', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: state.storeId, assignment: { selfChannelHandles: draft } }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        onNotify?.(body?.error || 'Không lưu được kênh Brand.', 'error');
        return;
      }
      onNotify?.(`Đã lưu kênh Brand của ${state.storeName}.`, 'success');
      setDraft(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-ink">Kênh Brand ({state.storeName}):</span>
        {filled.length === 0 ? (
          <span className="text-warning">Chưa khai báo, nên chưa kiểm được video đăng đúng kênh.</span>
        ) : (
          filled.map(k => (
            <Status key={k} tone="neutral">
              {HANDLE_LABEL[k]}: {state.handles[k]}
            </Status>
          ))
        )}
        {state.canEdit && !draft && (
          <Button size="sm" variant="ghost" onClick={() => setDraft({ ...state.handles })}>
            Sửa
          </Button>
        )}
      </div>
      {draft && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
          {(Object.keys(HANDLE_LABEL) as HandleKey[]).map(k => (
            <Field key={k} label={HANDLE_LABEL[k]}>
              <Input value={draft[k] || ''} onChange={e => setDraft({ ...draft, [k]: e.target.value })} placeholder="@kenh hoặc link kênh" />
            </Field>
          ))}
          <div className="flex gap-2 md:col-span-5 justify-end">
            <Button size="sm" variant="secondary" onClick={() => setDraft(null)} disabled={saving}>
              Hủy
            </Button>
            <Button size="sm" variant="primary" onClick={save} disabled={saving}>
              {saving ? 'Đang lưu…' : 'Lưu kênh Brand'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
