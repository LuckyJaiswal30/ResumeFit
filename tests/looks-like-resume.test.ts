import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { looksLikeResume, resumeRejectionMessage } from '@/lib/resume/looks-like-resume'

const RESUMES: Record<string, string> = {
  'a conventional resume': `DANIEL OKONKWO
daniel.okonkwo@email.com | +1 (415) 555-0182 | linkedin.com/in/danielokonkwo

PROFESSIONAL EXPERIENCE
Senior Software Engineer | Atlassian | March 2022 - Present
- Led the migration of the Jira issue view to React 18.
- Mentored four engineers, two of whom were promoted.

EDUCATION
BSc Computer Science, University of California, Berkeley | 2018

TECHNICAL SKILLS
React, TypeScript, Next.js, GraphQL, Playwright, AWS`,

  'a fresher with only projects': `Priya Sharma
priya.sharma@email.com | +91 98765 43210

EDUCATION
B.Tech Computer Science, VIT Vellore, 2022 - 2026

SKILLS
Java, Python, SQL, Git

PROJECTS
- Built an expense tracker in React with Firebase auth.
- Created a REST API in Spring Boot for a college portal.`,

  'a prose CV with no headings': `Marcus Bell
marcus.bell@email.com | 555 0198 | linkedin.com/in/marcusbell

Senior Product Designer at Figma from 2021 to Present, where I led the redesign of the
comments system and mentored two junior designers. Before that, Product Designer at
Intercom 2018 - 2021, where I designed the mobile messenger. BA Graphic Design, 2018.`,

  'an academic CV': `Dr Helena Vasquez
h.vasquez@university.ac.uk

EDUCATION
PhD Molecular Biology, Imperial College London, 2014 - 2018

EMPLOYMENT
Senior Lecturer, University of Manchester, 2021 - Present
- Led a research group of six postgraduate students.

SKILLS
Python, R, statistical modelling`,

  'a non-technical career changer': `Sam Whitfield
sam.whitfield@email.com | 07700 900321

WORK EXPERIENCE
Restaurant Manager | The Ivy, Leeds | 2019 - Present
- Managed a front of house team of eighteen across two sites.
- Reduced staff turnover by a third through a new training programme.

EDUCATION
BA Hospitality Management, Leeds Beckett University, 2016`,
}

const NOT_RESUMES: Record<string, string> = {
  'an invoice': `ACME SUPPLIES LIMITED
INVOICE
Invoice Number: INV-2026-04817
Invoice Date: 14 March 2026
Bill To: Northgate Trading, Bristol BS11 9DQ
Steel bracket 40mm 120 4.50 540.00
Subtotal 1182.50 VAT at 20% 236.50 Total Due 1419.00
Payment Terms: Net 30 days. Please quote the invoice number with your remittance.`,

  'a news article': `The Quiet Collapse of the Corner Shop

Across the north of England, the independent corner shop is disappearing at a rate
that has surprised even the researchers tracking it. Closures cluster in towns where
a large supermarket opened within the previous three years. Economists disagree about
how much of this is inevitable.`,

  'a recipe': `Slow Roast Shoulder of Lamb

Serves six. Preparation twenty minutes.

Ingredients
2.2kg shoulder of lamb, 6 anchovy fillets, 4 sprigs rosemary, 2 tablespoons olive oil

Method
Preheat the oven to 160C. Blend the anchovies and rosemary to a paste.
Roast for four hours until the meat pulls from the bone.`,

  'a cover letter': `Dear Hiring Manager,

I am writing to apply for the Senior Frontend Engineer role advertised on your careers
page. I believe my background makes me a strong fit. Please find my details at
sam@email.com.

Yours sincerely,
Sam`,

  'the job posting pasted by mistake': `Senior Frontend Engineer
We are hiring a Senior Frontend Engineer to lead development of our customer platform.
Requirements: 5+ years frontend experience, deep React knowledge, strong TypeScript.
Nice to have: GraphQL. Apply now. Benefits include 25 days holiday.`,

  'a bank statement': `MONTHLY STATEMENT
Account Number 41882037 Sort Code 30-96-26
Date Description Money Out Money In Balance
01 Mar 2026 CARD PAYMENT TESCO 42.18 1284.02
Payment terms apply. Total due on account.`,

  'an empty document': '   \n\n  ',
}

describe('documents that must be accepted', () => {
  for (const [name, text] of Object.entries(RESUMES)) {
    it(name, () => {
      const result = looksLikeResume(text)
      assert.ok(result.ok, `scored ${result.score}, missing: ${result.missing.join('; ')}`)
    })
  }
})

describe('documents that must be turned away', () => {
  for (const [name, text] of Object.entries(NOT_RESUMES)) {
    it(name, () => {
      const result = looksLikeResume(text)
      assert.ok(!result.ok, `scored ${result.score}`)
    })
  }
})

describe('the rejection message', () => {
  it('names what was missing and stays short', () => {
    const message = resumeRejectionMessage(looksLikeResume(NOT_RESUMES['an invoice']))
    assert.match(message, /does not look like a resume/i)
    assert.match(message, /Experience, Education or Skills/)
    assert.ok(message.length < 260)
  })

  it('says when it recognises another kind of document', () => {
    const result = looksLikeResume(NOT_RESUMES['a recipe'])
    assert.ok(
      result.missing.some((entry) => /recipe/i.test(entry)),
      result.missing.join('; '),
    )
  })
})
