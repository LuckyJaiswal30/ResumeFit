import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { looksLikeJobPosting, postingRejectionMessage } from '@/lib/resume/looks-like-job-posting'

const POSTINGS: Record<string, string> = {
  'a conventional advert': `Senior Backend Engineer
We are looking for a Senior Backend Engineer to join our platform team.
Responsibilities: design APIs, mentor engineers, own reliability.
Requirements: 5+ years of Python, experience with AWS and PostgreSQL.
Nice to have: GraphQL. Benefits include remote work and 25 days holiday.`,

  'a pasted LinkedIn listing': `About the job
You will build and ship features for millions of customers.
Qualifications
Bachelor's degree or equivalent experience
Proven track record with React and TypeScript
Strong communication skills; ability to work across teams`,

  'a short but real posting': `Data Analyst at Northwind. The ideal candidate must know SQL and Excel, has strong
reporting skills and preferred experience with Tableau. Apply today to join our team.`,
}

const NOT_POSTINGS: Record<string, string> = {
  gibberish: 'asdkjh qwoeiu zxmncb lkjasd poiuqw mnbvcx asdfgh qwerty zxcvbn '.repeat(4),
  'a recipe':
    'Preheat the oven to 180C. Chop the onions finely and simmer in two tablespoons of butter until golden. Add the ingredients and serve four people.',
  'a news paragraph':
    'The city council voted on Tuesday to approve a new budget for the coming year. Officials said the plan includes funding for road repairs and parks.',
}

const RESUME = `Jane Doe
jane@example.com | +1 555 123 4567 | linkedin.com/in/janedoe

Experience
Senior Software Engineer, Acme Corp (2021 - Present)
- Built a REST API in Python serving 2M requests per day on AWS
- Led migration of services to Kubernetes and reduced deploy time by 40%
- Mentored four engineers and ran weekly code reviews

Education
B.S. Computer Science, State University, 2018

Skills
Python, Go, PostgreSQL, AWS, Docker, Kubernetes`

describe('text that must be accepted as a posting', () => {
  for (const [name, text] of Object.entries(POSTINGS)) {
    it(name, () => assert.ok(looksLikeJobPosting(text).ok))
  }
})

describe('text that must be turned away', () => {
  for (const [name, text] of Object.entries(NOT_POSTINGS)) {
    it(name, () => {
      const check = looksLikeJobPosting(text)
      assert.ok(!check.ok)
      assert.equal(check.reason, 'not-a-posting')
    })
  }

  it('recognises a resume pasted into the posting box', () => {
    const check = looksLikeJobPosting(RESUME)
    assert.ok(!check.ok)
    assert.equal(check.reason, 'is-a-resume')
    assert.match(postingRejectionMessage(check), /looks like a resume/i)
  })
})
