import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { listContracts, saveContract } from '@/lib/contracts/store';
import { wesignDetail } from '@/lib/contracts/wesign';
import { ContractError, event, requireCondition, signingChanged } from '@/lib/contracts/domain';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Điểm nhận callback/job chỉ kích hoạt đọc lại trạng thái từ MISA, không tin trạng thái trong body.
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.WESIGN_SYNC_SECRET; const supplied = req.headers.get('authorization')?.replace(/^Bearer /, '');
    requireCondition(secret && supplied && Buffer.byteLength(secret) === Buffer.byteLength(supplied) && timingSafeEqual(Buffer.from(secret), Buffer.from(supplied)), 'Không có quyền đồng bộ.', 401);
    const records = (await listContracts()).filter(r => r.signing.length && r.signing.at(-1)!.provider !== 'DEMO' && !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(r.signing.at(-1)!.status));
    const results: Array<{ id: string; success: boolean }> = [];
    // Ưu tiên hồ sơ chưa được đồng bộ lâu nhất để không bỏ đói hồ sơ ngoài lô 50.
    records.sort((a, b) => (a.signing.at(-1)!.syncedAt || '').localeCompare(b.signing.at(-1)!.syncedAt || ''));
    for (const record of records.slice(0, 50)) {
      const next = structuredClone(record); const attempt = next.signing.at(-1)!;
      try {
        const detail = await wesignDetail(attempt.documentId);
        if (!signingChanged(attempt, detail)) { results.push({ id: record.id, success: true }); continue; }
        Object.assign(attempt, detail, { error: undefined });
        event(next, { id: 'wesign-sync', name: 'Đồng bộ MISA weSign', roles: [], brands: [] }, 'SYNC_WESIGN', String(detail.sourceStatus));
        await saveContract(next, record.revision); results.push({ id: record.id, success: true });
      } catch (e) {
        if (!(e instanceof ContractError && e.status === 409)) {
          attempt.error = e instanceof ContractError ? e.message : 'Lỗi kết nối weSign. Giữ nguyên trạng thái lần đồng bộ trước.';
          await saveContract(next, record.revision).catch(() => undefined);
        }
        results.push({ id: record.id, success: false });
      }
    }
    return NextResponse.json({ results, remaining: Math.max(0, records.length - 50) });
  } catch (e) { return NextResponse.json({ error: e instanceof ContractError ? e.message : 'Không thể đồng bộ.' }, { status: e instanceof ContractError ? e.status : 503 }); }
}
