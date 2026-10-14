import {
  MAX_ADDED_WORDS,
  addedContentWords,
  addsUnsupportedNumber,
  groundRequirements,
  scoreRequirements,
  verifyEvidence,
} from './match'
import type {
  Analysis,
  AtsReport,
  BulletRewrite,
  Coverage,
  Finding,
  Importance,
  PhrasingGap,
  Priority,
} from './types'

export type Review = {
  requirements: Array<{
    label: string
    category: 'skill' | 'experience' | 'qualification'
    importance: Importance
    coverage: Coverage
    evidence: string | null
    note: string
  }>
  findings: Array<{ title: string; detail: string; priority: Priority }>
  phrasing: Array<{ yours: string; posting: string; note: string }>
  rewrites: Array<{ original: string; rewrite: string; reason: string }>
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

export function assembleAiAnalysis(
  resume: string,
  jobDescription: string,
  ats: AtsReport,
  review: Review,
  model: string | null,
): Analysis {
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
      verifyEvidence(resume, item.original) &&
      !addsUnsupportedNumber(item.original, item.rewrite) &&
      addedContentWords(item.original, item.rewrite).length <= MAX_ADDED_WORDS,
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
    model,
    aiError: null,
    match: scoreRequirements(requirements),
    ats,
    findings,
    phrasing,
    rewrites,
  }
}
