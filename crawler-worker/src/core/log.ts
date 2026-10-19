type Level = 'info' | 'warn' | 'error';

function write(level: Level, event: string, data?: Record<string, unknown>) {
  const line = JSON.stringify({ t: new Date().toISOString(), level, event, ...data });
  if (level === 'error') console.error(line);
  else console.log(line);
}

/** Log dạng JSON một dòng để gom về hệ thống log sau này. */
export const log = {
  info: (event: string, data?: Record<string, unknown>) => write('info', event, data),
  warn: (event: string, data?: Record<string, unknown>) => write('warn', event, data),
  error: (event: string, data?: Record<string, unknown>) => write('error', event, data),
};
