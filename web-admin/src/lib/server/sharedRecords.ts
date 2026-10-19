/** Server-owned versioned records. Local sandbox uses atomic files; production uses PostgreSQL. */
import { mkdir, readFile, writeFile, rename, open, unlink, stat } from 'node:fs/promises';
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

export async function readRecord<T>(key: string, fallback: T): Promise<SharedRecord<T>> {
  if (local()) {
    const filePath = file(key);
    try {
      const st = await stat(filePath);
      const cached = localRecordCache.get(filePath);
      if (cached && cached.mtimeMs === st.mtimeMs && cached.size === st.size) {
        return structuredClone(cached.record) as SharedRecord<T>;
      }
      const parsed = JSON.parse(await readFile(filePath, 'utf8')) as SharedRecord<T>;
      localRecordCache.set(filePath, { mtimeMs: st.mtimeMs, size: st.size, record: structuredClone(parsed) });
      return parsed;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
        localRecordCache.delete(filePath);
        return { revision: 0, data: fallback };
      }
      throw e;
    }
  }
  const rows = await prisma.$queryRaw<Array<SharedRecord<T>>>`SELECT revision, data FROM "AppSharedRecord" WHERE key = ${key}`;
  return rows[0] || { revision: 0, data: fallback };
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
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`INSERT INTO "AppSharedRecord" (key, revision, data) VALUES (${key}, 0, ${JSON.stringify(fallback)}::jsonb) ON CONFLICT (key) DO NOTHING`;
    const rows = await tx.$queryRaw<Array<SharedRecord<T>>>`SELECT revision, data FROM "AppSharedRecord" WHERE key = ${key} FOR UPDATE`;
    const current = rows[0];
    if (current.revision !== expected) throw new RecordError('Dữ liệu đã thay đổi. Tải lại trước khi lưu.', 409);
    const next = { revision: expected + 1, data: await transform(current.data) };
    await tx.$executeRaw`UPDATE "AppSharedRecord" SET revision = ${next.revision}, data = ${JSON.stringify(next.data)}::jsonb WHERE key = ${key}`;
    return next;
  });
}
