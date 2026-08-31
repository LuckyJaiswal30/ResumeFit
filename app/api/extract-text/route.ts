import mammoth from 'mammoth'
import { looksLikeResume, resumeRejectionMessage } from '@/lib/resume/looks-like-resume'
import { extractPdfText } from '@/lib/resume/pdf-text'
import { checkRateLimit, rateLimitHeaders } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 30

const MAX_FILE_BYTES = 4 * 1024 * 1024
const MAX_BODY_BYTES = MAX_FILE_BYTES + 64 * 1024
const MAX_TEXT_LENGTH = 80_000
const MIN_TEXT_LENGTH = 80

function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

function looksBinary(bytes: Uint8Array) {
  const sample = bytes.subarray(0, 4096)
  if (sample.includes(0)) return true
  const controls = sample.filter((byte) => byte < 9 || (byte > 13 && byte < 32)).length
  return controls > sample.length * 0.05
}

function tidy(text: string) {
  return text
    .replaceAll('\u0000', '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_TEXT_LENGTH)
}

function decodeText(bytes: Uint8Array) {
  const [a, b, c] = bytes
  if (a === 0xff && b === 0xfe) return new TextDecoder('utf-16le').decode(bytes.subarray(2))
  if (a === 0xfe && b === 0xff) return new TextDecoder('utf-16be').decode(bytes.subarray(2))
  if (a === 0xef && b === 0xbb && c === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3))
  }

  const sample = bytes.subarray(0, 2048)
  const evenNulls = sample.filter((byte, index) => byte === 0 && index % 2 === 1).length
  const oddNulls = sample.filter((byte, index) => byte === 0 && index % 2 === 0).length
  if (evenNulls > sample.length / 8) return new TextDecoder('utf-16le').decode(bytes)
  if (oddNulls > sample.length / 8) return new TextDecoder('utf-16be').decode(bytes)

  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
  const replacements = (utf8.match(/\ufffd/g) ?? []).length
  if (replacements > utf8.length / 200) {
    return new TextDecoder('windows-1252').decode(bytes)
  }
  return utf8
}

function startsWith(bytes: Uint8Array, signature: string) {
  return new TextDecoder('latin1').decode(bytes.slice(0, signature.length)) === signature
}

export async function POST(request: Request) {
  const rate = await checkRateLimit(request, 'extract', 30, 10 * 60_000)
  const limitHeaders = rateLimitHeaders(rate)
  if (!rate.allowed) {
    return Response.json(
      { error: 'That is a lot of uploads in a short space of time. Try again in a few minutes.' },
      { status: 429, headers: limitHeaders },
    )
  }

  const declaredSize = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredSize) && declaredSize > MAX_BODY_BYTES) {
    return Response.json(
      { error: 'That file is over 4 MB. Try a smaller export.' },
      { status: 413, headers: limitHeaders },
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get('resume')

    if (!(file instanceof File)) return fail('Pick a resume file first.')
    if (file.size === 0) return fail('That file is empty.')
    if (file.size > MAX_FILE_BYTES) return fail('That file is over 4 MB. Try a smaller export.')

    const name = file.name.toLowerCase()
    const bytes = new Uint8Array(await file.arrayBuffer())
    let text: string

    if (name.endsWith('.txt')) {
      if (looksBinary(bytes)) return fail('There is no readable text in that file.')
      text = decodeText(bytes)
    } else if (name.endsWith('.docx')) {
      if (!startsWith(bytes, 'PK\u0003\u0004'))
        return fail('That is not really a .docx file.')
      text = (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value
    } else if (name.endsWith('.pdf')) {
      if (!startsWith(bytes, '%PDF')) return fail('That is not really a .pdf file.')
      text = await extractPdfText(bytes)
    } else {
      return fail('Upload a .pdf, .docx or .txt file.')
    }

    text = tidy(text)
    if (text.length < MIN_TEXT_LENGTH) {
      return fail(
        'There is almost no readable text in that file. If it is a scan or an image, export a text version instead.',
        422,
      )
    }

    const check = looksLikeResume(text)
    if (!check.ok) return fail(resumeRejectionMessage(check), 422)

    return Response.json({ text }, { headers: limitHeaders })
  } catch {
    return fail(
      'That file could not be read. Try a different export, or paste the text instead.',
      422,
    )
  }
}
