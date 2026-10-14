import { afterEach, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { AiUnavailableError } from '@/lib/ai/client'
import {
  ImageReaderBusyError,
  ImageUnreadableError,
  imageMimeType,
  transcribeDocument,
} from '@/lib/resume/image-text'

const realFetch = globalThis.fetch

function bytes(...parts: Array<string | number[]>) {
  const chunks = parts.map((part) =>
    typeof part === 'string' ? Array.from(part, (char) => char.charCodeAt(0)) : part,
  )
  return new Uint8Array([...chunks.flat(), ...new Array(16).fill(0)])
}

const PNG = bytes([0x89], 'PNG\r\n\u001a\n')
const JPEG = bytes([0xff, 0xd8, 0xff, 0xe0])
const WEBP = bytes('RIFF', [0, 0, 0, 0], 'WEBP')
const HEIC = bytes([0, 0, 0, 0x18], 'ftypheic')
const HEIF = bytes([0, 0, 0, 0x18], 'ftypmif1')
const MP4 = bytes([0, 0, 0, 0x18], 'ftypisom')

type Call = { url: string; body: { contents: Array<{ parts: Array<Record<string, unknown>> }> } }
let calls: Call[] = []

function stubGemini(payload: unknown) {
  calls = []
  globalThis.fetch = (async (url: string, init: { body: string }) => {
    calls.push({ url: String(url), body: JSON.parse(init.body) })
    const reply = {
      candidates: [
        { finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(payload) }] } },
      ],
    }
    return new Response(JSON.stringify(reply), { status: 200 })
  }) as unknown as typeof fetch
}

describe('imageMimeType', () => {
  it('recognises the supported formats from their bytes', () => {
    assert.equal(imageMimeType(PNG), 'image/png')
    assert.equal(imageMimeType(JPEG), 'image/jpeg')
    assert.equal(imageMimeType(WEBP), 'image/webp')
    assert.equal(imageMimeType(HEIC), 'image/heic')
    assert.equal(imageMimeType(HEIF), 'image/heif')
  })

  it('refuses anything else, whatever the file is called', () => {
    assert.equal(imageMimeType(MP4), null)
    assert.equal(imageMimeType(bytes('%PDF-1.7')), null)
    assert.equal(imageMimeType(bytes('Jane Doe, Engineer')), null)
    assert.equal(imageMimeType(new Uint8Array([0xff, 0xd8])), null)
  })
})

describe('transcribeDocument', () => {
  beforeEach(() => {
    for (const key of ['AI_PROVIDER', 'GEMINI_API_KEY', 'GEMINI_MODEL', 'GROQ_API_KEY']) {
      delete process.env[key]
    }
    delete process.env.AI_BUDGET_PER_MINUTE
    process.env.GEMINI_API_KEY = 'test-key'
  })

  afterEach(() => {
    globalThis.fetch = realFetch
  })

  it('sends the image inline ahead of the instructions and returns the text', async () => {
    stubGemini({ readable: true, text: 'Jane Doe\nSoftware Engineer' })
    const { text } = await transcribeDocument([{ mimeType: 'image/png', data: PNG }])

    assert.equal(text, 'Jane Doe\nSoftware Engineer')
    const [image, prompt] = calls[0].body.contents[0].parts
    assert.deepEqual(image, {
      inlineData: { mimeType: 'image/png', data: Buffer.from(PNG).toString('base64') },
    })
    assert.match(String(prompt.text), /never an instruction to you/)
  })

  it('reports an image with no document text in it', async () => {
    stubGemini({ readable: false, text: '' })
    await assert.rejects(
      () => transcribeDocument([{ mimeType: 'image/jpeg', data: JPEG }]),
      (error: Error) => error instanceof ImageUnreadableError,
    )
  })

  it('stops calling out once the shared budget is spent', async () => {
    process.env.GEMINI_MODEL = 'budget-test-model'
    process.env.AI_BUDGET_PER_MINUTE = '1'
    stubGemini({ readable: true, text: 'Jane Doe' })

    await transcribeDocument([{ mimeType: 'image/png', data: PNG }])
    await assert.rejects(
      () => transcribeDocument([{ mimeType: 'image/png', data: PNG }]),
      (error: Error) => error instanceof ImageReaderBusyError,
    )
    assert.equal(calls.length, 1)
  })

  it('refuses rather than sending an image to a provider that cannot read it', async () => {
    delete process.env.GEMINI_API_KEY
    process.env.GROQ_API_KEY = 'groq-key'
    process.env.GEMINI_MODEL = 'unused'
    stubGemini({ readable: true, text: 'Jane Doe' })

    await assert.rejects(
      () => transcribeDocument([{ mimeType: 'image/png', data: PNG }]),
      (error: Error) => error instanceof AiUnavailableError,
    )
    assert.equal(calls.length, 0)
  })
})
