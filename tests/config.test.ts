import { beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { cacheTtlMs, resolveProvider } from '@/lib/ai/config'

const KEYS = [
  'AI_PROVIDER',
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  'GROQ_API_KEY',
  'GROQ_MODEL',
  'AI_TEMPERATURE',
  'AI_TIMEOUT_MS',
  'AI_MAX_PROMPT_CHARS',
  'AI_MAX_OUTPUT_TOKENS',
  'AI_CACHE_MINUTES',
]

beforeEach(() => {
  for (const key of KEYS) delete process.env[key]
})

describe('choosing a provider', () => {
  it('reports nothing configured when there are no keys', () => {
    assert.equal(resolveProvider(), null)
  })

  it('uses whichever provider has a key', () => {
    process.env.GEMINI_API_KEY = 'g'
    assert.equal(resolveProvider()?.name, 'gemini')
    delete process.env.GEMINI_API_KEY
    process.env.GROQ_API_KEY = 'q'
    assert.equal(resolveProvider()?.name, 'groq')
  })

  it('prefers gemini when both keys are present', () => {
    process.env.GEMINI_API_KEY = 'g'
    process.env.GROQ_API_KEY = 'q'
    assert.equal(resolveProvider()?.name, 'gemini')
  })

  it('honours an explicit choice, whatever the casing', () => {
    process.env.GEMINI_API_KEY = 'g'
    process.env.GROQ_API_KEY = 'q'
    process.env.AI_PROVIDER = '  GROQ '
    assert.equal(resolveProvider()?.name, 'groq')
  })

  it('does not silently swap providers when the named one has no key', () => {
    process.env.AI_PROVIDER = 'gemini'
    process.env.GROQ_API_KEY = 'q'
    assert.equal(resolveProvider(), null)
  })

  it('ignores a key left as the placeholder from the example file', () => {
    process.env.GEMINI_API_KEY = 'your_key_here'
    assert.equal(resolveProvider(), null)
  })
})

describe('choosing a model', () => {
  it('falls back to a default per provider', () => {
    process.env.GEMINI_API_KEY = 'g'
    assert.equal(resolveProvider()?.model, 'gemini-3.5-flash-lite')
    delete process.env.GEMINI_API_KEY
    process.env.GROQ_API_KEY = 'q'
    assert.equal(resolveProvider()?.model, 'openai/gpt-oss-20b')
  })

  it('takes the model from the environment when set', () => {
    process.env.GEMINI_API_KEY = 'g'
    process.env.GEMINI_MODEL = 'gemini-3.7-flash'
    assert.equal(resolveProvider()?.model, 'gemini-3.7-flash')
  })

  it('treats a blank model as unset', () => {
    process.env.GEMINI_API_KEY = 'g'
    process.env.GEMINI_MODEL = '   '
    assert.equal(resolveProvider()?.model, 'gemini-3.5-flash-lite')
  })
})

describe('tunables', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'g'
  })

  it('defaults temperature to zero so repeat runs agree', () => {
    assert.equal(resolveProvider()?.temperature, 0)
  })

  it('reads temperature and clamps it to a sane range', () => {
    process.env.AI_TEMPERATURE = '0.7'
    assert.equal(resolveProvider()?.temperature, 0.7)
    process.env.AI_TEMPERATURE = '9'
    assert.equal(resolveProvider()?.temperature, 2)
  })

  it('falls back when a tunable is not a number', () => {
    process.env.AI_TEMPERATURE = 'hot'
    assert.equal(resolveProvider()?.temperature, 0)
  })

  it('clamps the timeout rather than accepting anything', () => {
    process.env.AI_TIMEOUT_MS = '45000'
    assert.equal(resolveProvider()?.timeoutMs, 45000)
    process.env.AI_TIMEOUT_MS = '1'
    assert.equal(resolveProvider()?.timeoutMs, 5000)
  })

  it('gives each provider its own prompt budget', () => {
    assert.equal(resolveProvider()?.promptChars, 16000)
    delete process.env.GEMINI_API_KEY
    process.env.GROQ_API_KEY = 'q'
    assert.equal(resolveProvider()?.promptChars, 9000)
  })

  it('lets the environment override the budgets', () => {
    process.env.AI_MAX_PROMPT_CHARS = '5000'
    process.env.AI_MAX_OUTPUT_TOKENS = '2000'
    assert.equal(resolveProvider()?.promptChars, 5000)
    assert.equal(resolveProvider()?.completionTokens, 2000)
  })

  it('reads the cache lifetime, including turning it off', () => {
    assert.equal(cacheTtlMs(), 60 * 60_000)
    process.env.AI_CACHE_MINUTES = '5'
    assert.equal(cacheTtlMs(), 5 * 60_000)
    process.env.AI_CACHE_MINUTES = '0'
    assert.equal(cacheTtlMs(), 0)
  })
})
