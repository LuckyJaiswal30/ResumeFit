import { afterEach, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { z } from 'zod'
import { AiUnavailableError, generateJson, isAiConfigured } from '@/lib/ai/client'

const realFetch = globalThis.fetch
const validator = z.object({ answer: z.string() })
const schema = {
  type: 'object',
  additionalProperties: false,
  properties: { answer: { type: 'string' } },
  required: ['answer'],
}

type Call = { url: string; headers: Record<string, string>; body: Record<string, unknown> }
let calls: Call[] = []

function stub(reply: (attempt: number) => { status: number; json: unknown }) {
  calls = []
  globalThis.fetch = (async (
    url: string,
    init: { body: string; headers: Record<string, string> },
  ) => {
    calls.push({ url: String(url), headers: init.headers, body: JSON.parse(init.body) })
    const { status, json } = reply(calls.length)
    return new Response(JSON.stringify(json), { status })
  }) as unknown as typeof fetch
}

const geminiReply = (text: string) => ({
  candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }],
})

beforeEach(() => {
  for (const key of [
    'AI_PROVIDER',
    'GEMINI_API_KEY',
    'GEMINI_MODEL',
    'GROQ_API_KEY',
    'GROQ_MODEL',
  ]) {
    delete process.env[key]
  }
})

afterEach(() => {
  globalThis.fetch = realFetch
})

describe('when nothing is configured', () => {
  it('says so rather than calling out', () => {
    assert.equal(isAiConfigured(), false)
  })

  it('throws a recognisable error', async () => {
    await assert.rejects(
      () => generateJson({ prompt: 'x', schema, validator }),
      (error: Error) => error instanceof AiUnavailableError,
    )
  })
})

describe('gemini', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key'
  })

  it('reads the text out of the candidate parts', async () => {
    stub(() => ({ status: 200, json: geminiReply('{"answer":"hi"}') }))
    assert.deepEqual(await generateJson({ prompt: 'p', schema, validator }), { answer: 'hi' })
  })

  it('posts to generateContent with the key in a header', async () => {
    stub(() => ({ status: 200, json: geminiReply('{"answer":"hi"}') }))
    await generateJson({ prompt: 'p', schema, validator })
    assert.ok(calls[0].url.endsWith(':generateContent'), calls[0].url)
    assert.ok(calls[0].url.includes('gemini-3.5-flash-lite'), calls[0].url)
    assert.equal(calls[0].headers['x-goog-api-key'], 'test-key')
  })

  it('strips additionalProperties, which gemini rejects', async () => {
    const nested = {
      type: 'object',
      additionalProperties: false,
      properties: { answer: { type: 'string' }, evidence: { type: ['string', 'null'] } },
      required: ['answer', 'evidence'],
    }
    stub(() => ({ status: 200, json: geminiReply('{"answer":"hi"}') }))
    await generateJson({ prompt: 'p', schema: nested, validator })
    const sent = calls[0].body.generationConfig as { responseSchema: Record<string, unknown> }
    assert.ok(!JSON.stringify(sent.responseSchema).includes('additionalProperties'))
    assert.deepEqual((sent.responseSchema.properties as Record<string, unknown>).evidence, {
      type: 'string',
      nullable: true,
    })
  })

  it('ignores thinking parts and joins the rest', async () => {
    stub(() => ({
      status: 200,
      json: {
        candidates: [
          {
            finishReason: 'STOP',
            content: {
              parts: [{ thought: true, text: 'hmm' }, { text: '{"answer":' }, { text: '"hi"}' }],
            },
          },
        ],
      },
    }))
    assert.deepEqual(await generateJson({ prompt: 'p', schema, validator }), { answer: 'hi' })
  })

  it('unwraps a fenced code block', async () => {
    stub(() => ({ status: 200, json: geminiReply('```json\n{"answer":"hi"}\n```') }))
    assert.deepEqual(await generateJson({ prompt: 'p', schema, validator }), { answer: 'hi' })
  })

  it('treats the older response shape as empty rather than guessing', async () => {
    stub(() => ({ status: 200, json: { steps: [{ content: [{ text: '{"answer":"hi"}' }] }] } }))
    await assert.rejects(() => generateJson({ prompt: 'p', schema, validator }), /empty response/)
  })

  it('retries once when the provider is busy', async () => {
    stub((attempt) =>
      attempt === 1
        ? { status: 503, json: {} }
        : { status: 200, json: geminiReply('{"answer":"hi"}') },
    )
    assert.deepEqual(await generateJson({ prompt: 'p', schema, validator }), { answer: 'hi' })
    assert.equal(calls.length, 2)
  })

  it('gives up immediately when the provider is rate limiting', async () => {
    stub(() => ({ status: 429, json: {} }))
    await assert.rejects(() => generateJson({ prompt: 'p', schema, validator }), /rate limiting/)
    assert.equal(calls.length, 1)
  })

  it('rejects a response that does not match the schema', async () => {
    stub(() => ({ status: 200, json: geminiReply('{"wrong":1}') }))
    await assert.rejects(() => generateJson({ prompt: 'p', schema, validator }))
  })

  it('never puts the api key in the error', async () => {
    stub(() => ({ status: 401, json: {} }))
    await generateJson({ prompt: 'p', schema, validator }).catch((error: Error) => {
      assert.ok(!error.message.includes('test-key'), error.message)
    })
  })
})

describe('groq', () => {
  beforeEach(() => {
    process.env.AI_PROVIDER = 'groq'
    process.env.GROQ_API_KEY = 'groq-key'
  })

  it('reads the message content and keeps strict mode', async () => {
    stub(() => ({ status: 200, json: { choices: [{ message: { content: '{"answer":"yo"}' } }] } }))
    assert.deepEqual(await generateJson({ prompt: 'p', schema, validator }), { answer: 'yo' })
    assert.equal(calls[0].headers.Authorization, 'Bearer groq-key')
    const format = calls[0].body.response_format as {
      json_schema: { strict: boolean; schema: Record<string, unknown> }
    }
    assert.equal(format.json_schema.strict, true)
    assert.equal(format.json_schema.schema.additionalProperties, false)
  })
})
