import { afterEach, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildAnalysis } from '@/lib/resume/analyze'

const realFetch = globalThis.fetch

const RESUME = `Avery Morgan
avery.morgan@email.com | 555-123-4567 | linkedin.com/in/averymorgan

EXPERIENCE
Software Engineer | Northstar Labs | 2023 - Present
- Developed customer-facing dashboard features using React and TypeScript.
- Responsible for fixing bugs reported by the support team.
- Built REST API integrations and maintained the automated test suite in Jest.

EDUCATION
B.S. Computer Science, Example University | 2023

SKILLS
React, TypeScript, JavaScript, Node.js, Git, REST APIs, Jest`

const POSTING = `Senior Frontend Engineer
Requirements: 5+ years frontend experience, deep React knowledge, strong TypeScript,
automated testing in Playwright or Cypress, familiarity with AWS, accessibility to
WCAG 2.2 AA, CI/CD in GitHub Actions, mentoring juniors.
Nice to have: GraphQL, design system ownership.`

const REVIEW = {
  requirements: [
    {
      label: 'React',
      category: 'skill',
      importance: 'required',
      coverage: 'strong',
      evidence: 'Developed customer-facing dashboard features using React and TypeScript.',
      note: 'Shown in your current role.',
    },
    {
      label: 'AWS',
      category: 'skill',
      importance: 'required',
      coverage: 'missing',
      evidence: null,
      note: 'Not mentioned.',
    },
    {
      label: 'GraphQL',
      category: 'skill',
      importance: 'preferred',
      coverage: 'missing',
      evidence: null,
      note: 'Not mentioned.',
    },
  ],
  findings: [
    {
      title: 'No cloud experience shown',
      detail: 'The posting asks for AWS and nothing touches cloud work.',
      priority: 'high',
    },
  ],
  phrasing: [],
  rewrites: [
    {
      original: 'Responsible for fixing bugs reported by the support team.',
      rewrite: 'Fixed defects raised by the support team, working from their reports.',
      reason: 'Replaces a passive phrase with the action taken.',
    },
  ],
}

let calls = 0

function stubModel(payload: unknown, status = 200) {
  calls = 0
  globalThis.fetch = (async () => {
    calls += 1
    return new Response(
      JSON.stringify({
        candidates: [
          { finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(payload) }] } },
        ],
      }),
      { status },
    )
  }) as unknown as typeof fetch
}

function stubFailure(status: number) {
  calls = 0
  globalThis.fetch = (async () => {
    calls += 1
    return new Response('{}', { status })
  }) as unknown as typeof fetch
}

let variant = 0
const uniquePosting = () => `${POSTING}\n[case ${(variant += 1)}]`

beforeEach(() => {
  process.env.GEMINI_API_KEY = 'test-key'
  process.env.AI_BUDGET_PER_MINUTE = '1000'
  process.env.AI_BUDGET_PER_DAY = '100000'
  delete process.env.AI_PROVIDER
  delete process.env.GEMINI_MODEL
})

afterEach(() => {
  globalThis.fetch = realFetch
})

describe('without a provider', () => {
  it('falls back to term matching and says nothing failed', async () => {
    delete process.env.GEMINI_API_KEY
    const analysis = await buildAnalysis(RESUME, uniquePosting())
    assert.equal(analysis.source, 'keyword')
    assert.equal(analysis.aiError, null)
    assert.equal(analysis.rewrites.length, 0)
    assert.ok(analysis.ats.score > 0)
    assert.ok(analysis.findings.length > 0)
  })
})

describe('with a provider', () => {
  it('uses the model and records which one', async () => {
    stubModel(REVIEW)
    const analysis = await buildAnalysis(RESUME, uniquePosting())
    assert.equal(analysis.source, 'ai')
    assert.equal(analysis.aiError, null)
    assert.equal(analysis.model, 'gemini-3.5-flash-lite')
  })

  it('scores required coverage above preferred', async () => {
    stubModel(REVIEW)
    const analysis = await buildAnalysis(RESUME, uniquePosting())
    assert.equal(analysis.match.score, 38)
  })

  it('keeps a quote that appears in the resume', async () => {
    stubModel(REVIEW)
    const analysis = await buildAnalysis(RESUME, uniquePosting())
    const react = analysis.match.requirements.find((r) => r.label === 'React')
    assert.equal(react?.coverage, 'strong')
    assert.equal(react?.evidenceVerified, true)
  })

  it('generates its own ids rather than trusting the model', async () => {
    stubModel(REVIEW)
    const analysis = await buildAnalysis(RESUME, uniquePosting())
    const ids = analysis.match.requirements.map((r) => r.id)
    assert.equal(new Set(ids).size, ids.length)
    assert.ok(ids.every((id) => id.length > 0))
  })
})

