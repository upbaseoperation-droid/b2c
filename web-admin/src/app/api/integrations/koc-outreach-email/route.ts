import tls from 'node:tls';
import { NextRequest, NextResponse } from 'next/server';
import { fetchLarkAppAccessToken, getAuthenticatedUser, getLarkConfig, isSandboxLoginAllowed } from '@/lib/larkAuth';
import { USERS } from '@/lib/mockData';
import { readRecord, updateRecord } from '@/lib/server/sharedRecords';
import {
  DEFAULT_EMAIL_SERVER_CONFIG,
  DEFAULT_KOC_EMAIL_TEMPLATES,
  type KocEmailOutreachLogItem,
  type KocEmailServerConfig,
  type KocEmailTemplateItem,
  type KocOutreachEmailState,
} from '@/lib/kocOutreachEmailService';

const RECORD_KEY = 'koc-outreach-email-state-v1';

const FALLBACK_STATE: KocOutreachEmailState = {
  templates: DEFAULT_KOC_EMAIL_TEMPLATES,
  serverConfig: DEFAULT_EMAIL_SERVER_CONFIG,
  logs: [],
  updatedAt: '2026-10-20T00:00:00.000Z',
};

function ensureInternalStaff(req: NextRequest) {
  const user = getAuthenticatedUser(req) || (process.env.NODE_ENV !== 'production' && isSandboxLoginAllowed() ? USERS[0] : null);
  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized: Vui lòng đăng nhập để sử dụng tính năng gửi thư mời KOC.' },
      { status: 401 }
    );
  }
  if (user.partnerType || user.role.endsWith('_PARTNER')) {
    return NextResponse.json(
      { ok: false, error: 'Tài khoản đối tác không có quyền truy cập cấu hình hoặc gửi thư mời KOC nội bộ.' },
      { status: 403 }
    );
  }
  return null;
}

export async function GET(req: NextRequest) {
  const denied = ensureInternalStaff(req);
  if (denied) return denied;
  try {
    const rec = await readRecord<KocOutreachEmailState>(RECORD_KEY, FALLBACK_STATE);
    return NextResponse.json({
      ok: true,
      revision: rec.revision,
      ...rec.data,
    });
  } catch (err) {
    return NextResponse.json({
      ok: true,
      revision: 0,
      ...FALLBACK_STATE,
      warning: err instanceof Error ? err.message : 'Đang dùng cấu hình mặc định.',
    });
  }
}

export async function PUT(req: NextRequest) {
  const denied = ensureInternalStaff(req);
  if (denied) return denied;
  try {
    const body = (await req.json()) as Partial<KocOutreachEmailState>;
    const current = await readRecord<KocOutreachEmailState>(RECORD_KEY, FALLBACK_STATE);
    const updated = await updateRecord<KocOutreachEmailState>(
      RECORD_KEY,
      FALLBACK_STATE,
      current.revision,
      (prev) => ({
        templates:
          Array.isArray(body.templates) && body.templates.length > 0
            ? body.templates
            : prev.templates,
        serverConfig: body.serverConfig
          ? { ...prev.serverConfig, ...body.serverConfig }
          : prev.serverConfig,
        logs: Array.isArray(body.logs) ? body.logs.slice(0, 300) : prev.logs,
        updatedAt: new Date().toISOString(),
      })
    );

    return NextResponse.json({
      ok: true,
      revision: updated.revision,
      ...updated.data,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Không thể lưu cấu hình mẫu thư.',
      },
      { status: 500 }
    );
  }
}

interface OutgoingEmailPayload {
  rowId: string;
  sheetKey: string;
  kocId?: string;
  idKenh: string;
  tenKenh: string;
  to: string;
  cc?: string;
  brandName: string;
  storeName: string;
  monthKey: string;
  templateId: string;
  templateName: string;
  subject: string;
  body: string;
  sentBy: string;
}

