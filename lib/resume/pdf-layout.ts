export type TextItem = { text: string; x: number; y: number; width: number; size: number }

type Row = { items: TextItem[]; y: number; size: number }
type Interval = [number, number]

const LINE_TOLERANCE = 3
const MIN_GUTTER_WIDTH = 8
const SCAN_MARGIN = 0.15
const MIN_SIDE_BY_SIDE_ROWS = 4
const ALIGN_TOLERANCE = 20
const MAX_DEPTH = 3
const MAX_JUMP_SHARE = 0.3
const INTERLEAVE_GAP = 24
const HEADING_SCALE = 1.2
const SECTION_GAP_SCALE = 1.4

const CONTACT = /@|\+?\d[\d ()-]{7,}\d|linkedin|github|https?:|www\./i
const DATE = /\b(?:19|20)\d{2}\b|\bpresent\b/i

function median(values: number[]) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

function end(item: TextItem) {
  return item.x + item.width
}

// "W O R K" is how a letter-spaced heading comes out of the PDF. Close it back up.
function closeLetterSpacing(text: string) {
  const trimmed = text.trim()
  return /^(?:\p{L} ){2,}\p{L}$/u.test(trimmed) ? trimmed.replaceAll(' ', '') : text
}

function joinItems(items: TextItem[]) {
  return items
    .reduce((line, item, index) => {
      const text = closeLetterSpacing(item.text)
      if (index === 0) return text
      const previous = items[index - 1]
      const gap = item.x - end(previous)
      const spaced =
        gap > Math.max(1, item.size * 0.15) && !line.endsWith(' ') && !text.startsWith(' ')
      return line + (spaced ? ' ' : '') + text
    }, '')
    .replace(/\s+/g, ' ')
    .replace(/(?<!\S)(?:\p{Lu} ){3,}\p{Lu}(?!\S)/gu, (run) => run.replaceAll(' ', ''))
    .trim()
}

function rowText(row: Row) {
  return joinItems([...row.items].sort((a, b) => a.x - b.x))
}

function makeRow(items: TextItem[]): Row {
  return { items, y: items[0].y, size: Math.max(...items.map((item) => item.size)) }
}

// Lines in the order the PDF stores them: an item joins the line before it when it sits on
// the same baseline further to the right.
function streamLines(items: TextItem[]) {
  const lines: TextItem[][] = []
  for (const item of items) {
    const line = lines.at(-1)
    const last = line?.at(-1)
    if (
      line &&
      last &&
      Math.abs(item.y - last.y) <= LINE_TOLERANCE &&
      item.x >= end(last) - item.size
    ) {
      line.push(item)
    } else {
      lines.push([item])
    }
  }
  return lines.map(makeRow)
}

// Word, Google Docs, Canva, LaTeX and browsers all write text in reading order, one column
// at a time. Some tools write it row by row across the page, or in no order at all.
function inReadingOrder(lines: Row[]) {
  let jumps = 0
  for (let index = 1; index < lines.length; index += 1) {
    const previous = lines[index - 1]
    const current = lines[index]
    const sameRow = Math.abs(current.y - previous.y) <= LINE_TOLERANCE
    if (
      current.y > previous.y + LINE_TOLERANCE ||
      (sameRow && current.items[0].x < previous.items[0].x)
    ) {
      jumps += 1
    }
  }
  if (jumps >= 3 && jumps / lines.length > MAX_JUMP_SHARE) return false

  const columnStarts: number[] = []
  for (const line of lines) {
    for (let index = 1; index < line.items.length; index += 1) {
      if (line.items[index].x - end(line.items[index - 1]) >= INTERLEAVE_GAP) {
        columnStarts.push(line.items[index].x)
      }
    }
  }
  const interleaved = columnStarts.some(
    (start) =>
      columnStarts.filter((other) => Math.abs(other - start) <= LINE_TOLERANCE).length >=
      MIN_SIDE_BY_SIDE_ROWS,
  )
  return !interleaved
}

function groupRows(items: TextItem[]) {
  const rows: TextItem[][] = []
  for (const item of [...items].sort((a, b) => b.y - a.y)) {
    const row = rows.find((candidate) => Math.abs(candidate[0].y - item.y) <= LINE_TOLERANCE)
    if (row) row.push(item)
    else rows.push([item])
  }
  return rows.map((row) => makeRow(row.sort((a, b) => a.x - b.x)))
}

function freeSpace(row: Row, from: number, to: number) {
  const free: Interval[] = []
  let cursor = from
  for (const item of row.items) {
    if (item.x > cursor) free.push([cursor, Math.min(item.x, to)])
    cursor = Math.max(cursor, end(item))
    if (cursor >= to) break
  }
  if (cursor < to) free.push([cursor, to])
  return free.filter(([a, b]) => b - a >= MIN_GUTTER_WIDTH)
}

function intersect(a: Interval[], b: Interval[]) {
  const result: Interval[] = []
  for (const [a0, a1] of a) {
    for (const [b0, b1] of b) {
      const lo = Math.max(a0, b0)
      const hi = Math.min(a1, b1)
      if (hi - lo >= MIN_GUTTER_WIDTH) result.push([lo, hi])
    }
  }
  return result
}

