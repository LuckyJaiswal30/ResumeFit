import { AiRequestError, AiUnavailableError, canReadImages } from '@/lib/ai/client'
import {
  ImageReaderBusyError,
  imageMimeType,
  transcribeDocument,
  type Transcription,
} from './image-text'
import { SEVERAL_RESUMES_MESSAGE } from './looks-like-resume'
import { htmlToText } from './markup-text'
import { extractDoc, extractDocx, extractOdt, type ImageFile, type OfficeText } from './office-text'
import { extractPdfPages } from './pdf-text'
import { rtfToText } from './rtf-text'
import { readZip, ZipError, type ZipEntry } from './zip'

export const MAX_TEXT_LENGTH = 80_000
export const MIN_TEXT_LENGTH = 80
export const MAX_PAGE_IMAGES = 5
const MIN_PAGE_TEXT = 20

export type UploadedFile = { name: string; bytes: Uint8Array }

export type ReadResult = { text: string; transcribed: boolean }

// The message is written for the person uploading.
export class ResumeReadError extends Error {
  readonly status: number

  constructor(message: string, status = 422) {
    super(message)
    this.status = status
  }
}

type Kind =
  | { type: 'pdf' }
  | { type: 'docx' }
  | { type: 'odt' }
  | { type: 'pages'; preview: ZipEntry | undefined }
  | { type: 'zip' }
  | { type: 'doc' }
  | { type: 'rtf' }
  | { type: 'image'; mimeType: string }
  | { type: 'other-image' }
  | { type: 'html' }
  | { type: 'text'; utf16: 'utf-16le' | 'utf-16be' | null }
  | { type: 'binary' }

function ascii(bytes: Uint8Array, from: number, to: number) {
  return new TextDecoder('latin1').decode(bytes.subarray(from, to))
}

function looksBinary(bytes: Uint8Array) {
  const sample = bytes.subarray(0, 4096)
  if (sample.includes(0)) return true
  const controls = sample.filter((byte) => byte < 9 || (byte > 13 && byte < 32)).length
  return controls > sample.length * 0.05
}

function utf16Flavour(bytes: Uint8Array): 'utf-16le' | 'utf-16be' | null {
  const [a, b] = bytes
  if (a === 0xff && b === 0xfe) return 'utf-16le'
  if (a === 0xfe && b === 0xff) return 'utf-16be'

  const sample = bytes.subarray(0, 2048)
  const evenNulls = sample.filter((byte, index) => byte === 0 && index % 2 === 1).length
  const oddNulls = sample.filter((byte, index) => byte === 0 && index % 2 === 0).length
  // Real UTF-16 text has its zero bytes on one side only. Binary data has them everywhere.
  if (evenNulls > sample.length / 8 && oddNulls < evenNulls / 4) return 'utf-16le'
  if (oddNulls > sample.length / 8 && evenNulls < oddNulls / 4) return 'utf-16be'
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

// Control and private-use characters are what icon fonts leave behind.
function isInvisible(char: string) {
  const code = char.codePointAt(0) ?? 0
  if (char === '\n' || char === '\r' || char === '\t') return false
  return code < 32 || code === 127 || (code >= 0xe000 && code <= 0xf8ff)
}

export function tidy(text: string) {
  return [...text]
    .filter((char) => !isInvisible(char))
    .join('')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_TEXT_LENGTH)
}

