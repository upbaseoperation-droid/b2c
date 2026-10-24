'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import type { PlanDiscussionMessage, PlanDiscussionRole, UserProfile } from './types';
import {
  chatRoleFromUser,
  chatTitleFor,
  isSystemMessage,
  planChannelName,
  type PlanChatMessage,
  type UserMessageType
} from './planChat';

/**
 * Khung trao đổi kế hoạch tháng theo kiểu "chuông báo":
 * - Supabase Realtime Broadcast chỉ báo "có tin mới" (không chứa nội dung).
 * - Nhận tín hiệu -> gọi API có kiểm tra đăng nhập để lấy tin.
 * - Kênh không kết nối được trong 8 giây -> hỏi server mỗi 10 giây (chỉ khi tab đang hiển thị).
 */

export type PlanChatConnection = 'live' | 'polling' | 'connecting';

export interface PlanChatTypingUser {
  key: string;
  name: string;
  role: PlanDiscussionRole;
}

export interface UsePlanChatOptions {
  planId: string | null | undefined;
  initialMessages?: PlanDiscussionMessage[];
  currentUser: UserProfile | null | undefined;
  /** Khung trao đổi đang mở. Khi false vẫn giữ kết nối để đếm tin chưa đọc. */
  enabled?: boolean;
  /** Chỉ ADMIN: gửi thử dưới vai trò khác. */
  asRole?: Exclude<PlanDiscussionRole, 'SYSTEM'>;
}

export interface UsePlanChatResult {
  messages: PlanChatMessage[];
  send: (content: string, type?: UserMessageType) => Promise<boolean>;
  /** Gửi lại tin lỗi (giữ nguyên clientId để không tạo trùng). */
  retry: (clientId: string) => Promise<boolean>;
  sending: boolean;
  connection: PlanChatConnection;
  typingUsers: PlanChatTypingUser[];
  /** Người đang mở kế hoạch này (Presence). */
  onlineUsers: PlanChatTypingUser[];
  notifyTyping: () => void;
  unreadCount: number;
  markRead: () => void;
  error: string | null;
  refresh: () => Promise<void>;
  /** Kiểm tra một tin có phải của người dùng hiện tại. */
  isMine: (m: PlanChatMessage) => boolean;
}

const SUBSCRIBE_TIMEOUT_MS = 8000;
const POLL_INTERVAL_MS = 10000;
const TYPING_THROTTLE_MS = 2000;
const TYPING_EXPIRE_MS = 4000;

let realtimeClient: SupabaseClient | null | undefined;

/** Client Supabase chỉ dùng cho Realtime (không lưu phiên đăng nhập Supabase). */
function getRealtimeClient(): SupabaseClient | null {
  if (realtimeClient !== undefined) return realtimeClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (typeof window === 'undefined' || !url || !key) {
    realtimeClient = null;
    return null;
  }
  realtimeClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'plan-chat-realtime' }
  });
  return realtimeClient;
}

function newClientId() {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `msg-${Date.now().toString(36)}-${rand}`;
}

const timeOf = (m: PlanDiscussionMessage) => {
  const t = new Date(m.timestamp).getTime();
  return Number.isNaN(t) ? 0 : t;
};

/** Gộp tin theo id; bản từ server (không có status) thay bản lạc quan. Sắp xếp cũ -> mới. */
function mergeMessages(base: PlanChatMessage[], incoming: PlanChatMessage[]): PlanChatMessage[] {
  if (!incoming.length) return base;
  const map = new Map<string, PlanChatMessage>();
  for (const m of base) if (m?.id) map.set(m.id, m);
  let changed = false;
  for (const m of incoming) {
    if (!m?.id) continue;
    const prev = map.get(m.id);
    if (prev && !prev.status && !m.status) continue; // đã có bản chính thức
    if (prev && !prev.status && m.status) continue; // không hạ bản chính thức về bản tạm
    map.set(m.id, m);
    changed = true;
  }
  if (!changed) return base;
  return Array.from(map.values()).sort((a, b) => timeOf(a) - timeOf(b));
}

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* bỏ qua: trình duyệt chặn localStorage */
  }
}

