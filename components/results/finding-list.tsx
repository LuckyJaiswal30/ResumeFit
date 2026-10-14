'use client'

import { ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'
import type { Finding } from '@/lib/resume/types'

const DOT = { high: 'bg-destructive', medium: 'bg-warning', low: 'bg-input' } as const

export function FindingList({ findings }: { findings: Finding[] }) {
  const [open, setOpen] = useState(0)
  const panelId = useId()

  return (
    <section id="notes" className="scroll-mt-28">
      <h2 className="text-xl font-semibold tracking-[-0.03em]">What the review flagged</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {findings.length > 0
          ? 'Notes from reading your resume against the posting.'
          : 'Nothing major to flag. Start with the gaps above.'}
      </p>
      {findings.length > 0 && (
        <div className="mt-5 flex flex-col divide-y divide-border">
          {findings.map((finding, index) => (
            <div key={finding.id} className="py-4 first:pt-0 last:pb-0">
              <button
                type="button"
                onClick={() => setOpen(open === index ? -1 : index)}
                aria-expanded={open === index}
                aria-controls={`${panelId}-${index}`}
                className="flex w-full items-center justify-between gap-3 rounded-sm text-left text-sm font-semibold outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
              >
                <span className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${DOT[finding.priority]}`}
                  />
                  <span>
                    {finding.title}
                    <span className="sr-only">, {finding.priority} priority</span>
                  </span>
                </span>
                <ChevronDown
                  className={`size-4 shrink-0 text-muted-foreground transition-transform ${open === index ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
              <div id={`${panelId}-${index}`} hidden={open !== index}>
                <p className="mt-3 pl-6 text-sm leading-6 text-muted-foreground">
                  {finding.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
