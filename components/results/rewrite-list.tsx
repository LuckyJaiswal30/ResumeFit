import { Fragment } from 'react'
import { CopyButton } from '@/components/results/copy-button'
import { wordDiff, type DiffPart } from '@/lib/resume/diff'
import type { BulletRewrite } from '@/lib/resume/types'

function Words({ parts, changed }: { parts: DiffPart[]; changed: string }) {
  let offset = 0
  return parts.map((part) => {
    const position = offset
    offset += part.text.length + 1
    return (
      <Fragment key={position}>
        <span className={part.kind === 'same' ? undefined : changed}>{part.text}</span>{' '}
      </Fragment>
    )
  })
}

export function RewriteList({ rewrites }: { rewrites: BulletRewrite[] }) {
  if (rewrites.length === 0) return null

  return (
    <section id="rewrites" className="scroll-mt-28">
      <h2 className="text-xl font-semibold tracking-[-0.03em]">Bullets worth rewriting</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Same facts, sharper wording. Check each one still describes what you did.
      </p>
      <ul className="mt-5 flex flex-col gap-4">
        {rewrites.map((rewrite) => {
          const diff = wordDiff(rewrite.original, rewrite.rewrite)
          return (
            <li
              key={rewrite.original}
              className="rounded-xl border border-border bg-card p-5 text-sm"
            >
              <p className="text-xs text-muted-foreground">Yours</p>
              <p className="mt-1.5 leading-7 text-muted-foreground">
                <Words
                  parts={diff.before}
                  changed="rounded-sm bg-destructive/10 px-0.5 text-destructive/90 line-through decoration-destructive/50"
                />
              </p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">Suggested</p>
                <CopyButton value={rewrite.rewrite} label="Copy the suggested bullet" />
              </div>
              <p className="mt-1.5 leading-7 font-medium">
                <Words parts={diff.after} changed="marked" />
              </p>
              {rewrite.reason && (
                <p className="mt-4 border-t border-border pt-3 leading-6 text-muted-foreground">
                  {rewrite.reason}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
