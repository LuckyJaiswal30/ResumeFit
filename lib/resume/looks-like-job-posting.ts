import { looksLikeResume } from './looks-like-resume'

export type PostingCheck = {
  ok: boolean
  reason: 'not-a-posting' | 'is-a-resume' | null
}

const POSTING_PHRASES = [
  /\b(?:we(?:’|')?re|we\s+are|is|are)\s+(?:now\s+)?(?:hiring|recruiting|looking\s+for|seeking)\b/i,
  /\b(?:about\s+(?:the\s+)?(?:role|job|company|team|us)|the\s+role|job\s+description|job\s+summary)\b/i,
  /\bwhat\s+you(?:’|')?ll\s+(?:do|bring|need)|what\s+you\s+will\s+(?:do|bring|need)\b/i,
  /\b(?:you\s+will|you(?:’|')?ll)\s+(?:be|have|work|design|build|lead|own|help|join|collaborate)\b/i,
  /\b(?:key\s+|core\s+|main\s+|your\s+)?responsibilities\b/i,
  /\b(?:minimum\s+|basic\s+|preferred\s+|required\s+)?(?:requirements|qualifications)\b/i,
  /\b(?:nice\s+to\s+have|bonus\s+points|a\s+plus)\b/i,
  /\b(?:benefits|perks|salary|compensation|we\s+offer|health\s+insurance|paid\s+time\s+off|holiday)\b/i,
  /\b(?:apply\s+(?:now|today|at|here|via|through)|how\s+to\s+apply|equal\s+opportunity|candidates?\s+(?:will|should|must)|ideal\s+candidate)\b/i,
  /\b(?:join\s+our|our\s+(?:team|mission|culture|client|customers?))\b/i,
]

const ASK_WORDS =
  /\b(?:required|preferred|must|ability\s+to|proven|strong|familiarity|proficiency)\b/gi

export function postingSignals(text: string) {
  return POSTING_PHRASES.filter((pattern) => pattern.test(text)).length
}

export function looksLikeJobPosting(text: string): PostingCheck {
  const signals = postingSignals(text)
  const asks = (text.match(ASK_WORDS) ?? []).length

  if (signals >= 2 || (signals >= 1 && asks >= 3)) return { ok: true, reason: null }

  const resume = looksLikeResume(text)
  return { ok: false, reason: resume.ok ? 'is-a-resume' : 'not-a-posting' }
}

export function postingRejectionMessage(check: PostingCheck) {
  if (check.reason === 'is-a-resume') {
    return 'That looks like a resume, not a job posting. Paste the posting you’re applying to in this box.'
  }
  return 'That doesn’t look like a job posting. Paste the full description, with the requirements and responsibilities.'
}