function sides(row: Row, split: number) {
  return {
    left: row.items.some((item) => end(item) <= split),
    right: row.items.some((item) => item.x >= split),
  }
}

// A heading sitting under a column block, after a wider gap than the block's own spacing,
// belongs to whatever comes next.
function dropTrailingHeading(run: Row[], split: number) {
  const lastTwoSided = run.findLastIndex((row) => {
    const side = sides(row, split)
    return side.left && side.right
  })
  if (lastTwoSided < 0 || lastTwoSided >= run.length - 1) return run

  const spacing = run.slice(1).map((row, index) => run[index].y - row.y)
  const usual = median(spacing)
  const usualSize = median(run.map((row) => row.size))
  for (let index = run.length - 1; index > lastTwoSided; index -= 1) {
    const gap = run[index - 1].y - run[index].y
    if (gap > usual * 1.5 && run[index].size >= usualSize) return run.slice(0, index)
  }
  return run
}

// A larger heading with clear space above it right across the page opens a new section, so
// columns never run through it. A heading inside a sidebar has the main column beside it.
function sectionStarts(rows: Row[]) {
  const bodySize = median(rows.flatMap((row) => row.items.map((item) => item.size)))
  const spacing = median(rows.slice(1).map((row, index) => rows[index].y - row.y))
  return rows.map(
    (row, index) =>
      index > 0 &&
      row.size >= bodySize * HEADING_SCALE &&
      rows[index - 1].y - row.y >= spacing * SECTION_GAP_SCALE,
  )
}

function isColumnSplit(run: Row[], split: number) {
  const left = run.flatMap((row) => row.items.filter((item) => end(item) <= split))
  const right = run.flatMap((row) => row.items.filter((item) => item.x >= split))
  if (left.length === 0 || right.length === 0) return false

  const rightRows = run.filter((row) => sides(row, split).right)
  const sideBySide = run.filter((row) => {
    const side = sides(row, split)
    return side.left && side.right
  }).length

  const starts = rightRows.map((row) => row.items.find((item) => item.x >= split)!.x)
  const firstStart = Math.min(...starts)
  const leftAligned =
    starts.filter((start) => start - firstStart <= ALIGN_TOLERANCE).length >= starts.length * 0.6
  if (sideBySide >= MIN_SIDE_BY_SIDE_ROWS && leftAligned) return true

  // A name on the left with contact details stacked against the right margin.
  const ends = rightRows.map((row) => Math.max(...row.items.filter((i) => i.x >= split).map(end)))
  const lastEnd = Math.max(...ends)
  const rightAligned = ends.filter((value) => lastEnd - value <= 4).length >= ends.length * 0.8
  const rightText = right.map((item) => item.text).join(' ')
  return rightRows.length >= 2 && rightAligned && CONTACT.test(rightText) && !DATE.test(rightText)
}

function layoutRegion(items: TextItem[], depth: number): string[] {
  const rows = groupRows(items)
  if (rows.length === 0) return []
  if (depth >= MAX_DEPTH) return rows.map(rowText)

  const from = Math.min(...items.map((item) => item.x))
  const to = Math.max(...items.map(end))
  const scanFrom = from + (to - from) * SCAN_MARGIN
  const scanTo = to - (to - from) * SCAN_MARGIN

  const opensSection = sectionStarts(rows)
  const lines: string[] = []
  let index = 0
  while (index < rows.length) {
    let gutters = freeSpace(rows[index], scanFrom, scanTo)
    let next = index + 1
    while (gutters.length > 0 && next < rows.length && !opensSection[next]) {
      const narrowed = intersect(gutters, freeSpace(rows[next], scanFrom, scanTo))
      if (narrowed.length === 0) break
      gutters = narrowed
      next += 1
    }

    let consumed = 0
    for (const [a, b] of [...gutters].sort((g, h) => h[1] - h[0] - (g[1] - g[0]))) {
      const split = (a + b) / 2
      const run = dropTrailingHeading(rows.slice(index, next), split)
      if (!isColumnSplit(run, split)) continue
      const runItems = run.flatMap((row) => row.items)
      lines.push(
        ...layoutRegion(
          runItems.filter((item) => end(item) <= split),
          depth + 1,
        ),
        ...layoutRegion(
          runItems.filter((item) => item.x >= split),
          depth + 1,
        ),
      )
      consumed = run.length
      break
    }

    if (consumed === 0) {
      lines.push(rowText(rows[index]))
      consumed = 1
    }
    index += consumed
  }
  return lines
}

export function layoutPage(items: TextItem[]) {
  const visible = items.filter((item) => item.text.trim().length > 0)
  if (visible.length === 0) return []

  const lines = streamLines(visible)
  if (inReadingOrder(lines)) return lines.map(rowText).filter(Boolean)
  return layoutRegion(visible, 0).filter(Boolean)
}
