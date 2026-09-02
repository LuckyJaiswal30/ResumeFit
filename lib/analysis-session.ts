import type { Analysis } from '@/lib/resume/types'

export type AnalysisSession = {
  analysis: Analysis
  fileName: string
  completedAt: number
  isSample?: boolean
}

const STORAGE_KEY = 'resumefit:last-analysis'

export function storeAnalysisSession(session: AnalysisSession) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    return
  }
}

let snapshot: { raw: string | null; session: AnalysisSession | null } = {
  raw: null,
  session: null,
}

function parse(raw: string): AnalysisSession | null {
  try {
    const parsed = JSON.parse(raw) as AnalysisSession
    return parsed.analysis?.match ? parsed : null
  } catch {
    return null
  }
}

function storedValue(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function readAnalysisSession(): AnalysisSession | null {
  const raw = storedValue()

  if (raw !== snapshot.raw) {
    snapshot = { raw, session: raw ? parse(raw) : null }
  }
  return snapshot.session
}

export function subscribeToAnalysisSession(onChange: () => void) {
  window.addEventListener('storage', onChange)
  return () => window.removeEventListener('storage', onChange)
}
