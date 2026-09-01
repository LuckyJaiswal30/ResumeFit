import { Info } from 'lucide-react'
import type { Analysis } from '@/lib/resume/types'

export function AnalysisSourceNote({ analysis }: { analysis: Analysis }) {
  if (analysis.source === 'ai') return null

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-5 text-sm">
      <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div>
        <p className="font-medium">Matched on words alone</p>
        <p className="mt-1.5 leading-6 text-muted-foreground">
          {analysis.aiError
            ? `The review did not run because ${analysis.aiError}. This compares wording only, so there are no quotes or rewrites.`
            : 'No model is set up, so this compares wording only. There are no quotes or rewrites.'}
        </p>
      </div>
    </div>
  )
}
