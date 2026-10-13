import { mkdir, readFile, writeFile, rename, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import prisma from '../prisma';
import { ContractError, requireCondition } from './domain';
import type { ContractRecord } from './types';
const local = () => process.env.NODE_ENV !== 'production' && process.env.CONTRACT_STORAGE !== 'postgres';
const directory = () => path.resolve(process.env.CONTRACT_DATA_DIR || path.join(process.cwd(), '.contract-data'));
async function localRecords(): Promise<ContractRecord[]> {
  try { return JSON.parse(await readFile(path.join(directory(), 'records.json'), 'utf8')); }
  catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []; throw e; }
}
export async function listContracts(): Promise<ContractRecord[]> {
  if (local()) return localRecords();
  const rows = await prisma.$queryRaw<Array<{ data: ContractRecord }>>`SELECT data FROM "ContractHubRecord" ORDER BY "updatedAt" DESC`;
  return rows.map(r => r.data);
}
export async function getContract(id: string) { const record = (await listContracts()).find(r => r.id === id); requireCondition(record, 'Không tìm thấy hồ sơ.', 404); return record; }
export async function saveContract(record: ContractRecord, expected?: number) {
  const next = structuredClone(record); next.revision = expected === undefined ? 1 : expected + 1;
  if (!local()) {
    await prisma.$transaction(async tx => {
      for (const attempt of next.signing) {
        const binding = await tx.$queryRaw<Array<{ contractId: string }>>`SELECT "contractId" FROM "ContractWeSignBinding" WHERE "documentId"=${attempt.documentId}`;
        requireCondition(!binding.length || binding[0].contractId === next.id, 'Luồng weSign đã liên kết hồ sơ khác.', 409);
        if (!binding.length) await tx.$executeRaw`INSERT INTO "ContractWeSignBinding" ("documentId", "contractId") VALUES (${attempt.documentId}, ${next.id})`;
      }
      if (expected === undefined) await tx.$executeRaw`INSERT INTO "ContractHubRecord" (id, revision, data, "updatedAt") VALUES (${next.id}, 1, ${JSON.stringify(next)}::jsonb, NOW())`;
      else {
        const count = await tx.$executeRaw`UPDATE "ContractHubRecord" SET revision=${next.revision}, data=${JSON.stringify(next)}::jsonb, "updatedAt"=NOW() WHERE id=${next.id} AND revision=${expected}`;
        requireCondition(count === 1, 'Hồ sơ đã được người khác cập nhật. Vui lòng tải lại.', 409);
      }
    });
    return next;
  }
  await mkdir(directory(), { recursive: true });
  let lock;
  try { lock = await open(path.join(directory(), 'records.lock'), 'wx'); }
  catch { throw new ContractError('Hồ sơ đang được cập nhật. Vui lòng thử lại.', 409); }
  const temp = path.join(directory(), `${randomUUID()}.tmp`);
  try {
    const records = await localRecords(); const index = records.findIndex(r => r.id === next.id);
    requireCondition(!records.some(r => r.id !== next.id && r.signing.some(s => next.signing.some(n => n.documentId === s.documentId))), 'Luồng weSign đã liên kết hồ sơ khác.', 409);
    requireCondition(expected === undefined ? index < 0 : index >= 0 && records[index].revision === expected, 'Hồ sơ đã được người khác cập nhật. Vui lòng tải lại.', 409);
    if (index < 0) records.push(next); else records[index] = next;
    await writeFile(temp, JSON.stringify(records), { mode: 0o600 }); await rename(temp, path.join(directory(), 'records.json')); return next;
  } finally { await lock.close(); await unlink(path.join(directory(), 'records.lock')); await unlink(temp).catch(() => undefined); }
}
export const storageMode = () => local() ? 'LOCAL_DEVELOPMENT' : 'POSTGRES';
