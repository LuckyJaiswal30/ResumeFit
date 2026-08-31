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

export function makePdf(items: Item[], pageHeight = 792, pageWidth = 612) {
  const content = items
    .map((item) => {
      const font = item.bold ? '/F2' : '/F1'
      return `BT ${font} ${item.size ?? 10} Tf 1 0 0 1 ${item.x} ${pageHeight - item.y} Tm (${encode(item.text)}) Tj ET`
    })
    .join('\n')

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ]

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