export function usePlanChat({
  planId,
  initialMessages,
  currentUser,
  enabled = true,
  asRole
}: UsePlanChatOptions): UsePlanChatResult {
  const [messages, setMessages] = useState<PlanChatMessage[]>(() => mergeMessages([], initialMessages ?? []));
  const [connection, setConnection] = useState<PlanChatConnection>('connecting');
  const [typingMap, setTypingMap] = useState<Record<string, PlanChatTypingUser & { expiresAt: number }>>({});
  const [onlineUsers, setOnlineUsers] = useState<PlanChatTypingUser[]>([]);
  const [sendingCount, setSendingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastReadAt, setLastReadAt] = useState<number | null>(null);

  const userKey = currentUser?.id || currentUser?.email || currentUser?.name || 'guest';
  const myRole: Exclude<PlanDiscussionRole, 'SYSTEM'> = asRole ?? (currentUser ? chatRoleFromUser(currentUser) : 'BOOKING');

  const cursorRef = useRef<string | null>(null);
  const fetchingRef = useRef(false);
  const refetchRef = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const connectionRef = useRef<PlanChatConnection>('connecting');
  const lastTypingSentRef = useRef(0);
  const planIdRef = useRef(planId);
  const messagesRef = useRef(messages);
  useLayoutEffect(() => {
    planIdRef.current = planId;
    messagesRef.current = messages;
  });

  const readKey = planId ? `plan-chat-read:${planId}:${userKey}` : null;

  const isMine = useCallback(
    (m: PlanChatMessage) => {
      if (!currentUser) return false;
      if (m.authorId) return m.authorId === currentUser.id;
      return m.authorName === currentUser.name && m.authorRole !== 'SYSTEM';
    },
    [currentUser]
  );

  // ---------- Đọc tin từ server ----------
  const fetchMessages = useCallback(async () => {
    const id = planIdRef.current;
    if (!id) return;
    if (fetchingRef.current) {
      refetchRef.current = true;
      return;
    }
    fetchingRef.current = true;
    try {
      do {
        refetchRef.current = false;
        const qs = cursorRef.current ? `?after=${encodeURIComponent(cursorRef.current)}` : '';
        const res = await fetch(`/api/monthly-plans/${encodeURIComponent(id)}/messages${qs}`, {
          cache: 'no-store',
          credentials: 'same-origin'
        });
        if (planIdRef.current !== id) return; // đã chuyển kế hoạch
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(body?.error || `Không tải được tin trao đổi (mã ${res.status}).`);
          return;
        }
        const data = (await res.json()) as { messages: PlanChatMessage[]; cursor: string | null };
        if (data.cursor) cursorRef.current = data.cursor;
        setMessages(prev => mergeMessages(prev, data.messages || []));
        setError(null);
      } while (refetchRef.current && planIdRef.current === id);
    } catch {
      if (planIdRef.current === id) setError('Mất kết nối, đang thử lại.');
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  // ---------- Đổi kế hoạch: đặt lại trạng thái ----------
  useEffect(() => {
    cursorRef.current = null;
    const initMsgs = initialMessages ?? [];
    queueMicrotask(() => {
      setMessages(mergeMessages([], initMsgs));
      setTypingMap({});
      setOnlineUsers([]);
      setError(null);
    });
    if (planId) void fetchMessages();
    // initialMessages chỉ dùng làm dữ liệu ban đầu khi đổi kế hoạch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, fetchMessages]);

  // Kế hoạch được tải lại (tin hệ thống mới đi kèm payload) -> gộp thêm, không trùng
  const initialKey = useMemo(() => (initialMessages ?? []).map(m => m.id).join('|'), [initialMessages]);
  useEffect(() => {
    if (initialMessages?.length) {
      const incoming = initialMessages;
      queueMicrotask(() => {
        setMessages(prev => mergeMessages(prev, incoming));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  // ---------- Mốc đã đọc ----------
  useEffect(() => {
    if (!readKey) {
      queueMicrotask(() => {
        setLastReadAt(null);
      });
      return;
    }
    const stored = readStorage(readKey);
    const parsed = stored ? Date.parse(stored) : NaN;
    const nextReadAt = Number.isNaN(parsed) ? null : parsed;
    queueMicrotask(() => {
      setLastReadAt(nextReadAt);
    });
  }, [readKey]);

  // Lần đầu (chưa có mốc): coi tin hiện có là đã đọc để không báo số lớn với dữ liệu cũ
  useEffect(() => {
    if (!readKey || lastReadAt !== null || !messages.length) return;
    if (readStorage(readKey)) return;
    const latest = Math.max(...messages.map(timeOf));
    writeStorage(readKey, new Date(latest).toISOString());
    queueMicrotask(() => {
      setLastReadAt(latest);
    });
  }, [readKey, lastReadAt, messages]);

  const markRead = useCallback(() => {
    if (!readKey) return;
    const latest = messagesRef.current.reduce((max, m) => Math.max(max, timeOf(m)), 0);
    const mark = Math.max(Date.now(), latest);
    writeStorage(readKey, new Date(mark).toISOString());
    setLastReadAt(mark);
  }, [readKey]);

  const unreadCount = useMemo(() => {
    if (lastReadAt === null) return 0;
    return messages.filter(m => !m.status && !isSystemMessage(m) && !isMine(m) && timeOf(m) > lastReadAt).length;
  }, [messages, lastReadAt, isMine]);

  // Đang mở khung trao đổi: tin mới đến coi như đã đọc
  useEffect(() => {
    if (enabled && unreadCount > 0) markRead();
  }, [enabled, unreadCount, markRead]);

  // ---------- Kênh realtime + dự phòng hỏi server ----------
  useEffect(() => {
    if (!planId) return;
    const setConn = (c: PlanChatConnection) => {
      connectionRef.current = c;
      setConnection(c);
    };
    setConn('connecting');

    const client = getRealtimeClient();
    let channel: RealtimeChannel | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    if (client) {
      channel = client.channel(planChannelName(planId), {
        config: { broadcast: { self: false }, presence: { key: userKey } }
      });
      channelRef.current = channel;

      channel
        .on('broadcast', { event: 'new_message' }, () => {
          void fetchMessages();
        })
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          const p = payload as Partial<PlanChatTypingUser> | undefined;
          if (!p?.key || !p.name || p.key === userKey) return;
          setTypingMap(prev => ({
            ...prev,
            [p.key as string]: {
              key: p.key as string,
              name: String(p.name).slice(0, 80),
              role: (p.role as PlanDiscussionRole) || 'BOOKING',
              expiresAt: Date.now() + TYPING_EXPIRE_MS
            }
          }));
        })
        .on('presence', { event: 'sync' }, () => {
          const state = channel?.presenceState<{ name?: string; role?: PlanDiscussionRole }>() ?? {};
          const users: PlanChatTypingUser[] = [];
          for (const [key, metas] of Object.entries(state)) {
            const meta = metas[0];
            if (meta?.name) users.push({ key, name: meta.name, role: meta.role || 'BOOKING' });
          }
          setOnlineUsers(users);
        })
        .subscribe(status => {
          if (status === 'SUBSCRIBED') {
            if (fallbackTimer) clearTimeout(fallbackTimer);
            const wasLive = connectionRef.current === 'live';
            setConn('live');
            if (currentUser) {
              void channel?.track({ name: currentUser.name, role: myRole }).catch(() => undefined);
            }
            if (!wasLive) void fetchMessages(); // bù tin lỡ trong lúc chưa kết nối
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            if (connectionRef.current !== 'polling') setConn('polling');
          }
        });

      fallbackTimer = setTimeout(() => {
        if (connectionRef.current !== 'live') setConn('polling');
      }, SUBSCRIBE_TIMEOUT_MS);
    } else {
      setConn('polling');
    }

    const pollTimer = setInterval(() => {
      if (connectionRef.current === 'live') return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      void fetchMessages();
    }, POLL_INTERVAL_MS);

    // Quay lại tab: hỏi lại một lần để chắc chắn không lỡ tin
    const onVisible = () => {
      if (document.visibilityState === 'visible') void fetchMessages();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      clearInterval(pollTimer);
      document.removeEventListener('visibilitychange', onVisible);
      if (channel && client) void client.removeChannel(channel);
      if (channelRef.current === channel) channelRef.current = null;
    };
    // currentUser/myRole chỉ dùng cho Presence; không dựng lại kênh khi đổi tham chiếu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, userKey, fetchMessages]);

  // Dọn người "đang nhập" đã hết hạn
  useEffect(() => {
    const keys = Object.keys(typingMap);
    if (!keys.length) return;
    const next = Math.min(...keys.map(k => typingMap[k].expiresAt)) - Date.now();
    const t = setTimeout(
      () => {
        const now = Date.now();
        setTypingMap(prev => {
          const kept = Object.fromEntries(Object.entries(prev).filter(([, v]) => v.expiresAt > now));
          return Object.keys(kept).length === Object.keys(prev).length ? prev : kept;
        });
      },
      Math.max(next, 50)
    );
    return () => clearTimeout(t);
  }, [typingMap]);

  const typingUsers = useMemo(
    () => Object.values(typingMap).map(({ key, name, role }) => ({ key, name, role })),
    [typingMap]
  );

  const notifyTyping = useCallback(() => {
    const channel = channelRef.current;
    if (!channel || connectionRef.current !== 'live' || !currentUser) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < TYPING_THROTTLE_MS) return;
    lastTypingSentRef.current = now;
    void channel
      .send({ type: 'broadcast', event: 'typing', payload: { key: userKey, name: currentUser.name, role: myRole } })
      .catch(() => undefined);
  }, [currentUser, userKey, myRole]);

  // ---------- Gửi tin ----------
  const postMessage = useCallback(
    async (draft: PlanChatMessage): Promise<boolean> => {
      const id = planIdRef.current;
      if (!id) return false;
      setSendingCount(c => c + 1);
      setMessages(prev => mergeMessages(prev, [{ ...draft, status: 'sending' }]));
      try {
        const res = await fetch(`/api/monthly-plans/${encodeURIComponent(id)}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            clientId: draft.id,
            content: draft.content,
            type: draft.type,
            ...(draft.tags?.length ? { tags: draft.tags } : {}),
            ...(asRole ? { asRole } : {})
          })
        });
        const body = (await res.json().catch(() => null)) as { message?: PlanChatMessage; error?: string } | null;
        if (!res.ok || !body?.message) throw new Error(body?.error || `Gửi tin lỗi (mã ${res.status}).`);
        const saved = body.message;
        if (planIdRef.current === id) {
          setMessages(prev => mergeMessages(prev.filter(m => m.id !== saved.id), [saved]));
          setError(null);
        }
        return true;
      } catch (err) {
        if (planIdRef.current === id) {
          setMessages(prev => prev.map(m => (m.id === draft.id ? { ...m, status: 'failed' } : m)));
          setError(err instanceof Error ? err.message : 'Gửi tin lỗi.');
        }
        return false;
      } finally {
        setSendingCount(c => Math.max(0, c - 1));
      }
    },
    [asRole]
  );

  const send = useCallback(
    async (content: string, type: UserMessageType = 'COMMENT') => {
      const text = content.trim();
      if (!text || !currentUser || !planIdRef.current) return false;
      const draft: PlanChatMessage = {
        id: newClientId(),
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorRole: myRole,
        authorTitle: chatTitleFor(myRole, currentUser),
        content: text,
        type,
        timestamp: new Date().toISOString()
      };
      return postMessage(draft);
    },
    [currentUser, myRole, postMessage]
  );

  const retry = useCallback(
    async (clientId: string) => {
      const draft = messagesRef.current.find(m => m.id === clientId && m.status === 'failed');
      if (!draft) return false;
      const { status: _status, ...rest } = draft;
      void _status;
      return postMessage(rest);
    },
    [postMessage]
  );

  return {
    messages,
    send,
    retry,
    sending: sendingCount > 0,
    connection,
    typingUsers,
    onlineUsers,
    notifyTyping,
    unreadCount,
    markRead,
    error,
    refresh: fetchMessages,
    isMine
  };
}
