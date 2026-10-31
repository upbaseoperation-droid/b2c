import { mkdir, readFile, writeFile, rename, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import prisma from '../prisma';
import { isPostgresStorageEnabled } from '../server/dbStorageMode';
import { ContractError, requireCondition } from './domain';
import { DEMO_SEED_RECORDS } from './demoSeedRecords';
import type { ContractRecord } from './types';

const local = () => !!process.env.CONTRACT_DATA_DIR || !isPostgresStorageEnabled('CONTRACT_STORAGE');
const directory = () => path.resolve(/*turbopackIgnore: true*/ process.env.CONTRACT_DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), '.contract-data'));

const PG_CONTRACT_CACHE_TTL_MS = 60_000;
let pgContractCache: {
  expiresAt: number;
  byId: Map<string, ContractRecord>;
  list: ContractRecord[];
} | null = null;

function defaultSeedRecords(): ContractRecord[] {
  return structuredClone(DEMO_SEED_RECORDS);
}

function mergeWithSeedRecords(existing: ContractRecord[]): ContractRecord[] {
  const byId = new Map<string, ContractRecord>();
  for (const r of existing) {
    if (r && r.id) byId.set(r.id, r);
  }
  for (const seed of DEMO_SEED_RECORDS) {
    const cur = byId.get(seed.id);
    if (!cur || ((seed.id === 'CTR-DEMO-2026-002' || seed.id === 'CTR-DEMO-2026-004') && !cur.googleDocsAuditTrail?.negotiationReport)) {
      byId.set(seed.id, structuredClone(seed));
    }
  }
  const priorityIds = ['CTR-DEMO-2026-002', 'CTR-DEMO-2026-004'];
  const all = Array.from(byId.values());
  all.sort((a, b) => {
    const ia = priorityIds.indexOf(a.id);
    const ib = priorityIds.indexOf(b.id);
    if (ia !== -1 || ib !== -1) {
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    }
    return (b.updatedAt || '').localeCompare(a.updatedAt || '');
  });
  return all;
}

async function localRecords(): Promise<ContractRecord[]> {
  try {
    const parsed = JSON.parse(await readFile(path.join(directory(), 'records.json'), 'utf8'));
    if (Array.isArray(parsed)) {
      return process.env.CONTRACT_DATA_DIR ? parsed : mergeWithSeedRecords(parsed);
    }
    return defaultSeedRecords();
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return process.env.CONTRACT_DATA_DIR ? [] : defaultSeedRecords();
    }
    throw e;
  }
}

export async function listContracts(): Promise<ContractRecord[]> {
  if (local()) return localRecords();
  const now = Date.now();
  if (pgContractCache && now < pgContractCache.expiresAt) {
    return pgContractCache.list;
  }
  try {
    if (pgContractCache) {
      const metaRows = await prisma.$queryRaw<Array<{ id: string; revision: number }>>`
        SELECT id, revision FROM "ContractHubRecord" ORDER BY "updatedAt" DESC
      `;
      const changedIds: string[] = [];
      for (const m of metaRows) {
        const cached = pgContractCache.byId.get(m.id);
        if (!cached || cached.revision !== Number(m.revision)) {
          changedIds.push(m.id);
        }
      }
      const nextById = new Map<string, ContractRecord>(pgContractCache.byId);
      if (changedIds.length > 0) {
        const changedRows = await prisma.$queryRaw<Array<{ id: string; data: ContractRecord }>>`
          SELECT id, data FROM "ContractHubRecord" WHERE id = ANY(${changedIds})
        `;
        for (const r of changedRows) {
          if (r.data && r.id) nextById.set(r.id, r.data);
        }
      }
      const merged = mergeWithSeedRecords(Array.from(nextById.values()));
      pgContractCache = {
        expiresAt: Date.now() + PG_CONTRACT_CACHE_TTL_MS,
        byId: new Map(merged.map(r => [r.id, r])),
        list: merged,
      };
      return merged;
    }

    const rows = await prisma.$queryRaw<Array<{ data: ContractRecord }>>`SELECT data FROM "ContractHubRecord" ORDER BY "updatedAt" DESC`;
    const merged = mergeWithSeedRecords(rows.map(r => r.data));
    pgContractCache = {
      expiresAt: Date.now() + PG_CONTRACT_CACHE_TTL_MS,
      byId: new Map(merged.map(r => [r.id, r])),
      list: merged,
    };
    return merged;
  } catch {
    return localRecords().catch(() => defaultSeedRecords());
  }
}

