import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { matchBand, tally } from '@/lib/resume/band'
import { SAMPLE_ANALYSIS } from '@/lib/sample-analysis'
import { buildPriorities } from '@/lib/resume/priorities'

describe('the match band', () => {
  it('uses the same cut-offs as the summary sentence', () => {
    assert.equal(matchBand(80).label, 'Strong match')
    assert.equal(matchBand(79).label, 'Partial match')
    assert.equal(matchBand(55).label, 'Partial match')
    assert.equal(matchBand(54).label, 'Weak match')
  })

  it('counts only fully proven items', () => {
    assert.deepEqual(tally(SAMPLE_ANALYSIS.match, 'required'), { proven: 5, partial: 1, total: 6 })
    assert.deepEqual(tally(SAMPLE_ANALYSIS.match, 'preferred'), { proven: 0, partial: 2, total: 4 })
  })
})

describe('the actions on the sample', () => {
  const actions = buildPriorities(SAMPLE_ANALYSIS)

  it('ranks a partly shown must-have above nice-to-have gaps', () => {
    const clarify = actions.findIndex((action) => action.kind === 'clarify')
    const niceToHave = actions.findIndex((action) => /Next\.js|A\/B/.test(action.title))
    assert.ok(clarify >= 0, 'accessibility should appear')
    assert.ok(clarify < niceToHave)
  })

  it('offers starter wording only where a bullet has to be written', () => {
    for (const action of actions) {
      if (action.kind === 'show' || action.kind === 'add') assert.ok(action.starter)
      else assert.equal(action.starter, undefined)
    }
  })

  it('never suggests inventing experience without saying so', () => {
    for (const action of actions.filter((item) => item.kind === 'add')) {
      assert.match(action.starter as string, /only add this if it is true/i)
    }
  })
})
