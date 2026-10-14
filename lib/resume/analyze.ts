import { createHash } from 'node:crypto'
import { reserveProviderBudget } from '@/lib/ai/budget'
import { AiRequestError, activeModel, isAiConfigured, resolveProvider } from '@/lib/ai/client'
import { REVIEW_VERSION, requestResumeReview } from '@/lib/ai/review'
import { readAnalysis, writeAnalysis } from './analysis-cache'
import { buildAtsReport } from './ats'
import { assembleAiAnalysis } from './assemble'
import { keywordRequirements, scoreRequirements } from './match'
import { buildTailoring } from './tailor'
import { checkTitle } from './title'
import type { Analysis, AtsReport, Finding, Requirement } from './types'

function cacheKey(resume: string, jobDescription: string) {
  const provider = resolveProvider()
  return createHash('sha256')
    .update(`v${REVIEW_VERSION}:${provider?.name}:${provider?.model}:${resume}:${jobDescription}`)
    .digest('hex')
}

const ATS_PROBLEM: Record<string, string> = {
  contact: 'Your contact details are hard to find',
  sections: 'The usual section headings are missing',
  bullets: 'Too few bulleted achievements',
  length: 'The length is working against you',
  density: 'One block is a wall of text',
  signals: 'Dates or profile links are missing',
}

function keywordFindings(requirements: Requirement[], ats: AtsReport): Finding[] {
  const findings: Finding[] = []
  const missing = requirements.filter((item) => item.coverage === 'missing')

  if (missing.length) {
    findings.push({
      id: 'missing-terms',
      title: 'Words from the posting are missing',
      detail: `${missing
        .slice(0, 5)
        .map((item) => item.label)
        .join(
          ', ',
        )} appear in the posting but not your resume. Add the ones you have used, inside the work that proves them.`,
      priority: 'high',
    })
  }

  for (const check of ats.checks) {
    if (!check.passed) {
      findings.push({
        id: `ats-${check.id}`,
        title: ATS_PROBLEM[check.id] ?? check.label,
        detail: check.detail,
        priority: check.id === 'contact' || check.id === 'sections' ? 'high' : 'medium',
      })
    }
  }

  return findings.slice(0, 5)
}

function keywordAnalysis(
  resume: string,
  jobDescription: string,
  ats: AtsReport,
  aiError: string | null,
): Analysis {
  const requirements = keywordRequirements(resume, jobDescription)
  const match = scoreRequirements(requirements)
  return {
    source: 'keyword',
    model: null,
    aiError,
    match: {
      ...match,
      summary:
        'This only counts the posting’s key words in your resume. It can’t judge how well you show them, so treat it as a rough guide.',
      breakdown: match.breakdown.map((part) => ({ ...part, label: 'Term coverage' })),
    },
    ats,
    findings: keywordFindings(requirements, ats),
    phrasing: [],
    rewrites: [],
  }
}

async function aiAnalysis(
  resume: string,
  jobDescription: string,
  ats: AtsReport,
): Promise<Analysis> {
  const review = await requestResumeReview(resume, jobDescription)
  return assembleAiAnalysis(resume, jobDescription, ats, review, activeModel())
}

async function analyse(resume: string, jobDescription: string): Promise<Analysis> {
  const ats = buildAtsReport(resume)
  if (!isAiConfigured()) return keywordAnalysis(resume, jobDescription, ats, null)

  const key = cacheKey(resume, jobDescription)
  const cached = await readAnalysis(key)
  if (cached) return cached

  const provider = resolveProvider()
  if (provider && !(await reserveProviderBudget(provider))) {
    return keywordAnalysis(
      resume,
      jobDescription,
      ats,
      'the shared allowance for the configured model is used up for now',
    )
  }

  try {
    const analysis = await aiAnalysis(resume, jobDescription, ats)
    await writeAnalysis(key, analysis)
    return analysis
  } catch (error) {
    const detail =
      error instanceof AiRequestError ? error.message : 'the response could not be used'
    return keywordAnalysis(resume, jobDescription, ats, detail)
  }
}

export async function buildAnalysis(resume: string, jobDescription: string): Promise<Analysis> {
  const analysis = await analyse(resume, jobDescription)
  const withTitle = { ...analysis, title: checkTitle(resume, jobDescription) }
  return { ...withTitle, tailoring: buildTailoring(withTitle, resume) }
}
