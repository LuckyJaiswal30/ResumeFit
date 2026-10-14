import mammoth from 'mammoth'
import WordExtractor from 'word-extractor'
import { imageMimeType } from './image-text'
import { htmlToText, odfXmlToText, wordXmlToText } from './markup-text'
import { readZip, readZipText, type ZipEntry } from './zip'

export type ImageFile = { mimeType: string; data: Uint8Array }

// Images are only unpacked when asked for, since most resumes never need them.
export type OfficeText = { text: string; images: () => ImageFile[] }

const MAX_IMAGES = 5
const MIN_IMAGE_BYTES = 20 * 1024

function lines(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

// Header and footer lines that the body doesn't already contain, so contact details kept in
// the page header aren't lost, and repeated ones aren't doubled.
function extraLines(parts: string[], body: string) {
  const seen = new Set(lines(body))
  const extra: string[] = []
  for (const line of parts.flatMap(lines)) {
    if (seen.has(line)) continue
    seen.add(line)
    extra.push(line)
  }
  return extra.join('\n')
}

// Large pictures in the file, biggest first. A resume pasted into Word as a scan is one of these.
function embeddedImages(entries: Map<string, ZipEntry>, folder: string) {
  return [...entries.values()]
    .filter((entry) => entry.name.startsWith(folder) && entry.size >= MIN_IMAGE_BYTES)
    .sort((a, b) => b.size - a.size)
    .slice(0, MAX_IMAGES)
    .flatMap((entry) => {
      const data = entry.read()
      const mimeType = imageMimeType(data)
      return mimeType ? [{ mimeType, data }] : []
    })
}

function partsMatching(entries: Map<string, ZipEntry>, pattern: RegExp) {
  return [...entries.keys()]
    .filter((name) => pattern.test(name))
    .sort()
    .map((name) => wordXmlToText(readZipText(entries, name) ?? ''))
}

export async function extractDocx(bytes: Uint8Array): Promise<OfficeText> {
  const entries = readZip(bytes)
  const { value: html } = await mammoth.convertToHtml(
    { buffer: Buffer.from(bytes) },
    { convertImage: mammoth.images.imgElement(async () => ({ src: '' })) },
  )
  const body = htmlToText(html)
  const header = extraLines(partsMatching(entries, /^word\/header\d*\.xml$/), body)
  const footer = extraLines(partsMatching(entries, /^word\/footer\d*\.xml$/), `${header}\n${body}`)
  return {
    text: [header, body, footer].filter(Boolean).join('\n\n'),
    images: () => embeddedImages(entries, 'word/media/'),
  }
}

export function extractOdt(bytes: Uint8Array): OfficeText {
  const entries = readZip(bytes)
  const body = odfXmlToText(readZipText(entries, 'content.xml') ?? '')
  const styles = readZipText(entries, 'styles.xml') ?? ''
  const pageParts = [...styles.matchAll(/<style:(header|footer)\b[^>]*>([\s\S]*?)<\/style:\1>/g)]
  const header = extraLines(
    pageParts.filter((part) => part[1] === 'header').map((part) => odfXmlToText(part[2])),
    body,
  )
  const footer = extraLines(
    pageParts.filter((part) => part[1] === 'footer').map((part) => odfXmlToText(part[2])),
    `${header}\n${body}`,
  )
  return {
    text: [header, body, footer].filter(Boolean).join('\n\n'),
    images: () => embeddedImages(entries, 'Pictures/'),
  }
}

export async function extractDoc(bytes: Uint8Array): Promise<OfficeText> {
  const document = await new WordExtractor().extract(Buffer.from(bytes))
  const body = [document.getBody(), document.getTextboxes({ includeHeadersAndFooters: false })]
    .filter(Boolean)
    .join('\n')
  const header = extraLines([document.getHeaders({ includeFooters: false })], body)
  const footer = extraLines([document.getFooters()], `${header}\n${body}`)
  return { text: [header, body, footer].filter(Boolean).join('\n\n'), images: () => [] }
}