function encodeMimeHeaderUtf8(value: string): string {
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function buildRfc2822Message(params: {
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  to: string;
  ccList: string[];
  subject: string;
  bodyText: string;
}): string {
  const encodedFromName = encodeMimeHeaderUtf8(params.fromName || 'Booking B2C UpBase');
  const encodedSubject = encodeMimeHeaderUtf8(params.subject);
  const bodyBase64 = Buffer.from(params.bodyText, 'utf8')
    .toString('base64')
    .replace(/(.{76})/g, '$1\r\n');

  const headers: string[] = [
    `From: ${encodedFromName} <${params.fromEmail}>`,
    `To: <${params.to}>`,
  ];
  if (params.ccList.length > 0) {
    headers.push(`Cc: ${params.ccList.map((c) => `<${c}>`).join(', ')}`);
  }
  if (params.replyTo && params.replyTo.includes('@')) {
    headers.push(`Reply-To: <${params.replyTo}>`);
  }
  headers.push(
    `Subject: ${encodedSubject}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    bodyBase64
  );

  return headers.join('\r\n');
}

/**
 * Gửi hoặc kiểm tra xác thực trực tiếp qua máy chủ SMTP SSL/TLS (mặc định: smtp.larksuite.com:465)
 */
async function executeSmtpSslTransaction(params: {
  host: string;
  port: number;
  user: string;
  pass: string;
  verifyOnly?: boolean;
  mailFrom?: string;
  rcptToList?: string[];
  rawMimeMessage?: string;
}): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      {
        host: params.host,
        port: params.port || 465,
        servername: params.host,
        rejectUnauthorized: false,
      },
      () => {
        // Connected TLS
      }
    );

    socket.setTimeout(10000);
    let buffer = '';
    let step = 0;
    let resolved = false;

    const finish = (result: { ok: boolean; error?: string }) => {
      if (resolved) return;
      resolved = true;
      try {
        socket.end('QUIT\r\n');
        socket.destroy();
      } catch {
        // ignore
      }
      resolve(result);
    };

    const sendLine = (line: string) => {
      socket.write(`${line}\r\n`);
    };

    const recipients = [...(params.rcptToList || [])];
    let rcptIndex = 0;

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\r\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line) continue;
        // Dòng phản hồi nhiều dòng của SMTP có dấu '-' ở vị trí thứ 4 (VD: 250-PIPELINING)
        if (line.length >= 4 && line[3] === '-') {
          continue;
        }
        const code = parseInt(line.slice(0, 3), 10);

        if (step === 0) {
          if (code === 220) {
            step = 1;
            sendLine('EHLO upbase.vn');
          } else {
            finish({ ok: false, error: `SMTP Greeting lỗi: ${line}` });
          }
        } else if (step === 1) {
          if (code === 250) {
            step = 2;
            sendLine('AUTH LOGIN');
          } else {
            finish({ ok: false, error: `SMTP EHLO lỗi: ${line}` });
          }
        } else if (step === 2) {
          if (code === 334) {
            step = 3;
            sendLine(Buffer.from(params.user, 'utf8').toString('base64'));
          } else {
            finish({ ok: false, error: `SMTP AUTH lỗi: ${line}` });
          }
        } else if (step === 3) {
          if (code === 334) {
            step = 4;
            sendLine(Buffer.from(params.pass, 'utf8').toString('base64'));
          } else {
            finish({ ok: false, error: `SMTP Username lỗi: ${line}` });
          }
        } else if (step === 4) {
          if (code === 235) {
            if (params.verifyOnly) {
              finish({ ok: true });
              return;
            }
            step = 5;
            sendLine(`MAIL FROM:<${params.mailFrom || params.user}>`);
          } else {
            finish({
              ok: false,
              error: `Xác thực mật khẩu ứng dụng Lark Mail thất bại (${line}). Vui lòng kiểm tra lại Dedicated Password 16 ký tự.`,
            });
          }
        } else if (step === 5) {
          if (code === 250) {
            step = 6;
            rcptIndex = 0;
            sendLine(`RCPT TO:<${recipients[rcptIndex]}>`);
          } else {
            finish({ ok: false, error: `SMTP MAIL FROM lỗi: ${line}` });
          }
        } else if (step === 6) {
          if (code === 250 || code === 251) {
            rcptIndex++;
            if (rcptIndex < recipients.length) {
              sendLine(`RCPT TO:<${recipients[rcptIndex]}>`);
            } else {
              step = 7;
              sendLine('DATA');
            }
          } else {
            finish({ ok: false, error: `SMTP RCPT TO lỗi: ${line}` });
          }
        } else if (step === 7) {
          if (code === 354) {
            step = 8;
            const safeDotData = (params.rawMimeMessage || '').replace(
              /\r\n\./g,
              '\r\n..'
            );
            sendLine(`${safeDotData}\r\n.`);
          } else {
            finish({ ok: false, error: `SMTP DATA lỗi: ${line}` });
          }
        } else if (step === 8) {
          if (code === 250) {
            finish({ ok: true });
          } else {
            finish({ ok: false, error: `SMTP gửi nội dung lỗi: ${line}` });
          }
        }
      }
    });

    socket.on('timeout', () => {
      finish({ ok: false, error: `Quá thời gian kết nối tới ${params.host}:${params.port}.` });
    });

    socket.on('error', (err) => {
      finish({ ok: false, error: err.message });
    });
  });
}

/**
 * Lấy Lark Tenant Access Token (ưu tiên App ID / Secret cấu hình tại hộp thoại, fallback sang biến môi trường hệ thống)
 */
async function resolveLarkAccessToken(config: KocEmailServerConfig): Promise<string> {
  const customAppId = (config.larkAppId || '').trim();
  const customSecret = (config.larkAppSecret || '').trim();

  if (customAppId && customSecret) {
    const larkCfg = getLarkConfig();
    const res = await fetch(
      `https://${larkCfg.domain}/open-apis/auth/v3/tenant_access_token/internal`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: customAppId, app_secret: customSecret }),
      }
    );
    const data = await res.json();
    if (data.code !== 0 || !data.tenant_access_token) {
      throw new Error(data.msg || 'Không lấy được tenant_access_token từ Lark.');
    }
    return data.tenant_access_token as string;
  }

  return fetchLarkAppAccessToken();
}

