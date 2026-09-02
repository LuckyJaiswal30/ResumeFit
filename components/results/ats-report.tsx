import { Check, X } from 'lucide-react'
import type { AtsReport as AtsReportData } from '@/lib/resume/types'

export function AtsReport({ ats }: { ats: AtsReportData }) {
  if (ats.checks.length === 0) return null

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-xl font-semibold tracking-[-0.03em]">How it reads to a parser</h2>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{ats.score}</span> / 100
        </p>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Software reads your resume before a person does.
      </p>
      <ul className="mt-6 flex flex-col gap-3">
        {ats.checks.map((check) => (
          <li
            key={check.id}
            className="flex items-start gap-3 rounded-lg border border-border p-4 text-sm"
          >
            {check.passed ? (
              <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <X className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            )}
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
