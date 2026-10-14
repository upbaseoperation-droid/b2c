import { NextRequest, NextResponse } from 'next/server';
import { appendPlanMessage, listPlanMessages, assertPlanIdAccess } from '@/lib/server/monthlyPlanStore';
import {
  CHAT_ROLES,
  MAX_MESSAGE_LENGTH,
  USER_MESSAGE_TYPES,
  chatRoleFromUser,
  chatTitleFor,
  type UserMessageType
} from '@/lib/planChat';
import type { PlanDiscussionRole } from '@/lib/types';
import { getPlanActor, handlePlanError, unauthorized } from '../../_shared';

export const dynamic = 'force-dynamic';

const CLIENT_ID_PATTERN = /^[A-Za-z0-9._:-]{4,100}$/;
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 40;

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

// GET /api/monthly-plans/:id/messages?after=<ISO> — đọc tin trao đổi (cũ -> mới)
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  try {
    const { id } = await context.params;
    await assertPlanIdAccess(decodeURIComponent(id), actor);
    const afterRaw = request.nextUrl.searchParams.get('after');
    let after: Date | null = null;
    if (afterRaw) {
      after = new Date(afterRaw);
      if (Number.isNaN(after.getTime())) return badRequest('Mốc thời gian không hợp lệ.');
    }
    const result = await listPlanMessages(decodeURIComponent(id), after);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return handlePlanError(err);
  }
}

// POST /api/monthly-plans/:id/messages — gửi tin trao đổi (chỉ thêm, idempotent theo clientId)
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  try {
    const { id } = await context.params;
    await assertPlanIdAccess(decodeURIComponent(id), actor);
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return badRequest('Dữ liệu gửi lên không hợp lệ.');
    }
    if (!body || typeof body !== 'object') return badRequest('Dữ liệu gửi lên không hợp lệ.');

    const clientId = typeof body.clientId === 'string' ? body.clientId.trim() : '';
    if (!CLIENT_ID_PATTERN.test(clientId)) return badRequest('Mã tin nhắn không hợp lệ.');

    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (!content) return badRequest('Nội dung tin nhắn không được để trống.');
    if (content.length > MAX_MESSAGE_LENGTH) {
      return badRequest(`Nội dung tối đa ${MAX_MESSAGE_LENGTH} ký tự.`);
    }

    const type = (body.type ?? 'COMMENT') as UserMessageType;
    if (!USER_MESSAGE_TYPES.includes(type)) return badRequest('Loại tin không hợp lệ.');

    let tags: string[] | undefined;
    if (body.tags !== undefined) {
      if (!Array.isArray(body.tags) || body.tags.length > MAX_TAGS) return badRequest('Danh sách thẻ không hợp lệ.');
      tags = body.tags
        .filter((t): t is string => typeof t === 'string')
        .map(t => t.trim().slice(0, MAX_TAG_LENGTH))
        .filter(Boolean);
    }

    // Vai trò lấy từ phiên đăng nhập; chỉ ADMIN được chạy thử dưới vai trò khác
    let role: PlanDiscussionRole = chatRoleFromUser(actor);
    if (body.asRole !== undefined && body.asRole !== null) {
      if (actor.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Chỉ quản trị viên được gửi thử dưới vai trò khác.' }, { status: 403 });
      }
      if (!CHAT_ROLES.includes(body.asRole as (typeof CHAT_ROLES)[number])) return badRequest('Vai trò không hợp lệ.');
      role = body.asRole as PlanDiscussionRole;
    }

    const { message, created } = await appendPlanMessage(
      decodeURIComponent(id),
      { clientId, content, type, tags },
      { id: actor.id, name: actor.name, role, title: chatTitleFor(role, actor) }
    );
    return NextResponse.json({ message, created }, { status: created ? 201 : 200 });
  } catch (err) {
    return handlePlanError(err);
  }
}