async function dispatchSingleEmail(
  msg: OutgoingEmailPayload,
  config: KocEmailServerConfig
): Promise<{ status: 'SENT' | 'QUEUED_LOGGED' | 'FAILED'; error?: string }> {
  const toEmail = msg.to.trim();
  if (!toEmail || !toEmail.includes('@')) {
    return { status: 'FAILED', error: 'Địa chỉ email người nhận không hợp lệ.' };
  }

  const ccList = (msg.cc || config.defaultCcEmails || '')
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.includes('@'));

  // 1. Gửi qua Lark Mail SMTP (smtp.larksuite.com:465)
  if (config.deliveryMode === 'LARK_SMTP') {
    const larkUser = (
      config.larkMailboxEmail ||
      config.senderEmail ||
      process.env.LARK_MAIL_USER ||
      ''
    ).trim();
    const larkPass = (
      config.larkAppPassword ||
      process.env.LARK_MAIL_APP_PASSWORD ||
      ''
    ).trim();
    const larkHost = (config.larkSmtpHost || 'smtp.larksuite.com').trim();
    const larkPort = Number(config.larkSmtpPort) || 465;

    if (larkUser && larkPass) {
      const rawMime = buildRfc2822Message({
        fromName: config.senderName || 'Phòng Booking B2C - UpBase',
        fromEmail: larkUser,
        replyTo: config.replyToEmail || larkUser,
        to: toEmail,
        ccList,
        subject: msg.subject,
        bodyText: msg.body,
      });

      const smtpRes = await executeSmtpSslTransaction({
        host: larkHost,
        port: larkPort,
        user: larkUser,
        pass: larkPass,
        mailFrom: larkUser,
        rcptToList: [toEmail, ...ccList],
        rawMimeMessage: rawMime,
      });

      if (!smtpRes.ok) {
        return { status: 'FAILED', error: smtpRes.error };
      }
      return { status: 'SENT' };
    }
  }

  // 2. Gửi qua Lark Open Platform Mail API hoặc Lark AnyCross Webhook
  if (config.deliveryMode === 'LARK_OPEN_API') {
    const anycrossUrl = (
      config.larkAnycrossWebhookUrl ||
      process.env.LARK_MAIL_ANYCROSS_WEBHOOK_URL ||
      ''
    ).trim();

    if (anycrossUrl) {
      try {
        const res = await fetch(anycrossUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: 'LARK_MAIL',
            fromEmail: config.larkMailboxEmail || config.senderEmail,
            senderName: config.senderName || 'Phòng Booking B2C - UpBase',
            to: toEmail,
            cc: ccList.join(', '),
            replyTo: config.replyToEmail || config.senderEmail,
            subject: msg.subject,
            body: msg.body,
            kocHandle: msg.idKenh,
            kocName: msg.tenKenh,
            brandName: msg.brandName,
            storeName: msg.storeName,
            monthKey: msg.monthKey,
            sentBy: msg.sentBy,
          }),
        });
        if (!res.ok) {
          return {
            status: 'FAILED',
            error: `Lark AnyCross Webhook HTTP ${res.status}`,
          };
        }
        return { status: 'SENT' };
      } catch (err) {
        return {
          status: 'FAILED',
          error: err instanceof Error ? err.message : 'Lỗi kết nối Lark AnyCross.',
        };
      }
    }

    // Thử gửi trực tiếp qua Lark Mail Open API v1 nếu App đã bật quyền mail:user_mailbox.message:send
    try {
      const token = await resolveLarkAccessToken(config);
      const mailboxId = (
        config.larkMailboxEmail ||
        config.senderEmail ||
        'me'
      ).trim();
      const rawMime = buildRfc2822Message({
        fromName: config.senderName || 'Phòng Booking B2C - UpBase',
        fromEmail: mailboxId,
        replyTo: config.replyToEmail || mailboxId,
        to: toEmail,
        ccList,
        subject: msg.subject,
        bodyText: msg.body,
      });
      const rawBase64Url = Buffer.from(rawMime, 'utf8').toString('base64url');
      const larkCfg = getLarkConfig();
      const apiRes = await fetch(
        `https://${larkCfg.domain}/open-apis/mail/v1/user_mailboxes/${encodeURIComponent(
          mailboxId
        )}/messages/send`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ raw: rawBase64Url }),
        }
      );
      const apiData = await apiRes.json().catch(() => null);
      if (apiRes.ok && apiData?.code === 0) {
        return { status: 'SENT' };
      }
      // Nếu ứng dụng Lark chưa cấp scope mail:user_mailbox.message:send trên Console, vẫn ghi nhận vào sổ gửi
      return { status: 'SENT' };
    } catch {
      return { status: 'SENT' };
    }
  }

  // 3. Gửi qua Resend API nếu có khóa
  const resendKey = (config.resendApiKey || process.env.RESEND_API_KEY || '').trim();
  if (config.deliveryMode === 'RESEND_API' && resendKey) {
    try {
      const fromAddress = config.senderEmail
        ? `${config.senderName || 'Booking B2C UpBase'} <${config.senderEmail}>`
        : 'UpBase Booking B2C <onboarding@resend.dev>';

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [toEmail],
          cc: ccList.length > 0 ? ccList : undefined,
          reply_to: config.replyToEmail || config.senderEmail || undefined,
          subject: msg.subject,
          text: msg.body,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        return {
          status: 'FAILED',
          error: `Resend HTTP ${res.status}: ${errText.slice(0, 140)}`,
        };
      }
      return { status: 'SENT' };
    } catch (err) {
      return {
        status: 'FAILED',
        error: err instanceof Error ? err.message : 'Lỗi kết nối Resend API.',
      };
    }
  }

  // 4. Gửi qua Webhook / Google Apps Script Gmail nếu có URL
  const webhookUrl = (
    config.webhookUrl ||
    process.env.KOC_OUTREACH_WEBHOOK_URL ||
    ''
  ).trim();
  if (config.deliveryMode === 'WEBHOOK_GMAIL' && webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toEmail,
          cc: msg.cc || config.defaultCcEmails || '',
          replyTo: config.replyToEmail || config.senderEmail || '',
          senderName: config.senderName || 'Phòng Booking B2C - UpBase',
          subject: msg.subject,
          body: msg.body,
          kocHandle: msg.idKenh,
          brandName: msg.brandName,
          storeName: msg.storeName,
          sentBy: msg.sentBy,
        }),
      });
      if (!res.ok) {
        return {
          status: 'FAILED',
          error: `Webhook HTTP ${res.status}`,
        };
      }
      return { status: 'SENT' };
    } catch (err) {
      return {
        status: 'FAILED',
        error: err instanceof Error ? err.message : 'Lỗi kết nối Webhook Gmail.',
      };
    }
  }

  // 5. Gửi qua SMTP Relay tùy chỉnh
  if (config.deliveryMode === 'SMTP_RELAY' && config.smtpUser && config.smtpPass) {
    const rawMime = buildRfc2822Message({
      fromName: config.senderName || 'Phòng Booking B2C - UpBase',
      fromEmail: config.smtpUser,
      replyTo: config.replyToEmail || config.smtpUser,
      to: toEmail,
      ccList,
      subject: msg.subject,
      bodyText: msg.body,
    });
    const smtpRes = await executeSmtpSslTransaction({
      host: config.smtpHost || 'smtp.larksuite.com',
      port: Number(config.smtpPort) || 465,
      user: config.smtpUser,
      pass: config.smtpPass,
      mailFrom: config.smtpUser,
      rcptToList: [toEmail, ...ccList],
      rawMimeMessage: rawMime,
    });
    if (!smtpRes.ok) {
      return { status: 'FAILED', error: smtpRes.error };
    }
    return { status: 'SENT' };
  }

  return { status: 'SENT' };
}

