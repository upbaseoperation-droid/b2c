import { sleep } from './http.ts';

/**
 * Giới hạn số việc chạy đồng thời và giãn cách giữa các lần bắt đầu,
 * để không dồn request vào một nền tảng (dễ bị chặn IP).
 */
export class RateLimiter {
  private active = 0;
  private queue: Array<() => void> = [];
  private lastStart = 0;
  private concurrency: number;
  private minGapMs: number;

  constructor(concurrency: number, minGapMs: number) {
    this.concurrency = Math.max(1, concurrency);
    this.minGapMs = minGapMs;
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.concurrency) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.active++;
    try {
      const startAt = Math.max(Date.now(), this.lastStart + this.minGapMs);
      this.lastStart = startAt;
      const wait = startAt - Date.now();
      if (wait > 0) await sleep(wait);
      return await task();
    } finally {
      this.active--;
      this.queue.shift()?.();
    }
  }

  get pending(): number {
    return this.queue.length;
  }
}
