import type { Requirement } from './types'

export type RequirementState = 'proven' | 'partial' | 'unproven' | 'absent'

export function requirementState(item: Requirement): RequirementState {
  if (item.coverage === 'strong') return 'proven'
  if (item.coverage === 'partial') return 'partial'
  return item.evidence === null ? 'absent' : 'unproven'
}
