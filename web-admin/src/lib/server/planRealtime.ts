// Chỉ dùng phía server. Phát "chuông báo" có tin mới qua Supabase Realtime Broadcast (REST).
import { planChannelName } from '../planChat';

const TIMEOUT_MS = 3000;

function realtimeConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ''), key };
}

/**
 * Báo cho mọi người đang mở kế hoạch biết có tin mới. Tín hiệu không chứa nội dung tin;
 * giao diện nhận tín hiệu sẽ tự gọi API (có kiểm tra đăng nhập) để lấy tin.
 * Không bao giờ ném lỗi — lỗi phát tín hiệu không được làm hỏng request lưu tin.
 */
export async function notifyPlanMessages(planId: string): Promise<{ ok: boolean; status?: number }> {
  const cfg = realtimeConfig();
  if (!cfg) return { ok: false };
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: cfg.key
    };
    // Khóa dạng JWT cũ (anon/service_role) gửi kèm Authorization; khóa sb_publishable_/sb_secret_ chỉ cần apikey.
    if (cfg.key.startsWith('eyJ')) headers.Authorization = `Bearer ${cfg.key}`;

    const res = await fetch(`${cfg.url}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages: [
          {
            topic: planChannelName(planId),
            event: 'new_message',
            payload: { event: 'new_message', at: new Date().toISOString() },
            private: false
          }
        ]
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store'
    });
    if (!res.ok) {
      console.warn(`[plan-chat] Phát tín hiệu realtime lỗi HTTP ${res.status}`);
    }
    return { ok: res.ok, status: res.status };
  } catch (err) {
    console.warn('[plan-chat] Không phát được tín hiệu realtime:', err instanceof Error ? err.message : err);
    return { ok: false };
  }
}
