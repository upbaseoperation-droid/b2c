import { NextRequest, NextResponse } from 'next/server';
import { decodeSessionToken, SESSION_COOKIE_NAME } from '@/lib/larkAuth';
import { INITIAL_THIRD_PARTY_ACCOUNTS, convertPartnerAccountToUserProfile } from '@/lib/thirdPartyAccessData';
import { canAccess, canDecide, HubError, parseEntry, requireHub } from '@/lib/partnerHub/domain';
import { hubScopes, resolveScope } from '@/lib/partnerHub/scopes';
import { appendEntry, readThread } from '@/lib/partnerHub/store';
import type { HubThread } from '@/lib/partnerHub/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
function actorFor(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const actor = token ? decodeSessionToken(token) : null;
  requireHub(actor && actor.canLogin !== false, 'Vui lòng đăng nhập lại.', 401);
  if (actor.partnerType || actor.role.endsWith('_PARTNER')) {
    // The existing partner login is a demo email selector, not verified OAuth.
    requireHub(process.env.NODE_ENV !== 'production', 'Cần xác thực tài khoản đối tác trước khi mở trao đổi trên môi trường thật.', 403);
    const account = INITIAL_THIRD_PARTY_ACCOUNTS.find(a => a.status === 'ACTIVE' && (
      `partner_${a.id}` === actor.id ||
      (a.gmail.toLowerCase() === actor.email.toLowerCase() && a.partnerType === actor.partnerType && a.linkedEntityId === actor.linkedEntityId)
    ));
    requireHub(account, 'Tài khoản đối tác không còn quyền truy cập.', 403);
    return convertPartnerAccountToUserProfile(account);
  }
  return actor;
}
function failure(error: unknown) {
  return json({ error: error instanceof HubError ? error.message : 'Không thể lưu/đọc trao đổi. Vui lòng thử lại hoặc kiểm tra kho dữ liệu.' }, error instanceof HubError ? error.status : 503);
}
function page(thread: HubThread, before?: string | null) {
  let end = thread.entries.length;
  if (before) {
    end = thread.entries.findIndex(e => e.clientId === before);
    requireHub(end >= 0, 'Mốc hội thoại không hợp lệ.');
  }
  const start = Math.max(0, end - 50);
  return { thread: { ...thread, entries: thread.entries.slice(start, end) }, hasMore: start > 0 };
}
export async function GET(request: NextRequest) {
  try {
    const actor = actorFor(request);
    const key = request.nextUrl.searchParams.get('key');
    if (!key) {
      const root = request.nextUrl.searchParams.get('root');
      const family = request.nextUrl.searchParams.get('family');
      const scopes = hubScopes().filter(s => (!root || s.root === root) && (!family || s.partnerType === family) && canAccess(actor, s));
      const rooms = await Promise.all(scopes.map(async s => {
        const thread = await readThread(s);
        return { key: s.key, title: s.title, revision: thread.revision, decision: s.proposalVersion ? thread.decision : undefined, proposalVersion: s.proposalVersion, lastEntry: thread.entries.at(-1) };
      }));
      return json({ rooms });
    }
    const scope = resolveScope(key);
    requireHub(canAccess(actor, scope), 'Bạn không có quyền vào cuộc trao đổi này.', 403);
    return json({ ...page(await readThread(scope), request.nextUrl.searchParams.get('before')), title: scope.title, canDecide: canDecide(actor, scope) });
  } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    requireHub(!origin || origin === request.nextUrl.origin, 'Nguồn gửi không hợp lệ.', 403);
    const actor = actorFor(request);
    const raw = await request.text();
    requireHub(raw.length <= 24000, 'Nội dung gửi quá dài.', 413);
    let body;
    try { body = JSON.parse(raw); } catch { throw new HubError('Dữ liệu gửi không hợp lệ.'); }
    requireHub(body && typeof body.key === 'string', 'Thiếu mã cuộc trao đổi.');
    const scope = resolveScope(body.key);
    requireHub(canAccess(actor, scope), 'Bạn không có quyền vào cuộc trao đổi này.', 403);
    return json({ ...page(await appendEntry(scope, actor, parseEntry(body))), title: scope.title, canDecide: canDecide(actor, scope) });
  } catch (error) { return failure(error); }
}
