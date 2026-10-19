function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const value = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export const config = {
  port: intEnv('PORT', 8790),
  /** Token dùng chung với web-admin (header Authorization: Bearer ...). Để trống = không kiểm tra (chỉ dùng khi chạy local). */
  token: process.env.WORKER_TOKEN?.trim() || '',
  httpTimeoutMs: intEnv('HTTP_TIMEOUT_MS', 12000),
  httpRetries: intEnv('HTTP_RETRIES', 2),
  /** Thời gian giữ kết quả trong cache, tránh gọi lại nền tảng khi nhiều người cùng kiểm tra một link. */
  cacheTtlMs: intEnv('CACHE_TTL_SECONDS', 600) * 1000,
  cacheMaxEntries: intEnv('CACHE_MAX_ENTRIES', 2000),
  /** Số request đồng thời tối đa tới MỖI nền tảng. */
  perPlatformConcurrency: intEnv('PER_PLATFORM_CONCURRENCY', 3),
  /** Khoảng nghỉ tối thiểu giữa 2 request liên tiếp tới cùng nền tảng. */
  perPlatformMinGapMs: intEnv('PER_PLATFORM_MIN_GAP_MS', 400),
  maxLinksPerRequest: intEnv('MAX_LINKS_PER_REQUEST', 100),
  /** Có proxy (HTTPS_PROXY + NODE_USE_ENV_PROXY=1) hay không — chỉ để báo trên /health. */
  proxyConfigured: Boolean(process.env.HTTPS_PROXY || process.env.HTTP_PROXY),
};
