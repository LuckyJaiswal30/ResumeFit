import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { wordDiff } from '@/lib/resume/diff'

const text = (parts: Array<{ text: string }>) => parts.map((part) => part.text).join(' ')

describe('word diff', () => {
  it('marks only the words that changed', () => {
    const { before, after } = wordDiff(
      'Responsible for the checkout redesign.',
      'Led the checkout redesign.',
    )
    assert.deepEqual(before, [
      { text: 'Responsible for', kind: 'removed' },
      { text: 'the checkout redesign.', kind: 'same' },
    ])
    assert.deepEqual(after, [
      { text: 'Led', kind: 'added' },
      { text: 'the checkout redesign.', kind: 'same' },
    ])
  })

  it('rebuilds both sentences exactly', () => {
    const a = 'Helped the team move to a shared Figma library and wrote some of the docs.'
    const b = 'Moved the team to a shared Figma library and wrote its documentation.'
    const { before, after } = wordDiff(a, b)
    assert.equal(text(before), a)
    assert.equal(text(after), b)
  })

  it('treats identical text as unchanged', () => {
    const { before, after } = wordDiff('Built a thing', 'Built a thing')
    assert.deepEqual(before, [{ text: 'Built a thing', kind: 'same' }])
    assert.deepEqual(after, [{ text: 'Built a thing', kind: 'same' }])
  })

  it('handles an empty side', () => {
    const { before, after } = wordDiff('', 'Added words')
    assert.deepEqual(before, [])
    assert.deepEqual(after, [{ text: 'Added words', kind: 'added' }])
  })
})
