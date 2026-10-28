/** Server-owned versioned records. Local sandbox uses atomic files; production uses PostgreSQL. */
import { mkdir, readFile, writeFile, rename, open, unlink, stat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import prisma from '../prisma';

export class RecordError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export interface SharedRecord<T> { revision: number; data: T }
const local = () => !!process.env.SHARED_DATA_DIR || (process.env.NODE_ENV !== 'production' && process.env.SHARED_STORAGE !== 'postgres');
const directory = () => path.resolve(/*turbopackIgnore: true*/ (process.env.SHARED_DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), '.shared-data')));
function file(key: string) {
  if (!/^[a-z][a-z0-9-]{0,80}$/.test(key)) throw new RecordError('Mã dữ liệu không hợp lệ.');
  return path.join(directory(), `${key}.json`);
}

const localRecordCache = new Map<string, { mtimeMs: number; size: number; record: SharedRecord<unknown> }>();
const PG_CACHE_TTL_MS = 20_000;
const pgRecordCache = new Map<string, { expiresAt: number; record: SharedRecord<unknown> }>();
const pgInflightReads = new Map<string, Promise<SharedRecord<unknown>>>();

export async function readRecord<T>(
  key: string,
  fallback: T,
  options?: { clone?: boolean; skipCache?: boolean }
): Promise<SharedRecord<T>> {
  const shouldClone = options?.clone !== false;
  if (local()) {
    const filePath = file(key);
    try {
      const st = await stat(filePath);
      const cached = localRecordCache.get(filePath);
      if (!options?.skipCache && cached && cached.mtimeMs === st.mtimeMs && cached.size === st.size) {
        return (shouldClone ? structuredClone(cached.record) : cached.record) as SharedRecord<T>;
      }
      const parsed = JSON.parse(await readFile(filePath, 'utf8')) as SharedRecord<T>;
      localRecordCache.set(filePath, { mtimeMs: st.mtimeMs, size: st.size, record: shouldClone ? structuredClone(parsed) : parsed });
      return parsed;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
        localRecordCache.delete(filePath);
        return { revision: 0, data: fallback };
      }
      throw e;
    }
  }
  const now = Date.now();
  const cachedPg = pgRecordCache.get(key);
  if (!options?.skipCache && cachedPg && now < cachedPg.expiresAt) {
    return (shouldClone ? structuredClone(cachedPg.record) : cachedPg.record) as SharedRecord<T>;
  }
  let inflight = pgInflightReads.get(key);
  if (!inflight) {
    inflight = prisma.$queryRaw<Array<SharedRecord<T>>>`SELECT revision, data FROM "AppSharedRecord" WHERE key = ${key}`
      .then((rows) => {
        const record = rows[0] || { revision: 0, data: fallback };
        pgRecordCache.set(key, {
          expiresAt: Date.now() + PG_CACHE_TTL_MS,
          record: structuredClone(record),
        });
        return record as SharedRecord<unknown>;
      })
      .catch(() => {
        return { revision: 0, data: fallback } as SharedRecord<unknown>;
      })
      .finally(() => {
        pgInflightReads.delete(key);
      });
    pgInflightReads.set(key, inflight);
  }
  const resolved = await inflight;
  return (shouldClone ? structuredClone(resolved) : resolved) as SharedRecord<T>;
}

/**
 * Đọc hàng loạt bản ghi theo danh sách khóa trong 1 lượt (tránh N lần stat file hoặc N câu truy vấn SQL).
 */
