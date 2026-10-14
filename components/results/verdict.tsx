import { matchBand, tally, type Tally } from '@/lib/resume/band'
import type { AnalysisSource, MatchReport } from '@/lib/resume/types'

const TONES = {
  strong: 'bg-success/15 text-success',
  partial: 'bg-warning/20 text-foreground',
  weak: 'bg-destructive/10 text-destructive',
} as const

function Progress({ label, value, verb }: { label: string; value: Tally; verb: string }) {
  const share = (count: number) => (value.total === 0 ? 0 : (count / value.total) * 100)
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <dt className="font-medium">{label}</dt>
        <dd className="tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">{value.proven}</span> of {value.total}{' '}
          {verb}
          {value.partial > 0 && `, ${value.partial} partly`}
        </dd>
      </div>
      <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full bg-success" style={{ width: `${share(value.proven)}%` }} />
        <div className="h-full bg-success/35" style={{ width: `${share(value.partial)}%` }} />
      </div>
    </div>
  )
}

function Keep({ children }: { children: string }) {
  return <span className="whitespace-nowrap">{children}</span>
}

export function Verdict({ match, source }: { match: MatchReport; source: AnalysisSource }) {
  const band = source === 'ai' ? matchBand(match.score) : null
  const required = tally(match, 'required')
  const preferred = tally(match, 'preferred')
  const verb = source === 'ai' ? 'shown' : 'found'

  const parts = [
    required.total > 0 && (
      <span key="required">
        {required.proven} of {required.total} <Keep>must-haves</Keep>
      </span>
    ),
    preferred.total > 0 && (
      <span key="preferred">
        {preferred.proven} of {preferred.total} <Keep>nice-to-haves</Keep>
      </span>
    ),
  ].filter(Boolean)
  const lead = source === 'ai' ? 'Your resume shows' : 'Your resume uses'
  const tail = source === 'ai' ? '.' : ' from the posting.'

  return (
    <section
      aria-labelledby="verdict-title"
      className="grid gap-10 border-y border-border py-10 lg:grid-cols-[1fr_380px] lg:gap-16"
    >
      <div>
        <p
          className={`inline-flex rounded-full px-3.5 py-1 text-sm font-medium ${band ? TONES[band.tone] : 'bg-muted text-muted-foreground'}`}
        >
          {band ? band.label : 'Word check only'}
        </p>
        <h2
          id="verdict-title"
          className="mt-5 max-w-2xl text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
        >
          {lead} {parts[0]}
          {parts[1] && <> and {parts[1]}</>}
          {tail}
        </h2>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">{match.summary}</p>
      </div>

      <div>
        <dl className="flex flex-col gap-5">
          {required.total > 0 && <Progress label="Must-haves" value={required} verb={verb} />}
          {preferred.total > 0 && <Progress label="Nice-to-haves" value={preferred} verb={verb} />}
        </dl>
        <p className="mt-6 flex items-baseline gap-2 border-t border-border pt-5 text-sm text-muted-foreground">
          Match score
          <span className="text-2xl font-semibold tabular-nums text-foreground">{match.score}</span>
          / 100
        </p>
        <details className="group mt-3 text-sm">
          <summary className="cursor-pointer rounded-sm text-muted-foreground underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/30">
            What this score means
          </summary>
          <p className="mt-3 leading-6 text-muted-foreground">
            {source === 'ai'
              ? 'It counts how much of the posting your resume proves. Must-haves are worth 75% and nice-to-haves 25%. A requirement shown by a line you wrote earns full credit, one only partly shown earns half, and one that is missing earns none.'
              : 'No model reviewed this, so it only counts how many of the posting’s key words appear in your resume. It can’t tell whether the work behind a word is shown.'}
          </p>
          <p className="mt-3 leading-6 text-muted-foreground">
            Treat it as a guide to gaps, not a prediction. Most applicant tracking systems don’t
            reject on a score. Recruiters tend to search by keyword and skim titles, companies and
            dates first, so a resume that reads clearly beats one tuned to hit 100.
          </p>
        </details>
      </div>
    </section>
  )
}
