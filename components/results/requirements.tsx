'use client'

import { Check, CircleAlert, CircleDashed, Minus } from 'lucide-react'
import { useState } from 'react'
import { requirementState, type RequirementState } from '@/lib/resume/state'
import type { AnalysisSource, Requirement } from '@/lib/resume/types'

const STATUS: Record<RequirementState, { label: string; Glyph: typeof Check; chip: string }> = {
  proven: { label: 'Proven', Glyph: Check, chip: 'bg-success/15 text-success' },
  partial: { label: 'Partly shown', Glyph: CircleDashed, chip: 'bg-success/10 text-success' },
  unproven: {
    label: 'Mentioned, not shown',
    Glyph: CircleAlert,
    chip: 'bg-warning/20 text-foreground',
  },
  absent: { label: 'Missing', Glyph: Minus, chip: 'bg-muted text-muted-foreground' },
}

function Group({
  title,
  items,
  source,
}: {
  title: string
  items: Requirement[]
  source: AnalysisSource
}) {
  if (items.length === 0) return null

  return (
    <div>
      <h3 className="text-base font-semibold">
        {title}{' '}
        <span className="font-normal tabular-nums text-muted-foreground">{items.length}</span>
      </h3>
      <ul className="mt-3 flex flex-col divide-y divide-border border-y border-border">
        {items.map((item) => {
          const state = requirementState(item)
          const { label, Glyph, chip } = STATUS[state]
          const statusLabel =
            source === 'keyword'
              ? (
                  {
                    proven: 'Found in your experience',
                    partial: 'Found',
                    unproven: 'Only in your skills list',
                    absent: 'Not found',
                  } as const
                )[state]
              : label
          return (
            <li key={item.id} className="py-5">
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                <h4 className="min-w-0 flex-1 text-base font-medium">{item.label}</h4>
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${chip}`}
                >
                  <Glyph className="size-3.5" aria-hidden="true" />
                  {statusLabel}
                </span>
              </div>
              {item.note && (
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{item.note}</p>
              )}
              {item.evidence && item.evidenceVerified && (
                <figure className="mt-3">
                  <blockquote className="text-sm leading-7">
                    <span className="marked">{item.evidence}</span>
                  </blockquote>
                  <figcaption className="mt-1.5 text-xs text-muted-foreground">
                    The line in your resume that shows it
                  </figcaption>
                </figure>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function Requirements({
  requirements,
  source,
}: {
  requirements: Requirement[]
  source: AnalysisSource
}) {
  const [filter, setFilter] = useState<'all' | 'gaps'>('all')
  const needsWork = requirements.filter((item) => requirementState(item) !== 'proven')
  const visible = filter === 'gaps' ? needsWork : requirements

  const options = [
    ['all', `Everything (${requirements.length})`],
    ['gaps', `Needs work (${needsWork.length})`],
  ] as const

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.03em]">The posting, point by point</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Each requirement from the job, and what your resume shows for it.
          </p>
        </div>
        <div
          role="group"
          aria-label="Filter requirements"
          className="flex rounded-lg bg-muted p-1 text-sm"
        >
          {options.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={`rounded-md px-3 py-1.5 outline-none transition-colors focus-visible:ring-4 focus-visible:ring-ring/30 ${filter === value ? 'bg-card font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="mt-6 rounded-xl bg-success/10 p-5 text-sm text-foreground">
          Nothing needs work. Every requirement is proven by a line in your resume.
        </p>
      ) : (
        <div className="mt-7 flex flex-col gap-9">
          <Group
            title="Must-haves"
            items={visible.filter((item) => item.importance === 'required')}
            source={source}
          />
          <Group
            title="Nice-to-haves"
            items={visible.filter((item) => item.importance === 'preferred')}
            source={source}
          />
        </div>
      )}
    </section>
  )
}