describe('guardrails', () => {
  it('downgrades a strong claim whose quote is invented', async () => {
    stubModel({
      ...REVIEW,
      requirements: [
        {
          label: 'Kubernetes',
          category: 'skill',
          importance: 'required',
          coverage: 'strong',
          evidence: 'Operated production Kubernetes clusters serving millions of requests',
          note: 'Claimed.',
        },
      ],
    })
    const analysis = await buildAnalysis(RESUME, uniquePosting())
    assert.equal(analysis.match.requirements[0].coverage, 'partial')
    assert.equal(analysis.match.requirements[0].evidenceVerified, false)
  })

  it('drops a rewrite that invents a number', async () => {
    stubModel({
      ...REVIEW,
      rewrites: [
        {
          original: 'Responsible for fixing bugs reported by the support team.',
          rewrite: 'Resolved 250+ tickets, cutting response time by 40%.',
          reason: 'Adds impact.',
        },
      ],
    })
    assert.equal((await buildAnalysis(RESUME, uniquePosting())).rewrites.length, 0)
  })

  it('drops a rewrite of a line that is not in the resume', async () => {
    stubModel({
      ...REVIEW,
      rewrites: [
        {
          original: 'Architected a distributed event bus that never appeared here.',
          rewrite: 'Designed a distributed event bus for internal services.',
          reason: 'Clearer.',
        },
      ],
    })
    assert.equal((await buildAnalysis(RESUME, uniquePosting())).rewrites.length, 0)
  })

  it('keeps a wording pair grounded in both documents', async () => {
    stubModel({
      ...REVIEW,
      phrasing: [
        {
          yours: 'maintained the automated test suite in Jest',
          posting: 'automated testing in Playwright or Cypress',
          note: 'Same work, different words.',
        },
      ],
    })
    const analysis = await buildAnalysis(RESUME, uniquePosting())
    assert.equal(analysis.phrasing.length, 1)
  })

  it('drops a wording pair the resume never contained', async () => {
    stubModel({
      ...REVIEW,
      phrasing: [
        {
          yours: 'architected a service mesh across twelve clusters',
          posting: 'automated testing in Playwright or Cypress',
          note: 'Invented.',
        },
      ],
    })
    assert.equal((await buildAnalysis(RESUME, uniquePosting())).phrasing.length, 0)
  })

  it('drops a wording pair the posting never contained', async () => {
    stubModel({
      ...REVIEW,
      phrasing: [
        {
          yours: 'maintained the automated test suite in Jest',
          posting: 'quantum error correction',
          note: 'Not in the posting.',
        },
      ],
    })
    assert.equal((await buildAnalysis(RESUME, uniquePosting())).phrasing.length, 0)
  })
})

describe('when the model fails', () => {
  it('falls back to term matching and explains why', async () => {
    stubFailure(500)
    const analysis = await buildAnalysis(RESUME, uniquePosting())
    assert.equal(analysis.source, 'keyword')
    assert.ok(analysis.aiError && analysis.aiError.length > 0)
    assert.ok(analysis.match.requirements.length > 0)
  })

  it('falls back rather than showing an empty report', async () => {
    stubModel({ requirements: [], findings: [], phrasing: [], rewrites: [] })
    assert.equal((await buildAnalysis(RESUME, uniquePosting())).source, 'keyword')
  })
})

describe('caching', () => {
  it('serves an identical request without calling out again', async () => {
    stubModel(REVIEW)
    const posting = uniquePosting()
    const first = await buildAnalysis(RESUME, posting)
    const callsAfterFirst = calls
    const second = await buildAnalysis(RESUME, posting)
    assert.equal(calls, callsAfterFirst)
    assert.deepEqual(second, first)
  })

  it('still calls out when the input changes', async () => {
    stubModel(REVIEW)
    const posting = uniquePosting()
    await buildAnalysis(RESUME, posting)
    const before = calls
    await buildAnalysis(RESUME, `${posting} plus Kubernetes`)
    assert.ok(calls > before)
  })
})

describe('shared model allowance', () => {
  const isolate = () => {
    process.env.GEMINI_MODEL = `budget-${(variant += 1)}-${Date.now()}`
  }

  it('stops calling out once the allowance for the minute is spent', async () => {
    isolate()
    process.env.AI_BUDGET_PER_MINUTE = '1'
    stubModel(REVIEW)

    const first = await buildAnalysis(RESUME, uniquePosting())
    const spent = calls
    const second = await buildAnalysis(RESUME, uniquePosting())

    assert.equal(first.source, 'ai')
    assert.equal(second.source, 'keyword')
    assert.equal(calls, spent)
    assert.match(second.aiError ?? '', /allowance/)
  })

  it('still answers with term matching when the allowance is gone', async () => {
    isolate()
    process.env.AI_BUDGET_PER_MINUTE = '1'
    stubModel(REVIEW)

    await buildAnalysis(RESUME, uniquePosting())
    const degraded = await buildAnalysis(RESUME, uniquePosting())

    assert.equal(degraded.source, 'keyword')
    assert.ok(degraded.match.requirements.length > 0)
    assert.ok(degraded.ats.checks.length > 0)
  })

  it('serves a repeat from cache without touching the allowance', async () => {
    isolate()
    process.env.AI_BUDGET_PER_MINUTE = '1'
    stubModel(REVIEW)

    const posting = uniquePosting()
    const first = await buildAnalysis(RESUME, posting)
    const repeat = await buildAnalysis(RESUME, posting)

    assert.equal(first.source, 'ai')
    assert.equal(repeat.source, 'ai')
    assert.deepEqual(repeat, first)
  })
})
