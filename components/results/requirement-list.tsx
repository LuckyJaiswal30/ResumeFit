import { Check, CircleAlert, CircleDashed } from 'lucide-react'
import type { Requirement } from '@/lib/resume/types'

const ICONS = {
  strong: { Glyph: Check, tone: 'text-success' },
  partial: { Glyph: CircleDashed, tone: 'text-warning' },
  missing: { Glyph: CircleAlert, tone: 'text-warning' },
} as const

export function RequirementList({
  title,
  description,
  requirements,
}: {
  title: string
  description: string
  requirements: Requirement[]
}) {
  if (requirements.length === 0) return null

  return (
    <section>
      <h2 className="text-xl font-semibold tracking-[-0.03em]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      <ul className="mt-6 flex flex-col gap-3">
        {requirements.map((requirement) => {
          const { Glyph, tone } = ICONS[requirement.coverage]
          return (
            <li key={requirement.id} className="rounded-lg border border-border p-4 text-sm">
              <div className="flex items-start gap-3">
                <Glyph className={`mt-0.5 size-4 shrink-0 ${tone}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-medium">{requirement.label}</span>
                    {requirement.importance === 'preferred' && (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        nice to have
                      </span>
                    )}
                  </div>
                  {requirement.note && (
                    <p className="mt-1.5 leading-6 text-muted-foreground">{requirement.note}</p>
                  )}
                  {requirement.evidence && requirement.evidenceVerified && (
                    <blockquote className="mt-3 border-l-2 border-border pl-3 leading-6 text-muted-foreground">
                      {requirement.evidence}
                    </blockquote>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
