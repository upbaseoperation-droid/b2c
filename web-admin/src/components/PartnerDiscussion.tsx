'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DECISION_LABELS, KIND_LABELS, type Decision, type EntryInput, type EntryKind, type HubEntry, type ThreadResponse } from '../lib/partnerHub/types';
import { mergeLatest } from '../lib/partnerHub/client';

export interface DiscussionRoom {
  key: string;
  title: string;
  revision: number;
  decision?: Decision;
  proposalVersion?: string;
  lastEntry?: HubEntry;
}
interface Props {
  root?: string;
  family: 'BRAND' | 'KOC' | 'CTV';
  actorId: string;
  initialRoom?: string;
  onRooms?: (rooms: DiscussionRoom[]) => void;
  renderContext?: (key: string) => React.ReactNode;
}
async function responseJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw Object.assign(new Error(body.error || 'Không thể kết nối. Vui lòng thử lại.'), { status: response.status });
  return body;
}
const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900';
const buttonClass = 'rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50';

export function PartnerDiscussion(props: Props) {
  return <DiscussionWorkspace key={`${props.actorId}:${props.root || props.family}:${props.initialRoom || ''}`} {...props} />;
}
function DiscussionWorkspace({ root, family, actorId, initialRoom, onRooms, renderContext }: Props) {
  const [rooms, setRooms] = useState<DiscussionRoom[]>([]);
  const [selected, setSelected] = useState(initialRoom || '');
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [read, setRead] = useState<Record<string, number>>(() => {
    try { return typeof window === 'undefined' ? {} : JSON.parse(localStorage.getItem(`hub-read:${actorId}`) || '{}'); } catch { return {}; }
  });
  const onRoomsRef = useRef(onRooms);
  useEffect(() => { onRoomsRef.current = onRooms; }, [onRooms]);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const qs = new URLSearchParams({ family });
      if (root) qs.set('root', root);
      const data = await responseJson<{ rooms: DiscussionRoom[] }>(await fetch(`/api/partner-hub?${qs}`, { cache: 'no-store', signal }));
      if (signal?.aborted) return;
      setRooms(data.rooms); setError(''); setLoaded(true);
      setSelected(prev => data.rooms.some(r => r.key === prev) ? prev : data.rooms[0]?.key || '');
      onRoomsRef.current?.(data.rooms);
    } catch (e) { if (!signal?.aborted) { setError((e as Error).message); setLoaded(true); if ([401, 403].includes((e as { status?: number }).status || 0)) setRooms([]); } }
  }, [family, root]);
  useEffect(() => {
    const controller = new AbortController();
    // Initial fetch updates state after the network response, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh(controller.signal);
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh(controller.signal); }, 15000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [refresh]);
  const markRead = useCallback((key: string, revision: number) => {
    setRead(previous => {
      if (previous[key] === revision) return previous;
      const next = { ...previous, [key]: revision };
      try { localStorage.setItem(`hub-read:${actorId}`, JSON.stringify(next)); } catch { /* Storage may be disabled. */ }
      return next;
    });
  }, [actorId]);
  return <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-4" aria-label="Trao đổi và ý kiến">
    <div><h3 className="font-semibold text-slate-900">Trao đổi &amp; ý kiến</h3></div>
    {error && <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error} <button type="button" className="underline" onClick={() => void refresh()}>Thử lại</button></div>}
    {!loaded && <p role="status" className="text-sm text-slate-500">Đang tải cuộc trao đổi…</p>}
    {loaded && !error && !rooms.length && <p className="text-sm text-slate-500">Chưa có cuộc trao đổi được phân công cho bạn trong phạm vi này.</p>}
    {!!rooms.length && <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <nav aria-label="Danh sách cuộc trao đổi" className="max-h-[620px] space-y-2 overflow-y-auto">
        {rooms.map(room => <button key={room.key} type="button" onClick={() => setSelected(room.key)} aria-pressed={selected === room.key} className={`w-full rounded-lg border p-3 text-left text-sm ${selected === room.key ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
          <span className="block font-medium text-slate-900">{room.title}</span>
          {room.decision && <span className="mt-1 block text-xs text-blue-700">{DECISION_LABELS[room.decision]}</span>}
          {room.revision > (read[room.key] || 0) && <span className="text-xs font-semibold text-amber-700">Có phản hồi mới</span>}
          {room.lastEntry && <span className="mt-1 line-clamp-2 block text-xs text-slate-500">{room.lastEntry.authorName}: {room.lastEntry.content || KIND_LABELS[room.lastEntry.kind]}</span>}
        </button>)}
      </nav>
      {selected && <div className="min-w-0 space-y-3">{renderContext?.(selected)}<ThreadPane key={`${actorId}:${selected}`} roomKey={selected} onRead={markRead} onSaved={() => void refresh()} /></div>}
    </div>}
  </section>;
}

function ThreadPane({ roomKey, onRead, onSaved }: { roomKey: string; onRead: (key: string, revision: number) => void; onSaved: () => void }) {
  const [data, setData] = useState<ThreadResponse | null>(null);
  const [error, setError] = useState('');
  const [content, setContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [external, setExternal] = useState(false);
  const [externalChannel, setExternalChannel] = useState('');
  const [replyTo, setReplyTo] = useState<HubEntry | null>(null);
  const [pending, setPending] = useState<EntryInput | null>(null);
  const [sending, setSending] = useState(false);
  const [olderLoading, setOlderLoading] = useState(false);
  const busy = useRef(false);
  const sequence = useRef(0);
  const mounted = useRef(true);
  const panel = useRef<HTMLDivElement>(null);
  const visible = useRef(false);
  const latestRevision = useRef(0);
  useEffect(() => {
    const element = panel.current;
    if (!element) return;
    const markVisible = () => {
      if (visible.current && document.visibilityState === 'visible') onRead(roomKey, latestRevision.current);
    };
    const observer = new IntersectionObserver(([entry]) => { visible.current = entry.isIntersecting; markVisible(); });
    observer.observe(element);
    document.addEventListener('visibilitychange', markVisible);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', markVisible); };
  }, [roomKey, onRead]);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    try {
      const result = await responseJson<ThreadResponse>(await fetch(`/api/partner-hub?${new URLSearchParams({ key: roomKey })}`, { cache: 'no-store' }));
      if (!mounted.current || request !== sequence.current) return;
      setData(previous => mergeLatest(previous, result));
      setError(''); latestRevision.current = result.thread.revision;
      if (visible.current && document.visibilityState === 'visible') onRead(roomKey, result.thread.revision);
    } catch (e) { if (mounted.current && request === sequence.current) { setError((e as Error).message); if ([401, 403].includes((e as { status?: number }).status || 0)) setData(null); } }
  }, [roomKey, onRead]);
  useEffect(() => {
    mounted.current = true;
    // Initial fetch updates state asynchronously after the server responds.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const timer = setInterval(() => { if (!busy.current && visible.current && document.visibilityState === 'visible') void refresh(); }, 10000);
    return () => { mounted.current = false; clearInterval(timer); };
  }, [refresh]);
  async function older() {
    if (!data?.thread.entries.length || olderLoading) return;
    setOlderLoading(true);
    try {
      const result = await responseJson<ThreadResponse>(await fetch(`/api/partner-hub?${new URLSearchParams({ key: roomKey, before: data.thread.entries[0].clientId })}`, { cache: 'no-store' }));
      if (mounted.current) setData(prev => prev ? { ...prev, hasMore: result.hasMore, thread: { ...prev.thread, entries: [...new Map([...result.thread.entries, ...prev.thread.entries].map(e => [e.clientId, e])).values()] } } : result);
    } catch (e) { if (mounted.current) setError((e as Error).message); }
    finally { if (mounted.current) setOlderLoading(false); }
  }
  async function send(kind: EntryKind, retry?: EntryInput) {
    if (!data || sending) return;
    const payload = retry || { clientId: crypto.randomUUID(), kind, content: content.trim(), linkUrl: linkUrl.trim() || undefined, linkTitle: linkTitle.trim() || undefined, externalChannel: external ? externalChannel.trim() : undefined, replyTo: replyTo?.clientId, expectedRevision: data.thread.revision, proposalVersion: data.thread.proposalVersion };
    busy.current = true; ++sequence.current; setSending(true); setPending(payload); setError('');
    try {
      const response = await fetch('/api/partner-hub', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: roomKey, ...payload }) });
      if (!response.ok) {
        const body = await response.json();
        if ([400, 403, 409, 413].includes(response.status) && mounted.current) { setPending(null); busy.current = false; await refresh(); }
        throw new Error(body.error || 'Không gửi được. Vui lòng thử lại.');
      }
      const result = await response.json() as ThreadResponse;
      if (!mounted.current) return;
      setData(prev => mergeLatest(prev, result));
      setPending(null); setContent(''); setLinkUrl(''); setLinkTitle(''); setReplyTo(null); setExternal(false); setExternalChannel(''); busy.current = false;
      latestRevision.current = result.thread.revision;
      onRead(roomKey, result.thread.revision); onSaved();
    } catch (e) { if (mounted.current) setError((e as Error).message); }
    finally { if (mounted.current) setSending(false); }
  }
  return <div ref={panel} className="space-y-3">
    {error && <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}{!pending && <button type="button" className="ml-2 underline" onClick={() => void refresh()}>Tải lại</button>}</div>}
    {!data && <p className="text-sm text-slate-500">Đang tải lịch sử…</p>}
    {data && <>
      <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold text-slate-900">{data.title}</h4>{data.thread.proposalVersion && <span className="rounded bg-blue-50 px-2 py-1 text-sm text-blue-700">{DECISION_LABELS[data.thread.decision]}</span>}</div>
      <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-lg bg-slate-50 p-3" aria-label="Lịch sử trao đổi">
        {data.hasMore && <button type="button" className={buttonClass} disabled={olderLoading} onClick={() => void older()}>{olderLoading ? 'Đang tải…' : 'Xem ý kiến cũ hơn'}</button>}
        {!data.thread.entries.length && <p className="text-sm text-slate-500">Chưa có ý kiến. Bạn có thể bắt đầu trao đổi hoặc ghi lại kết luận từ Zalo, email, cuộc họp.</p>}
        {data.thread.entries.map(entry => <article key={entry.clientId} id={`message-${entry.clientId}`} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
          <div className="flex flex-wrap justify-between gap-1"><strong>{entry.authorName}</strong><time className="text-xs text-slate-500" dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString('vi-VN')}</time></div>
          <p className="text-xs text-slate-500">{entry.authorRole} · {KIND_LABELS[entry.kind]}{entry.externalChannel ? ` · ${entry.externalChannel} · do ${entry.authorName} ghi nhận` : ''}</p>
          {entry.replyTo && <a href={`#message-${entry.replyTo}`} className="mt-1 block text-xs text-blue-700">Trả lời: {data.thread.entries.find(e => e.clientId === entry.replyTo)?.content.slice(0, 100) || 'ý kiến trước đó (xem lịch sử cũ)'}</a>}
          <p className="mt-2 whitespace-pre-wrap break-words">{entry.content || KIND_LABELS[entry.kind]}</p>
          {entry.linkUrl && <a className="mt-2 block break-all text-blue-700 underline" href={entry.linkUrl} target="_blank" rel="noopener noreferrer">{entry.linkTitle || 'Mở tài liệu'}</a>}
          <div className="mt-2 flex gap-3 text-xs text-blue-700"><button type="button" disabled={!!pending} onClick={() => setReplyTo(entry)}>Trả lời</button>{entry.linkUrl && <button type="button" disabled={!!pending} onClick={() => { setReplyTo(entry); setContent(`Nhờ bạn cấp quyền truy cập tài liệu: ${entry.linkTitle || entry.linkUrl}`); }}>Cần cấp quyền truy cập</button>}</div>
        </article>)}
      </div>
      <form onSubmit={e => { e.preventDefault(); void send(external ? 'EXTERNAL' : 'COMMENT'); }} className="space-y-3">
        <fieldset disabled={!!pending || sending} className="space-y-3">
          {replyTo && <div className="flex justify-between gap-2 rounded bg-blue-50 p-2 text-sm"><span>Trả lời {replyTo.authorName}: {replyTo.content.slice(0, 90)}</span><button type="button" onClick={() => setReplyTo(null)} aria-label="Bỏ trả lời">×</button></div>}
          <label className="block text-sm font-medium">Ý kiến / lý do<textarea className={`${inputClass} mt-1 min-h-24`} maxLength={6000} value={content} onChange={e => setContent(e.target.value)} placeholder="Ghi ý kiến cho đề xuất hoặc công việc này…" /></label>
          <div className="grid gap-2 sm:grid-cols-2"><label className="text-sm">Link Drive / tài liệu<input className={inputClass} type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://drive.google.com/…" maxLength={2000} /></label><label className="text-sm">Tên tài liệu / phiên bản<input className={inputClass} value={linkTitle} onChange={e => setLinkTitle(e.target.value)} placeholder="Video nháp · v2" maxLength={160} required={!!linkUrl} /></label></div>
          <p className="text-xs text-slate-500">Chỉ lưu link; quyền xem do người gửi quản lý trên Drive. Nội dung ở link có thể được thay đổi tại nguồn.</p>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={external} onChange={e => setExternal(e.target.checked)} />Ghi nhận trao đổi bên ngoài</label>
          {external && <label className="block text-sm">Kênh trao đổi<input className={inputClass} required value={externalChannel} onChange={e => setExternalChannel(e.target.value)} maxLength={100} placeholder="Zalo / email / cuộc họp…" /></label>}
          <div className="flex flex-wrap gap-2"><button className={`${buttonClass} bg-blue-600 text-white`} type="submit" disabled={!content.trim() && !linkUrl.trim()}>Gửi ý kiến</button>
            {data.canDecide && !external && <><button className={`${buttonClass} bg-emerald-600 text-white`} type="button" onClick={() => void send('APPROVE')}>Xác nhận duyệt</button><button className={`${buttonClass} text-rose-700`} type="button" disabled={!content.trim()} onClick={() => void send('REJECT')}>Không duyệt</button><button className={buttonClass} type="button" disabled={!content.trim()} onClick={() => void send('REQUEST_INFO')}>Cần bổ sung</button></>}
          </div>
          {data.thread.proposalVersion && <p className="text-xs text-slate-500">Không duyệt / cần bổ sung phải có lý do. Gửi ý kiến hoặc ghi nhận trao đổi bên ngoài không tự thay đổi quyết định.</p>}
        </fieldset>
        {sending && <p role="status" className="text-sm text-blue-700">Đang lưu…</p>}
        {pending && !sending && <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-rose-700">Chưa xác nhận đã lưu.</span><button className={buttonClass} type="button" onClick={() => void send(pending.kind, pending)}>Thử gửi lại</button><button className={buttonClass} type="button" onClick={() => { setPending(null); busy.current = false; void refresh(); }}>Kiểm tra lịch sử / sửa nội dung</button></div>}
      </form>
    </>}
  </div>;
}