export async function readRecordsBatch<T>(
  keys: string[],
  fallback: T,
  options?: { clone?: boolean; skipCache?: boolean }
): Promise<Map<string, SharedRecord<T>>> {
  const shouldClone = options?.clone !== false;
  const result = new Map<string, SharedRecord<T>>();
  const uniqueKeys = Array.from(new Set(keys));
  if (uniqueKeys.length === 0) return result;

  if (local()) {
    const dir = directory();
    const existingFiles = new Set<string>(
      await readdir(dir).catch(() => [] as string[])
    );
    await Promise.all(
      uniqueKeys.map(async (key) => {
        if (!existingFiles.has(`${key}.json`)) {
          result.set(key, { revision: 0, data: fallback });
          return;
        }
        try {
          const rec = await readRecord<T>(key, fallback, { clone: shouldClone });
          result.set(key, rec);
        } catch {
          result.set(key, { revision: 0, data: fallback });
        }
      })
    );
    return result;
  }

  const now = Date.now();
  const missingKeys: string[] = [];
  for (const key of uniqueKeys) {
    const cachedPg = pgRecordCache.get(key);
    if (!options?.skipCache && cachedPg && now < cachedPg.expiresAt) {
      result.set(
        key,
        (shouldClone ? structuredClone(cachedPg.record) : cachedPg.record) as SharedRecord<T>
      );
    } else {
      missingKeys.push(key);
    }
  }

  if (missingKeys.length > 0) {
    const rows = await prisma.$queryRaw<Array<{ key: string; revision: number; data: T }>>`
      SELECT key, revision, data FROM "AppSharedRecord" WHERE key = ANY(${missingKeys})
    `.catch(() => [] as Array<{ key: string; revision: number; data: T }>);
    const foundByKey = new Map<string, SharedRecord<T>>();
    for (const row of rows) {
      foundByKey.set(row.key, { revision: row.revision, data: row.data });
    }
    const expiresAt = Date.now() + PG_CACHE_TTL_MS;
    for (const key of missingKeys) {
      const record = foundByKey.get(key) || { revision: 0, data: fallback };
      pgRecordCache.set(key, {
        expiresAt,
        record: structuredClone(record),
      });
      result.set(
        key,
        (shouldClone ? structuredClone(record) : record) as SharedRecord<T>
      );
    }
  }

  return result;
}
export async function updateRecord<T>(key: string, fallback: T, expected: number, transform: (data: T) => T | Promise<T>): Promise<SharedRecord<T>> {
  if (!Number.isInteger(expected) || expected < 0) throw new RecordError('Thiếu phiên bản dữ liệu.');
  if (local()) {
    await mkdir(directory(), { recursive: true });
    const filePath = file(key);
    const lockPath = `${filePath}.lock`;
    let lock;
    try { lock = await open(lockPath, 'wx'); }
    catch (e) { if ((e as NodeJS.ErrnoException).code === 'EEXIST') throw new RecordError('Dữ liệu đang được lưu. Vui lòng thử lại.', 409); throw e; }
    try {
      const current = await readRecord(key, fallback);
      if (current.revision !== expected) throw new RecordError('Dữ liệu đã thay đổi. Tải lại trước khi lưu.', 409);
      const next = { revision: expected + 1, data: await transform(current.data) };
      const temporary = `${filePath}.${randomUUID()}.tmp`;
      await writeFile(temporary, JSON.stringify(next), 'utf8');
      await rename(temporary, filePath);
      const st = await stat(filePath).catch(() => null);
      if (st) {
        localRecordCache.set(filePath, { mtimeMs: st.mtimeMs, size: st.size, record: structuredClone(next) });
      } else {
        localRecordCache.delete(filePath);
      }
      return next;
    } finally { await lock.close(); await unlink(lockPath); }
  }
  const rows = await prisma.$queryRaw<Array<SharedRecord<T>>>`SELECT revision, data FROM "AppSharedRecord" WHERE key = ${key}`;
  const current = rows[0] || { revision: 0, data: fallback };
  if (current.revision !== expected) throw new RecordError('Dữ liệu đã thay đổi. Tải lại trước khi lưu.', 409);
  const nextData = await transform(current.data);
  const nextRevision = expected + 1;
  const serializedNext = JSON.stringify(nextData);
  const affected = expected === 0
    ? await prisma.$executeRaw`
        INSERT INTO "AppSharedRecord" (key, revision, data)
        VALUES (${key}, ${nextRevision}, ${serializedNext}::jsonb)
        ON CONFLICT (key) DO UPDATE
        SET revision = ${nextRevision}, data = EXCLUDED.data
        WHERE "AppSharedRecord".revision = 0
      `
    : await prisma.$executeRaw`
        UPDATE "AppSharedRecord"
        SET revision = ${nextRevision}, data = ${serializedNext}::jsonb
        WHERE key = ${key} AND revision = ${expected}
      `;
  if (Number(affected) === 0) {
    pgRecordCache.delete(key);
    throw new RecordError('Dữ liệu đã thay đổi. Tải lại trước khi lưu.', 409);
  }
  const updated: SharedRecord<T> = { revision: nextRevision, data: nextData };
  pgRecordCache.set(key, {
    expiresAt: Date.now() + PG_CACHE_TTL_MS,
    record: structuredClone(updated),
  });
  return updated;
}

export async function upsertRecord<T>(
  key: string,
  fallback: T,
  transform: (data: T) => T | Promise<T>
): Promise<SharedRecord<T>> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    const current = await readRecord<T>(key, fallback);
    try {
      return await updateRecord<T>(key, fallback, current.revision, transform);
    } catch (err) {
      lastErr = err;
      if (err instanceof RecordError && err.status === 409) {
        continue;
      }
      throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new RecordError('Không thể lưu dữ liệu do xung đột đồng thời.', 409);
}
