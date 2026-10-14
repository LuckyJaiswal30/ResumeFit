// Characters a resume line can open with to mark a bullet: Word and Google Docs list glyphs,
// the shapes and arrows design templates use, and plain dashes.
const MARKS = [
  '-',
  '*',
  '•',
  '▪',
  '◦',
  '‣',
  '·',
  '●',
  '○',
  '■',
  '□',
  '◆',
  '◇',
  '►',
  '▸',
  '▶',
  '➢',
  '➤',
  '➔',
  '→',
  '✓',
  '✔',
  '❖',
  '★',
  '–',
  '—',
  '✅',
  '🔹',
  '🔸',
  '👉',
]

export const BULLET_MARK = `(?:${MARKS.map((mark) => mark.replace('*', '\\*')).join('|')})`

export const BULLET_LINE = new RegExp(String.raw`^\s*(?:${BULLET_MARK}|\d+[.)])\s+`, 'u')