// What the file really is, judged by its contents. Names and extensions are often wrong:
// files arrive renamed, extensionless from chat apps, or as "Resume.docx (3).pdf".
export function sniff(bytes: Uint8Array): Kind {
  if (ascii(bytes, 0, 1024).includes('%PDF-')) return { type: 'pdf' }
  if (ascii(bytes, 0, 5) === '{\\rtf') return { type: 'rtf' }
  if (ascii(bytes, 0, 8) === 'ÐÏ\u0011à¡±\u001aá') return { type: 'doc' }

  const mimeType = imageMimeType(bytes)
  if (mimeType) return { type: 'image', mimeType }
  if (
    ascii(bytes, 0, 4) === 'GIF8' ||
    ascii(bytes, 0, 2) === 'BM' ||
    ascii(bytes, 0, 4) === 'II*\u0000' ||
    ascii(bytes, 0, 4) === 'MM\u0000*' ||
    (ascii(bytes, 4, 8) === 'ftyp' && /^avi[fs]$/.test(ascii(bytes, 8, 12)))
  ) {
    return { type: 'other-image' }
  }

  if (ascii(bytes, 0, 4) === 'PK\u0003\u0004') {
    try {
      const entries = readZip(bytes)
      if (entries.has('word/document.xml')) return { type: 'docx' }
      const mime = entries.get('mimetype')
      if (mime && ascii(mime.read(), 0, 64).startsWith('application/vnd.oasis.opendocument.text')) {
        return { type: 'odt' }
      }
      if (entries.has('Index/Document.iwa') || entries.has('index.xml')) {
        return { type: 'pages', preview: entries.get('QuickLook/Preview.pdf') }
      }
    } catch (error) {
      if (!(error instanceof ZipError)) throw error
    }
    return { type: 'zip' }
  }

  const utf16 = utf16Flavour(bytes)
  if (!utf16 && looksBinary(bytes)) return { type: 'binary' }
  const head = decodeText(bytes.subarray(0, 2048), utf16)
  if (/<(?:!doctype html|html|body)\b/i.test(head)) return { type: 'html' }
  return { type: 'text', utf16 }
}

