import { NextRequest, NextResponse } from 'next/server';
import {
  getZaloBotToken,
  getZaloBotSecretToken,
  getAllMappings,
  getAllUserPermissions,
  getAirCheckHistory,
  getDebugEvents,
  getSecurityPolicy,
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

  const mappings = getAllMappings();
  const userPermissions = getAllUserPermissions();
  const airHistory = getAirCheckHistory();
  const recentEvents = getDebugEvents();

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
    securityPolicy: getSecurityPolicy(),
    airHistory,
    recentEvents,
  });
}
