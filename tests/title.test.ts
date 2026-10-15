import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { checkTitle, postingTitle, resumeTitles } from '@/lib/resume/title'

const RESUME = (title: string, headline = 'Software developer, Leeds, UK') => `Nora Whitfield
${headline}
nora@example.com | linkedin.com/in/nora

Summary
Developer with five years of experience building customer-facing web applications for health teams.

Experience
${title}, Lumen Care, Leeds, UK | Mar 2022 - Present
- Built and documented a shared component library now used by five product teams.
Web Developer, Brightwell Digital, Manchester | Jun 2019 - Feb 2022
- Developed React interfaces for three client apps, from first sketch to launch.

Education
BSc Computer Science, University of Leeds, 2019`

describe('finding the title in a posting', () => {
  const cases: Array<[string, string, string | null]> = [
    [
      'first line',
      'Senior Frontend Engineer\nNorthlight Health, Remote (UK)\n\nAbout the role',
      'Senior Frontend Engineer',
    ],
    [
      'a labelled line',
      'Acme Corp\nJob Title: Data Analyst II - Remote\nWe are hiring',
      'Data Analyst II',
    ],
    ['title at a company', 'Backend Developer at Acme\nRequirements: Python', 'Backend Developer'],
    ['title with a location', 'Product Designer (Remote, EU)\nAbout us', 'Product Designer'],
    [
      'a posting that opens with a sentence',
      'Acme Corp is hiring a developer to build things for our customers every day.\nRequirements',
      null,
    ],
    [
      'a posting with no recognisable role',
      'Come and join our fast-growing family\nBenefits include lunch',
      null,
    ],
  ]
  for (const [name, text, expected] of cases) {
    it(name, () => assert.equal(postingTitle(text), expected))
  }
})

describe('finding titles in a resume', () => {
  it('reads titles from the job lines, newest first', () => {
    assert.deepEqual(resumeTitles(RESUME('Software Engineer')), [
      'Software Engineer',
      'Web Developer',
    ])
  })

  it('finds a title written after the employer', () => {
    const text =
      'Experience\nLumen Care — Senior Engineer (2022 - Present)\n- Did things for customers\n\nEducation\nBSc'
    assert.deepEqual(resumeTitles(text), ['Senior Engineer'])
  })

  it('ignores bullets, long sentences and company names that merely contain a role word', () => {
    const text =
      'Experience\nLead Generation Ltd, Manchester | 2020 - 2022\n- Managed a team of engineers across two sites\nThis role covered a great many things across the business over a long period of time\nEducation'
    assert.deepEqual(resumeTitles(text), [])
  })
})

describe('comparing the two', () => {
  const posting = 'Senior Frontend Engineer\nNorthlight Health\nRequirements: React'

  it('matches when a job title says it, whatever the level', () => {
    const check = checkTitle(RESUME('Frontend Engineer'), posting)
    assert.equal(check?.verdict, 'match')
    assert.equal(check?.latest, 'Frontend Engineer')
    assert.equal(check?.levelGap, true)
  })

  it('sees no level gap when the level is there too', () => {
    const check = checkTitle(RESUME('Senior Frontend Engineer'), posting)
    assert.equal(check?.verdict, 'match')
    assert.equal(check?.levelGap, false)
  })

  it('treats Sr. and Senior as the same level', () => {
    assert.equal(checkTitle(RESUME('Sr. Frontend Engineer'), posting)?.levelGap, false)
  })

  it('notices the words only appear in the headline', () => {
    const check = checkTitle(RESUME('Software Engineer', 'Frontend Engineer, Leeds, UK'), posting)
    assert.equal(check?.verdict, 'headline')
    assert.equal(check?.latest, 'Software Engineer')
  })

  it('calls a shared role a close match', () => {
    assert.equal(checkTitle(RESUME('Software Engineer'), posting)?.verdict, 'close')
  })

  it('says so when nothing resembles it', () => {
    const check = checkTitle(RESUME('Pastry Chef'), 'Data Analyst\nAbout the role')
    assert.equal(check?.verdict, 'different')
  })

  it('stays quiet when the posting has no recognisable title', () => {
    assert.equal(checkTitle(RESUME('Software Engineer'), 'Join our family today'), null)
  })
})

describe('a resume with no experience section', () => {
  it('does not take a tool in a skills list for a job title', () => {
    const resume = [
      'PRIYA SHAH',
      'priya.shah@example.com',
      'EDUCATION',
      'Bachelor of Engineering, University of Pune, 2018',
      'TOOLS USED',
      'Google Analytics',
      'Google Keyword Planner',
    ].join('\n')
    assert.deepEqual(resumeTitles(resume), [])
  })

  it('still reads a headline under the name', () => {
    const resume = ['Priya Shah', 'Marketing Executive', 'SKILLS', 'Event Planner software'].join(
      '\n',
    )
    assert.deepEqual(resumeTitles(resume), ['Marketing Executive'])
  })
})
