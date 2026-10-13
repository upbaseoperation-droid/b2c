'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ChevronDown, ChevronUp, Loader2, MessageSquare, RotateCcw, Send, X } from 'lucide-react';
import type { InputPlanBreakdownState, PlanDiscussionRole, UserProfile } from '@/lib/types';
import {
  MAX_MESSAGE_LENGTH,
  ROLE_LABELS,
  TYPE_LABELS,
  chatRoleFromUser,
  isSystemMessage,
  type PlanChatMessage,
  type UserMessageType
} from '@/lib/planChat';
import type { PlanChatConnection, UsePlanChatResult } from '@/lib/usePlanChat';

// =========================================================================
// Nút mở khung trao đổi (kèm số tin chưa đọc)
// =========================================================================

export interface PlanChatButtonProps {
  unreadCount?: number;
  onClick: () => void;
  className?: string;
  label?: string;
}

export function PlanChatButton({ unreadCount = 0, onClick, className = '', label = 'Trao đổi' }: PlanChatButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs ${className}`}
      aria-label={unreadCount > 0 ? `${label}, ${unreadCount} tin chưa đọc` : label}
    >
      <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
      <span>{label}</span>
      {unreadCount > 0 && (
        <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-2xs font-semibold leading-[18px] text-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}

// =========================================================================
// Khung trao đổi trượt từ bên phải
// =========================================================================

export interface PlanChatDrawerProps {
  open: boolean;
  onClose: () => void;
  plan: InputPlanBreakdownState;
  currentUser: UserProfile | null | undefined;
  chat: UsePlanChatResult;
  /** Nội dung thẻ "Nhận xét kế hoạch" (gắn sau). Mặc định hiện trạng thái trống. */
  reviewSlot?: React.ReactNode;
}

type FilterKey = 'ALL' | 'PROPOSAL' | 'APPROVAL';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PROPOSAL', label: 'Đề xuất & yêu cầu sửa' },
  { key: 'APPROVAL', label: 'Duyệt & phiên bản' }
];

const TYPE_CHIPS: { type: UserMessageType; label: string }[] = [
  { type: 'COMMENT', label: 'Trao đổi' },
  { type: 'BUDGET_ADJUST', label: 'Đề xuất điều chỉnh ngân sách' },
  { type: 'REVISION_REQUEST', label: 'Yêu cầu sửa' }
];

const QUICK_REPLIES: Record<Exclude<PlanDiscussionRole, 'SYSTEM'>, string[]> = {
  GROWTH: [
    'Đề nghị rà lại tỷ trọng ngân sách Affiliate và kênh Brand.',
    'Mục tiêu GMV tháng này giữ nguyên như đã giao.',
    'Vui lòng bổ sung lý do tăng chi phí so với tháng trước.',
    'Đồng ý với phương án phân bổ hiện tại.'
  ],
  BOOKING: [
    'Đã cập nhật phân bổ theo góp ý, nhờ anh/chị xem lại.',
    'Ngân sách hiện tại chưa đủ cho số video mục tiêu.',
    'Đề xuất tăng số video KOC trả phí để bám mục tiêu GMV.',
    'Nhờ xác nhận số suất gửi mẫu miễn phí (FOC) tháng này.'
  ],
  MEDIA: [
    'Ngân sách Ads hiện tại đủ cho mục tiêu ROAS.',
    'Đề nghị tăng ngân sách Ads cho giai đoạn cao điểm.',
    'Cần thêm video để chạy quảng cáo, nhờ Booking bổ sung.'
  ],
  LEAD: [
    'Đã xem, đồng ý hướng phân bổ.',
    'Cần làm rõ chi phí Net trước khi duyệt.',
    'Các bên thống nhất lại số liệu rồi gửi duyệt.',
    'Lưu ý không vượt hạn mức Order Net của gian hàng.'
  ]
};

const ROLE_BADGE: Record<PlanDiscussionRole, string> = {
  GROWTH: 'bg-amber-50 text-amber-700 border-amber-200',
  BOOKING: 'bg-blue-50 text-blue-700 border-blue-200',
  MEDIA: 'bg-blue-50 text-blue-700 border-blue-200',
  LEAD: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SYSTEM: 'bg-slate-100 text-slate-500 border-slate-200'
};

const CONNECTION_VIEW: Record<PlanChatConnection, { label: string; dot: string }> = {
  live: { label: 'Trực tiếp', dot: 'bg-emerald-500' },
  polling: { label: 'Cập nhật 10 giây', dot: 'bg-amber-400' },
  connecting: { label: 'Đang kết nối', dot: 'bg-slate-300' }
};

const GROUP_WINDOW_MS = 5 * 60 * 1000;
const NEAR_BOTTOM_PX = 80;
const MAX_TEXTAREA_PX = 120; // ~5 dòng

const pad = (n: number) => String(n).padStart(2, '0');
const toDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
};
const formatTime = (iso: string) => {
  const d = toDate(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
function dayLabel(d: Date) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(d) === dayKey(today)) return 'Hôm nay';
  if (dayKey(d) === dayKey(yesterday)) return 'Hôm qua';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
const formatMoney = (n?: number) => (typeof n === 'number' ? `${n.toLocaleString('vi-VN')}đ` : '—');

function matchesFilter(m: PlanChatMessage, filter: FilterKey) {
  if (filter === 'ALL') return true;
  if (filter === 'PROPOSAL') return m.type === 'REVISION_REQUEST' || m.type === 'BUDGET_ADJUST';
  return isSystemMessage(m);
}

function shortTitle(plan: InputPlanBreakdownState) {
  const t = plan.title || plan.brandName || plan.id;
  return t.length > 60 ? `${t.slice(0, 57)}…` : t;
}

export function PlanChatDrawer({ open, onClose, plan, currentUser, chat, reviewSlot }: PlanChatDrawerProps) {
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [draft, setDraft] = useState('');
  const [msgType, setMsgType] = useState<UserMessageType>('COMMENT');
  const [reviewOpen, setReviewOpen] = useState(true);
  const [hasNewBelow, setHasNewBelow] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const nearBottomRef = useRef(true);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const lastCountRef = useRef(0);

  const { messages, markRead, isMine } = chat;
  const myRole: Exclude<PlanDiscussionRole, 'SYSTEM'> = currentUser ? chatRoleFromUser(currentUser) : 'BOOKING';

  // ---------- Mở / đóng: focus, Esc, đánh dấu đã đọc ----------
  const onCloseRef = useRef(onClose);
  const markReadRef = useRef(markRead);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
    markReadRef.current = markRead;
  });

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = (document.activeElement as HTMLElement) ?? null;
    markReadRef.current();
    const t = setTimeout(() => textareaRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
      const el = returnFocusRef.current;
      if (el && typeof el.focus === 'function') el.focus();
    };
  }, [open]);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    nearBottomRef.current = true;
    setHasNewBelow(false);
  }, []);

  // Mở khung hoặc đổi bộ lọc: cuộn xuống cuối
  useLayoutEffect(() => {
    if (open) scrollToBottom();
  }, [open, filter, scrollToBottom]);

  const visible = useMemo(() => messages.filter(m => matchesFilter(m, filter)), [messages, filter]);

  // Có tin mới: tự cuộn nếu đang ở gần cuối hoặc tin của mình; nếu đang đọc tin cũ thì hiện nút
  useLayoutEffect(() => {
    const prev = lastCountRef.current;
    lastCountRef.current = visible.length;
    if (!open || visible.length <= prev) return;
    const last = visible[visible.length - 1];
    if (nearBottomRef.current || (last && isMine(last))) scrollToBottom(prev > 0);
    else setHasNewBelow(true);
  }, [visible, open, isMine, scrollToBottom]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    nearBottomRef.current = near;
    if (near) setHasNewBelow(false);
  };

  // ---------- Ô nhập ----------
  const autoGrow = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_PX)}px`;
  };

  useLayoutEffect(autoGrow, [draft]);

  const submit = async () => {
    const text = draft.trim();
    if (!text || text.length > MAX_MESSAGE_LENGTH || !currentUser) return;
    setDraft('');
    setMsgType('COMMENT');
    nearBottomRef.current = true;
    await chat.send(text, msgType);
    textareaRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Không gửi khi bộ gõ tiếng Việt (IME) đang ghép chữ
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  const typingText = useMemo(() => {
    const names = chat.typingUsers.map(u => u.name);
    if (!names.length) return '';
    if (names.length === 1) return `${names[0]} đang nhập…`;
    if (names.length === 2) return `${names[0]} và ${names[1]} đang nhập…`;
    return `${names[0]} và ${names.length - 1} người khác đang nhập…`;
  }, [chat.typingUsers]);

  const conn = CONNECTION_VIEW[chat.connection];
  const pics: { label: string; name?: string }[] = [
    { label: 'Growth', name: plan.growthPic },
    { label: 'Booking', name: plan.pic },
    { label: 'Media', name: plan.mediaPic },
    { label: 'Trưởng phòng', name: plan.approvedBy }
  ];
  const overLimit = draft.length > MAX_MESSAGE_LENGTH;

  // ---------- Dựng danh sách tin ----------
  const rows: React.ReactNode[] = [];
  let prevDay = '';
  let prevMsg: PlanChatMessage | null = null;
  for (const m of visible) {
    const d = toDate(m.timestamp);
    const dk = dayKey(d);
    if (dk !== prevDay) {
      rows.push(
        <div key={`day-${dk}`} className="flex items-center gap-2 py-2" role="separator">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-2xs font-semibold text-slate-400">{dayLabel(d)}</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>
      );
      prevDay = dk;
      prevMsg = null;
    }

    if (isSystemMessage(m)) {
      rows.push(
        <div key={m.id} className="flex justify-center py-1">
          <div className="max-w-[90%] text-center text-2xs text-slate-500 bg-slate-100 rounded-full px-3 py-1">
            <span className="font-semibold">{TYPE_LABELS[m.type] ?? 'Hệ thống'}</span>
            <span> · {m.content}</span>
            <BudgetDiffLine m={m} />
            <span className="text-slate-400"> · {formatTime(m.timestamp)}</span>
          </div>
        </div>
      );
      prevMsg = null;
      continue;
    }

    const mine = isMine(m);
    const grouped =
      !!prevMsg &&
      prevMsg.authorName === m.authorName &&
      prevMsg.authorRole === m.authorRole &&
      timeOfMs(m) - timeOfMs(prevMsg) < GROUP_WINDOW_MS;
    prevMsg = m;

    rows.push(
      <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'} ${grouped ? 'mt-0.5' : 'mt-3'}`}>
        {!grouped && (
          <div className={`flex items-center gap-1.5 mb-1 text-2xs ${mine ? 'flex-row-reverse' : ''}`}>
            <span className="font-semibold text-slate-700">{mine ? 'Bạn' : m.authorName}</span>
            <span className={`px-1.5 py-px rounded border text-2xs font-semibold ${ROLE_BADGE[m.authorRole] ?? ROLE_BADGE.BOOKING}`}>
              {ROLE_LABELS[m.authorRole] ?? m.authorRole}
            </span>
            {m.authorTitle && !mine && <span className="text-slate-400 truncate max-w-[140px]">{m.authorTitle}</span>}
          </div>
        )}
        <div
          className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap break-words ${
            mine ? 'bg-blue-600 text-white rounded-br-md' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'
          } ${m.status === 'sending' ? 'opacity-70' : ''} ${m.status === 'failed' ? 'ring-2 ring-rose-300' : ''}`}
        >
          {m.type !== 'COMMENT' && (
            <span
              className={`inline-block mb-1 mr-1 px-1.5 py-px rounded text-2xs font-semibold ${
                mine
                  ? 'bg-white/20 text-white'
                  : m.type === 'REVISION_REQUEST'
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-amber-50 text-amber-700'
              }`}
            >
              {TYPE_LABELS[m.type] ?? m.type}
            </span>
          )}
          {m.content}
          {m.budgetDiff && (
            <div className={`mt-1 text-2xs ${mine ? 'text-blue-100' : 'text-slate-500'}`}>
              <BudgetDiffLine m={m} />
            </div>
          )}
          {m.tags && m.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {m.tags.map(t => (
                <span key={t} className={`text-2xs ${mine ? 'text-blue-100' : 'text-slate-400'}`}>
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-2xs text-slate-400">
          {m.status === 'sending' && <span>Đang gửi…</span>}
          {m.status === 'failed' && (
            <button
              type="button"
              onClick={() => void chat.retry(m.id)}
              className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:text-rose-700"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" /> Gửi lại
            </button>
          )}
          {!m.status && <span>{formatTime(m.timestamp)}</span>}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Lớp phủ mờ */}
      <div
        className={`fixed inset-0 z-[90] bg-slate-900/30 transition-opacity duration-(--motion-base) ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Trao đổi kế hoạch"
        inert={!open}
        className={`fixed top-0 right-0 z-[91] h-screen w-full sm:w-[420px] bg-slate-50 shadow-2xl border-l border-slate-200 flex flex-col transition-transform ${
          open ? 'translate-x-0 duration-(--motion-slow) ease-enter' : 'translate-x-full duration-(--motion-base) ease-exit'
        }`}
      >
        {/* Header */}
        <header className="shrink-0 bg-white border-b border-slate-200 px-4 pt-3 pb-2.5">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-slate-900">Trao đổi kế hoạch</h2>
              <p className="text-2xs text-slate-500 truncate" title={plan.title}>
                {shortTitle(plan)}
              </p>
            </div>
            <span className="mt-0.5 inline-flex items-center gap-1.5 text-2xs font-semibold text-slate-500" aria-live="polite">
              <span className={`w-2 h-2 rounded-full ${conn.dot}`} aria-hidden="true" />
              {conn.label}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -mr-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              aria-label="Đóng khung trao đổi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-2xs text-slate-500">
            {pics.map(p => (
              <span key={p.label}>
                {p.label}: <span className="font-semibold text-slate-700">{p.name || '—'}</span>
              </span>
            ))}
          </div>
          {chat.onlineUsers.length > 1 && (
            <div className="mt-1 text-2xs text-emerald-600">
              Đang mở: {chat.onlineUsers.map(u => u.name).join(', ')}
            </div>
          )}
        </header>

        {/* Nhận xét kế hoạch */}
        <section className="shrink-0 mx-3 mt-3 rounded-xl bg-white border border-slate-200">
          <button
            type="button"
            onClick={() => setReviewOpen(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700"
            aria-expanded={reviewOpen}
          >
            <span>Nhận xét kế hoạch</span>
            {reviewOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {reviewOpen && (
            <div className="px-3 pb-2.5 text-2xs text-slate-500 max-h-48 overflow-y-auto">
              {reviewSlot ?? <p className="italic">Chưa có nhận xét.</p>}
            </div>
          )}
        </section>

        {/* Bộ lọc */}
        <div className="shrink-0 flex gap-1.5 px-3 pt-2.5 pb-1 overflow-x-auto" role="tablist" aria-label="Lọc tin">
          {FILTERS.map(f => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-2xs font-semibold border ${
                filter === f.key
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Danh sách tin */}
        <div className="relative flex-1 min-h-0">
          <div
            ref={listRef}
            onScroll={onScroll}
            className="h-full overflow-y-auto px-3 pb-3"
            aria-live="polite"
            aria-relevant="additions"
          >
            {visible.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-6 text-slate-400">
                <MessageSquare className="w-8 h-8 mb-2 text-slate-300" aria-hidden="true" />
                <p className="text-xs font-semibold text-slate-500">
                  {filter === 'ALL' ? 'Chưa có trao đổi nào' : 'Không có tin phù hợp bộ lọc'}
                </p>
                {filter === 'ALL' && (
                  <p className="mt-1 text-2xs">Gửi tin đầu tiên để các bên Growth, Booking, Media cùng thống nhất kế hoạch.</p>
                )}
              </div>
            ) : (
              rows
            )}
          </div>
          {hasNewBelow && (
            <button
              type="button"
              onClick={() => scrollToBottom(true)}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-600 text-white text-2xs font-semibold shadow-lg"
            >
              Có tin mới <ArrowDown className="w-3 h-3" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Đang nhập */}
        <div className="shrink-0 h-5 px-4 text-2xs italic text-slate-400" aria-live="polite">
          {typingText}
        </div>

        {/* Khung nhập */}
        <footer className="shrink-0 bg-white border-t border-slate-200 px-3 pt-2 pb-3">
          <div className="flex gap-1.5 mb-2 overflow-x-auto" role="radiogroup" aria-label="Loại tin">
            {TYPE_CHIPS.map(c => (
              <button
                key={c.type}
                type="button"
                role="radio"
                aria-checked={msgType === c.type}
                onClick={() => setMsgType(c.type)}
                className={`shrink-0 px-2 py-0.5 rounded-full text-2xs font-semibold border ${
                  msgType === c.type
                    ? c.type === 'REVISION_REQUEST'
                      ? 'bg-rose-50 text-rose-700 border-rose-300'
                      : c.type === 'BUDGET_ADJUST'
                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                        : 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5 mb-2 overflow-x-auto pb-0.5" aria-label="Gợi ý nhanh">
            {QUICK_REPLIES[myRole].map(q => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setDraft(d => (d.trim() ? `${d.trimEnd()} ${q}` : q));
                  textareaRef.current?.focus();
                }}
                className="shrink-0 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-2xs text-slate-600 whitespace-nowrap"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={e => {
                setDraft(e.target.value);
                if (e.target.value) chat.notifyTyping();
              }}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder={currentUser ? 'Nhập nội dung trao đổi…' : 'Cần đăng nhập để gửi tin'}
              disabled={!currentUser}
              aria-label="Nội dung tin nhắn"
              className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] leading-5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 disabled:opacity-60"
              style={{ maxHeight: MAX_TEXTAREA_PX }}
            />
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!draft.trim() || overLimit || !currentUser}
              className="shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400"
              aria-label="Gửi tin"
            >
              {chat.sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2 text-2xs text-slate-400">
            <span>Tin đã gửi được lưu vào biên bản, không sửa hoặc xóa được.</span>
            {draft.length > MAX_MESSAGE_LENGTH * 0.8 && (
              <span className={overLimit ? 'text-rose-600 font-semibold' : ''}>
                {draft.length}/{MAX_MESSAGE_LENGTH}
              </span>
            )}
          </div>
          {chat.error && <div className="mt-1 text-2xs text-rose-600" role="alert">{chat.error}</div>}
        </footer>
      </aside>
    </>
  );
}

function timeOfMs(m: PlanChatMessage) {
  return toDate(m.timestamp).getTime();
}

function BudgetDiffLine({ m }: { m: PlanChatMessage }) {
  const b = m.budgetDiff;
  if (!b) return null;
  const parts: string[] = [];
  if (b.oldBudget !== undefined || b.newBudget !== undefined) {
    parts.push(`Ngân sách: ${formatMoney(b.oldBudget)} → ${formatMoney(b.newBudget)}`);
  }
  if (b.oldGmv !== undefined || b.newGmv !== undefined) {
    parts.push(`GMV: ${formatMoney(b.oldGmv)} → ${formatMoney(b.newGmv)}`);
  }
  if (!parts.length) return null;
  return <span className="block">{parts.join(' · ')}</span>;
}

export default PlanChatDrawer;
