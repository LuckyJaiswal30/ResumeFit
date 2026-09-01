import type { Coverage, Importance, MatchReport, Requirement } from './types'

const CREDIT: Record<Coverage, number> = { strong: 1, partial: 0.5, missing: 0 }
const REQUIRED_WEIGHT = 75
const PREFERRED_WEIGHT = 25

const SKILL_ALIASES: Record<string, string[]> = {
  javascript: ['js', 'ecmascript'],
  typescript: ['ts'],
  'node.js': ['node', 'nodejs'],
  'next.js': ['next', 'nextjs'],
  postgresql: ['postgres'],
  kubernetes: ['k8s'],
  'ci/cd': ['ci cd', 'continuous integration', 'continuous delivery'],
  rest: ['rest api', 'rest apis', 'restful'],
  'machine learning': ['ml'],
  aws: ['amazon web services'],
  'github actions': ['gh actions'],
}

const SKILLS = [
  'Accessibility',
  'Agile',
  'Airflow',
  'Angular',
  'Ansible',
  'API',
  'AWS',
  'Azure',
  'Bash',
  'C#',
  'C++',
  'CI/CD',
  'CSS',
  'Django',
  'Docker',
  'Elasticsearch',
  'Express',
  'Figma',
  'Firebase',
  'Flask',
  'Git',
  'GitHub Actions',
  'Go',
  'GraphQL',
  'gRPC',
  'HTML',
  'Java',
  'JavaScript',
  'Jenkins',
  'Jest',
  'Jira',
  'Kafka',
  'Kotlin',
  'Kubernetes',
  'Linux',
  'Machine learning',
  'MongoDB',
  'MySQL',
  'Next.js',
  'Node.js',
  'NoSQL',
  'pandas',
  'PHP',
  'Playwright',
  'PostgreSQL',
  'Power BI',
  'Python',
  'PyTorch',
  'React',
  'React Native',
  'Redis',
  'Redux',
  'REST',
  'Ruby',
  'Rust',
  'Sass',
  'Scala',
  'Selenium',
  'Snowflake',
  'Spark',
  'Spring',
  'SQL',
  'Swift',
  'Tableau',
  'Tailwind',
  'TensorFlow',
  'Terraform',
  'TypeScript',
  'Vue',
  'Webpack',
]

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[‘’']/g, '')
    .replace(/[^a-z0-9+#./\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function containsTerm(normalizedText: string, term: string) {
  const normalizedTerm = normalize(term)
  if (!normalizedTerm) return false
  const pattern = new RegExp(`(?<![a-z0-9+#.])${escapeRegExp(normalizedTerm)}(?![a-z0-9+#])`)
  return pattern.test(normalizedText)
}

function termWithAliases(skill: string) {
  return [skill, ...(SKILL_ALIASES[skill.toLowerCase()] ?? [])]
}

function looseTokens(value: string) {
  return normalize(value)
    .split(/[^a-z0-9+#]+/)
    .filter((token) => token.length >= 3)
}

export function verifyEvidence(resume: string, evidence: string | null) {
  if (!evidence) return false
  const normalizedEvidence = normalize(evidence)
  if (normalizedEvidence.length < 8) return false
  if (normalize(resume).includes(normalizedEvidence)) return true

  const resumeTokens = new Set(looseTokens(resume))
  const evidenceTokens = [...new Set(looseTokens(evidence))]
  if (evidenceTokens.length === 0) return false
  const present = evidenceTokens.filter((token) => resumeTokens.has(token)).length
  return present / evidenceTokens.length >= 0.8
}

function downgrade(coverage: Coverage): Coverage {
  return coverage === 'strong' ? 'partial' : 'missing'
}

export function groundRequirements(resume: string, requirements: Requirement[]): Requirement[] {
  return requirements.map((requirement) => {
    if (requirement.coverage === 'missing') {
      return { ...requirement, evidence: null, evidenceVerified: false }
    }
    const evidenceVerified = verifyEvidence(resume, requirement.evidence)
    if (evidenceVerified) return { ...requirement, evidenceVerified }
    const coverage = downgrade(requirement.coverage)
    return {
      ...requirement,
      coverage,
      evidenceVerified: false,
      note:
        coverage === 'missing'
          ? 'You name this, but no work backs it up.'
          : 'The line meant to back this up is not in your resume, so it scores lower.',
    }
  })
}

function averageCredit(requirements: Requirement[]) {
  if (requirements.length === 0) return null
  const total = requirements.reduce((sum, item) => sum + CREDIT[item.coverage], 0)
  return total / requirements.length
}

function summarize(score: number, requirements: Requirement[]) {
  const missingRequired = requirements.filter(
    (item) => item.importance === 'required' && item.coverage === 'missing',
  )
  if (score >= 80) {
    return missingRequired.length === 0
      ? 'Your resume covers what this role asks for.'
      : `Strong overall, though ${missingRequired.length} required item${missingRequired.length === 1 ? ' is' : 's are'} still missing.`
  }
  if (score >= 55) {
    return `A workable match. Closing ${missingRequired.length} required item${missingRequired.length === 1 ? '' : 's'} would move it the furthest.`
  }
  return 'This resume does not show the core requirements for the role yet.'
}

export function scoreRequirements(requirements: Requirement[]): MatchReport {
  const required = requirements.filter((item) => item.importance === 'required')
  const preferred = requirements.filter((item) => item.importance === 'preferred')
  const requiredCredit = averageCredit(required)
  const preferredCredit = averageCredit(preferred)

  const parts: Array<{ label: string; credit: number; weight: number }> = []
  if (requiredCredit !== null && preferredCredit !== null) {
    parts.push({ label: 'Required', credit: requiredCredit, weight: REQUIRED_WEIGHT })
    parts.push({ label: 'Preferred', credit: preferredCredit, weight: PREFERRED_WEIGHT })
  } else if (requiredCredit !== null) {
    parts.push({ label: 'Required', credit: requiredCredit, weight: 100 })
  } else if (preferredCredit !== null) {
    parts.push({ label: 'Preferred', credit: preferredCredit, weight: 100 })
  }

  const score = parts.length
    ? Math.round(parts.reduce((total, part) => total + part.credit * part.weight, 0))
    : 0

  return {
    score,
    breakdown: parts.map((part) => ({
      label: part.label,
      score: Math.round(part.credit * 100),
      weight: part.weight,
    })),
    requirements,
    summary: summarize(score, requirements),
  }
}

export function keywordRequirements(resume: string, jobDescription: string): Requirement[] {
  const normalizedResume = normalize(resume)
  const normalizedJob = normalize(jobDescription)

  return SKILLS.filter((skill) =>
    termWithAliases(skill).some((term) => containsTerm(normalizedJob, term)),
  ).map((skill) => {
    const covered = termWithAliases(skill).some((term) => containsTerm(normalizedResume, term))
    const coverage: Coverage = covered ? 'strong' : 'missing'
    const importance: Importance = 'required'
    return {
      id: `keyword-${skill.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      label: skill,
      category: 'skill' as const,
      importance,
      coverage,
      evidence: null,
      evidenceVerified: false,
      note: covered
        ? 'This word appears in both the posting and your resume.'
        : 'The posting uses this word. Your resume does not.',
    }
  })
}

export function addsUnsupportedNumber(original: string, rewrite: string) {
  const pattern = /\d+(?:[.,]\d+)?%?/g
  const originalNumbers = new Set(original.match(pattern) ?? [])
  return (rewrite.match(pattern) ?? []).some((number) => !originalNumbers.has(number))
}
