import type { AtsReport } from './types'

const BULLET_PREFIX = /^(?:[-*•▪◦‣·]|\d+[.)])\s+/

const SECTION_PATTERNS = [
  {
    label: 'experience',
    pattern:
      /^\s*(?:work\s+|professional\s+|relevant\s+)?(?:experience|employment|work history)\b/im,
  },
  { label: 'education', pattern: /^\s*(?:education|academic background|qualifications)\b/im },
  {
    label: 'skills',
    pattern: /^\s*(?:technical\s+|core\s+)?(?:skills|competencies|technologies)\b/im,
  },
]

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
const PHONE = /(?:\+?\d[\d().\-\s]{7,}\d)/
const PROFILE_LINK =
  /(?:linkedin\.com|github\.com|gitlab\.com|behance\.net|dribbble\.com|https?:\/\/)/i
const YEAR = /\b(?:19|20)\d{2}\b/

export function extractBullets(resume: string) {
  return resume
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => BULLET_PREFIX.test(line))
    .map((line) => line.replace(BULLET_PREFIX, '').trim())
    .filter((line) => line.length >= 20)
}

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length
}

export function buildAtsReport(resume: string): AtsReport {
  const bullets = extractBullets(resume)
  const wordCount = countWords(resume)
  const foundSections = SECTION_PATTERNS.filter((section) => section.pattern.test(resume))
  const longestParagraph = Math.max(0, ...resume.split(/\n\s*\n/).map((block) => countWords(block)))

  const hasEmail = EMAIL.test(resume)
  const hasPhone = PHONE.test(resume)

  const checks = [
    {
      id: 'contact',
      label: 'Contact details are readable',
      weight: 20,
      passed: hasEmail && hasPhone,
      detail:
        hasEmail && hasPhone
          ? 'Found an email address and a phone number in real text.'
          : hasEmail
            ? 'Found an email address, but no phone number.'
            : hasPhone
              ? 'Found a phone number, but no email address.'
              : 'No email address or phone number turned up in the text.',
    },
    {
      id: 'sections',
      label: 'The usual section headings',
      weight: 20,
      passed: foundSections.length === SECTION_PATTERNS.length,
      detail:
        foundSections.length === SECTION_PATTERNS.length
          ? 'Experience, education and skills are all there.'
          : `Found ${foundSections.map((section) => section.label).join(', ') || 'none'}. Parsers look for experience, education, and skills.`,
    },
    {
      id: 'bullets',
      label: 'Bulleted achievements',
      weight: 20,
      passed: bullets.length >= 4,
      detail:
        bullets.length >= 4
          ? `${bullets.length} bullet points detected.`
          : `Only ${bullets.length} bullet point${bullets.length === 1 ? '' : 's'} detected. Bulleted lines come through more reliably than paragraphs.`,
    },
    {
      id: 'length',
      label: 'Length is in range',
      weight: 15,
      passed: wordCount >= 180 && wordCount <= 1100,
      detail:
        wordCount < 180
          ? `${wordCount} words is on the short side for a full application.`
          : wordCount > 1100
            ? `${wordCount} words is long enough that the good parts get buried.`
            : `${wordCount} words.`,
    },
    {
      id: 'density',
      label: 'No wall-of-text blocks',
      weight: 15,
      passed: longestParagraph <= 130,
      detail:
        longestParagraph <= 130
          ? 'Paragraph lengths are fine.'
          : `One block runs ${longestParagraph} words. Break it into bullets so it can be skimmed.`,
    },
    {
      id: 'signals',
      label: 'Dates and profile links',
      weight: 10,
      passed: YEAR.test(resume) && PROFILE_LINK.test(resume),
      detail:
        YEAR.test(resume) && PROFILE_LINK.test(resume)
          ? 'Employment years and at least one profile link are there.'
          : YEAR.test(resume)
            ? 'Employment years are there, but no LinkedIn, GitHub or portfolio link.'
            : 'No employment years turned up, which makes your timeline hard to place.',
    },
  ]

  const score = Math.round(
    checks.reduce((total, check) => total + (check.passed ? check.weight : 0), 0),
  )

  return {
    score,
    checks: checks.map(({ id, label, passed, detail }) => ({ id, label, passed, detail })),
  }
}
