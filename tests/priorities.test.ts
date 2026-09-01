import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildPriorities } from '@/lib/resume/priorities'
import type { Analysis, Requirement } from '@/lib/resume/types'

const requirement = (over: Partial<Requirement>): Requirement => ({
  id: over.label ?? 'x',
  label: 'X',
  category: 'skill',
  importance: 'required',
  coverage: 'missing',
  evidence: null,
  evidenceVerified: false,
  note: '',
  ...over,
})

const analysis = (over: Partial<Analysis>): Analysis => ({
  source: 'ai',
  model: 'test',
  aiError: null,
  match: { score: 50, breakdown: [], requirements: [], summary: '' },
  ats: { score: 100, checks: [] },
  findings: [],
  phrasing: [],
  rewrites: [],
  ...over,
})

describe('what to fix first', () => {
  it('puts a skill you claimed above one you never mentioned', () => {
    const out = buildPriorities(
      analysis({
        match: {
          score: 0,
          breakdown: [],
          summary: '',
          requirements: [
            requirement({ id: 'k8s', label: 'Kubernetes', evidence: null }),
            requirement({ id: 'next', label: 'Next.js', evidence: 'Next.js' }),
          ],
        },
      }),
    )
    assert.match(out[0].title, /Next\.js/)
    assert.match(out[0].title, /^Show where/)
    assert.match(out[1].title, /Kubernetes/)
  })

  it('puts required items above nice to have ones', () => {
    const out = buildPriorities(
      analysis({
        match: {
          score: 0,
          breakdown: [],
          summary: '',
          requirements: [
            requirement({
              id: 'gql',
              label: 'GraphQL',
              importance: 'preferred',
              evidence: 'GraphQL',
            }),
            requirement({ id: 'ts', label: 'TypeScript', importance: 'required', evidence: null }),
          ],
        },
      }),
    )
    assert.match(out[0].title, /TypeScript/)
    assert.match(out[1].title, /GraphQL/)
  })

  it('never lists a requirement the resume already covers', () => {
    const out = buildPriorities(
      analysis({
        match: {
          score: 0,
          breakdown: [],
          summary: '',
          requirements: [
            requirement({
              id: 'react',
              label: 'React',
              coverage: 'strong',
              evidence: 'built React apps',
              evidenceVerified: true,
            }),
          ],
        },
      }),
    )
    assert.deepEqual(out, [])
  })

  it('slots parser problems after the required gaps', () => {
    const out = buildPriorities(
      analysis({
        match: {
          score: 0,
          breakdown: [],
          summary: '',
          requirements: [requirement({ id: 'ts', label: 'TypeScript', evidence: null })],
        },
        ats: {
          score: 60,
          checks: [
            {
              id: 'contact',
              label: 'Contact details are readable',
              passed: false,
              detail: 'No email found.',
            },
          ],
        },
      }),
    )
    assert.match(out[0].title, /TypeScript/)
    assert.match(out[1].title, /Contact details/)
  })

  it('keeps the list short enough to act on', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      requirement({ id: `r${i}`, label: `Skill ${i}`, evidence: null }),
    )
    const out = buildPriorities(
      analysis({ match: { score: 0, breakdown: [], summary: '', requirements: many } }),
    )
    assert.ok(out.length <= 5, `expected at most 5, got ${out.length}`)
  })
})
