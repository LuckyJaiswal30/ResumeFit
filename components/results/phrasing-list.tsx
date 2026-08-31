import { ArrowRight } from 'lucide-react'
import type { PhrasingGap } from '@/lib/resume/types'

export function PhrasingList({ phrasing }: { phrasing: PhrasingGap[] }) {
  if (phrasing.length === 0) return null

  return (
    <section>
      <h2 className="text-xl font-semibold tracking-[-0.03em]">Same skill, different words</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        You have done the work, but the posting names it differently, so a keyword filter can miss
        it.
      </p>
      <ul className="mt-6 flex flex-col gap-3">
        {phrasing.map((gap) => (
          <li key={gap.id} className="rounded-lg border border-border p-4 text-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="flex-1 leading-6">
                <span className="font-mono text-[11px] text-muted-foreground">you wrote</span>
                <br />
                {gap.yours}
              </p>
              <ArrowRight
                className="size-4 shrink-0 rotate-90 text-muted-foreground sm:rotate-0"
                aria-hidden="true"
              />
              <p className="flex-1 leading-6">
                <span className="font-mono text-[11px] text-muted-foreground">they ask for</span>
                <br />
                {gap.posting}
              </p>
            </div>
            {gap.note && (
              <p className="mt-3 border-t border-border pt-3 leading-6 text-muted-foreground">
                {gap.note}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
