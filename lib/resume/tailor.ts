import { containsTerm, normalize, termWithAliases } from './match'
import { BULLET, EXPERIENCE, SECTION_END, words } from './title'
import type { Analysis, BulletPlacement, PostingPriority, Requirement, Tailoring } from './types'

const TOP = 5
export const BURIED_POSITION = 3
const SKILLS_HEADING =
  /^\s*(?:(?:technical|core|key)\s+)?(?:skills|competencies|technologies|tools|tech stack|proficiencies)\b/i
const ANY_HEADING =
  /^\s*(?:experience|education|projects|certifications?|summary|profile|awards|languages|interests)\b/i

type Job = { header: string; bullets: string[] }

function parseJobs(resume: string): Job[] {
  const lines = resume.split(/\r?\n/).map((line) => line.trim())
  const start = lines.findIndex((line) => EXPERIENCE.test(line))
  let scope = lines
  if (start >= 0) {
    const rest = lines.slice(start + 1)
    const end = rest.findIndex((line) => SECTION_END.test(line))
    scope = end >= 0 ? rest.slice(0, end) : rest
  }

  const jobs: Job[] = []
  for (const line of scope) {
    if (!line) continue
    if (BULLET.test(line)) {
      if (jobs.length === 0) jobs.push({ header: 'Your experience', bullets: [] })
      jobs[jobs.length - 1].bullets.push(line.replace(BULLET, '').trim())
    } else if (words(line).length <= 16) {
      jobs.push({ header: line.split('|')[0].trim(), bullets: [] })
    }
  }
  return jobs.filter((job) => job.bullets.length > 0)
}

function labelTerms(label: string) {
  const parts = label.split(/\s*(?:,|&|\band\b)\s*/i).filter(Boolean)
  const terms = new Set<string>()
  for (const part of parts) {
    for (const term of termWithAliases(part)) terms.add(term)
  }
  return [...terms]
}

function findPlacement(jobs: Job[], requirement: Requirement): BulletPlacement | null {
  const quote =
    requirement.evidenceVerified && requirement.evidence ? normalize(requirement.evidence) : null
  const terms = labelTerms(requirement.label)

  for (const [jobIndex, job] of jobs.entries()) {
    const index = job.bullets.findIndex((bullet) => {
      const text = normalize(bullet)
      return quote
        ? text.includes(quote) || quote.includes(text)
        : terms.some((term) => containsTerm(text, term))
    })
    if (index >= 0) {
      return {
        role: job.header,
        bullet: job.bullets[index],
        position: index + 1,
        total: job.bullets.length,
        older: jobIndex > 0,
      }
    }
  }
  return null
}

function skillsLine(resume: string) {
  const lines = resume.split(/\r?\n/).map((line) => line.trim())
  const start = lines.findIndex((line) => SKILLS_HEADING.test(line) && words(line).length <= 4)
  if (start < 0) return null

  for (const line of lines.slice(start + 1)) {
    if (!line) continue
    if (ANY_HEADING.test(line) && words(line).length <= 4) return null
    const [prefix, list] = /^[A-Za-z &/]{2,25}:\s*/.test(line)
      ? [line.match(/^[A-Za-z &/]{2,25}:\s*/)![0], line.replace(/^[A-Za-z &/]{2,25}:\s*/, '')]
      : ['', line]
    const items = list.split(/\s*[,;|·•]\s*/).filter(Boolean)
    if (items.length >= 3) return { prefix, items }
  }
  return null
}

function reorderSkills(resume: string, proven: Requirement[]) {
  const line = skillsLine(resume)
  if (!line) return null

  const wanted = proven.flatMap((requirement) => labelTerms(requirement.label))
  const rank = (item: string) => {
    const text = normalize(item)
    const index = wanted.findIndex((term) => containsTerm(text, term))
    return index >= 0 ? index : Number.POSITIVE_INFINITY
  }

  const suggested = line.items
    .map((item, order) => ({ item, order, rank: rank(item) }))
    .sort((a, b) => a.rank - b.rank || a.order - b.order)
    .map(({ item }) => item)

  const changed = suggested.some((item, index) => item !== line.items[index])
  return changed ? { current: line.items, suggested, prefix: line.prefix } : null
}

function listOf(items: string[]) {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

export function buildTailoring(analysis: Analysis, resume: string): Tailoring | null {
  const requirements = analysis.match.requirements
  if (requirements.length === 0) return null

  const ranked = [...requirements]
    .map((requirement, index) => ({ requirement, index }))
    .sort(
      (a, b) =>
        Number(b.requirement.importance === 'required') -
          Number(a.requirement.importance === 'required') || a.index - b.index,
    )
    .map(({ requirement }) => requirement)

  const jobs = parseJobs(resume)
  const priorities: PostingPriority[] = ranked.slice(0, TOP).map((requirement) => ({
    label: requirement.label,
    importance: requirement.importance,
    coverage: requirement.coverage,
    placement: requirement.coverage === 'strong' ? findPlacement(jobs, requirement) : null,
  }))

  const proven = ranked.filter((requirement) => requirement.coverage === 'strong')
  const opener =
    proven.length >= 2
      ? `${analysis.title?.latest ?? '[Your title]'} focused on ${listOf(
          proven.slice(0, 3).map((requirement) => requirement.label),
        )}.`
      : null

  return {
    priorities,
    opener,
    skills: reorderSkills(resume, proven),
  }
}
