import { config } from './config.ts';
import { log } from './log.ts';

export const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/** Facebook và Instagram trả sẵn meta/JSON của bài đăng cho bot xem trước link. */
export const LINK_PREVIEW_UA = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';

export interface FetchTextOptions {
  userAgent?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
  /** Mặc định 'follow'. 'manual' để tự đọc header Location của link rút gọn. */
  redirect?: RequestRedirect;
}

export interface FetchTextResult {
  status: number;
  finalUrl: string;
  text: string;
  headers: Headers;
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * GET một trang, tự thử lại với backoff khi lỗi mạng hoặc khi nền tảng trả 429/5xx.
 * Không ném lỗi với 4xx khác: adapter tự quyết định 404/403 nghĩa là gì.
 */
export async function fetchText(url: string, options: FetchTextOptions = {}): Promise<FetchTextResult> {
  const retries = options.retries ?? config.httpRetries;
  const timeoutMs = options.timeoutMs ?? config.httpTimeoutMs;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const backoff = 600 * 2 ** (attempt - 1) + Math.floor(Math.random() * 300);
      await sleep(backoff);
    }
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: options.redirect ?? 'follow',
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          'User-Agent': options.userAgent ?? BROWSER_UA,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
          ...options.headers,
        },
      });
      if (RETRYABLE_STATUS.has(res.status) && attempt < retries) {
        log.warn('http.retry', { url, status: res.status, attempt });
        await res.body?.cancel();
        lastError = new HttpError(`HTTP ${res.status}`, res.status);
        continue;
      }
      const text = await res.text();
      return { status: res.status, finalUrl: res.url || url, text, headers: res.headers };
    } catch (err) {
      lastError = err;
      log.warn('http.error', { url, attempt, error: errorMessage(err) });
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** Mở link rút gọn và trả về URL cuối cùng sau redirect. */
export async function resolveRedirect(url: string, userAgent = BROWSER_UA): Promise<string> {
  let current = url;
  for (let hop = 0; hop < 6; hop++) {
    const res = await fetch(current, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(config.httpTimeoutMs),
      headers: { 'User-Agent': userAgent },
    });
    await res.body?.cancel();
    const location = res.headers.get('location');
    if (res.status < 300 || res.status >= 400 || !location) return current;
    current = new URL(location, current).toString();
  }
  return current;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    const cause = (err as Error & { cause?: unknown }).cause;
    return cause instanceof Error ? `${err.message}: ${cause.message}` : err.message;
  }
  return String(err);
}
