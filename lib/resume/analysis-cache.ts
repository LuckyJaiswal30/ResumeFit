import { cacheTtlMs } from '@/lib/ai/config'
import { redisConfig, redisPipeline, type RedisConfig } from '@/lib/security/redis'
import type { Analysis } from './types'

const MEMORY_LIMIT = 40

const memory = new Map<string, { expiresAt: number; analysis: Analysis }>()

function storeKey(key: string) {
  return `resumefit:analysis:${key}`
}

function readMemory(key: string) {
  const hit = memory.get(key)
  if (!hit) return null
  if (hit.expiresAt <= Date.now()) {
    memory.delete(key)
    return null
  }
  return hit.analysis
}

function writeMemory(key: string, analysis: Analysis, ttlMs: number) {
  if (memory.size >= MEMORY_LIMIT) {
    const oldest = memory.keys().next().value
    if (oldest) memory.delete(oldest)
  }
  memory.set(key, { expiresAt: Date.now() + ttlMs, analysis })
}

async function readRedis(config: RedisConfig, key: string) {
  const [entry] = await redisPipeline(config, [['GET', storeKey(key)]])
  const raw = entry?.result
  return typeof raw === 'string' ? (JSON.parse(raw) as Analysis) : null
}

async function writeRedis(config: RedisConfig, key: string, analysis: Analysis, ttlMs: number) {
  await redisPipeline(config, [
    ['SET', storeKey(key), JSON.stringify(analysis), 'EX', String(Math.ceil(ttlMs / 1000))],
  ])
}

export async function readAnalysis(key: string): Promise<Analysis | null> {
  if (cacheTtlMs() <= 0) return null

  const config = redisConfig()
  if (!config) return readMemory(key)

  try {
    return await readRedis(config, key)
  } catch {
    return readMemory(key)
  }
}

export async function writeAnalysis(key: string, analysis: Analysis) {
  const ttlMs = cacheTtlMs()
  if (ttlMs <= 0) return

  const config = redisConfig()
  if (!config) {
    writeMemory(key, analysis, ttlMs)
    return
  }

  try {
    await writeRedis(config, key, analysis, ttlMs)
  } catch {
    writeMemory(key, analysis, ttlMs)
  }
}
