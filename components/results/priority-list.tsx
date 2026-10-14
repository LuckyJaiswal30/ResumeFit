'use client'

import { CopyButton } from '@/components/results/copy-button'
import type { PriorityAction, PriorityKind } from '@/lib/resume/priorities'

const TAGS: Record<PriorityKind, string> = {
  show: 'Add one bullet',
  clarify: 'Reword a bullet',
  add: 'Only if it’s true',
  format: 'Quick fix',
  title: 'Check your title',
}

export function PriorityList({ actions }: { actions: PriorityAction[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
      <h2 className="text-base font-semibold">Fix this before you apply</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {actions.length > 0
          ? 'In order, biggest improvement for the least work first.'
          : 'Nothing outstanding. Your resume covers what the posting asks for.'}
      </p>
      {actions.length > 0 && (
        <ol className="mt-5 flex flex-col divide-y divide-border">
          {actions.map((action, index) => (
            <li key={action.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold tabular-nums text-primary-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-6">{action.title}</p>
                  <p className="text-xs text-muted-foreground">{TAGS[action.kind]}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{action.detail}</p>
                  {action.starter && (
                    <div className="mt-3 rounded-lg bg-muted p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">A way to start it</p>
                        <CopyButton value={action.starter} label="Copy the starter wording" />
                      </div>
                      <p className="mt-1.5 text-sm leading-6">{action.starter}</p>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
