import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { cacheSize, checkLinks, queueDepth, type CheckRequestItem } from './check-link.ts';
import { config } from './core/config.ts';
import { splitLinks } from './core/detect.ts';
import { log } from './core/log.ts';
import type { LinkExpectation } from './core/types.ts';

const MAX_BODY_BYTES = 256 * 1024;
const startedAt = new Date().toISOString();

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function authorized(req: IncomingMessage): boolean {
  if (!config.token) return true;
  const header = req.headers.authorization ?? '';
  const given = Buffer.from(header.replace(/^Bearer\s+/i, ''));
  const expected = Buffer.from(config.token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new Error('BODY_TOO_LARGE');
    chunks.push(chunk as Buffer);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const list = value.map((v) => String(v ?? '').trim()).filter(Boolean);
  return list.length ? list : undefined;
}

function toExpectation(value: unknown): LinkExpectation {
  if (!value || typeof value !== 'object') return {};
  const v = value as Record<string, unknown>;
  const date = (d: unknown) => (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined);
  const minViews = Number(v.minViews);
  return {
    handle: typeof v.handle === 'string' && v.handle.trim() ? v.handle.trim() : undefined,
    airFrom: date(v.airFrom),
    airTo: date(v.airTo),
    requiredHashtags: asStringArray(v.requiredHashtags),
    requiredKeywords: asStringArray(v.requiredKeywords),
    requireProductLink: v.requireProductLink === true,
    minViews: Number.isFinite(minViews) && minViews > 0 ? minViews : undefined,
  };
}

/**
 * Body nhận 1 trong 2 dạng:
 * - { links: string | string[], expect?: LinkExpectation }  — cùng điều kiện cho mọi link
 * - { items: [{ url, expect? }] }                            — điều kiện riêng cho từng link (từng deal)
 */
function toItems(body: unknown): CheckRequestItem[] {
  const b = (body ?? {}) as Record<string, unknown>;
  if (Array.isArray(b.items)) {
    return b.items
      .map((item) => {
        const i = (item ?? {}) as Record<string, unknown>;
        return { url: String(i.url ?? '').trim(), expect: toExpectation(i.expect) };
      })
      .filter((i) => i.url);
  }
  const shared = toExpectation(b.expect);
  const links = typeof b.links === 'string' || Array.isArray(b.links) ? splitLinks(b.links as string | string[]) : [];
  return links.map((url) => ({ url, expect: shared }));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://worker');

  if (req.method === 'GET' && url.pathname === '/health') {
    return send(res, 200, {
      ok: true,
      startedAt,
      platforms: ['tiktok', 'shopee', 'facebook', 'instagram'],
      proxyConfigured: config.proxyConfigured,
      cacheEntries: cacheSize(),
      queue: queueDepth(),
    });
  }

  if (!authorized(req)) return send(res, 401, { success: false, error: 'UNAUTHORIZED' });

  if (req.method === 'POST' && url.pathname === '/v1/links/check') {
    let body: unknown;
    try {
      body = await readJson(req);
    } catch (err) {
      const tooLarge = err instanceof Error && err.message === 'BODY_TOO_LARGE';
      return send(res, tooLarge ? 413 : 400, { success: false, error: tooLarge ? 'BODY_TOO_LARGE' : 'INVALID_JSON' });
    }
    const items = toItems(body);
    if (items.length === 0) {
      return send(res, 400, { success: false, error: 'NO_LINKS', message: 'Cần ít nhất 1 link.' });
    }
    if (items.length > config.maxLinksPerRequest) {
      return send(res, 400, {
        success: false,
        error: 'TOO_MANY_LINKS',
        message: `Tối đa ${config.maxLinksPerRequest} link mỗi lần.`,
      });
    }
    const started = Date.now();
    const results = await checkLinks(items);
    const summary = {
      total: results.length,
      pass: results.filter((r) => r.verdict === 'PASS').length,
      review: results.filter((r) => r.verdict === 'REVIEW').length,
      fail: results.filter((r) => r.verdict === 'FAIL').length,
    };
    log.info('links.checked', { ...summary, ms: Date.now() - started });
    return send(res, 200, { success: true, summary, results });
  }

  send(res, 404, { success: false, error: 'NOT_FOUND' });
});

server.listen(config.port, () => {
  log.info('worker.started', {
    port: config.port,
    auth: Boolean(config.token),
    proxy: config.proxyConfigured,
  });
});