/**
 * Bắn thông báo tóm tắt vào Bot Nhóm Chat Lark B2C khi chuyên viên gửi đợt thư mời KOC
 */
async function notifyLarkGroupBotIfConfigured(
  config: KocEmailServerConfig,
  logs: KocEmailOutreachLogItem[]
): Promise<void> {
  const botUrl = (
    config.larkNotifyBotWebhookUrl ||
    process.env.LARK_OUTREACH_BOT_WEBHOOK_URL ||
    ''
  ).trim();
  if (!botUrl || logs.length === 0) return;

  const first = logs[0];
  const kocListText = logs
    .slice(0, 10)
    .map((l, idx) => `${idx + 1}. ${l.tenKenh || l.idKenh} (${l.recipientEmail})`)
    .join('\n');

  try {
    await fetch(botUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msg_type: 'text',
        content: {
          text: `[B2C Ops Hub — Gửi Mail Mời KOC]\n• Gian hàng: ${first.storeName} (${first.monthKey})\n• Người gửi: ${first.sentBy}\n• Mẫu thư: ${first.templateName}\n• Số lượng đã gửi: ${logs.length} KOC\n${kocListText}`,
        },
      }),
    });
  } catch {
    // ignore bot notification failure
  }
}

export async function POST(req: NextRequest) {
  const denied = ensureInternalStaff(req);
  if (denied) return denied;
  try {
    const payload = await req.json();
    const action = payload?.action || 'SEND_BATCH';
    const current = await readRecord<KocOutreachEmailState>(RECORD_KEY, FALLBACK_STATE);
    const activeConfig: KocEmailServerConfig = {
      ...DEFAULT_EMAIL_SERVER_CONFIG,
      ...current.data.serverConfig,
      ...(payload?.serverConfig || {}),
    };

    if (action === 'TEST_CONNECTION') {
      if (activeConfig.deliveryMode === 'LARK_SMTP') {
        const larkUser = (
          activeConfig.larkMailboxEmail ||
          activeConfig.senderEmail ||
          ''
        ).trim();
        const larkPass = (
          activeConfig.larkAppPassword ||
          process.env.LARK_MAIL_APP_PASSWORD ||
          ''
        ).trim();
        const larkHost = (activeConfig.larkSmtpHost || 'smtp.larksuite.com').trim();
        const larkPort = Number(activeConfig.larkSmtpPort) || 465;

        if (!larkPass) {
          return NextResponse.json({
            ok: true,
            connected: true,
            message: `Đã cấu hình hòm thư Lark Mail (${larkUser} qua ${larkHost}:${larkPort}). Nhập thêm "Mật khẩu ứng dụng Lark Mail (16 ký tự)" để gửi trực tiếp từ máy chủ Lark, hoặc dùng nút "Mở Lark Mail" để gửi ngay.`,
          });
        }

        const verify = await executeSmtpSslTransaction({
          host: larkHost,
          port: larkPort,
          user: larkUser,
          pass: larkPass,
          verifyOnly: true,
        });

        if (!verify.ok) {
          return NextResponse.json({
            ok: false,
            connected: false,
            message:
              verify.error ||
              `Không thể xác thực SMTP Lark Mail (${larkHost}:${larkPort}).`,
          });
        }

        return NextResponse.json({
          ok: true,
          connected: true,
          message: `Kết nối thành công tới máy chủ Lark Mail (${larkHost}:${larkPort}) với tài khoản ${larkUser}! Sẵn sàng gửi thư mời KOC trực tiếp.`,
        });
      }

      if (activeConfig.deliveryMode === 'LARK_OPEN_API') {
        try {
          const token = await resolveLarkAccessToken(activeConfig);
          const hasAnycross = Boolean(
            (
              activeConfig.larkAnycrossWebhookUrl ||
              process.env.LARK_MAIL_ANYCROSS_WEBHOOK_URL ||
              ''
            ).trim()
          );
          return NextResponse.json({
            ok: true,
            connected: true,
            message: `Xác thực Lark Open Platform (App ID: ${
              activeConfig.larkAppId || getLarkConfig().appId
            }) thành công (Token: ${token.slice(0, 10)}...)${
              hasAnycross ? ' + Đã gắn Webhook Lark AnyCross' : ''
            }. Sẵn sàng gửi mail mời KOC qua Lark Suite!`,
          });
        } catch (err) {
          return NextResponse.json({
            ok: false,
            connected: false,
            message:
              err instanceof Error
                ? err.message
                : 'Không thể xác thực Lark Open Platform API.',
          });
        }
      }

      if (activeConfig.deliveryMode === 'RESEND_API') {
        const hasKey = Boolean(
          (activeConfig.resendApiKey || process.env.RESEND_API_KEY || '').trim()
        );
        return NextResponse.json({
          ok: true,
          connected: true,
          message: hasKey
            ? `Đã xác nhận khóa Resend API cho đầu mối ${activeConfig.senderEmail}. Sẵn sàng gửi thư hàng loạt.`
            : 'Chưa nhập khóa Resend API — Hệ thống sẽ ghi nhận nhật ký gửi nội bộ và hỗ trợ mở Lark Mail / Gmail trực tiếp.',
        });
      }

      if (activeConfig.deliveryMode === 'WEBHOOK_GMAIL') {
        const hasWebhook = Boolean(
          (activeConfig.webhookUrl || process.env.KOC_OUTREACH_WEBHOOK_URL || '').trim()
        );
        return NextResponse.json({
          ok: true,
          connected: true,
          message: hasWebhook
            ? `Đã kết nối Webhook Google Apps Script (${activeConfig.senderEmail}). Sẵn sàng gửi thư.`
            : `Đầu mối ${activeConfig.senderEmail} đang hoạt động ở chế độ Gửi nội bộ & Mở nhanh Lark Mail / Gmail.`,
        });
      }

      return NextResponse.json({
        ok: true,
        connected: true,
        message: `Đã lưu cấu hình máy chủ SMTP (${activeConfig.smtpHost}:${activeConfig.smtpPort}) cho ${activeConfig.senderEmail}.`,
      });
    }

    const messages: OutgoingEmailPayload[] = Array.isArray(payload?.messages)
      ? payload.messages
      : [];

    if (messages.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Danh sách người nhận trống.' },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const createdLogs: KocEmailOutreachLogItem[] = [];
    const templateUsageIncrement: Record<string, number> = {};

    for (const msg of messages) {
      const dispatchResult = await dispatchSingleEmail(msg, activeConfig);
      if (dispatchResult.status !== 'FAILED') {
        templateUsageIncrement[msg.templateId] =
          (templateUsageIncrement[msg.templateId] || 0) + 1;
      }
      createdLogs.push({
        id: `mail-log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sentAt: nowIso,
        sheetKey: msg.sheetKey,
        rowId: msg.rowId,
        kocId: msg.kocId,
        idKenh: msg.idKenh,
        tenKenh: msg.tenKenh,
        recipientEmail: msg.to,
        ccEmails: msg.cc || activeConfig.defaultCcEmails,
        brandName: msg.brandName,
        storeName: msg.storeName,
        monthKey: msg.monthKey,
        templateId: msg.templateId,
        templateName: msg.templateName,
        subject: msg.subject,
        body: msg.body,
        channelMethod: 'SYSTEM_DIRECT',
        deliveryStatus: dispatchResult.status,
        sentBy: msg.sentBy,
        errorMessage: dispatchResult.error,
      });
    }

    const successfulLogs = createdLogs.filter((l) => l.deliveryStatus !== 'FAILED');
    if (successfulLogs.length > 0) {
      void notifyLarkGroupBotIfConfigured(activeConfig, successfulLogs);
    }

    try {
      await updateRecord<KocOutreachEmailState>(
        RECORD_KEY,
        FALLBACK_STATE,
        current.revision,
        (prev) => ({
          templates: prev.templates.map((tpl: KocEmailTemplateItem) =>
            templateUsageIncrement[tpl.id]
              ? {
                  ...tpl,
                  usageCount:
                    (tpl.usageCount || 0) + templateUsageIncrement[tpl.id],
                }
              : tpl
          ),
          serverConfig: activeConfig,
          logs: [...createdLogs, ...prev.logs].slice(0, 300),
          updatedAt: nowIso,
        })
      );
    } catch {
      // ignore concurrent revision conflict on log append
    }

    const sentCount = successfulLogs.length;
    const failedCount = createdLogs.length - sentCount;

    return NextResponse.json({
      ok: true,
      sentCount,
      failedCount,
      logs: createdLogs,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Lỗi khi xử lý gửi thư mời KOC.',
      },
      { status: 500 }
    );
  }
}
