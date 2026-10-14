import type { Analysis, Requirement } from './types'

export type PriorityKind = 'show' | 'clarify' | 'add' | 'format' | 'title'

export type PriorityAction = {
  id: string
  kind: PriorityKind
  title: string
  detail: string
  starter?: string
}

const MAX_ACTIONS = 5

const PARSER_TITLES: Record<string, string> = {
  contact: 'Contact details are incomplete',
  sections: 'Section headings are missing',
  bullets: 'Too few bulleted achievements',
  length: 'The length is working against you',
  density: 'One block is a wall of text',
  signals: 'Dates or profile links are missing',
}

function unproven(item: Requirement) {
  return item.coverage === 'missing' && item.evidence !== null
}

function absent(item: Requirement) {
  return item.coverage === 'missing' && item.evidence === null
}

function partial(item: Requirement) {
  return item.coverage === 'partial'
}

function rank(requirements: Requirement[]) {
  const required = requirements.filter((item) => item.importance === 'required')
  const preferred = requirements.filter((item) => item.importance === 'preferred')

  return [
    ...required.filter(unproven),
    ...required.filter(absent),
    ...required.filter(partial),
    ...preferred.filter(unproven),
    ...preferred.filter(absent),
  ]
}

function describe(item: Requirement): PriorityAction {
  if (unproven(item)) {
    return {
      id: `show-${item.id}`,
      kind: 'show',
      title: `Show where you used ${item.label}`,
      detail:
        'You already name this, so it only needs one bullet describing the work behind it. That turns a gap into a match without changing anything you have done.',
      starter: `[What you built or did] with ${item.label}, which [result].`,
    }
  }
  if (partial(item)) {
    return {
      id: `clarify-${item.id}`,
      kind: 'clarify',
      title: `Make ${item.label} unmistakable`,
      detail: `${item.note} Use the posting’s own wording in the bullet that already shows it, so a keyword search finds it.`,
    }
  }
  return {
    id: `add-${item.id}`,
    kind: 'add',
    title: `${item.label} is not in your resume`,
    detail:
      item.importance === 'required'
        ? 'The posting asks for this outright. Add it if you have done it, and if you have not, expect to be asked about it.'
        : 'Listed as nice to have. Worth adding if you have it, and safe to leave if you do not.',
    starter: `[What you built or did] with ${item.label}, which [result]. Only add this if it is true.`,
  }
}

function titleAction(analysis: Analysis): PriorityAction[] {
  const check = analysis.title
  if (!check || check.verdict === 'match') return []

  const latest = check.latest ? `Your latest title is “${check.latest}”. ` : ''
  const detail: Record<'headline' | 'close' | 'different', string> = {
    headline: `${latest}The posting’s title appears in your resume, but not in any job title. Recruiters read titles first, so if it describes what you did, add it beside your official one.`,
    close: `${latest}It’s close to “${check.posting}” but not the same words. If the work was the same, echo the posting’s wording beside your official title.`,
    different: `${latest}None of your job titles resemble “${check.posting}”. If you’re changing direction, say so in your summary so a quick skim makes sense.`,
  }
  return [
    {
      id: 'title',
      kind: 'title',
      title: 'Your job title doesn’t echo the posting',
      detail: `${detail[check.verdict]} Only use a title that is true.`,
    },
  ]
}

export function buildPriorities(analysis: Analysis): PriorityAction[] {
  const fromRequirements = rank(analysis.match.requirements).map(describe)

  const failedChecks = analysis.ats.checks
    .filter((check) => !check.passed)
    .map((check) => ({
      id: `parser-${check.id}`,
      kind: 'format' as const,
      title: PARSER_TITLES[check.id] ?? check.label,
      detail: `${check.detail} Software reads this before a person does, so it is a quick win.`,
    }))

  const requiredCount = analysis.match.requirements.filter(
    (item) => item.importance === 'required' && item.coverage !== 'strong',
  ).length

  const ordered = [
    ...fromRequirements.slice(0, requiredCount),
    ...titleAction(analysis),
    ...failedChecks,
    ...fromRequirements.slice(requiredCount),
  ]

  return ordered.slice(0, MAX_ACTIONS)
}
