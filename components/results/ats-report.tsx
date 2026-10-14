import { Check, X } from 'lucide-react'
import type { AtsReport as AtsReportData } from '@/lib/resume/types'

export function AtsReport({ ats }: { ats: AtsReportData }) {
  if (ats.checks.length === 0) return null

  return (
    <section id="parser" className="scroll-mt-28">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-xl font-semibold tracking-[-0.03em]">Can software read your resume?</h2>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium tabular-nums text-foreground">{ats.score}</span> / 100
        </p>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Applicant tracking software parses your file before a person sees it. These checks show what
        it can pick out.
      </p>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full rounded-full bg-primary" style={{ width: `${ats.score}%` }} />
      </div>
      <ul className="mt-5 grid gap-x-8 sm:grid-cols-2">
        {ats.checks.map((check) => (
          <li key={check.id} className="flex items-start gap-3 border-b border-border py-4 text-sm">
            <span
              className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${check.passed ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`}
            >
              {check.passed ? (
                <Check className="size-3" aria-hidden="true" />
              ) : (
                <X className="size-3" aria-hidden="true" />
              )}
              <span className="sr-only">{check.passed ? 'Passed' : 'Needs attention'}</span>
            </span>
            <div className="min-w-0">
              <p className="font-medium">{check.label}</p>
              <p className="mt-1 leading-6 text-muted-foreground">{check.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
