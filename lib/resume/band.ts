import type { MatchReport } from './types'

export type Band = { label: string; tone: 'strong' | 'partial' | 'weak' }

export function matchBand(score: number): Band {
  if (score >= 80) return { label: 'Strong match', tone: 'strong' }
  if (score >= 55) return { label: 'Partial match', tone: 'partial' }
  return { label: 'Weak match', tone: 'weak' }
}

export type Tally = { proven: number; partial: number; total: number }

export function tally(match: MatchReport, importance: 'required' | 'preferred'): Tally {
  const items = match.requirements.filter((item) => item.importance === importance)
  return {
    proven: items.filter((item) => item.coverage === 'strong').length,
    partial: items.filter((item) => item.coverage === 'partial').length,
    total: items.length,
  }
}
