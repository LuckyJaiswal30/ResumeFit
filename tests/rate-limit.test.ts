import { afterEach, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { checkRateLimit, rateLimitHeaders } from '@/lib/security/rate-limit'

const realFetch = globalThis.fetch
const request = (ip: string) => new Request('http://x/api', { headers: { 'x-forwarded-for': ip } })

beforeEach(() => {
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
})

afterEach(() => {
  globalThis.fetch = realFetch
})

describe('in-process limiter', () => {
  it('allows up to the limit then refuses', async () => {
    const ip = '10.0.0.1'
    for (let i = 0; i < 3; i += 1) {
      const result = await checkRateLimit(request(ip), 'a', 3, 60_000)
      assert.equal(result.allowed, true)
      assert.equal(result.remaining, 2 - i)
    }
    const blocked = await checkRateLimit(request(ip), 'a', 3, 60_000)
    assert.equal(blocked.allowed, false)
    assert.equal(blocked.remaining, 0)
  })

  it('keeps separate budgets per client', async () => {
    const first = await checkRateLimit(request('10.0.0.2'), 'b', 1, 60_000)
    const second = await checkRateLimit(request('10.0.0.3'), 'b', 1, 60_000)
    assert.ok(first.allowed && second.allowed)
  })

  it('keeps separate budgets per route', async () => {
    const ip = '10.0.0.4'
    await checkRateLimit(request(ip), 'routeA', 1, 60_000)
    assert.equal((await checkRateLimit(request(ip), 'routeB', 1, 60_000)).allowed, true)
  })

  it('frees the budget once the window passes', async () => {
    const ip = '10.0.0.5'
    await checkRateLimit(request(ip), 'c', 1, 40)
    assert.equal((await checkRateLimit(request(ip), 'c', 1, 40)).allowed, false)
    await new Promise((resolve) => setTimeout(resolve, 60))
    assert.equal((await checkRateLimit(request(ip), 'c', 1, 40)).allowed, true)
  })

  it('puts callers with no forwarded address in one bucket', async () => {
    const bare = () => new Request('http://x/api')
    await checkRateLimit(bare(), 'd', 1, 60_000)
    assert.equal((await checkRateLimit(bare(), 'd', 1, 60_000)).allowed, false)
  })
})

describe('headers', () => {
  it('reports the limit, what is left and when it resets', async () => {
    const headers = rateLimitHeaders(await checkRateLimit(request('10.0.1.1'), 'e', 5, 60_000))
    assert.equal(headers['RateLimit-Limit'], '5')
    assert.equal(headers['RateLimit-Remaining'], '4')
    assert.ok(Number(headers['RateLimit-Reset']) > 0)
    assert.equal(headers['Retry-After'], undefined)
  })

  it('adds Retry-After only when refusing', async () => {
    const ip = '10.0.1.2'
    await checkRateLimit(request(ip), 'f', 1, 60_000)
    const headers = rateLimitHeaders(await checkRateLimit(request(ip), 'f', 1, 60_000))
    assert.ok(Number(headers['Retry-After']) > 0)
  })
})

describe('shared store', () => {
  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'tok'
  })

  it('counts through the store when one is configured', async () => {
    let seen: { url: string; body: unknown[][]; auth: string } | null = null
    globalThis.fetch = (async (
      url: string,
      init: { body: string; headers: Record<string, string> },
    ) => {
      seen = { url: String(url), body: JSON.parse(init.body), auth: init.headers.Authorization }
      return new Response(JSON.stringify([{ result: 2 }, { result: 1 }, { result: 300 }]), {
        status: 200,
      })
    }) as unknown as typeof fetch

    const result = await checkRateLimit(request('10.0.2.1'), 'g', 10, 600_000)
    assert.equal(result.allowed, true)
    assert.equal(result.remaining, 8)
    assert.equal(result.resetSeconds, 300)
    assert.ok(seen!.url.endsWith('/pipeline'))
    assert.equal(seen!.auth, 'Bearer tok')
    assert.equal(seen!.body[0][0], 'INCR')
    assert.equal(seen!.body[1][0], 'EXPIRE')
  })

  it('refuses once the shared count passes the limit', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify([{ result: 11 }, { result: 0 }, { result: 120 }]), {
        status: 200,
      })) as typeof fetch
    const result = await checkRateLimit(request('10.0.2.2'), 'h', 10, 600_000)
    assert.equal(result.allowed, false)
  })

  it('keeps serving when the store cannot be reached', async () => {
    globalThis.fetch = (async () => {
      throw new Error('network down')
    }) as typeof fetch
    const result = await checkRateLimit(request('10.0.2.3'), 'i', 2, 60_000)
    assert.equal(result.allowed, true)
    assert.equal(result.remaining, 1)
  })

  it('keeps serving when the store returns an error', async () => {
    globalThis.fetch = (async () => new Response('nope', { status: 500 })) as typeof fetch
    assert.equal((await checkRateLimit(request('10.0.2.4'), 'j', 2, 60_000)).allowed, true)
  })
})
