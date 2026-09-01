import type { MatchReport } from '@/lib/resume/types'

export function FitScore({
  match,
  covered,
  missing,
}: {
  match: MatchReport
  covered: number
  missing: number
}) {
  return (
    <section className="grid gap-6 border-y border-border py-8 md:grid-cols-[260px_1fr] md:gap-12">
      <div>
        <p className="text-sm text-muted-foreground">Overall fit</p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-7xl font-semibold tracking-[-0.08em]">{match.score}</span>
          <span className="text-lg text-muted-foreground">/ 100</span>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{match.summary}</p>
        {match.breakdown.length > 0 && (
          <dl className="mt-5 flex flex-col gap-2 border-t border-border pt-4">
            {match.breakdown.map((part) => (
              <div key={part.label} className="flex items-baseline justify-between gap-3 text-xs">
                <dt className="text-muted-foreground">
                  {part.label}
                  <span className="ml-2 font-mono text-[11px]">{part.weight}%</span>
                </dt>
                <dd className="font-medium">{part.score} / 100</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="rounded-xl bg-accent p-5">
          <p className="text-sm font-medium text-accent-foreground">What is working</p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
            {covered} {covered === 1 ? 'match' : 'matches'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Backed by a line in your resume.</p>
        </div>
        <div className="rounded-xl bg-secondary p-5">
          <p className="text-sm font-medium text-secondary-foreground">Worth improving</p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
            {missing} {missing === 1 ? 'gap' : 'gaps'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Asked for, not shown yet.</p>
        </div>
      </div>
    </section>
  )
}
