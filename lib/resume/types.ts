export type Priority = 'high' | 'medium' | 'low'

export type Importance = 'required' | 'preferred'

export type Coverage = 'strong' | 'partial' | 'missing'

export type Requirement = {
  id: string
  label: string
  category: 'skill' | 'experience' | 'qualification'
  importance: Importance
  coverage: Coverage
  evidence: string | null
  evidenceVerified: boolean
  note: string
}

export type Finding = {
  id: string
  title: string
  detail: string
  priority: Priority
}

export type PhrasingGap = {
  id: string
  yours: string
  posting: string
  note: string
}

export type BulletRewrite = {
  original: string
  rewrite: string
  reason: string
}

export type AtsReport = {
  score: number
  checks: Array<{
    id: string
    label: string
    passed: boolean
    detail: string
  }>
}

export type MatchReport = {
  score: number
  breakdown: Array<{ label: string; score: number; weight: number }>
  requirements: Requirement[]
  summary: string
}

export type AnalysisSource = 'ai' | 'keyword'

export type TitleVerdict = 'match' | 'headline' | 'close' | 'different'

export type TitleCheck = {
  posting: string
  postingLevel: string | null
  latest: string | null
  verdict: TitleVerdict
  levelGap: boolean
}

export type BulletPlacement = {
  role: string
  bullet: string
  position: number
  total: number
  older: boolean
}

export type PostingPriority = {
  label: string
  importance: Importance
  coverage: Coverage
  placement: BulletPlacement | null
}

export type Tailoring = {
  priorities: PostingPriority[]
  opener: string | null
  skills: { current: string[]; suggested: string[]; prefix: string } | null
}

export type Analysis = {
  source: AnalysisSource
  model: string | null
  aiError: string | null
  match: MatchReport
  ats: AtsReport
  findings: Finding[]
  phrasing: PhrasingGap[]
  rewrites: BulletRewrite[]
  title?: TitleCheck | null
  tailoring?: Tailoring | null
}
