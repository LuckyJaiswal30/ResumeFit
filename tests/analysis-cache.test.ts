import { afterEach, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readAnalysis, writeAnalysis } from '@/lib/resume/analysis-cache'
import type { Analysis } from '@/lib/resume/types'

const realFetch = globalThis.fetch

const ANALYSIS: Analysis = {
  source: 'ai',
  model: 'test-model',
  aiError: null,
  match: { score: 72, breakdown: [], requirements: [], summary: 'A workable match.' },
  ats: { score: 80, checks: [] },
  findings: [],
  phrasing: [],
  rewrites: [],
}

let sent: string[][] = []

function stubStore(reply: (commands: string[][]) => unknown, status = 200) {
  sent = []
  globalThis.fetch = (async (_url: string, init: { body: string }) => {
    const commands = JSON.parse(init.body) as string[][]
    sent = commands
    return new Response(JSON.stringify(reply(commands)), { status })
  }) as unknown as typeof fetch
}

let unique = 0
const nextKey = () => `key-${(unique += 1)}-${Date.now()}`

beforeEach(() => {
  process.env.UPSTASH_REDIS_REST_URL = 'https://store.example'
  process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
  process.env.AI_CACHE_MINUTES = '60'
})

afterEach(() => {
  globalThis.fetch = realFetch
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
  delete process.env.AI_CACHE_MINUTES
})

describe('shared store', () => {
  it('writes the analysis with the configured expiry', async () => {
    stubStore(() => [{ result: 'OK' }])
    await writeAnalysis('abc', ANALYSIS)

    const [command] = sent
    assert.equal(command[0], 'SET')
    assert.equal(command[1], 'resumefit:analysis:abc')
    assert.deepEqual(JSON.parse(command[2]), ANALYSIS)
    assert.equal(command[3], 'EX')
    assert.equal(command[4], '3600')
  })

  it('serves a stored analysis back', async () => {
    stubStore(() => [{ result: JSON.stringify(ANALYSIS) }])
    const found = await readAnalysis('abc')

    assert.deepEqual(sent, [['GET', 'resumefit:analysis:abc']])
    assert.deepEqual(found, ANALYSIS)
  })

  it('reports a miss when the store holds nothing', async () => {
    stubStore(() => [{ result: null }])
    assert.equal(await readAnalysis(nextKey()), null)
  })

  it('keeps working in process when the store cannot be reached', async () => {
    const key = nextKey()
    globalThis.fetch = (async () => {
      throw new Error('unreachable')
    }) as unknown as typeof fetch

    await writeAnalysis(key, ANALYSIS)
    assert.deepEqual(await readAnalysis(key), ANALYSIS)
  })

  it('keeps working in process when the store returns an error', async () => {
    const key = nextKey()
    stubStore(() => ({ error: 'nope' }), 500)

    await writeAnalysis(key, ANALYSIS)
    assert.deepEqual(await readAnalysis(key), ANALYSIS)
  })
})

describe('when caching is switched off', () => {
  it('neither reads nor writes', async () => {
    process.env.AI_CACHE_MINUTES = '0'
    stubStore(() => [{ result: JSON.stringify(ANALYSIS) }])

    await writeAnalysis('abc', ANALYSIS)
    const found = await readAnalysis('abc')

    assert.deepEqual(sent, [])
    assert.equal(found, null)
  })
})
