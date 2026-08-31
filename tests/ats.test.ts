import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildAtsReport, extractBullets } from '@/lib/resume/ats'

const RESUME = `DANIEL OKONKWO
daniel.okonkwo@email.com | +1 (415) 555-0182 | linkedin.com/in/danielokonkwo

PROFESSIONAL EXPERIENCE

Senior Software Engineer | Atlassian | March 2022 - Present
- Led the migration of the Jira issue view to React 18.
- Introduced Playwright coverage across the checkout funnel.
- Mentored four engineers, two of whom were promoted.

Software Engineer | Zendesk | July 2019 - February 2022
- Rebuilt the agent workspace sidebar in TypeScript.
- Built CI/CD pipelines in GitHub Actions.

EDUCATION
BSc Computer Science, University of California, Berkeley | 2018

TECHNICAL SKILLS
React, TypeScript, Next.js, GraphQL, Playwright, AWS`

describe('bullet extraction', () => {
  it('finds bulleted lines and strips the marker', () => {
    const bullets = extractBullets(RESUME)
    assert.equal(bullets.length, 5)
    assert.ok(bullets.every((line) => !/^[-*•]/.test(line)))
  })

  it('ignores lines that merely contain a dash', () => {
    assert.equal(extractBullets('Senior Engineer - Atlassian - 2022').length, 0)
  })

  it('accepts the glyphs different editors produce', () => {
    const mixed =
      '• Did a thing worth mentioning here\n▪ Did another thing worth mentioning\n1. Did a third thing worth mentioning'
    assert.equal(extractBullets(mixed).length, 3)
  })
})

describe('ats report', () => {
  it('scores a well formed resume highly', () => {
    const report = buildAtsReport(RESUME)
    assert.ok(report.score >= 85, `scored ${report.score}`)
  })

  it('reports every check with a verdict and a reason', () => {
    const report = buildAtsReport(RESUME)
    assert.equal(report.checks.length, 6)
    for (const check of report.checks) {
      assert.equal(typeof check.passed, 'boolean')
      assert.ok(check.label.length > 0)
      assert.ok(check.detail.length > 0)
    }
  })

  it('passes contact, sections and bullets for a real resume', () => {
    const byId = Object.fromEntries(buildAtsReport(RESUME).checks.map((c) => [c.id, c.passed]))
    assert.ok(byId.contact)
    assert.ok(byId.sections)
    assert.ok(byId.bullets)
  })

  it('fails contact when there is no email or phone', () => {
    const report = buildAtsReport('EXPERIENCE\nSKILLS\nEDUCATION\nsome words here')
    assert.equal(report.checks.find((c) => c.id === 'contact')?.passed, false)
  })

  it('flags a wall of text', () => {
    const wall = `${RESUME}\n\n${'filler words to make a very long block '.repeat(30)}`
    assert.equal(buildAtsReport(wall).checks.find((c) => c.id === 'density')?.passed, false)
  })

  it('scores near nothing for an empty document', () => {
    assert.ok(buildAtsReport('hello').score <= 20)
  })
})
