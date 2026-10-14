import { buildAtsReport } from '@/lib/resume/ats'
import { buildTailoring } from '@/lib/resume/tailor'
import { checkTitle } from '@/lib/resume/title'
import { assembleAiAnalysis, type Review } from '@/lib/resume/assemble'
import type { Analysis } from '@/lib/resume/types'
import { SAMPLE_POSTING } from '@/lib/samples/sample-posting'
import { SAMPLE_RESUME, SAMPLE_RESUME_FILE } from '@/lib/samples/sample-resume'

export const SAMPLE_FILE_NAME = SAMPLE_RESUME_FILE

export const SAMPLE_MODEL = 'gemini-3.5-flash-lite'

const SAMPLE_REVIEW: Review = {
  requirements: [
    {
      label: 'React',
      category: 'skill',
      importance: 'required',
      coverage: 'strong',
      evidence: 'Developed React interfaces for three client apps, from first sketch to launch.',
      note: 'Real interfaces, taken from first sketch to launch.',
    },
    {
      label: 'TypeScript',
      category: 'skill',
      importance: 'required',
      coverage: 'strong',
      evidence:
        'Led the migration of the patient portal from JavaScript to TypeScript across 60 screens.',
      note: 'A large migration is stronger proof than a line in a skills list.',
    },
    {
      label: 'Design system',
      category: 'experience',
      importance: 'required',
      coverage: 'strong',
      evidence: 'Built and documented a shared component library now used by five product teams.',
      note: 'Built, documented and adopted by other teams.',
    },
    {
      label: 'Automated testing and CI/CD',
      category: 'skill',
      importance: 'required',
      coverage: 'strong',
      evidence:
        'Ran weekly releases through GitHub Actions, with automated visual regression checks on every PR.',
      note: 'Both the pipeline and the checks inside it are covered.',
    },
    {
      label: 'Web performance',
      category: 'skill',
      importance: 'required',
      coverage: 'strong',
      evidence:
        'Cut largest contentful paint from 4.1s to 1.6s by splitting bundles and deferring scripts.',
      note: 'A measured result with the method named.',
    },
    {
      label: 'Accessibility (WCAG 2.2 AA)',
      category: 'qualification',
      importance: 'required',
      coverage: 'partial',
      evidence: 'Built accessible checkout forms and checked them with VoiceOver and NVDA.',
      note: 'The work is real, but no standard or level is named.',
    },
    {
      label: 'Next.js and server-side rendering',
      category: 'skill',
      importance: 'preferred',
      coverage: 'partial',
      evidence: 'Built server-rendered product pages with Next.js to improve first load.',
      note: 'Appears in the skills list.',
    },
    {
      label: 'GraphQL at scale',
      category: 'skill',
      importance: 'preferred',
      coverage: 'strong',
      evidence: 'Designed GraphQL schemas for the patient portal.',
      note: 'Appears in the skills list.',
    },
    {
      label: 'Mentoring junior engineers',
      category: 'experience',
      importance: 'preferred',
      coverage: 'partial',
      evidence: 'Onboarded two new engineers onto the component library.',
      note: 'Onboarding counts, though it is the only mention.',
    },
    {
      label: 'A/B testing and experimentation',
      category: 'experience',
      importance: 'preferred',
      coverage: 'missing',
      evidence: null,
      note: 'Nothing about experiments appears in your resume.',
    },
  ],
  findings: [
    {
      title: 'Two skills stand on a list alone',
      detail:
        'Next.js and GraphQL are named in your skills but no bullet shows the work. Add a line to each role that used them, or leave them off.',
      priority: 'medium',
    },
    {
      title: 'The strongest bullets carry numbers, the weakest do not',
      detail:
        'Performance and testing results are measured. The checkout and Figma bullets describe a task without an outcome.',
      priority: 'low',
    },
  ],
  phrasing: [
    {
      yours: 'checked them with VoiceOver and NVDA',
      posting: 'WCAG 2.2 AA',
      note: 'Screen reader testing is part of WCAG work, but a keyword filter looks for the standard by name.',
    },
  ],
  rewrites: [
    {
      original: 'Responsible for the checkout redesign.',
      rewrite: 'Led the checkout redesign.',
      reason: 'A verb that says what you did, not what you were in charge of.',
    },
    {
      original: 'Helped the team move to a shared Figma library and wrote some of the docs.',
      rewrite: 'Moved the team to a shared Figma library and wrote its documentation.',
      reason: 'Drops the hedging words and keeps both facts.',
    },
  ],
}

const SAMPLE_BASE: Analysis = {
  ...assembleAiAnalysis(
    SAMPLE_RESUME,
    SAMPLE_POSTING,
    buildAtsReport(SAMPLE_RESUME),
    SAMPLE_REVIEW,
    SAMPLE_MODEL,
  ),
  title: checkTitle(SAMPLE_RESUME, SAMPLE_POSTING),
}

export const SAMPLE_ANALYSIS: Analysis = {
  ...SAMPLE_BASE,
  tailoring: buildTailoring(SAMPLE_BASE, SAMPLE_RESUME),
}
