export type DiffPart = { text: string; kind: 'same' | 'removed' | 'added' }

function key(word: string) {
  return word.toLowerCase().replace(/[^a-z0-9%+#./-]/g, '')
}

function merge(parts: DiffPart[]) {
  const merged: DiffPart[] = []
  for (const part of parts) {
    const last = merged[merged.length - 1]
    if (last && last.kind === part.kind) last.text += ` ${part.text}`
    else merged.push({ ...part })
  }
  return merged
}

export function wordDiff(before: string, after: string) {
  const a = before.split(/\s+/).filter(Boolean)
  const b = after.split(/\s+/).filter(Boolean)

  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i][j] =
        key(a[i]) === key(b[j])
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1])
    }
  }

  const left: DiffPart[] = []
  const right: DiffPart[] = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (key(a[i]) === key(b[j])) {
      left.push({ text: a[i], kind: 'same' })
      right.push({ text: b[j], kind: 'same' })
      i += 1
      j += 1
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      left.push({ text: a[i], kind: 'removed' })
      i += 1
    } else {
      right.push({ text: b[j], kind: 'added' })
      j += 1
    }
  }
  for (; i < a.length; i += 1) left.push({ text: a[i], kind: 'removed' })
  for (; j < b.length; j += 1) right.push({ text: b[j], kind: 'added' })

  return { before: merge(left), after: merge(right) }
}
