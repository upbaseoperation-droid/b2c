import { NextRequest, NextResponse } from 'next/server';
import { readRecord } from '@/lib/server/sharedRecords';
import {
  getZaloBotToken,
  getZaloBotSecretToken,
  getAllMappings,
  getAllUserPermissions,
  getAllDiscoveredSenders,
  hydrateZaloBotStateFromDb,
  getAirCheckHistory,
  getDebugEvents,
  getSecurityPolicy,
  getReplyConfig,
} from '@/lib/server/zaloBot';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = getZaloBotToken();
  const secretToken = getZaloBotSecretToken();

  let botInfo: any = null;
  let webhookInfo: any = null;
  let pingOk = false;

  try {
    const [meRes, whRes] = await Promise.all([
      fetch(`https://bot-api.zaloplatforms.com/bot${token}/getMe`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      }),
      fetch(`https://bot-api.zaloplatforms.com/bot${token}/getWebhookInfo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      }),
    ]);

    if (meRes.ok) {
      const meData = await meRes.json();
      botInfo = meData?.result || null;
      pingOk = true;
    }

    if (whRes.ok) {
      const whData = await whRes.json();
      webhookInfo = whData?.result || null;
    }
  } catch (err: any) {
    console.error('[ZaloBot Status Error]:', err);
  }

  await hydrateZaloBotStateFromDb({ forceFresh: true });
  const mappings = getAllMappings();
  const userPermissions = getAllUserPermissions();
  const discoveredSenders = getAllDiscoveredSenders();
  const airHistory = getAirCheckHistory();

  // Đọc nhật ký sự kiện webhook từ bản ghi bền vững kết hợp bộ nhớ đệm
  const persistedEventsRec = await readRecord<any[]>('zalo-webhook-history-v1', []).catch(() => ({ data: [] }));
  const persistedEvents = Array.isArray(persistedEventsRec?.data) ? persistedEventsRec.data : [];
  const inMemEvents = getDebugEvents();

  const combinedMap = new Map<string, any>();
  for (const ev of inMemEvents) {
    const key = `${ev.time}-${ev.extractedChatId || ev.body?.result?.message?.chat?.id || ''}`;
    combinedMap.set(key, ev);
  }
  for (const ev of persistedEvents) {
    const key = `${ev.time}-${ev.chatId || ev.extractedChatId || ''}`;
    if (!combinedMap.has(key)) {
      combinedMap.set(key, {
        time: ev.time || new Date().toISOString(),
        body: ev.body || ev.rawBody || {
          event_name: ev.eventName || 'message.text.received',
          message: {
            text: ev.text,
            message_type: ev.messageType,
            chat: { id: ev.chatId },
            from: { display_name: ev.sender },
          },
        },
        extractedChatId: ev.chatId || ev.extractedChatId,
        replySent: ev.error ? false : Boolean(ev.replySent || ev.replyText),
        replyText: ev.replyText || (ev.text ? `Đã tiếp nhận tin: "${ev.text.slice(0, 60)}..."` : ''),
        replyPhotoUrl: ev.replyPhotoUrl,
        error: ev.error,
      });
    }
  }
  const recentEvents = Array.from(combinedMap.values()).sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
  ).slice(0, 50);

  return NextResponse.json({
    ok: true,
    pingOk,
    botInfo: botInfo || {
      id: '4534079839618724427',
      display_name: 'Bot tttttttupbase',
      account_name: 'bot.qxQiPkja',
      can_join_groups: true,
    },
    webhookInfo: webhookInfo || {
      url: 'https://b2c-theta.vercel.app/api/integrations/zalo-bot/webhook',
      updated_at: Date.now(),
    },
    inviteUrl: 'https://bot.zaloplatforms.com/groups/invite/bot.qxQiPkja',
    secretTokenMasked: secretToken
      ? `${secretToken.slice(0, 4)}****${secretToken.slice(-4)}`
      : 'Chưa thiết lập',
    mappings,
    userPermissions,
    discoveredSenders,
    securityPolicy: getSecurityPolicy(),
    replyConfig: getReplyConfig(),
    airHistory,
    recentEvents,
  });
}
