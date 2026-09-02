import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildSummary } from '@/lib/resume/summary'
import { SAMPLE_ANALYSIS, SAMPLE_FILE_NAME } from '@/lib/sample-analysis'

const summary = buildSummary(SAMPLE_ANALYSIS, SAMPLE_FILE_NAME)

describe('the downloadable summary', () => {
  it('leads with the score and what produced it', () => {
    assert.match(summary, /^# ResumeFit summary/)
    assert.match(summary, new RegExp(`Overall fit:\\*\\* ${SAMPLE_ANALYSIS.match.score} / 100`))
    assert.match(summary, /reviewed by gemini/)
  })

  it('keeps the two kinds of gap apart', () => {
    assert.ok(summary.includes('## Listed, but not shown'))
    assert.ok(summary.includes('## Not there at all'))
  })

  it('carries the quote behind a match', () => {
    const quoted = SAMPLE_ANALYSIS.match.requirements.find((r) => r.evidenceVerified && r.evidence)
    assert.ok(quoted, 'sample should contain a verified quote')
    assert.ok(summary.includes(quoted.evidence as string))
  })

  it('never prints a quote that failed verification', () => {
    for (const item of SAMPLE_ANALYSIS.match.requirements) {
      if (item.evidence && !item.evidenceVerified) {
        assert.ok(!summary.includes(`> ${item.evidence}`), `leaked unverified quote: ${item.label}`)
      }
    }
  })

  it('includes the ranked actions and the rewrites', () => {
    assert.ok(summary.includes('## Fix this first'))
    assert.ok(summary.includes('## Bullets worth rewriting'))
    for (const r of SAMPLE_ANALYSIS.rewrites) assert.ok(summary.includes(r.rewrite))
  })

  it('leaves out sections with nothing in them', () => {
    const empty = { ...SAMPLE_ANALYSIS, rewrites: [], phrasing: [], findings: [] }
    const out = buildSummary(empty, 'x.pdf')
    assert.ok(!out.includes('## Bullets worth rewriting'))
    assert.ok(!out.includes('## Same skill, different words'))
    assert.ok(!out.includes('## What the review flagged'))
  })

  it('says so when no model was involved', () => {
    const keyword = { ...SAMPLE_ANALYSIS, source: 'keyword' as const, model: null }
    assert.match(buildSummary(keyword, 'x.pdf'), /word matching only/)
  })
})
