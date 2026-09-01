import { createHash } from 'node:crypto'
import { AiRequestError, activeModel, isAiConfigured, resolveProvider } from '@/lib/ai/client'
import { type ProviderConfig } from '@/lib/ai/config'
import { checkSharedLimit } from '@/lib/security/rate-limit'
import { requestResumeReview } from '@/lib/ai/review'
import { readAnalysis, writeAnalysis } from './analysis-cache'
import { buildAtsReport } from './ats'
import {
  addsUnsupportedNumber,
  groundRequirements,
  keywordRequirements,
  scoreRequirements,
  verifyEvidence,
} from './match'
import type { Analysis, AtsReport, BulletRewrite, Finding, PhrasingGap, Requirement } from './types'

function cacheKey(resume: string, jobDescription: string) {
  const provider = resolveProvider()
  return createHash('sha256')
    .update(`${provider?.name}:${provider?.model}:${resume}:${jobDescription}`)
    .digest('hex')
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
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

  const requirements = groundRequirements(
    resume,
    review.requirements.map((item, index) => ({
      id: `${index}-${slug(item.label)}`,
      label: item.label,
      category: item.category,
      importance: item.importance,
      coverage: item.coverage,
      evidence: item.evidence,
      evidenceVerified: false,
      note: item.note,
    })),
  )

  const rewrites: BulletRewrite[] = review.rewrites.filter(
    (item) =>
      verifyEvidence(resume, item.original) && !addsUnsupportedNumber(item.original, item.rewrite),
  )

  const findings: Finding[] = review.findings.map((item, index) => ({
    id: `${index}-${slug(item.title)}`,
    ...item,
  }))

  const phrasing: PhrasingGap[] = review.phrasing
    .filter(
      (item) =>
        verifyEvidence(resume, item.yours) &&
        verifyEvidence(jobDescription, item.posting) &&
        item.yours.toLowerCase() !== item.posting.toLowerCase(),
    )
    .map((item, index) => ({ id: `${index}-${slug(item.posting)}`, ...item }))

  return {
    source: 'ai',
    model: activeModel(),
    aiError: null,
    match: scoreRequirements(requirements),
    ats,
    findings,
    phrasing,
    rewrites,
  }
}

const DAY_MS = 24 * 60 * 60_000

async function reserveProviderBudget(provider: ProviderConfig) {
  const scope = `${provider.name}:${provider.model}`
  const perMinute = await checkSharedLimit(`${scope}:minute`, provider.budgetPerMinute, 60_000)
  if (!perMinute.allowed) return false
  const perDay = await checkSharedLimit(`${scope}:day`, provider.budgetPerDay, DAY_MS)
  return perDay.allowed
}

export async function buildAnalysis(resume: string, jobDescription: string): Promise<Analysis> {
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
