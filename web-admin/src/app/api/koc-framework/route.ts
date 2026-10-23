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

// GET /api/koc-framework?handles=a,b — hợp đồng nguyên tắc của các KOC (bỏ trống = toàn bộ)
export async function GET(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  try {
    const rec = await readRecord<FrameworkData>(KEY, EMPTY);
    const raw = request.nextUrl.searchParams.get('handles');
    const wanted = raw ? new Set(raw.split(',').map(normHandle).filter(Boolean)) : null;
    const items = (rec.data.items || []).filter(i => !wanted || wanted.has(i.id));
    return NextResponse.json({ items });
  } catch (e) {
    return fail(e);
  }
}

// PUT /api/koc-framework — ghi (thêm hoặc sửa) hợp đồng nguyên tắc của một KOC
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
