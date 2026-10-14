import { CopyButton } from '@/components/results/copy-button'
import { BURIED_POSITION } from '@/lib/resume/tailor'
import type { PostingPriority, Tailoring as TailoringData } from '@/lib/resume/types'

function advice(item: PostingPriority) {
  const { placement } = item
  if (item.coverage === 'missing')
    return 'Nothing in your resume shows this yet. See the fixes above.'
  if (item.coverage === 'partial') return 'Only partly shown. See the fixes above.'
  if (!placement) return 'Shown in your resume.'
  if (placement.older) {
    return `Your proof is under an older role, ${placement.role}. If your recent work used it too, add a bullet there.`
  }
  if (placement.position >= BURIED_POSITION) {
    return `Your proof is bullet ${placement.position} of ${placement.total} under ${placement.role}. Move it to the top.`
  }
  return `Already near the top of ${placement.role}. Leave it there.`
}

export function Tailoring({ tailoring }: { tailoring: TailoringData }) {
  const { priorities, opener, skills } = tailoring

  return (
    <section id="tailor" className="scroll-mt-28">
      <h2 className="text-xl font-semibold tracking-[-0.03em]">Tailor it to this posting</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        The posting lists these first. Here is where your proof sits, and how to put it where a
        quick skim will land. Every change below is a reorder of what you already wrote.
      </p>

      <h3 className="mt-7 text-base font-semibold">What they ask for first</h3>
      <ol className="mt-3 flex flex-col divide-y divide-border border-y border-border">
        {priorities.map((item, index) => (
          <li key={item.label} className="py-4">
            <div className="flex items-baseline gap-3">
              <span className="w-5 shrink-0 text-sm tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {item.label}{' '}
                  <span className="text-xs font-normal text-muted-foreground">
                    {item.importance === 'required' ? 'Must-have' : 'Nice to have'}
                  </span>
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{advice(item)}</p>
                {item.placement && (
                  <p className="mt-2 text-sm leading-6">
                    <span className="marked">{item.placement.bullet}</span>
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>

      {opener && (
        <div className="mt-8 rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Open with your strongest match</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Start your summary with the things the posting lists first that you can prove.
              </p>
            </div>
            <CopyButton value={opener} label="Copy the opening line" />
          </div>
          <p className="mt-3 rounded-lg bg-muted p-3 text-sm leading-6">{opener}</p>
        </div>
      )}

      {skills && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Reorder your skills</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Same skills, new order, so what the posting wants comes first. Nothing added.
              </p>
            </div>
            <CopyButton
              value={`${skills.prefix}${skills.suggested.join(', ')}`}
              label="Copy the reordered skills"
            />
          </div>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Now</dt>
              <dd className="mt-1 leading-6 text-muted-foreground">{skills.current.join(', ')}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Suggested</dt>
              <dd className="mt-1 leading-6">{skills.suggested.join(', ')}</dd>
            </div>
          </dl>
        </div>
      )}
    </section>
  )
}
