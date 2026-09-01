import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  addsUnsupportedNumber,
  groundRequirements,
  keywordRequirements,
  scoreRequirements,
  verifyEvidence,
} from '@/lib/resume/match'
import type { Requirement } from '@/lib/resume/types'

const RESUME = `Avery Morgan
avery.morgan@email.com

EXPERIENCE
Software Engineer | Northstar Labs | 2023 - Present
- Developed customer-facing dashboard features using React and TypeScript.
- Built REST API integrations and maintained the automated test suite in Jest.

SKILLS
React, TypeScript, JavaScript, Node.js, Git, HTML, CSS`

const requirement = (over: Partial<Requirement>): Requirement => ({
  id: 'r',
  label: 'A',
  category: 'skill',
  importance: 'required',
  coverage: 'strong',
  evidence: null,
  evidenceVerified: false,
  note: '',
  ...over,
})

describe('keyword matching', () => {
  it('pulls named technologies out of the posting, not filler words', () => {
    const labels = keywordRequirements(
      RESUME,
      'We need React, TypeScript and AWS. Build strong things with familiarity.',
    ).map((r) => r.label.toLowerCase())
    for (const junk of ['build', 'familiarity', 'strong', 'things', 'we', 'need']) {
      assert.ok(!labels.includes(junk), `"${junk}" leaked in`)
    }
  })

  it('marks what the resume has and has not got', () => {
    const found = keywordRequirements(RESUME, 'Need React, TypeScript, AWS and Playwright.')
    assert.equal(found.find((r) => r.label === 'React')?.coverage, 'strong')
    assert.equal(found.find((r) => r.label === 'AWS')?.coverage, 'missing')
    assert.equal(found.find((r) => r.label === 'Playwright')?.coverage, 'missing')
  })

  it('does not match a term inside a longer word', () => {
    const found = keywordRequirements(
      'I use Google and Rusty tools and javascripting',
      'We need go, rust and java',
    )
    assert.equal(found.find((r) => r.label === 'Go')?.coverage, 'missing')
    assert.equal(found.find((r) => r.label === 'Rust')?.coverage, 'missing')
    assert.equal(found.find((r) => r.label === 'Java')?.coverage, 'missing')
  })

  it('treats common aliases as the same skill', () => {
    const found = keywordRequirements(
      'Built services in Node and Postgres',
      'Need node.js and postgresql',
    )
    assert.equal(found.find((r) => r.label === 'Node.js')?.coverage, 'strong')
    assert.equal(found.find((r) => r.label === 'PostgreSQL')?.coverage, 'strong')
  })
})

describe('evidence verification', () => {
  it('accepts a quote copied from the resume', () => {
    assert.ok(
      verifyEvidence(
        RESUME,
        'Developed customer-facing dashboard features using React and TypeScript.',
      ),
    )
  })

  it('accepts a quote whose punctuation was normalised', () => {
    assert.ok(verifyEvidence(RESUME, 'developed customer facing dashboard features using react'))
  })

  it('rejects a quote that is not in the resume', () => {
    assert.ok(
      !verifyEvidence(
        RESUME,
        'Led a team of twelve engineers migrating Kubernetes clusters to AWS',
      ),
    )
  })

  it('rejects nothing at all', () => {
    assert.ok(!verifyEvidence(RESUME, null))
    assert.ok(!verifyEvidence(RESUME, '  '))
  })
})

describe('grounding', () => {
  it('downgrades a strong claim whose quote cannot be found', () => {
    const [out] = groundRequirements(RESUME, [
      requirement({ label: 'Kubernetes', evidence: 'Ran production Kubernetes clusters at scale' }),
    ])
    assert.equal(out.coverage, 'partial')
    assert.equal(out.evidenceVerified, false)
  })

  it('keeps a strong claim backed by a real quote', () => {
    const [out] = groundRequirements(RESUME, [
      requirement({
        label: 'React',
        evidence: 'Developed customer-facing dashboard features using React and TypeScript.',
      }),
    ])
    assert.equal(out.coverage, 'strong')
    assert.equal(out.evidenceVerified, true)
  })

  it('clears any evidence attached to a missing requirement', () => {
    const [out] = groundRequirements(RESUME, [
      requirement({ coverage: 'missing', evidence: 'something' }),
    ])
    assert.equal(out.evidence, null)
  })

  it('keeps the unfound quote when a partial claim drops to missing', () => {
    const [out] = groundRequirements(RESUME, [
      requirement({ coverage: 'partial', label: 'Figma', evidence: 'Figma' }),
    ])
    assert.equal(out.coverage, 'missing')
    assert.equal(out.evidenceVerified, false)
    assert.equal(out.evidence, 'Figma')
    assert.match(out.note, /nothing in your experience/i)
  })

  it('separates a claim it could not place from one never mentioned', () => {
    const [claimed, absent] = groundRequirements(RESUME, [
      requirement({ coverage: 'partial', label: 'Figma', evidence: 'Figma' }),
      requirement({ coverage: 'missing', label: 'Kubernetes', evidence: null }),
    ])
    assert.equal(claimed.coverage, 'missing')
    assert.notEqual(claimed.evidence, null)
    assert.equal(absent.coverage, 'missing')
    assert.equal(absent.evidence, null)
  })

  it('does not tell someone nothing backs a claim it still counts', () => {
    const [out] = groundRequirements(RESUME, [
      requirement({ coverage: 'strong', label: 'Kubernetes', evidence: 'Ran clusters at scale' }),
    ])
    assert.equal(out.coverage, 'partial')
    assert.doesNotMatch(out.note, /nothing in your experience/i)
  })
})

describe('scoring', () => {
  it('gives full marks when everything required is covered', () => {
    const report = scoreRequirements([requirement({ id: 'a' }), requirement({ id: 'b' })])
    assert.equal(report.score, 100)
  })

  it('gives nothing when everything is missing', () => {
    assert.equal(scoreRequirements([requirement({ coverage: 'missing' })]).score, 0)
  })

  it('gives half credit for partial coverage', () => {
    assert.equal(scoreRequirements([requirement({ coverage: 'partial' })]).score, 50)
  })

  it('weights required above preferred', () => {
    const missingRequired = scoreRequirements([
      requirement({ id: 'a', coverage: 'missing' }),
      requirement({ id: 'b', importance: 'preferred' }),
    ])
    const missingPreferred = scoreRequirements([
      requirement({ id: 'a' }),
      requirement({ id: 'b', importance: 'preferred', coverage: 'missing' }),
    ])
    assert.equal(missingRequired.score, 25)
    assert.equal(missingPreferred.score, 75)
  })

  it('survives an empty list', () => {
    assert.equal(scoreRequirements([]).score, 0)
  })
})

describe('rewrite number guard', () => {
  it('catches an invented figure', () => {
    assert.ok(addsUnsupportedNumber('Improved the checkout flow', 'Improved conversion by 35%'))
  })

  it('allows a figure the original already carried', () => {
    assert.ok(
      !addsUnsupportedNumber('Cut build time by 40%', 'Reduced CI build time 40% by parallelising'),
    )
  })

  it('allows a rewrite with no figures at all', () => {
    assert.ok(
      !addsUnsupportedNumber(
        'Worked on the dashboard',
        'Built dashboard features for internal users',
      ),
    )
  })
})
