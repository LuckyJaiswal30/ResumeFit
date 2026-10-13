import { hasPhoneNumber } from './contact'

export type ResumeCheck = {
  ok: boolean
  score: number
  found: string[]
  missing: string[]
}

const PASS_MARK = 6
const MIN_WORDS = 30

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
const PROFILE = /(?:linkedin\.com|github\.com|gitlab\.com|behance\.net|dribbble\.com|portfolio)/i

const DATE_RANGE = new RegExp(
  [
    String.raw`\b(?:19|20)\d{2}\s*(?:-|–|—|to)\s*(?:(?:19|20)\d{2}|present|current|now)\b`,
    String.raw`\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(?:19|20)\d{2}\s*(?:-|–|—|to)\s*`,
  ].join('|'),
  'i',
)

const SECTIONS = [
  /^\s*(?:work\s+|professional\s+|relevant\s+|employment\s+)?(?:experience|employment|work history|career history)\b/im,
  /^\s*(?:education|academic background|academic history|qualifications)\b/im,
  /^\s*(?:technical\s+|core\s+|key\s+)?(?:skills|competencies|technologies|proficiencies)\b/im,
  /^\s*(?:projects|selected projects|personal projects|portfolio)\b/im,
  /^\s*(?:certifications?|licen[sc]es|accreditations)\b/im,
  /^\s*(?:summary|profile|objective|about me)\b/im,
]

const ACTION_VERBS =
  /\b(?:led|built|developed|designed|implemented|managed|mentored|delivered|owned|migrated|launched|shipped|improved|reduced|increased|created|maintained|architected|coordinated)\b/gi

const BULLET = /^\s*(?:[-*•▪◦‣·]|\d+[.)])\s+\S/gm

const OTHER_DOCUMENT = [
  {
    label: 'an invoice or receipt',
    pattern:
      /\b(?:invoice\s*(?:number|no|date|#)|amount\s+due|total\s+due|subtotal|remittance|sort\s+code|purchase\s+order|bill\s+to|vat\s+at|payment\s+terms)\b/i,
  },
  {
    label: 'a recipe',
    pattern:
      /\b(?:ingredients|preheat|tablespoons?|teaspoons?|finely\s+chopped|serves\s+\d|simmer|until\s+golden)\b/i,
  },
  {
    label: 'a contract or terms document',
    pattern:
      /\b(?:terms\s+and\s+conditions|hereinafter|the\s+parties|shall\s+be\s+deemed|governing\s+law|in\s+witness\s+whereof|privacy\s+policy)\b/i,
  },
  {
    label: 'an academic paper',
    pattern:
      /\b(?:abstract|et\s+al\.|we\s+propose|this\s+paper|literature\s+review|bibliography)\b/i,
  },
]

const POSTING_LANGUAGE = [
  /\b(?:we(?:’|')?re|we\s+are|is|are)\s+(?:now\s+)?(?:hiring|recruiting|looking\s+for|seeking)\b/i,
  /\b(?:about\s+(?:the\s+)?(?:role|job|company)|the\s+role|job\s+description)\b/i,
  /\b(?:you\s+will|you(?:’|')?ll)\s+(?:be|have|work|design|build|lead|own|help|join)\b/i,
  /^\s*(?:key\s+|core\s+)?responsibilities\s*:?\s*$/im,
  /\b(?:requirements|qualifications)\s*:/i,
  /\b(?:nice\s+to\s+have|apply\s+(?:now|today|at|here)|equal\s+opportunity|we\s+offer|benefits\s+include)\b/i,
]

function countMatches(text: string, pattern: RegExp) {
  return (text.match(pattern) ?? []).length
}

export function looksLikeResume(text: string): ResumeCheck {
  const found: string[] = []
  const missing: string[] = []
  let score = 0

  if (EMAIL.test(text)) {
    score += 2
    found.push('an email address')
  } else {
    missing.push('an email address')
  }

  if (hasPhoneNumber(text)) score += 1
  if (PROFILE.test(text)) score += 1

  const sections = SECTIONS.filter((pattern) => pattern.test(text)).length
  if (sections > 0) {
    score += Math.min(5, sections * 2)
    found.push(`${sections} resume section${sections === 1 ? '' : 's'}`)
  } else {
    missing.push('sections such as Experience, Education or Skills')
  }

  if (DATE_RANGE.test(text)) {
    score += 2
    found.push('dated work history')
  } else {
    missing.push('dated work history')
  }

  if (countMatches(text, BULLET) >= 3) score += 1
  if (new Set(text.match(ACTION_VERBS)?.map((verb) => verb.toLowerCase()) ?? []).size >= 3) {
    score += 1
  }

  const otherKind = OTHER_DOCUMENT.find((entry) => entry.pattern.test(text))
  if (otherKind) {
    score -= 5
    missing.push(`it reads more like ${otherKind.label}`)
  } else if (POSTING_LANGUAGE.filter((pattern) => pattern.test(text)).length >= 3) {
    score -= 5
    missing.push('it reads more like a job posting')
  }

  const words = text.split(/\s+/).filter(Boolean).length
  if (words < MIN_WORDS) missing.push('more than a few lines of content')

  return { ok: score >= PASS_MARK && words >= MIN_WORDS, score, found, missing }
}

export function resumeRejectionMessage(check: ResumeCheck) {
  const kind = check.missing.find((entry) => entry.startsWith('it reads more like'))
  const absent = check.missing.filter((entry) => entry !== kind).slice(0, kind ? 2 : 3)
  const parts = ['This doesn’t look like a resume.']
  if (kind) parts.push(`${kind[0].toUpperCase()}${kind.slice(1)}.`)
  if (absent.length > 0) parts.push(`There’s no sign of ${absent.join(', ')}.`)
  parts.push('Upload your CV, or save it as a .txt file if it didn’t read cleanly.')
  return parts.join(' ')
}
