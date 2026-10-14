const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  bull: '•',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  hellip: '…',
}

export function decodeEntities(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === '#') {
      const value =
        code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : Number(code.slice(1))
      return Number.isFinite(value) && value > 0 && value <= 0x10ffff
        ? String.fromCodePoint(value)
        : ''
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? whole
  })
}

const BLOCK_END =
  /<\/(?:p|h[1-6]|li|tr|td|th|table|ul|ol|div|section|article|header|footer|blockquote|dd|dt)>/gi

export function htmlToText(html: string) {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<(script|style|head|noscript|template)\b[\s\S]*?<\/\1>/gi, '')
      .replace(/<li\b[^>]*>/gi, '\n- ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(BLOCK_END, '\n')
      .replace(/<[^>]+>/g, ''),
  )
}

type Rules = {
  paragraph: RegExp
  // Only text inside these elements is kept. Without it, every text node is.
  text?: RegExp
  tab: RegExp
  lineBreak: RegExp
  listItem?: RegExp
  spaces?: RegExp
  skip: RegExp[]
}

// Walks the tags of an office XML part in order: paragraphs become lines, list items get a
// "- " so bullets survive, and alternate copies of the same content are skipped.
function officeXmlToText(xml: string, rules: Rules) {
  let body = xml
  for (const pattern of rules.skip) body = body.replace(pattern, '')

  let out = ''
  // The list marker can come before the paragraph (ODF) or inside it (Word), so the "- " is
  // written in front of the paragraph's first real text.
  let bullet = false
  let inText = !rules.text
  for (const token of body.match(/<[^>]+>|[^<]+/g) ?? []) {
    if (token[0] !== '<') {
      if (!inText) continue
      if (bullet && token.trim()) {
        out += '- '
        bullet = false
      }
      out += decodeEntities(token)
      continue
    }
    const closing = token[1] === '/'
    const name = token.slice(closing ? 2 : 1).split(/[\s/>]/)[0]
    if (rules.listItem?.test(name) && !closing) bullet = true
    else if (rules.paragraph.test(name)) {
      out += '\n'
      if (closing || token.endsWith('/>')) bullet = false
    } else if (rules.text?.test(name)) inText = !closing && !token.endsWith('/>')
    else if (rules.tab.test(name)) out += '\t'
    else if (rules.lineBreak.test(name)) out += '\n'
    else if (rules.spaces?.test(name)) {
      out += ' '.repeat(Math.min(50, Number(/c="(\d+)"/.exec(token)?.[1] ?? 1)))
    }
  }
  return out
}

export function wordXmlToText(xml: string) {
  return officeXmlToText(xml, {
    paragraph: /^w:p$/,
    text: /^w:t$/,
    tab: /^w:tab$/,
    lineBreak: /^w:(?:br|cr)$/,
    listItem: /^w:numPr$/,
    skip: [/<mc:Fallback>[\s\S]*?<\/mc:Fallback>/g, /<w:instrText[\s\S]*?<\/w:instrText>/g],
  })
}

export function odfXmlToText(xml: string) {
  return officeXmlToText(xml, {
    paragraph: /^text:(?:p|h)$/,
    tab: /^text:tab$/,
    lineBreak: /^text:line-break$/,
    listItem: /^text:list-item$/,
    spaces: /^text:s$/,
    skip: [
      /<office:annotation\b[\s\S]*?<\/office:annotation>/g,
      /<text:tracked-changes\b[\s\S]*?<\/text:tracked-changes>/g,
      /<office:automatic-styles\b[\s\S]*?<\/office:automatic-styles>/g,
    ],
  })
}
