import type { Analysis, Requirement } from './types'

export type PriorityAction = {
  id: string
  title: string
  detail: string
}

const MAX_ACTIONS = 5

function unproven(item: Requirement) {
  return item.coverage === 'missing' && item.evidence !== null
}

function absent(item: Requirement) {
  return item.coverage === 'missing' && item.evidence === null
}

function rank(requirements: Requirement[]) {
  const required = requirements.filter((item) => item.importance === 'required')
  const preferred = requirements.filter((item) => item.importance === 'preferred')

  return [
    ...required.filter(unproven),
    ...required.filter(absent),
    ...preferred.filter(unproven),
    ...preferred.filter(absent),
  ]
}

function describe(item: Requirement): PriorityAction {
  if (unproven(item)) {
    return {
      id: `show-${item.id}`,
      title: `Show where you used ${item.label}`,
      detail:
        'You already name this, so it only needs one bullet describing the work behind it. That turns a gap into a match without changing anything you have done.',
    }
  }
  return {
    id: `add-${item.id}`,
    title: `${item.label} is not in your resume`,
    detail:
      item.importance === 'required'
        ? 'The posting asks for this outright. Add it if you have done it, and if you have not, expect to be asked about it.'
        : 'Listed as nice to have. Worth adding if you have it, and safe to leave if you do not.',
  }
}

export function buildPriorities(analysis: Analysis): PriorityAction[] {
  const fromRequirements = rank(analysis.match.requirements).map(describe)

  const failedChecks = analysis.ats.checks
    .filter((check) => !check.passed)
    .map((check) => ({
      id: `parser-${check.id}`,
      title: check.label.replace(/^The /, '').replace(/^\w/, (c) => c.toUpperCase()),
      detail: `${check.detail} Software reads this before a person does, so it is a quick win.`,
    }))

  const requiredCount = analysis.match.requirements.filter(
    (item) => item.importance === 'required' && item.coverage === 'missing',
  ).length

  const ordered = [
    ...fromRequirements.slice(0, requiredCount),
    ...failedChecks,
    ...fromRequirements.slice(requiredCount),
  ]

  return ordered.slice(0, MAX_ACTIONS)
}
