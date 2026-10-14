import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SAMPLE_ANALYSIS } from '@/lib/sample-analysis'
import { buildAtsReport } from '@/lib/resume/ats'
import { looksLikeJobPosting } from '@/lib/resume/looks-like-job-posting'
import { looksLikeResume } from '@/lib/resume/looks-like-resume'
import { verifyEvidence } from '@/lib/resume/match'
import { extractPdfText } from '@/lib/resume/pdf-text'
import { buildPriorities } from '@/lib/resume/priorities'
import { buildSummary } from '@/lib/resume/summary'
import { SAMPLE_POSTING } from '@/lib/samples/sample-posting'
import { SAMPLE_RESUME } from '@/lib/samples/sample-resume'

describe('the sample documents', () => {
  it('pass the same checks as any real upload', () => {
    assert.ok(looksLikeResume(SAMPLE_RESUME).ok)
    assert.ok(looksLikeJobPosting(SAMPLE_POSTING).ok)
  })

  it('ship as a PDF that reads back to the same text', async () => {
    const bytes = new Uint8Array(readFileSync('public/samples/nora-whitfield-resume.pdf'))
    const text = await extractPdfText(bytes)
    const flat = (value: string) => value.replace(/•/g, '-').replace(/\s+/g, ' ').trim()
    assert.equal(flat(text), flat(SAMPLE_RESUME))
  })
})

describe('the sample analysis', () => {
  const { match, ats } = SAMPLE_ANALYSIS

  it('only shows quotes that are really in the resume', () => {
    for (const item of match.requirements) {
      if (item.evidenceVerified) assert.ok(verifyEvidence(SAMPLE_RESUME, item.evidence), item.label)
    }
  })

  it('has its parser report computed from the resume, not typed in', () => {
    assert.deepEqual(ats, buildAtsReport(SAMPLE_RESUME))
    assert.equal(ats.checks.find((check) => check.id === 'contact')?.passed, false)
  })

  it('shows every state the results page can display', () => {
    const states = new Set(
      match.requirements.map((item) =>
        item.coverage === 'missing' ? (item.evidence ? 'unproven' : 'absent') : item.coverage,
      ),
    )
    assert.deepEqual([...states].sort(), ['absent', 'partial', 'strong', 'unproven'])
    assert.ok(SAMPLE_ANALYSIS.rewrites.length > 0)
    assert.ok(SAMPLE_ANALYSIS.phrasing.length > 0)
    assert.ok(SAMPLE_ANALYSIS.findings.length > 0)
  })

  it('demotes the model’s invented quotes instead of crediting them', () => {
    const nextjs = match.requirements.find((item) => item.label.startsWith('Next.js'))
    assert.equal(nextjs?.coverage, 'missing')
    assert.equal(nextjs?.evidenceVerified, false)
  })
})

describe('the sample’s job title', () => {
  const { title } = SAMPLE_ANALYSIS

  it('is a realistic near-miss, not a trivial match', () => {
    assert.equal(title?.posting, 'Senior Frontend Engineer')
    assert.equal(title?.latest, 'Software Engineer')
    assert.equal(title?.verdict, 'headline')
    assert.equal(title?.levelGap, true)
  })

  it('turns up in the actions and the download', () => {
    assert.ok(buildPriorities(SAMPLE_ANALYSIS).some((action) => action.kind === 'title'))
    assert.match(buildSummary(SAMPLE_ANALYSIS, 'x.pdf'), /## Job title/)
  })
})