export async function getContract(id: string) {
  if (!local()) {
    const cached = pgContractCache?.byId.get(id);
    if (cached && Date.now() < pgContractCache!.expiresAt) {
      return cached;
    }
    try {
      if (cached) {
        const meta = await prisma.$queryRaw<Array<{ revision: number }>>`
          SELECT revision FROM "ContractHubRecord" WHERE id = ${id} LIMIT 1
        `;
        if (meta.length > 0 && Number(meta[0].revision) === cached.revision) {
          return cached;
        }
      }
      const rows = await prisma.$queryRaw<Array<{ data: ContractRecord }>>`
        SELECT data FROM "ContractHubRecord" WHERE id = ${id} LIMIT 1
      `;
      if (rows.length > 0 && rows[0].data) {
        if (pgContractCache) {
          pgContractCache.byId.set(id, rows[0].data);
        }
        return rows[0].data;
      }
    } catch {
      // Fall back to listContracts
    }
  }
  const record = (await listContracts()).find(r => r.id === id);
  requireCondition(record, 'Không tìm thấy hồ sơ.', 404);
  return record;
}

export async function saveContract(record: ContractRecord, expected?: number) {
  const next = structuredClone(record);
  next.revision = expected === undefined ? 1 : expected + 1;
  if (!local()) {
    try {
      await prisma.$transaction(async tx => {
        for (const attempt of next.signing) {
          const binding = await tx.$queryRaw<Array<{ contractId: string }>>`SELECT "contractId" FROM "ContractWeSignBinding" WHERE "documentId"=${attempt.documentId}`;
          requireCondition(!binding.length || binding[0].contractId === next.id, 'Luồng weSign đã liên kết hồ sơ khác.', 409);
          if (!binding.length) await tx.$executeRaw`INSERT INTO "ContractWeSignBinding" ("documentId", "contractId") VALUES (${attempt.documentId}, ${next.id})`;
        }
        await tx.$executeRaw`
          INSERT INTO "ContractHubRecord" (id, revision, data, "updatedAt")
          VALUES (${next.id}, ${next.revision}, ${JSON.stringify(next)}::jsonb, NOW())
          ON CONFLICT (id) DO UPDATE
          SET revision=${next.revision}, data=${JSON.stringify(next)}::jsonb, "updatedAt"=NOW()
        `;
      });
      if (pgContractCache) {
        pgContractCache.byId.set(next.id, next);
        pgContractCache.list = mergeWithSeedRecords(Array.from(pgContractCache.byId.values()));
        pgContractCache.expiresAt = Date.now() + PG_CONTRACT_CACHE_TTL_MS;
      }
      return next;
    } catch (err) {
      if (err instanceof ContractError) throw err;
    }
  }
  await mkdir(directory(), { recursive: true });
  let lock;
  try {
    lock = await open(path.join(directory(), 'records.lock'), 'wx');
  } catch {
    throw new ContractError('Hồ sơ đang được cập nhật. Vui lòng thử lại.', 409);
  }
  const temp = path.join(directory(), `${randomUUID()}.tmp`);
  try {
    const records = await localRecords();
    const index = records.findIndex(r => r.id === next.id);
    requireCondition(!records.some(r => r.id !== next.id && r.signing.some(s => next.signing.some(n => n.documentId === s.documentId))), 'Luồng weSign đã liên kết hồ sơ khác.', 409);
    requireCondition(expected === undefined ? index < 0 : index >= 0 && records[index].revision === expected, 'Hồ sơ đã được người khác cập nhật. Vui lòng tải lại.', 409);
    if (index < 0) records.push(next);
    else records[index] = next;
    await writeFile(temp, JSON.stringify(records), { mode: 0o600 });
    await rename(temp, path.join(directory(), 'records.json'));
    return next;
  } finally {
    await lock.close();
    await unlink(path.join(directory(), 'records.lock'));
    await unlink(temp).catch(() => undefined);
  }
}

export const storageMode = () => (local() ? 'LOCAL_DEVELOPMENT' : 'POSTGRES');
