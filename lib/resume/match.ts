import type { Coverage, Importance, MatchReport, Requirement } from './types'
import { BULLET_MARK } from './bullets'

const NOT_A_PHRASE = new RegExp(String.raw`^${BULLET_MARK}|^\d+[.)]|[.!?]$`, 'u')

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
  'ci/cd': [
    'ci cd',
    'continuous integration',
    'continuous delivery',
    'github actions',
    'gitlab ci',
    'circleci',
  ],
  rest: ['rest api', 'rest apis', 'restful'],
  'machine learning': ['ml'],
  aws: ['amazon web services'],
  'github actions': ['gh actions'],
  accessibility: ['accessible', 'a11y', 'wcag'],
  'design system': ['design systems', 'component library', 'component libraries', 'ui library'],
  'web performance': [
    'core web vitals',
    'largest contentful paint',
    'page speed',
    'page load',
    'lighthouse',
  ],
  'a/b testing': ['a/b test', 'a/b tests', 'ab testing', 'split testing', 'experimentation'],
  mentoring: ['mentor', 'mentored', 'mentors'],
}

const SKILLS = [
  'Accessibility',
  'Agile',
  'Airflow',
  'Angular',
  'Ansible',
  'API',
  'A/B testing',
  'AWS',
  'Azure',
  'Bash',
  'C#',
  'C++',
  'CI/CD',
  'CSS',
  'Design system',
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
  'Mentoring',
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
  'Storybook',
  'SQL',
  'Swift',
  'Tableau',
  'Tailwind',
  'TensorFlow',
  'Terraform',
  'TypeScript',
  'Vue',
  'Web performance',
  'Webpack',
]

