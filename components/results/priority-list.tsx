'use client'

import { ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'
import type { PriorityAction } from '@/lib/resume/priorities'

export function PriorityList({ actions }: { actions: PriorityAction[] }) {
  const [open, setOpen] = useState(0)
  const panelId = useId()

  return (
    <div className="sticky top-8 rounded-xl border border-border bg-card p-5">
      <p className="text-sm font-medium">Fix this first</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {actions.length > 0
          ? 'Ordered by what moves the score for the least work.'
          : 'Nothing outstanding. Your resume covers what the posting asks for.'}
      </p>
      {actions.length > 0 && (
        <div className="mt-5 flex flex-col divide-y divide-border">
          {actions.map((action, index) => (
            <div key={action.id} className="py-4 first:pt-0 last:pb-0">
              <button
                type="button"
                onClick={() => setOpen(open === index ? -1 : index)}
                aria-expanded={open === index}
                aria-controls={`${panelId}-${index}`}
                className="flex w-full items-center justify-between gap-3 rounded-sm text-left text-sm font-semibold outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
              >
                <span className="flex items-start gap-3">
                  <span className="font-mono text-muted-foreground">{index + 1}</span>
                  {action.title}
                </span>
                <ChevronDown
                  className={`size-4 shrink-0 text-muted-foreground transition-transform ${open === index ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
              <div id={`${panelId}-${index}`} hidden={open !== index}>
                <p className="mt-3 pl-6 text-sm leading-6 text-muted-foreground">{action.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
