export type RateLimitResult = {
  allowed: boolean
  limit: number
  remaining: number
  resetSeconds: number
}

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()
const SWEEP_EVERY = 500
let writesSinceSweep = 0

function clientId(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return (
    forwarded ||
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    'anonymous'
  )
}

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  return url && token ? { url, token } : null
}

function sweep(now: number) {
  writesSinceSweep += 1
  if (writesSinceSweep < SWEEP_EVERY) return
  writesSinceSweep = 0
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

function inMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  sweep(now)
  const current = buckets.get(key)

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, limit, remaining: limit - 1, resetSeconds: Math.ceil(windowMs / 1000) }
  }

  const resetSeconds = Math.ceil((current.resetAt - now) / 1000)
  if (current.count >= limit) return { allowed: false, limit, remaining: 0, resetSeconds }

  current.count += 1
  return { allowed: true, limit, remaining: limit - current.count, resetSeconds }
}

async function inRedis(
  key: string,
  limit: number,
  windowMs: number,
  config: { url: string; token: string },
): Promise<RateLimitResult> {
  const seconds = Math.ceil(windowMs / 1000)
  const response = await fetch(`${config.url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      ['INCR', key],
      ['EXPIRE', key, String(seconds), 'NX'],
      ['TTL', key],
    ]),
    signal: AbortSignal.timeout(2_000),
  })

  if (!response.ok) throw new Error(`rate limit store returned ${response.status}`)

  const payload = (await response.json()) as Array<{ result?: unknown; error?: string }>
  const count = Number(payload[0]?.result ?? 0)
  const ttl = Number(payload[2]?.result ?? seconds)
  if (!Number.isFinite(count) || count <= 0) throw new Error('rate limit store returned no count')

  const resetSeconds = ttl > 0 ? ttl : seconds
  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    resetSeconds,
  }
}

async function consume(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const config = redisConfig()
  if (!config) return inMemory(key, limit, windowMs)

  try {
    return await inRedis(key, limit, windowMs, config)
  } catch {
    return inMemory(key, limit, windowMs)
  }
}

export async function checkRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  return consume(`resumefit:${scope}:${clientId(request)}`, limit, windowMs)
}

export async function checkSharedLimit(
  scope: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  return consume(`resumefit:shared:${scope}`, limit, windowMs)
}

export function rateLimitHeaders(result: RateLimitResult) {
  const headers: Record<string, string> = {
    'RateLimit-Limit': String(result.limit),
    'RateLimit-Remaining': String(result.remaining),
    'RateLimit-Reset': String(result.resetSeconds),
  }
  if (!result.allowed) headers['Retry-After'] = String(result.resetSeconds)
  return headers
}
