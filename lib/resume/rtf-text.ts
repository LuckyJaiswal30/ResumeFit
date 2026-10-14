// Groups that hold formatting, metadata or pictures rather than the document's words.
const SKIPPED_GROUPS = new Set([
  'fonttbl',
  'colortbl',
  'stylesheet',
  'info',
  'pict',
  'object',
  'fldinst',
  'xmlnstbl',
  'themedata',
  'colorschememapping',
  'datastore',
  'latentstyles',
  'rsidtbl',
  'generator',
  'listtable',
  'listoverridetable',
  'revtbl',
  'filetbl',
  'pgdsctbl',
  'mmathPr',
  'nonshppict',
  'shpinst',
  'bkmkstart',
  'bkmkend',
])

const SYMBOLS: Record<string, string> = {
  par: '\n',
  line: '\n',
  sect: '\n',
  page: '\n',
  row: '\n',
  cell: '\n',
  tab: '\t',
  bullet: '•',
  emdash: '—',
  endash: '–',
  lquote: '‘',
  rquote: '’',
  ldblquote: '“',
  rdblquote: '”',
  emspace: ' ',
  enspace: ' ',
}

const cp1252 = new TextDecoder('windows-1252')

type Group = { skip: boolean; unicodeSkip: number }

export function rtfToText(rtf: string) {
  let out = ''
  const stack: Group[] = []
  let group: Group = { skip: false, unicodeSkip: 1 }
  let pendingFallback = 0
  let groupStart = false
  let index = 0

  const emit = (text: string) => {
    if (pendingFallback > 0) {
      pendingFallback -= 1
      return
    }
    if (!group.skip) out += text
  }

  while (index < rtf.length) {
    const char = rtf[index]
    if (char === '{') {
      stack.push(group)
      group = { ...group }
      groupStart = true
      index += 1
      continue
    }
    if (char === '}') {
      group = stack.pop() ?? group
      groupStart = false
      pendingFallback = 0
      index += 1
      continue
    }
    if (char === '\r' || char === '\n') {
      index += 1
      continue
    }
    if (char !== '\\') {
      emit(char)
      groupStart = false
      index += 1
      continue
    }

    const next = rtf[index + 1]
    if (next === '\\' || next === '{' || next === '}') {
      emit(next)
      index += 2
    } else if (next === "'") {
      emit(cp1252.decode(new Uint8Array([parseInt(rtf.slice(index + 2, index + 4), 16) || 32])))
      index += 4
    } else if (next === '*') {
      if (groupStart) group.skip = true
      index += 2
    } else if (next === '~') {
      emit(' ')
      index += 2
    } else if (next === '_') {
      emit('-')
      index += 2
    } else if (next === '\n' || next === '\r') {
      emit('\n')
      index += 2
    } else {
      const match = /^([a-zA-Z]+)(-?\d+)? ?/.exec(rtf.slice(index + 1, index + 40))
      if (!match) {
        index += 2
        continue
      }
      const [whole, word, param] = match
      index += 1 + whole.length
      if (groupStart && SKIPPED_GROUPS.has(word)) group.skip = true
      groupStart = false

      if (word === 'uc') group.unicodeSkip = Number(param ?? 1)
      else if (word === 'u' && param !== undefined) {
        const code = Number(param)
        emit(String.fromCharCode(code < 0 ? code + 65_536 : code))
        pendingFallback = group.unicodeSkip
      } else if (word in SYMBOLS) emit(SYMBOLS[word])
    }
  }
  return out
}
