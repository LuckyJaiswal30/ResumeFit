import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { layoutPage, type TextItem } from './pdf-layout'

const MAX_PAGES = 30
const PARSE_TIMEOUT_MS = 15_000

const require = createRequire(import.meta.url)

function resolvedFontDirectory() {
  try {
    const manifest = require.resolve('pdfjs-dist/package.json')
    if (manifest.endsWith('package.json') && existsSync(manifest)) {
      return manifest.replace(/package\.json$/, 'standard_fonts/')
    }
  } catch {
    return null
  }
  return null
}

function standardFontDataUrl() {
  const candidates = [
    resolvedFontDirectory(),
    join(process.cwd(), 'node_modules', 'pdfjs-dist', 'standard_fonts') + '/',
  ]
  return candidates.find((path) => path !== null && existsSync(path)) ?? undefined
}

function ensureBrowserGlobals() {
  const scope = globalThis as Record<string, unknown>
  scope.DOMMatrix ??= class DOMMatrixStub {}
  scope.ImageData ??= class ImageDataStub {}
  scope.Path2D ??= class Path2DStub {}
}

async function readPages(bytes: Uint8Array) {
  ensureBrowserGlobals()
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const loadingTask = pdfjs.getDocument({
    // pdf.js detaches the buffer it is given, so hand it a copy and leave the caller's intact.
    data: bytes.slice(),
    useWorkerFetch: false,
    standardFontDataUrl: standardFontDataUrl(),
  })
  const document = await loadingTask.promise

  try {
    const pages: string[] = []
    const limit = Math.min(document.numPages, MAX_PAGES)

    for (let number = 1; number <= limit; number += 1) {
      const page = await document.getPage(number)
      const content = await page.getTextContent()

      const items: TextItem[] = content.items.map((item) => {
        const entry = item as { str?: string; transform?: number[]; width?: number }
        const transform = entry.transform ?? []
        return {
          text: entry.str ?? '',
          x: transform[4] ?? 0,
          y: transform[5] ?? 0,
          width: entry.width ?? 0,
          size: Math.hypot(transform[2] ?? 0, transform[3] ?? 0) || 10,
        }
      })

      pages.push(layoutPage(items).join('\n'))
      page.cleanup()
    }

    return pages
  } finally {
    await loadingTask.destroy()
  }
}

export class PasswordProtectedError extends Error {
  constructor() {
    super('This PDF is password protected.')
    this.name = 'PasswordProtectedError'
  }
}

// One entry per page, in order. A page with no text layer comes back as an empty string.
export async function extractPdfPages(bytes: Uint8Array): Promise<string[]> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const expiry = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('PDF parsing took too long.')), PARSE_TIMEOUT_MS)
  })

  try {
    return await Promise.race([readPages(bytes), expiry])
  } catch (error) {
    if (error instanceof Error && error.name === 'PasswordException') {
      throw new PasswordProtectedError()
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export async function extractPdfText(bytes: Uint8Array) {
  return (await extractPdfPages(bytes)).filter(Boolean).join('\n\n')
}
