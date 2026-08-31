export type RedisConfig = { url: string; token: string }

export type RedisReply = { result?: unknown; error?: string }

const REQUEST_TIMEOUT_MS = 2_000

export function redisConfig(): RedisConfig | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  return url && token ? { url, token } : null
}

export async function redisPipeline(
  config: RedisConfig,
  commands: string[][],
): Promise<RedisReply[]> {
  const response = await fetch(`${config.url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) throw new Error(`redis store returned ${response.status}`)

  return (await response.json()) as RedisReply[]
}