export function normalize(value: string) {
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

export function containsTerm(normalizedText: string, term: string) {
  const normalizedTerm = normalize(term)
  if (!normalizedTerm) return false
  const pattern = new RegExp(`(?<![a-z0-9+#.])${escapeRegExp(normalizedTerm)}(?![a-z0-9+#])`)
  return pattern.test(normalizedText)
}

function termIndex(normalizedText: string, term: string) {
  const normalizedTerm = normalize(term)
  if (!normalizedTerm) return -1
  return normalizedText.search(
    new RegExp(`(?<![a-z0-9+#.])${escapeRegExp(normalizedTerm)}(?![a-z0-9+#])`),
  )
}

export function termWithAliases(skill: string) {
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

function onlyInSkillsList(resume: string, evidence: string | null) {
  if (!evidence) return false
  const wanted = normalize(evidence)
  if (wanted.length === 0) return false
  const containing = resumeLines(resume).filter((line) => line.text.includes(wanted))
  return containing.length > 0 && containing.every((line) => line.skills)
}

export function groundRequirements(resume: string, requirements: Requirement[]): Requirement[] {
  return requirements.map((requirement) => {
    if (requirement.coverage === 'missing') {
      return { ...requirement, evidence: null, evidenceVerified: false }
    }
    const evidenceVerified = verifyEvidence(resume, requirement.evidence)
    if (evidenceVerified && onlyInSkillsList(resume, requirement.evidence)) {
      return {
        ...requirement,
        coverage: 'missing',
        evidenceVerified: false,
        note: 'You name this, but no work backs it up.',
      }
    }
    if (evidenceVerified) return { ...requirement, evidenceVerified }
    const coverage = downgrade(requirement.coverage)
    return {
      ...requirement,
      coverage,
      evidenceVerified: false,
      note:
        coverage === 'missing'
          ? 'You name this, but no work backs it up.'
          : 'The line meant to back this up isn’t in your resume, so it scores lower.',
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
    return missingRequired.length === 0
      ? 'A workable match. What is missing sits in the nice to haves, not the requirements.'
      : `A workable match. Closing ${missingRequired.length} required item${missingRequired.length === 1 ? '' : 's'} would move it the furthest.`
  }
  return 'This resume doesn’t show the core requirements for the role yet.'
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

const PREFERRED_HEADING =
  /\b(?:nice[- ]to[- ]haves?|preferred|bonus|desirable|good to have|extra credit)\b/i
const PREFERRED_INLINE = /\b(?:is|are) a plus\b|\(a plus\)|\bnice[- ]to[- ]have\b|\bbonus\b/i

function isHeading(line: string) {
  const words = line.trim().split(/\s+/).filter(Boolean)
  const text = line.trim()
  return words.length > 0 && words.length <= 7 && !NOT_A_PHRASE.test(text)
}

function lineImportances(jobDescription: string) {
  let mode: Importance = 'required'
  return jobDescription
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (isHeading(line)) {
        mode = PREFERRED_HEADING.test(line) ? 'preferred' : 'required'
        return { text: normalize(line), importance: mode }
      }
      const importance: Importance = PREFERRED_INLINE.test(line) ? 'preferred' : mode
      return { text: normalize(line), importance }
    })
}

const RESUME_SECTION =
  /^\s*(?:(?:work|professional|relevant|employment)\s+)?(?:experience|employment|work history|career history)\b|^\s*(?:education|academic background|qualifications)\b|^\s*(?:(?:technical|core|key)\s+)?(?:skills|competencies|technologies|tools|tech stack|proficiencies)\b|^\s*(?:projects|selected projects|personal projects|certifications?|licen[sc]es|awards|summary|profile|objective|about me|languages|interests)\b/i
const SKILLS_HEADING =
  /^\s*(?:(?:technical|core|key)\s+)?(?:skills|competencies|technologies|tools|tech stack|proficiencies)\b/i

function resumeLines(resume: string) {
  let inSkills = false
  return resume
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (RESUME_SECTION.test(line) && isHeading(line)) {
        inSkills = SKILLS_HEADING.test(line)
        return { text: '', skills: false }
      }
      return { text: normalize(line), skills: inSkills }
    })
}

export function keywordRequirements(resume: string, jobDescription: string): Requirement[] {
  const postingLines = lineImportances(jobDescription)
  const resumeText = resumeLines(resume)
  const mentions = (lines: Array<{ text: string }>, skill: string) =>
    termWithAliases(skill).some((term) => lines.some((line) => containsTerm(line.text, term)))

  const found = SKILLS.filter((skill) => mentions(postingLines, skill)).map((skill) => {
    const asked = postingLines.filter((line) =>
      termWithAliases(skill).some((term) => containsTerm(line.text, term)),
    )
    const importance: Importance = asked.some((line) => line.importance === 'required')
      ? 'required'
      : 'preferred'
    const normalizedJob = normalize(jobDescription)
    const position = Math.min(
      ...termWithAliases(skill)
        .map((term) => termIndex(normalizedJob, term))
        .filter((index) => index >= 0),
    )
    return { skill, importance, position }
  })

  return found
    .sort((a, b) => a.position - b.position)
    .map(({ skill, importance }) => {
      const inExperience = mentions(
        resumeText.filter((line) => !line.skills),
        skill,
      )
      const inSkillsOnly = !inExperience && mentions(resumeText, skill)
      const coverage: Coverage = inExperience ? 'strong' : 'missing'
      const note = inExperience
        ? 'This word appears in your experience. A model review would also check the work behind it.'
        : inSkillsOnly
          ? 'This word only appears in your skills list. Add a bullet that shows the work.'
          : 'The posting uses this word. Your resume doesn’t.'
      return {
        id: `keyword-${skill.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        label: skill,
        category: 'skill' as const,
        importance,
        coverage,
        evidence: inSkillsOnly ? skill : null,
        evidenceVerified: false,
        note,
      }
    })
}

export function addsUnsupportedNumber(original: string, rewrite: string) {
  const pattern = /\d+(?:[.,]\d+)?%?/g
  const originalNumbers = new Set(original.match(pattern) ?? [])
  return (rewrite.match(pattern) ?? []).some((number) => !originalNumbers.has(number))
}

const FILLER = new Set(
  'a an and as at by for from in into of on or the to with its their his her our your this that these those it is was were be been being than then so also while across over under per via within without up out'.split(
    ' ',
  ),
)

function stem(word: string) {
  return word.replace(/(?:ations?|ings?|ed|es|s)$/, '')
}

function sameWord(a: string, b: string) {
  const left = stem(a)
  const right = stem(b)
  if (left === right) return true
  const shortest = Math.min(left.length, right.length)
  return shortest >= 3 && (left.startsWith(right) || right.startsWith(left))
}

export function addedContentWords(original: string, rewrite: string) {
  const tokens = (value: string) => value.toLowerCase().match(/[a-z][a-z'-]*/g) ?? []
  const before = tokens(original)
  const [, ...after] = tokens(rewrite)
  return after.filter(
    (word) => !FILLER.has(word) && !before.some((existing) => sameWord(existing, word)),
  )
}

export const MAX_ADDED_WORDS = 2
