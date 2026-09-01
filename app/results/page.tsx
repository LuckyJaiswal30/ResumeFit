'use client'

import { ArrowLeft, FileText } from 'lucide-react'
import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { AnalysisSourceNote } from '@/components/results/analysis-source-note'
import { SampleNote } from '@/components/results/sample-note'
import { AtsReport } from '@/components/results/ats-report'
import { FindingList } from '@/components/results/finding-list'
import { FitScore } from '@/components/results/fit-score'
import { PhrasingList } from '@/components/results/phrasing-list'
import { RequirementList } from '@/components/results/requirement-list'
import { RewriteList } from '@/components/results/rewrite-list'
import {
  readAnalysisSession,
  subscribeToAnalysisSession,
  type AnalysisSession,
} from '@/lib/analysis-session'

function ResultsHeader() {
  return (
    <header className="mx-auto flex h-20 max-w-5xl items-center justify-between border-b border-border px-5 sm:px-8">
      <Link href="/" className="text-[17px] font-semibold tracking-[-0.04em]">
        resumefit<span className="text-primary">.</span>
      </Link>
      <Link
        href="/upload"
        className="inline-flex items-center gap-2 rounded-sm text-sm font-medium text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/30"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> New analysis
      </Link>
    </header>
  )
}

export default function ResultsPage() {
  const session = useSyncExternalStore<AnalysisSession | null | undefined>(
    subscribeToAnalysisSession,
    readAnalysisSession,
    () => undefined,
  )

  if (session === undefined) {
    return (
      <main id="main" className="flex-1">
        <ResultsHeader />
        <div
          className="mx-auto max-w-5xl px-5 pb-20 pt-12 sm:px-8 sm:pt-16"
          role="status"
          aria-label="Loading your analysis"
        >
          <div className="mb-12 flex flex-col gap-4">
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="h-10 w-2/3 rounded bg-muted sm:h-12" />
            <div className="h-4 w-48 rounded bg-muted" />
          </div>
          <div className="grid gap-6 border-y border-border py-8 md:grid-cols-[260px_1fr] md:gap-12">
            <div className="flex flex-col gap-4">
              <div className="h-4 w-20 rounded bg-muted" />
              <div className="h-16 w-32 rounded bg-muted" />
              <div className="h-4 w-full rounded bg-muted" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="h-32 rounded-xl bg-muted" />
              <div className="h-32 rounded-xl bg-muted" />
            </div>
          </div>
          <div className="mt-12 flex flex-col gap-3">
            <div className="h-6 w-40 rounded bg-muted" />
            <div className="h-16 rounded-lg bg-muted" />
            <div className="h-16 rounded-lg bg-muted" />
          </div>
        </div>
      </main>
    )
  }

  if (!session) {
    return (
      <main id="main" className="flex-1">
        <ResultsHeader />
        <div className="mx-auto max-w-5xl px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-md text-center">
            <h1 className="text-3xl font-semibold tracking-[-0.05em]">Nothing here yet</h1>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Results live only in the tab that made them. Run the comparison again.
            </p>
            <Link
              href="/upload"
              className="mt-8 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-ring/30"
            >
              Start a comparison
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const { analysis, fileName, isSample } = session
  const requirements = analysis.match.requirements
  const covered = requirements.filter((item) => item.coverage !== 'missing')
  const missing = requirements.filter((item) => item.coverage === 'missing')
  const claimed = missing.filter((item) => item.evidence !== null)
  const absent = missing.filter((item) => item.evidence === null)

  return (
    <main id="main" className="flex-1">
      <ResultsHeader />
      <div className="mx-auto max-w-5xl px-5 pb-20 pt-12 sm:px-8 sm:pt-16">
        <div className="mb-12">
          <p className="mb-3 text-sm font-medium text-primary">Your analysis</p>
          <h1 className="text-balance text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
            How your resume lines up
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <FileText className="size-4" aria-hidden="true" />
            {fileName}
            {analysis.model && (
              <>
                <span className="text-border">·</span>
                <span className="font-mono text-xs">{analysis.model}</span>
              </>
            )}
          </div>
        </div>

        <FitScore match={analysis.match} covered={covered.length} missing={missing.length} />

        <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-12">
            {isSample && <SampleNote />}
            <AnalysisSourceNote analysis={analysis} />
            <RequirementList
              title="Where you align"
              description="The posting asks for these. Your resume shows them."
              requirements={covered}
            />
            <RequirementList
              title="Listed, but not shown"
              description="You name these, but no work backs them up. One line usually fixes it."
              requirements={claimed}
            />
            <RequirementList
              title="Not there at all"
              description="The posting asks for these. Your resume never mentions them."
              requirements={absent}
            />
            <PhrasingList phrasing={analysis.phrasing} />
            <RewriteList rewrites={analysis.rewrites} />
            <AtsReport ats={analysis.ats} />
          </div>
          <aside>
            <FindingList findings={analysis.findings} />
          </aside>
        </div>
      </div>
    </main>
  )
}
