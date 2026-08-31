import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { extractPdfText } from '@/lib/resume/pdf-text'
import { buildAtsReport, extractBullets } from '@/lib/resume/ats'
import { makePdf } from './helpers/make-pdf'

function twoColumnResume() {
  const items = [
    { text: 'PRIYA RAGHAVAN', x: 40, y: 50, size: 16, bold: true },
    {
      text: 'priya.raghavan@email.com | +44 7700 900123 | linkedin.com/in/priyaraghavan',
      x: 40,
      y: 68,
      size: 9,
    },
  ]
  const sidebar = [
    'SKILLS',
    'React',
    'TypeScript',
    'Node.js',
    'GraphQL',
    'Docker',
    'AWS',
    'Jest',
    'EDUCATION',
    'BSc Computer Science',
    'University of Leeds',
    '2019',
  ]
  const main = [
    'EXPERIENCE',
    'Senior Frontend Engineer',
    'Monzo | 2022 - Present',
    '- Led the rebuild of the payments dashboard in React and TypeScript.',
    '- Cut median page load from 3.1s to 1.4s by code splitting the bundle.',
    '- Mentored three junior engineers through their first year.',
    'Frontend Engineer',
    'Deliveroo | 2019 - 2022',
    '- Built the restaurant onboarding flow used by 40,000 partners.',
    '- Owned accessibility remediation to WCAG 2.1 AA across the estate.',
  ]
  const rows = Math.max(sidebar.length, main.length)
  for (let i = 0; i < rows; i += 1) {
    if (sidebar[i]) items.push({ text: sidebar[i], x: 40, y: 110 + i * 18, size: 9 })
    if (main[i]) items.push({ text: main[i], x: 210, y: 110 + i * 18, size: 9 })
  }
  return makePdf(items)
}

function singleColumnResume() {
  const lines = [
    'MARCUS OSEI',
    'marcus.osei@email.com | 555-0147 | github.com/mosei',
    'EXPERIENCE',
    'Data Engineer | Northwind Analytics | 2021 - Present',
    '- Built ingestion pipelines in Airflow moving 2TB daily into Snowflake.',
    '- Cut warehouse spend 30% by rewriting the heaviest Spark jobs.',
    '- Added contract tests that caught schema drift before production.',
    'EDUCATION',
    'BSc Software Engineering, University of Manchester | 2021',
    'SKILLS',
    'Python, Go, SQL, AWS, Terraform, Docker, Airflow, Spark',
  ]
  return makePdf(lines.map((text, index) => ({ text, x: 40, y: 50 + index * 18, size: 9 })))
}

function typographyResume() {
  const lines = [
    'ZOË MÜLLER-SANTOS',
    'zoe.muller@email.com | +33 6 12 34 56 78 | linkedin.com/in/zmuller',
    'EXPERIENCE',
    'Product Designer — Doctolib | 2020–Present',
    '• Redesigned the practitioner’s booking flow — cut drop-off by 18%.',
    '• Ran “design critique” sessions across a 12-person team.',
    '• Built the design system in Figma, adopted by 4 squads.',
    'SKILLS',
    'Figma, prototyping, user research, accessibility',
    'EDUCATION',
    'MA Interaction Design, ENSCI Les Ateliers | 2020',
  ]
  return makePdf(lines.map((text, index) => ({ text, x: 40, y: 50 + index * 18, size: 9 })))
}

describe('two column layouts', () => {
  it('does not interleave the sidebar with the main column', async () => {
    const text = await extractPdfText(twoColumnResume())
    assert.ok(!/React Senior Frontend Engineer/.test(text), 'columns were merged line by line')
    assert.ok(!/Node\.js - Led the rebuild/.test(text), 'columns were merged line by line')
  })

  it('keeps each sidebar entry on its own line', async () => {
    const lines = (await extractPdfText(twoColumnResume())).split('\n')
    for (const skill of ['React', 'TypeScript', 'Node.js', 'GraphQL', 'Docker', 'AWS', 'Jest']) {
      assert.ok(lines.includes(skill), `${skill} was not on its own line`)
    }
  })

  it('keeps the main column bullets intact', async () => {
    const text = await extractPdfText(twoColumnResume())
    assert.match(text, /- Led the rebuild of the payments dashboard in React and TypeScript\./)
    assert.match(text, /- Owned accessibility remediation to WCAG 2\.1 AA across the estate\./)
  })

  it('reads the sidebar before the main column', async () => {
    const text = await extractPdfText(twoColumnResume())
    assert.ok(text.indexOf('SKILLS') < text.indexOf('EXPERIENCE'))
  })

  it('leaves the result usable downstream', async () => {
    const text = await extractPdfText(twoColumnResume())
    assert.ok(extractBullets(text).length >= 5)
    const checks = Object.fromEntries(buildAtsReport(text).checks.map((c) => [c.id, c.passed]))
    assert.ok(checks.bullets)
    assert.ok(checks.sections)
  })
})

describe('single column layouts', () => {
  it('is never split into columns by mistake', async () => {
    const text = await extractPdfText(singleColumnResume())
    assert.match(text, /- Built ingestion pipelines in Airflow moving 2TB daily into Snowflake\./)
    assert.match(text, /- Cut warehouse spend 30% by rewriting the heaviest Spark jobs\./)
  })

  it('keeps sections in their original order', async () => {
    const text = await extractPdfText(singleColumnResume())
    assert.ok(text.indexOf('EXPERIENCE') < text.indexOf('EDUCATION'))
    assert.ok(text.indexOf('EDUCATION') < text.indexOf('SKILLS'))
  })
})

describe('typography', () => {
  it('preserves accents, smart quotes and dashes', async () => {
    const text = await extractPdfText(typographyResume())
    assert.match(text, /ZOË MÜLLER-SANTOS/)
    assert.match(text, /practitioner’s/)
    assert.match(text, /“design critique”/)
    assert.match(text, /2020–Present/)
  })

  it('still finds bullets written with a bullet glyph', async () => {
    assert.ok(extractBullets(await extractPdfText(typographyResume())).length >= 3)
  })
})

describe('documents with no text layer', () => {
  it('comes back effectively empty rather than throwing', async () => {
    const text = await extractPdfText(makePdf([{ text: ' ', x: 40, y: 400 }]))
    assert.ok(text.trim().length < 80)
  })
})
