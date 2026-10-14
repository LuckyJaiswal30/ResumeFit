import { Check, CircleAlert, CircleDashed, Minus } from 'lucide-react'
import type { TitleCheck as TitleCheckData, TitleVerdict } from '@/lib/resume/types'

const VERDICTS: Record<
  TitleVerdict,
  { label: string; Glyph: typeof Check; chip: string; advice: string }
> = {
  match: {
    label: 'Matches',
    Glyph: Check,
    chip: 'bg-success/15 text-success',
    advice: 'Your job titles use the posting’s wording, so a keyword search for it will find you.',
  },
  headline: {
    label: 'In your headline only',
    Glyph: CircleDashed,
    chip: 'bg-warning/20 text-foreground',
    advice:
      'The posting’s title appears in your resume, but none of your job titles say it. Recruiters read titles first. If it describes what you did, add it beside your official title.',
  },
  close: {
    label: 'Close',
    Glyph: CircleAlert,
    chip: 'bg-warning/20 text-foreground',
    advice:
      'Your title is in the same line of work but uses different words. If the work was the same, you can echo the posting’s wording beside your official title.',
  },
  different: {
    label: 'Different',
    Glyph: Minus,
    chip: 'bg-muted text-muted-foreground',
    advice:
      'None of your job titles resemble this one. That’s fine if you’re changing direction, but say so in your summary so a quick skim makes sense.',
  },
}

export function TitleCheck({ check }: { check: TitleCheckData }) {
  const { label, Glyph, chip, advice } = VERDICTS[check.verdict]

  return (
    <section id="title" className="scroll-mt-28">
      <h2 className="text-xl font-semibold tracking-[-0.03em]">Your job title</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Recruiters read titles, companies and dates first. Here is how yours lines up.
      </p>
      <div className="mt-5 rounded-xl border border-border bg-card p-5">
        <dl className="grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">The posting</dt>
            <dd className="mt-1 text-lg font-medium">{check.posting}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Your latest title</dt>
            <dd className="mt-1 text-lg font-medium">{check.latest ?? 'Not found'}</dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap items-start gap-3 border-t border-border pt-4 text-sm">
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${chip}`}
          >
            <Glyph className="size-3.5" aria-hidden="true" />
            {label}
          </span>
          <p className="min-w-0 flex-1 leading-6 text-muted-foreground">{advice}</p>
        </div>
        {check.levelGap && check.postingLevel && (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            The posting is for a{' '}
            <span className="font-medium text-foreground">{check.postingLevel}</span> role and your
            latest title doesn’t say that level. Make the scope of your work clear in the bullets,
            such as ownership, team size or impact.
          </p>
        )}
        {check.verdict !== 'match' && (
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Only ever use a title that describes a role you really held.
          </p>
        )}
      </div>
    </section>
  )
}
