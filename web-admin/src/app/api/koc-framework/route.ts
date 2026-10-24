import { NextRequest, NextResponse } from 'next/server';
import { readRecord, updateRecord, RecordError } from '@/lib/server/sharedRecords';
import { getPlanActor, unauthorized } from '../monthly-plans/_shared';
import { normHandle, type FrameworkContract } from '@/lib/dealBoardRules';

export const dynamic = 'force-dynamic';

const KEY = 'koc-framework-contracts';
interface FrameworkData {
  items: FrameworkContract[];
}
const EMPTY: FrameworkData = { items: [] };
const MAX_ITEMS = 20000;

const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const day = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : '');

function fail(e: unknown) {
  if (e instanceof RecordError) return NextResponse.json({ error: e.message }, { status: e.status });
  return NextResponse.json({ error: 'Không truy cập được sổ hợp đồng nguyên tắc. Thử lại sau.' }, { status: 503 });
}

// GET /api/koc-framework?handles=a,b — hợp đồng nguyên tắc của các KOC (hỗ trợ cả HĐNT MCN dùng chung cho nhiều kênh coveredHandles)
export async function GET(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  try {
    const rec = await readRecord<FrameworkData>(KEY, EMPTY);
    const allItems = rec.data.items || [];
    const raw = request.nextUrl.searchParams.get('handles');
    if (!raw) return NextResponse.json({ items: allItems });
    const wanted = Array.from(new Set(raw.split(',').map(normHandle).filter(Boolean)));
    const directMap = new Map(allItems.map(i => [i.id, i]));
    const result: FrameworkContract[] = [];
    for (const h of wanted) {
      const direct = directMap.get(h);
      if (direct) {
        result.push(direct);
        continue;
      }
      const mcnShared = allItems.find(i => (i.coveredHandles || []).map(normHandle).includes(h));
      if (mcnShared) {
        result.push({ ...mcnShared, id: h, handle: h });
      }
    }
    return NextResponse.json({ items: result });
  } catch (e) {
    return fail(e);
  }
}

// PUT /api/koc-framework — ghi (thêm hoặc sửa) hợp đồng nguyên tắc của một KOC hoặc MCN
export async function PUT(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  try {
    if (request.headers.get('origin') !== request.nextUrl.origin) throw new RecordError('Yêu cầu không xuất phát từ ứng dụng.', 403);
    const body = (await request.json()) as Partial<FrameworkContract>;
    const id = normHandle(body.handle || '');
    if (!id) throw new RecordError('Thiếu ID kênh của KOC.', 400);
    const contractNo = s(body.contractNo, 80);
    const signedAt = day(body.signedAt);
    const validTo = day(body.validTo);
    if (!contractNo) throw new RecordError('Cần nhập số hợp đồng nguyên tắc.', 400);
    if (!signedAt) throw new RecordError('Cần nhập ngày ký.', 400);
    if (validTo && validTo < signedAt) throw new RecordError('Ngày hết hiệu lực không được trước ngày ký.', 400);
    const entityType =
      body.entityType === 'HOUSEHOLD' || body.entityType === 'COMPANY' ? body.entityType : 'INDIVIDUAL';
    const hardcopyStatus =
      body.hardcopyStatus === 'HARDCOPY_PENDING' ||
      body.hardcopyStatus === 'HARDCOPY_SENT_TO_KOC' ||
      body.hardcopyStatus === 'HARDCOPY_RETURNED_TO_ACCOUNTING'
        ? body.hardcopyStatus
        : 'ESIGN_VERIFIED';
    const coveredHandles = Array.isArray(body.coveredHandles)
      ? Array.from(new Set(body.coveredHandles.map(x => normHandle(String(x || ''))).filter(Boolean))).slice(0, 200)
      : undefined;
    const entry: FrameworkContract = {
      id,
      handle: id,
      contractNo,
      signedAt,
      validTo,
      fileUrl: s(body.fileUrl, 1000),
      note: s(body.note, 500),
      updatedBy: actor.name,
      updatedAt: new Date().toISOString(),
      entityType,
      legalName: s(body.legalName, 160),
      taxOrCccd: s(body.taxOrCccd, 60),
      bankName: s(body.bankName, 120),
      bankAccount: s(body.bankAccount, 80),
      bankHolder: s(body.bankHolder, 160),
      authorizationUrl: s(body.authorizationUrl, 1000),
      hardcopyStatus,
      hardcopyDueAt: day(body.hardcopyDueAt),
      coveredHandles,
    };
    // Ghi theo từng KOC, thử lại khi người khác vừa lưu
    for (let attempt = 0; attempt < 4; attempt++) {
      const current = await readRecord<FrameworkData>(KEY, EMPTY);
      const list = current.data.items || [];
      const next = list.some(i => i.id === id) ? list.map(i => (i.id === id ? entry : i)) : [...list, entry];
      if (next.length > MAX_ITEMS) throw new RecordError('Sổ hợp đồng nguyên tắc đã đầy.', 400);
      try {
        await updateRecord<FrameworkData>(KEY, EMPTY, current.revision, () => ({ items: next }));
        return NextResponse.json({ item: entry });
      } catch (e) {
        if (!(e instanceof RecordError && e.status === 409) || attempt === 3) throw e;
      }
    }
    throw new RecordError('Không lưu được, thử lại sau.', 409);
  } catch (e) {
    return fail(e);
  }
}
