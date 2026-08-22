// Minimal structured logger shared by the job and the API routes.
//
// Deliberately not winston: the hub has no logging dependency today and this
// is a handful of lines. JSON in production so the journal and docker logs
// stay greppable; readable text in dev.

type Level = 'debug' | 'info' | 'warn' | 'error';

const isProd = process.env.NODE_ENV === 'production';
const silent = process.env.NODE_ENV === 'test';

function emit(level: Level, message: string, meta?: Record<string, unknown>) {
  if (silent) return;
  if (isProd) {
    process.stdout.write(`${JSON.stringify({
      level, message, ts: new Date().toISOString(), ...meta,
    })}\n`);
    return;
  }
  const suffix = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  process.stdout.write(`[${level}] ${message}${suffix}\n`);
}

export const log = {
  debug: (m: string, meta?: Record<string, unknown>) => emit('debug', m, meta),
  info: (m: string, meta?: Record<string, unknown>) => emit('info', m, meta),
  warn: (m: string, meta?: Record<string, unknown>) => emit('warn', m, meta),
  error: (m: string, meta?: Record<string, unknown>) => emit('error', m, meta),
};
