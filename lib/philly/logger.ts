/* ---------------------------------------------------------------
   Structured JSON logger — Philly Dashboard
   ---------------------------------------------------------------
   - One JSON line per log event (easy to ship to Loki/Datadog/CW)
   - Respects LOG_LEVEL env (debug | info | warn | error)
   - Pretty-prints in development so terminals stay readable
   - Redacts common secret-shaped fields
   --------------------------------------------------------------- */

type Level = 'debug' | 'info' | 'warn' | 'error'

const LEVELS: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

function currentLevel(): number {
  const raw = (process.env.LOG_LEVEL ?? 'info').toLowerCase() as Level
  return LEVELS[raw] ?? LEVELS.info
}

const REDACT_KEYS = new Set([
  'password',
  'passwordhash',
  'password_hash',
  'token',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'apikey',
  'api_key',
  'secret',
  'authorization',
  'cookie',
  'set-cookie',
])

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[depth-limit]'
  if (value === null || value === undefined) return value
  if (typeof value === 'string') {
    // Redact JWT-ish strings outright
    if (/^ey[A-Za-z0-9_-]{20,}\./.test(value)) return '[redacted-jwt]'
    return value.length > 2000 ? value.slice(0, 2000) + '…' : value
  }
  if (typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1))

  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (REDACT_KEYS.has(k.toLowerCase())) {
      out[k] = '[redacted]'
    } else {
      out[k] = redact(v, depth + 1)
    }
  }
  return out
}

function emit(level: Level, msg: string, meta?: Record<string, unknown>) {
  if (LEVELS[level] < currentLevel()) return

  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(meta ? { ...(redact(meta) as Record<string, unknown>) } : {}),
  }

  const line = JSON.stringify(entry)

  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout

  if (process.env.NODE_ENV !== 'production') {
    // Friendly dev formatting
    const color =
      level === 'error'
        ? '\x1b[31m'
        : level === 'warn'
          ? '\x1b[33m'
          : level === 'debug'
            ? '\x1b[90m'
            : '\x1b[36m'
    const reset = '\x1b[0m'
    const metaStr = meta ? ' ' + JSON.stringify(redact(meta)) : ''
    stream.write(`${color}[${level}]${reset} ${msg}${metaStr}\n`)
    return
  }

  stream.write(line + '\n')
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => emit('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit('error', msg, meta),
  /** Log and optionally add HTTP request context. */
  http: (
    method: string,
    path: string,
    status: number,
    durationMs: number,
    meta?: Record<string, unknown>,
  ) => {
    const level: Level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'
    emit(level, `${method} ${path} ${status} ${durationMs}ms`, meta)
  },
}

export type Logger = typeof logger
