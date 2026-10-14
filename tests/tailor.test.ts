import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { SAMPLE_ANALYSIS } from '@/lib/sample-analysis'
import { keywordRequirements, scoreRequirements } from '@/lib/resume/match'
import { buildTailoring } from '@/lib/resume/tailor'
import type { Analysis } from '@/lib/resume/types'

const RESUME = `Sam Lee
sam@example.com

Experience
Platform Engineer, Acme | 2022 - Present
- Wrote internal documentation for the platform team.
- Ran weekly planning with the product group.
- Maintained the on-call rota for the platform.
- Reduced deploy time by moving builds to Docker and cutting the pipeline from 40 to 12 minutes.
- Shipped a Python service on AWS used by three teams.
Junior Developer, Beta | 2019 - 2022
- Built dashboards in React for the sales team.

Education
BSc Computer Science, 2019

Skills
Go, Linux, Python, AWS, Docker, React`

const POSTING = `Backend Engineer
Requirements
- Docker
- Python and AWS
Nice to have
- Kubernetes`

function analysisFor(resume: string, posting: string): Analysis {
  const requirements = keywordRequirements(resume, posting)
  return {
    source: 'keyword',
    model: null,
    aiError: null,
    match: scoreRequirements(requirements),
    ats: { score: 100, checks: [] },
    findings: [],
    phrasing: [],
    rewrites: [],
  }
}

describe('tailoring to a posting', () => {
  const tailoring = buildTailoring(analysisFor(RESUME, POSTING), RESUME)

  it('ranks must-haves ahead of nice-to-haves, in the posting’s order', () => {
    const labels = tailoring?.priorities.map((item) => item.label)
    assert.deepEqual(labels, ['Docker', 'Python', 'AWS', 'Kubernetes'])
  })

  it('finds where the proof sits and how buried it is', () => {
    const docker = tailoring?.priorities.find((item) => item.label === 'Docker')
    assert.equal(docker?.placement?.position, 4)
    assert.equal(docker?.placement?.total, 5)
    assert.equal(docker?.placement?.older, false)
  })

  it('notices when the proof is under an older role', () => {
    const resume = RESUME.replace(
      '- Shipped a Python service on AWS used by three teams.',
      '- Shipped a service.',
    )
    const out = buildTailoring(analysisFor(resume + '', 'Requirements\n- React'), resume)
    const react = out?.priorities.find((item) => item.label === 'React')
    assert.equal(react?.placement?.older, true)
  })

  it('gives no placement for something that is not proven', () => {
    const k8s = tailoring?.priorities.find((item) => item.label === 'Kubernetes')
    assert.equal(k8s?.placement, null)
  })

  it('reorders the skills line without adding or dropping anything', () => {
    assert.deepEqual(tailoring?.skills?.suggested.slice(0, 3), ['Docker', 'Python', 'AWS'])
    assert.deepEqual(
      [...(tailoring?.skills?.suggested ?? [])].sort(),
      [...(tailoring?.skills?.current ?? [])].sort(),
    )
  })

  it('builds an opening line from proven requirements only', () => {
    assert.match(tailoring?.opener ?? '', /Docker, Python and AWS/)
    assert.ok(!(tailoring?.opener ?? '').includes('Kubernetes'))
  })

  it('offers no opening line when fewer than two things are proven', () => {
    const out = buildTailoring(
      analysisFor('Experience\n- Used Docker daily.', 'Requirements\n- Docker\n- Terraform'),
      'Experience\n- Used Docker daily.',
    )
    assert.equal(out?.opener, null)
  })

  it('leaves the skills alone when they are already in the right order', () => {
    const sorted = RESUME.replace(
      'Go, Linux, Python, AWS, Docker, React',
      'Docker, Python, AWS, Go, Linux, React',
    )
    assert.equal(buildTailoring(analysisFor(sorted, POSTING), sorted)?.skills, null)
  })

  it('returns nothing when the posting has no requirements to rank', () => {
    assert.equal(buildTailoring(analysisFor(RESUME, 'Join our friendly team today'), RESUME), null)
  })
})

describe('tailoring on the sample', () => {
  const tailoring = SAMPLE_ANALYSIS.tailoring

  it('points out a buried bullet', () => {
    const cicd = tailoring?.priorities.find((item) => item.label.includes('CI/CD'))
    assert.equal(cicd?.placement?.position, 4)
  })

  it('shows that the React proof is in an older role', () => {
    assert.equal(
      tailoring?.priorities.find((item) => item.label === 'React')?.placement?.older,
      true,
    )
  })

  it('keeps unproven skills out of the opening line', () => {
    assert.ok(!(tailoring?.opener ?? '').match(/Next\.js|GraphQL/))
  })
})
