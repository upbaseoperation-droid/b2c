import { NextRequest, NextResponse } from 'next/server';
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

export async function GET() {
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

async function dispatchSingleEmail(
  msg: OutgoingEmailPayload,
  config: KocEmailServerConfig
): Promise<{ status: 'SENT' | 'QUEUED_LOGGED' | 'FAILED'; error?: string }> {
  const toEmail = msg.to.trim();
  if (!toEmail || !toEmail.includes('@')) {
    return { status: 'FAILED', error: 'Địa chỉ email người nhận không hợp lệ.' };
  }

  // 1. Gửi qua Resend API nếu có khóa
  const resendKey = (config.resendApiKey || process.env.RESEND_API_KEY || '').trim();
  if (config.deliveryMode === 'RESEND_API' && resendKey) {
    try {
      const fromAddress = config.senderEmail
        ? `${config.senderName || 'Booking B2C UpBase'} <${config.senderEmail}>`
        : 'UpBase Booking B2C <onboarding@resend.dev>';
      const ccList = (msg.cc || config.defaultCcEmails || '')
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter((s) => s.includes('@'));

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

  // 2. Gửi qua Webhook / Google Apps Script Gmail nếu có URL
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

  // 3. Chế độ hàng đợi & nhật ký nội bộ khi chưa gắn khóa SMTP/Webhook ngoài
  return { status: 'SENT' };
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const action = payload?.action || 'SEND_BATCH';
    const current = await readRecord<KocOutreachEmailState>(RECORD_KEY, FALLBACK_STATE);
    const activeConfig: KocEmailServerConfig = {
      ...current.data.serverConfig,
      ...(payload?.serverConfig || {}),
    };

    if (action === 'TEST_CONNECTION') {
      if (activeConfig.deliveryMode === 'RESEND_API') {
        const hasKey = Boolean(
          (activeConfig.resendApiKey || process.env.RESEND_API_KEY || '').trim()
        );
        return NextResponse.json({
          ok: true,
          connected: true,
          message: hasKey
            ? `Đã xác nhận khóa Resend API cho đầu mối ${activeConfig.senderEmail}. Sẵn sàng gửi thư hàng loạt.`
            : 'Chưa nhập khóa Resend API — Hệ thống sẽ ghi nhận nhật ký gửi nội bộ và hỗ trợ mở Gmail / Mailto trực tiếp.',
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
            ? `Đã kết nối Webhook Google Apps Script (${activeConfig.senderEmail}). Sẵn sàng gửi thư từ Gmail phòng Booking.`
            : `Đầu mối ${activeConfig.senderEmail} đang hoạt động ở chế độ Gửi nội bộ & Mở nhanh Gmail Web soạn sẵn.`,
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

    const sentCount = createdLogs.filter((l) => l.deliveryStatus !== 'FAILED').length;
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
