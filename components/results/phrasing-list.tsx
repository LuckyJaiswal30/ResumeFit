import { ArrowRight } from 'lucide-react'
import type { PhrasingGap } from '@/lib/resume/types'

export function PhrasingList({ phrasing }: { phrasing: PhrasingGap[] }) {
  if (phrasing.length === 0) return null

  return (
    <section id="wording" className="scroll-mt-28">
      <h2 className="text-xl font-semibold tracking-[-0.03em]">Same skill, different words</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        You did the work. The posting calls it something else.
      </p>
      <ul className="mt-5 flex flex-col divide-y divide-border border-y border-border">
        {phrasing.map((gap) => (
          <li key={gap.id} className="py-5 text-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <p className="flex-1 leading-6">
                <span className="text-xs text-muted-foreground">You wrote</span>
                <br />
                {gap.yours}
              </p>
              <ArrowRight
                className="size-4 shrink-0 rotate-90 text-muted-foreground sm:rotate-0"
                aria-hidden="true"
              />
              <p className="flex-1 leading-6">
                <span className="text-xs text-muted-foreground">They ask for</span>
                <br />
                <span className="marked">{gap.posting}</span>
              </p>
            </div>
            {gap.note && <p className="mt-3 leading-6 text-muted-foreground">{gap.note}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}
