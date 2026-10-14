import { mkdir, readFile, writeFile, rename, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import prisma from '../prisma';
import type { UserProfile } from '../types';
import type { EntryInput, HubScope, HubThread } from './types';
import { applyEntry, currentThread, emptyThread, HubError } from './domain';

const local = () => process.env.NODE_ENV !== 'production' && process.env.PARTNER_HUB_STORAGE !== 'postgres';
const directory = () => path.resolve(/*turbopackIgnore: true*/ process.env.PARTNER_HUB_DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), '.partner-hub-data'));
function filename(scope: HubScope) { return path.join(directory(), `${createHash('sha256').update(scope.key).digest('hex')}.json`); }
async function readLocal(scope: HubScope): Promise<HubThread> {
  try { return currentThread(JSON.parse(await readFile(filename(scope), 'utf8')), scope); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyThread(scope); throw error; }
}
export async function readThread(scope: HubScope): Promise<HubThread> {
  if (local()) return readLocal(scope);
  const rows = await prisma.$queryRaw<Array<{ data: HubThread }>>`SELECT data FROM "PartnerHubThread" WHERE id=${scope.key}`;
  return rows.length ? currentThread(rows[0].data, scope) : emptyThread(scope);
}
export async function appendEntry(scope: HubScope, actor: UserProfile, input: EntryInput): Promise<HubThread> {
  if (!local()) return prisma.$transaction(async tx => {
    const initial = emptyThread(scope);
    await tx.$executeRaw`INSERT INTO "PartnerHubThread" (id, data, "updatedAt") VALUES (${scope.key}, ${JSON.stringify(initial)}::jsonb, NOW()) ON CONFLICT (id) DO NOTHING`;
    const rows = await tx.$queryRaw<Array<{ data: HubThread }>>`SELECT data FROM "PartnerHubThread" WHERE id=${scope.key} FOR UPDATE`;
    const next = applyEntry(rows[0].data, input, actor, scope);
    await tx.$executeRaw`UPDATE "PartnerHubThread" SET data=${JSON.stringify(next)}::jsonb, "updatedAt"=NOW() WHERE id=${scope.key}`;
    return next;
  });
  await mkdir(directory(), { recursive: true });
  const file = filename(scope);
  let lock;
  try { lock = await open(`${file}.lock`, 'wx'); }
  catch { throw new HubError('Cuộc trao đổi đang được cập nhật. Vui lòng thử gửi lại.', 409); }
  const temp = `${file}.${randomUUID()}.tmp`;
  try {
    const next = applyEntry(await readLocal(scope), input, actor, scope);
    await writeFile(temp, JSON.stringify(next), { mode: 0o600 });
    await rename(temp, file);
    return next;
  } finally {
    await lock.close();
    await unlink(`${file}.lock`);
    await unlink(temp).catch(() => undefined);
  }
}