// A text layer can exist and still be nonsense, when a PDF's fonts carry no character map.
export function looksGarbled(text: string) {
  const chars = [...text]
  if (chars.length === 0) return false
  const junk = chars.filter((char) => /[-�]/.test(char)).length
  if (junk / chars.length > 0.05 || /\(cid:\d+\)/.test(text)) return true

  const tokens = text.split(/\s+/).filter((token) => (token.match(/\p{L}/gu)?.length ?? 0) >= 3)
  if (tokens.length < 20) return false
  const wordlike = tokens.filter(
    (token) => /[aeiouy]/i.test(token) && /^[\p{L}'’.,:;()/&+-]+$/u.test(token.replace(/\d/g, '')),
  )
  return wordlike.length / tokens.length < 0.6
}

const PAGE_KIND_LABEL: Record<string, string> = {
  'cover-letter': 'a cover letter',
  'job-posting': 'a job posting',
  other: 'something other than a resume',
}

function nameWords(name: string) {
  return new Set(
    name
      .toLowerCase()
      .split(/[^\p{L}]+/u)
      .filter((word) => word.length >= 2),
  )
}

// "Ravi Kumar", "RAVI KUMAR", "R. Kumar" and "Kumar Ravi" are one person. "Amit Kumar" isn't.
export function samePerson(a: string, b: string) {
  const [shorter, longer] = [nameWords(a), nameWords(b)].sort((x, y) => x.size - y.size)
  if (shorter.size === 0) return true
  return [...shorter].every((word) => longer.has(word))
}

export function distinctPeople(names: string[]) {
  const people: string[] = []
  for (const name of names.map((entry) => entry.trim()).filter(Boolean)) {
    if (!people.some((person) => samePerson(person, name))) people.push(name)
  }
  return people
}

// Everything uploaded has to be one person's resume. Mixing in someone else's resume, or a
// page that isn't a resume at all, would blend two people into one report.
export function checkOneResume(transcription: Transcription) {
  const several = transcription.pages.length > 1
  const stray = transcription.pages.findIndex(
    (page) => page.kind !== 'resume' && page.kind !== 'blank',
  )
  if (stray >= 0) {
    const label = PAGE_KIND_LABEL[transcription.pages[stray].kind]
    throw new ResumeReadError(
      several
        ? `Page ${stray + 1} looks like ${label}, not part of a resume. Upload only the pages of your resume.`
        : `That looks like ${label}, not a resume. Upload your resume instead.`,
    )
  }

  const people = distinctPeople(transcription.pages.flatMap((page) => page.candidates))
  if (people.length > 1) {
    throw new ResumeReadError(
      `This has resumes for more than one person (${people.slice(0, 3).join(' and ')}). Upload just one person’s resume.`,
    )
  }
  if (transcription.separateDocuments) throw new ResumeReadError(SEVERAL_RESUMES_MESSAGE)
}

async function transcribe(files: ImageFile[]) {
  const transcription = await transcribeDocument(files)
  checkOneResume(transcription)
  return { text: transcription.text, transcribed: true }
}

// Reads a PDF locally, and has the model read it instead when the text layer is missing,
// covers only some pages, or is garbled. If the model can't help, a usable local read wins.
async function readPdf(bytes: Uint8Array): Promise<ReadResult> {
  const pages = await extractPdfPages(bytes)
  const local = tidy(pages.filter(Boolean).join('\n\n'))
  const usable = local.length >= MIN_TEXT_LENGTH && !looksGarbled(local)
  const partlyScanned = pages.length > 1 && pages.some((page) => tidy(page).length < MIN_PAGE_TEXT)
  if ((usable && !partlyScanned) || !canReadImages()) return { text: local, transcribed: false }

  try {
    return await transcribe([{ mimeType: 'application/pdf', data: bytes }])
  } catch (error) {
    const recoverable =
      error instanceof ImageReaderBusyError ||
      error instanceof AiRequestError ||
      error instanceof AiUnavailableError
    if (usable && recoverable) return { text: local, transcribed: false }
    throw error
  }
}

async function readOffice(office: OfficeText): Promise<ReadResult> {
  const text = tidy(office.text)
  if (text.length >= MIN_TEXT_LENGTH || !canReadImages()) return { text, transcribed: false }
  const images = office.images()
  return images.length > 0 ? transcribe(images) : { text, transcribed: false }
}

function unreadable(message: string): never {
  throw new ResumeReadError(message, 400)
}

async function readOne(file: UploadedFile): Promise<ReadResult> {
  const kind = sniff(file.bytes)
  switch (kind.type) {
    case 'pdf':
      return readPdf(file.bytes)
    case 'docx':
      return readOffice(await extractDocx(file.bytes))
    case 'odt':
      return readOffice(extractOdt(file.bytes))
    case 'doc':
      return readOffice(await extractDoc(file.bytes))
    case 'rtf':
      return { text: rtfToText(ascii(file.bytes, 0, file.bytes.length)), transcribed: false }
    case 'html':
      return { text: htmlToText(decodeText(file.bytes, null)), transcribed: false }
    case 'text':
      return { text: decodeText(file.bytes, kind.utf16), transcribed: false }
    case 'image':
      if (!canReadImages()) {
        throw new ResumeReadError(
          'Images can’t be read right now. Upload a PDF, DOCX or TXT instead.',
        )
      }
      return transcribe([{ mimeType: kind.mimeType, data: file.bytes }])
    case 'other-image':
      return unreadable('That image format can’t be read. Save it as a JPG or PNG and try again.')
    case 'pages':
      if (kind.preview) return readPdf(kind.preview.read())
      return unreadable(
        'Pages files can’t be read directly. In Pages, choose File › Export To › PDF.',
      )
    case 'zip':
      return unreadable('That’s a zip archive. Take the resume out of it and upload that file.')
    case 'binary':
      return unreadable(
        'That file type can’t be read. Upload a PDF, Word document, text file or photo.',
      )
  }
}

export async function readResume(files: UploadedFile[]): Promise<ReadResult> {
  if (files.length === 0) throw new ResumeReadError('Pick a resume file first.', 400)
  if (files.some((file) => file.bytes.length === 0))
    throw new ResumeReadError('That file is empty.', 400)

  let result: ReadResult
  if (files.length === 1) {
    result = await readOne(files[0])
  } else {
    if (files.length > MAX_PAGE_IMAGES) {
      throw new ResumeReadError(`Add up to ${MAX_PAGE_IMAGES} photos, one per page.`, 400)
    }
    const images = files.map((file) => ({ file, kind: sniff(file.bytes) }))
    const pages: ImageFile[] = []
    for (const { kind } of images) {
      if (kind.type !== 'image') {
        throw new ResumeReadError('Add one document, or up to five photos of its pages.', 400)
      }
      pages.push({ mimeType: kind.mimeType, data: images[pages.length].file.bytes })
    }
    if (!canReadImages()) {
      throw new ResumeReadError(
        'Images can’t be read right now. Upload a PDF, DOCX or TXT instead.',
      )
    }
    result = await transcribe(pages)
  }

  const text = tidy(result.text)
  if (text.length < MIN_TEXT_LENGTH) {
    throw new ResumeReadError(
      result.transcribed
        ? 'Hardly any text could be made out. Try a sharper, well-lit photo of the whole page.'
        : canReadImages()
          ? 'There’s almost no readable text in that file.'
          : 'There’s almost no readable text in that file. If it’s a scan or an image, export a text version instead.',
    )
  }
  return { text, transcribed: result.transcribed }
}
