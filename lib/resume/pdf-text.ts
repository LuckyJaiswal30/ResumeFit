import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

type TextItem = { text: string; x: number; y: number; width: number }

const LINE_TOLERANCE = 3
const MIN_GUTTER_WIDTH = 12
const GUTTER_SCAN_STEP = 2
const MIN_COLUMN_SHARE = 0.15
const MAX_GUTTER_CROSSINGS = 2
const MIN_SIDE_BY_SIDE_ROWS = 4
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

function crossings(items: TextItem[], x: number) {
  return items.filter((item) => item.x < x - 1 && item.x + item.width > x + 1).length
}

function findGutter(items: TextItem[], pageWidth: number) {
  if (items.length < 10) return null

  const from = pageWidth * 0.18
  const to = pageWidth * 0.82
  const allowed = MAX_GUTTER_CROSSINGS

  let best: { start: number; end: number } | null = null
  let runStart: number | null = null

  for (let x = from; x <= to; x += GUTTER_SCAN_STEP) {
    if (crossings(items, x) <= allowed) {
      if (runStart === null) runStart = x
      continue
    }
    if (runStart !== null) {
      const run = { start: runStart, end: x - GUTTER_SCAN_STEP }
      if (!best || run.end - run.start > best.end - best.start) best = run
      runStart = null
    }
  }
  if (runStart !== null) {
    const run = { start: runStart, end: to }
    if (!best || run.end - run.start > best.end - best.start) best = run
  }

  if (!best || best.end - best.start < MIN_GUTTER_WIDTH) return null

  const split = (best.start + best.end) / 2
  const left = items.filter((item) => item.x + item.width <= split)
  const right = items.filter((item) => item.x >= split)
  const share = items.length * MIN_COLUMN_SHARE
  if (left.length < share || right.length < share) return null

  const sideBySide = new Set(
    right
      .filter((item) => left.some((other) => Math.abs(other.y - item.y) <= LINE_TOLERANCE))
      .map((item) => Math.round(item.y)),
  )
  return sideBySide.size >= MIN_SIDE_BY_SIDE_ROWS ? split : null
}

function toLines(items: TextItem[]) {
  const rows: TextItem[][] = []

  for (const item of [...items].sort((a, b) => b.y - a.y)) {
    const row = rows.find((candidate) => Math.abs(candidate[0].y - item.y) <= LINE_TOLERANCE)
    if (row) row.push(item)
    else rows.push([item])
  }

  return rows
    .map((row) =>
      [...row]
        .sort((a, b) => a.x - b.x)
        .reduce((line, item, index, all) => {
          if (index === 0) return item.text
          const previous = all[index - 1]
          const gap = item.x - (previous.x + previous.width)
          const spaced = gap > 1 && !line.endsWith(' ') && !item.text.startsWith(' ')
          return line + (spaced ? ' ' : '') + item.text
        }, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
}

function orderPage(items: TextItem[], pageWidth: number) {
  const split = findGutter(items, pageWidth)
  if (split === null) return toLines(items)

  const spansGutter = (item: TextItem) => item.x < split && item.x + item.width > split
  const banner = items.filter(spansGutter)
  const columned = items.filter((item) => !spansGutter(item))
  const left = columned.filter((item) => item.x < split)
  const right = columned.filter((item) => item.x >= split)

  const highestColumn = Math.max(...columned.map((item) => item.y))
  const lowestColumn = Math.min(...columned.map((item) => item.y))
  const header = banner.filter((item) => item.y > highestColumn)
  const footer = banner.filter((item) => item.y < lowestColumn)
  const inline = banner.filter((item) => item.y <= highestColumn && item.y >= lowestColumn)

  return [
    ...toLines(header),
    ...toLines([...left, ...inline]),
    ...toLines(right),
    ...toLines(footer),
  ]
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
    data: bytes,
    useWorkerFetch: false,
    standardFontDataUrl: standardFontDataUrl(),
  })
  const document = await loadingTask.promise

  try {
    const pages: string[] = []
    const limit = Math.min(document.numPages, MAX_PAGES)

    for (let number = 1; number <= limit; number += 1) {
      const page = await document.getPage(number)
      const viewport = page.getViewport({ scale: 1 })
      const content = await page.getTextContent()

      const items: TextItem[] = content.items
        .map((item) => {
          const entry = item as { str?: string; transform?: number[]; width?: number }
          return {
            text: entry.str ?? '',
            x: entry.transform?.[4] ?? 0,
            y: entry.transform?.[5] ?? 0,
            width: entry.width ?? 0,
          }
        })
        .filter((item) => item.text.trim().length > 0)

      if (items.length > 0) pages.push(orderPage(items, viewport.width).join('\n'))
      page.cleanup()
    }

    return pages.join('\n\n')
  } finally {
    await loadingTask.destroy()
  }
}

export async function extractPdfText(bytes: Uint8Array) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const expiry = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('PDF parsing took too long.')), PARSE_TIMEOUT_MS)
  })

  try {
    return await Promise.race([readPages(bytes), expiry])
  } finally {
    clearTimeout(timer)
  }
}
