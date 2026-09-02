export type ResumeCheck = {
  ok: boolean
  score: number
  found: string[]
  missing: string[]
}

const PASS_MARK = 6

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
const PHONE = /(?:\+?\d[\d().\-\s]{7,}\d)/
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

  if (PHONE.test(text)) score += 1
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
  }

  return { ok: score >= PASS_MARK, score, found, missing }
}

export function resumeRejectionMessage(check: ResumeCheck) {
  const reasons = check.missing.slice(0, 3).join(', ')
  return `This does not look like a resume. We could not find ${reasons}. Upload your CV, or paste the text if the file did not read cleanly.`
}
