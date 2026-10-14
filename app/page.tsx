import { X } from 'lucide-react'
import Link from 'next/link'
import { FAQ } from '@/components/faq'
import { SampleLink } from '@/components/sample-link'
import { SiteHeader } from '@/components/site-header'

export default function Home() {
  return (
    <main id="main" className="flex-1 bg-background text-foreground">
      <SiteHeader />
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="mx-auto flex max-w-6xl flex-col items-center px-5 pb-24 pt-20 text-center sm:px-8 sm:pb-32 sm:pt-28 lg:px-10 lg:pb-40 lg:pt-36">
          <p className="mb-7 text-sm font-medium text-primary">Before you send the application</p>
          <h1 className="max-w-4xl text-balance text-5xl font-semibold leading-[1.03] tracking-[-0.075em] sm:text-7xl lg:text-8xl">
            Know what your resume proves.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
            Paste a job posting and your resume. See what matches, what doesn’t, and why.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
            <Link
              href="/upload"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-ring/30"
            >
              Check my fit
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-xl border border-input bg-background px-5 py-3.5 text-sm font-semibold outline-none transition-colors hover:bg-muted focus-visible:ring-4 focus-visible:ring-ring/30"
            >
              See how it works
            </a>
            <SampleLink className="rounded-sm text-sm font-medium text-muted-foreground underline underline-offset-4 outline-none transition-colors hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/30" />
          </div>
          <div className="mt-16 grid w-full max-w-2xl grid-cols-3 border-y border-border py-5 text-left sm:mt-20">
            <div className="pr-4">
              <p className="text-sm font-semibold">Quoted, not guessed</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Every match quotes your resume.
              </p>
            </div>
            <div className="border-l border-border px-4">
              <p className="text-sm font-semibold">Nothing invented</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                No invented numbers or claims.
              </p>
            </div>
            <div className="border-l border-border pl-4">
              <p className="text-sm font-semibold">No sign-up</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Results stay in your browser tab.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section id="features" className="border-y border-border bg-card">
        <div className="mx-auto max-w-[84rem] px-5 py-20 sm:px-8 lg:px-10">
          <div className="max-w-xl">
            <p className="text-sm font-medium text-primary">Where most resume tools stop</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
              The feedback you wanted before applying.
            </h2>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
            {[
              [
                '01',
                'Reads the posting first',
                'Requirements come from the job you pasted, not a checklist. Must-haves and nice-to-haves score separately.',
              ],
              [
                '02',
                'Shows its work',
                'A match has to quote the line that proves it. A skill you list but never show gets marked down.',
              ],
              [
                '03',
                'Won’t flatter you',
                'Rewrites keep your facts. A weak bullet gets a stronger verb, not an invented number.',
              ],
            ].map(([n, t, d]) => (
              <article key={n} className="bg-card p-7 sm:p-9">
                <span className="font-mono text-xs text-muted-foreground">{n}</span>
                <h3 className="mt-12 text-xl font-semibold tracking-[-0.03em]">{t}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section
        id="how-it-works"
        className="mx-auto grid max-w-[84rem] gap-14 px-5 py-24 sm:px-8 lg:grid-cols-[.7fr_1.3fr] lg:px-10 lg:py-32"
      >
        <div>
          <p className="text-sm font-medium text-primary">How it works</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
            It takes three steps.
          </h2>
        </div>
        <div className="flex flex-col divide-y divide-border border-y border-border">
          {[
            ['Add your resume', 'Upload the PDF, DOCX or TXT you already send.'],
            ['Paste the posting', 'All of it, requirements included.'],
            ['Read what came back', 'Your score, your gaps, and the bullets to fix.'],
          ].map(([t, d], i) => (
            <div key={t} className="grid gap-4 py-7 sm:grid-cols-[72px_1fr]">
              <span className="font-mono text-sm text-primary">0{i + 1}</span>
              <div>
                <h3 className="text-lg font-semibold tracking-[-0.02em]">{t}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section id="limits" className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-[84rem] gap-14 px-5 py-24 sm:px-8 lg:grid-cols-[.7fr_1.3fr] lg:px-10">
          <div>
            <p className="text-sm font-medium text-primary">On purpose</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
              What it won’t do.
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              A tool that agrees with everything isn’t much use.
            </p>
          </div>
          <div className="flex flex-col divide-y divide-border border-y border-border">
            {[
              [
                'Count a skill it can’t find',
                'A skills list isn’t evidence. Without a line showing the work, the requirement moves to your gaps.',
              ],
              [
                'Invent a number to make a bullet land',
                'Rewrites keep your facts. No metric or outcome appears that you didn’t write.',
              ],
              [
                'Score something that isn’t a resume',
                'Invoices, recipes and contracts are turned away with a reason.',
              ],
              [
                'Pretend a model read it when none did',
                'If the review can’t run, the page says so and compares wording instead.',
              ],
            ].map(([t, d]) => (
              <div key={t} className="grid gap-4 py-7 sm:grid-cols-[72px_1fr]">
                <X className="mt-1 size-4 text-muted-foreground" aria-hidden="true" />
                <div>
                  <h3 className="text-lg font-semibold tracking-[-0.02em]">{t}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section
        id="faq"
        className="mx-auto grid max-w-[84rem] gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[.7fr_1.3fr] lg:px-10"
      >
        <div>
          <p className="text-sm font-medium text-primary">Worth knowing first</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em]">Before you start.</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Something not covered here?{' '}
            <a href="mailto:luckyjaiswal3405@gmail.com" className="underline underline-offset-4">
              Ask me.
            </a>
          </p>
        </div>
        <FAQ />
      </section>
    </main>
  )
}
