import mammoth from 'mammoth'
import { looksLikeResume, resumeRejectionMessage } from '@/lib/resume/looks-like-resume'
import { extractPdfText, PasswordProtectedError } from '@/lib/resume/pdf-text'
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

function utf16Flavour(bytes: Uint8Array): 'utf-16le' | 'utf-16be' | null {
  const [a, b] = bytes
  if (a === 0xff && b === 0xfe) return 'utf-16le'
  if (a === 0xfe && b === 0xff) return 'utf-16be'

  const sample = bytes.subarray(0, 2048)
  const evenNulls = sample.filter((byte, index) => byte === 0 && index % 2 === 1).length
  const oddNulls = sample.filter((byte, index) => byte === 0 && index % 2 === 0).length
  if (evenNulls > sample.length / 8) return 'utf-16le'
  if (oddNulls > sample.length / 8) return 'utf-16be'
  return null
}

function decodeText(bytes: Uint8Array, utf16: 'utf-16le' | 'utf-16be' | null) {
  if (utf16) {
    const hasBom = bytes[0] === 0xff || bytes[0] === 0xfe
    return new TextDecoder(utf16).decode(hasBom ? bytes.subarray(2) : bytes)
  }
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3))
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

function startsWith(bytes: Uint8Array, signature: string) {
  return new TextDecoder('latin1').decode(bytes.slice(0, signature.length)) === signature
}

export async function POST(request: Request) {
  const rate = await checkRateLimit(request, 'extract', 30, 10 * 60_000)
  const limitHeaders = rateLimitHeaders(rate)
  if (!rate.allowed) {
    return Response.json(
      { error: 'That’s a lot of uploads in a short space of time. Try again in a few minutes.' },
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
      const utf16 = utf16Flavour(bytes)
      if (!utf16 && looksBinary(bytes)) return fail('There is no readable text in that file.')
      text = decodeText(bytes, utf16)
    } else if (name.endsWith('.docx')) {
      if (!startsWith(bytes, 'PK\u0003\u0004')) return fail('That’s not really a .docx file.')
      text = (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value
    } else if (name.endsWith('.pdf')) {
      if (!startsWith(bytes, '%PDF')) return fail('That’s not really a .pdf file.')
      text = await extractPdfText(bytes)
    } else {
      return fail('Upload a .pdf, .docx or .txt file.')
    }

    text = tidy(text)
    if (text.length < MIN_TEXT_LENGTH) {
      return fail(
        'There’s almost no readable text in that file. If it’s a scan or an image, export a text version instead.',
        422,
      )
    }

    const check = looksLikeResume(text)
    if (!check.ok) return fail(resumeRejectionMessage(check), 422)

    return Response.json({ text }, { headers: limitHeaders })
  } catch (error) {
    if (error instanceof PasswordProtectedError) {
      return fail('That PDF is password protected. Save an unlocked copy and upload that.', 422)
    }
    return fail(
      'That file could not be read. Try a different export, or save it as a .txt file.',
      422,
    )
  }
}
