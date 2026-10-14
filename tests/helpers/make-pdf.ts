type Item = { text: string; x: number; y: number; size?: number; bold?: boolean }

const WINANSI: Record<string, string> = {
  '’': '\x92',
  '‘': '\x91',
  '“': '\x93',
  '”': '\x94',
  '–': '\x96',
  '—': '\x97',
  '•': '\x95',
  '\u00a0': ' ',
}

function encode(value: string) {
  return value
    .replace(/[‘’“”–—•\u00a0]/g, (char) => WINANSI[char] ?? char)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function pageContent(items: Item[], pageHeight: number) {
  return items
    .map((item) => {
      const font = item.bold ? '/F2' : '/F1'
      return `BT ${font} ${item.size ?? 10} Tf 1 0 0 1 ${item.x} ${pageHeight - item.y} Tm (${encode(item.text)}) Tj ET`
    })
    .join('\n')
}

// One PDF with a page per entry. An empty entry is a page with no text, as a scan would be.
export function makePdfPages(pages: Item[][], pageHeight = 792, pageWidth = 612) {
  const fonts = pages.length * 2 + 3
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`,
  ]
  for (const items of pages) {
    const page = objects.length + 1
    const content = pageContent(items, pageHeight)
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fonts} 0 R /F2 ${fonts + 1} 0 R >> >> /Contents ${page + 1} 0 R >>`,
      `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
    )
  }
  objects.push(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  )

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'))
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`
  })

  const xref = Buffer.byteLength(pdf, 'latin1')
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`

  return new Uint8Array(Buffer.from(pdf, 'latin1'))
}

export function makePdf(items: Item[], pageHeight = 792, pageWidth = 612) {
  return makePdfPages([items], pageHeight, pageWidth)
}
