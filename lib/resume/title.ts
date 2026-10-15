import type { TitleCheck, TitleVerdict } from './types'
import { BULLET_LINE } from './bullets'

const ROLE =
  /\b(?:engineer|developer|designer|manager|analyst|scientist|architect|consultant|specialist|administrator|coordinator|director|officer|assistant|technician|accountant|nurse|teacher|recruiter|marketer|writer|editor|strategist|representative|executive|programmer|tester|researcher|producer|owner|advisor|planner|buyer|pharmacist|paralegal|lawyer|counsel)\b/i

const LEVEL =
  /\b(?:senior|sr|junior|jr|lead|principal|staff|head|chief|associate|intern|trainee|graduate|ii|iii|iv)\b/gi

export const SECTION_END =
  /^\s*(?:education|skills|technical skills|projects|certifications?|awards|references|languages|interests|publications)\b/i
export const EXPERIENCE =
  /^\s*(?:work\s+|professional\s+|relevant\s+|employment\s+)?(?:experience|employment|work history|career history)\b/i
export const BULLET = BULLET_LINE
// Headings of sections that never hold job titles, for resumes with no Experience section.
const OTHER_SECTION =
  /^\s*(?:education|(?:technical\s+|personal\s+|key\s+|core\s+)?skills|tools(?:\s+used)?|technologies|projects|certifications?|courses|training|awards|achievements|references|languages|interests|hobbies|publications|objective|summary|profile|about me|extra[\s-]*cirr?icular(?:\s+activities)?)\s*:?\s*$/i
const SEPARATORS = /\s*(?:,|\||—|–|\s-\s|@|\bat\b|\()\s*/i
const LABEL = /^\s*(?:job\s+title|title|position|role)\s*[:-]\s*/i

export function words(value: string) {
  return value.split(/\s+/).filter(Boolean)
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#/\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function core(title: string) {
  return normalize(title.replace(LEVEL, ' '))
}

function level(title: string) {
  const found = title.match(LEVEL)?.[0].toLowerCase()
  return found === 'sr' ? 'senior' : found === 'jr' ? 'junior' : (found ?? null)
}

function titleFrom(line: string) {
  const cleaned = line.replace(LABEL, '').trim()
  if (cleaned.length === 0 || /[.!?]$/.test(cleaned)) return null
  const segment = cleaned.split(SEPARATORS).find((part) => ROLE.test(part))
  if (!segment) return null
  const title = segment.replace(/[)(]/g, '').trim()
  return words(title).length <= 8 ? title : null
}

export function postingTitle(posting: string) {
  const lines = posting
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const labelled = lines.find((line) => LABEL.test(line))
  if (labelled) {
    const title = titleFrom(labelled)
    if (title) return title
  }

  for (const line of lines.slice(0, 4)) {
    if (words(line).length > 9) continue
    const title = titleFrom(line)
    if (title) return title
  }
  return null
}

export function resumeTitles(resume: string) {
  const lines = resume.split(/\r?\n/).map((line) => line.trim())
  const start = lines.findIndex((line) => EXPERIENCE.test(line))

  let scope = lines
  if (start >= 0) {
    const rest = lines.slice(start + 1)
    const end = rest.findIndex((line) => SECTION_END.test(line))
    scope = end >= 0 ? rest.slice(0, end) : rest
  }

  const titles: string[] = []
  let elsewhere = false
  for (const line of scope) {
    if (start < 0 && OTHER_SECTION.test(line)) elsewhere = true
    if (elsewhere || !line || BULLET.test(line) || words(line).length > 16) continue
    const title = titleFrom(line)
    if (title && !titles.includes(title)) titles.push(title)
  }
  return titles
}

function overlap(a: string, b: string) {
  const left = new Set(words(a))
  const right = words(b)
  if (right.length === 0) return 0
  return right.filter((word) => left.has(word)).length / right.length
}

function shareRoleNoun(a: string, b: string) {
  const noun = (value: string) => value.match(ROLE)?.[0].toLowerCase()
  return noun(a) !== undefined && noun(a) === noun(b)
}

export function checkTitle(resume: string, posting: string): TitleCheck | null {
  const wanted = postingTitle(posting)
  if (!wanted) return null

  const wantedCore = core(wanted)
  if (wantedCore.length === 0) return null

  const titles = resumeTitles(resume)
  const latest = titles[0] ?? null
  const titleCores = titles.map(core)

  const phrase = new RegExp(
    `(?<![a-z0-9])${wantedCore.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9])`,
  )
  const inTitles = titleCores.some((candidate) => phrase.test(candidate))
  const anywhere = phrase.test(normalize(resume))

  let verdict: TitleVerdict
  if (inTitles) verdict = 'match'
  else if (anywhere) verdict = 'headline'
  else if (
    titleCores.some(
      (candidate) => shareRoleNoun(candidate, wantedCore) || overlap(candidate, wantedCore) >= 0.5,
    )
  ) {
    verdict = 'close'
  } else verdict = 'different'

  const wantedLevel = level(wanted)
  const latestLevel = latest ? level(latest) : null
  const levelGap = wantedLevel !== null && latest !== null && wantedLevel !== latestLevel

  return { posting: wanted, postingLevel: wantedLevel, latest, verdict, levelGap }
}
