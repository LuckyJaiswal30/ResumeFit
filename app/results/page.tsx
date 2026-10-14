'use client'

import { ArrowLeft, FileText } from 'lucide-react'
import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { AnalysisSourceNote } from '@/components/results/analysis-source-note'
import { SampleNote } from '@/components/results/sample-note'
import { AtsReport } from '@/components/results/ats-report'
import { FindingList } from '@/components/results/finding-list'
import { PriorityList } from '@/components/results/priority-list'
import { Tailoring } from '@/components/results/tailoring'
import { TitleCheck } from '@/components/results/title-check'
import { SectionNav, type SectionLink } from '@/components/results/section-nav'
import { Verdict } from '@/components/results/verdict'
import { PhrasingList } from '@/components/results/phrasing-list'
import { Requirements } from '@/components/results/requirements'
import { RewriteList } from '@/components/results/rewrite-list'
import { DownloadSummary } from '@/components/results/download-summary'
import { buildPriorities } from '@/lib/resume/priorities'
import {
  readAnalysisSession,
  subscribeToAnalysisSession,
  type AnalysisSession,
} from '@/lib/analysis-session'

function ResultsHeader() {
  return (
    <header className="mx-auto flex h-20 max-w-[84rem] items-center justify-between border-b border-border px-5 sm:px-8">
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
          className="mx-auto max-w-[84rem] px-5 pb-20 pt-12 sm:px-8 sm:pt-16"
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
        <div className="mx-auto max-w-[84rem] px-5 py-24 sm:px-8">
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
  const priorities = buildPriorities(analysis)

  const sections: SectionLink[] = [
    ...(analysis.title ? [{ id: 'title', label: 'Job title' }] : []),
    { id: 'requirements', label: 'Requirements' },
    ...(analysis.tailoring ? [{ id: 'tailor', label: 'Tailor it' }] : []),
    ...(analysis.phrasing.length > 0 ? [{ id: 'wording', label: 'Wording' }] : []),
    ...(analysis.rewrites.length > 0 ? [{ id: 'rewrites', label: 'Rewrites' }] : []),
    { id: 'parser', label: 'Formatting' },
    { id: 'notes', label: 'Review notes' },
  ]

  return (
    <main id="main" className="flex-1">
      <ResultsHeader />
      <div className="mx-auto max-w-[84rem] px-5 pb-24 pt-12 sm:px-8 sm:pt-16">
        <div className="mb-10">
          <h1 className="text-balance text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
            How your resume lines up
          </h1>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <FileText className="size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-words">{fileName}</span>
              <span aria-hidden="true" className="text-border">
                ·
              </span>
              <span>{analysis.source === 'ai' ? 'Full review' : 'Word match only'}</span>
              {isSample && (
                <span className="ml-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                  Example
                </span>
              )}
            </div>
            <DownloadSummary analysis={analysis} fileName={fileName} />
          </div>
        </div>

        <Verdict match={analysis.match} source={analysis.source} />

        <SectionNav sections={sections} />

        <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_340px] lg:gap-14">
          <div className="flex min-w-0 flex-col gap-14">
            {isSample && <SampleNote />}
            <AnalysisSourceNote analysis={analysis} />
            {analysis.title && <TitleCheck check={analysis.title} />}
            <div id="requirements" className="scroll-mt-28">
              <Requirements requirements={analysis.match.requirements} source={analysis.source} />
            </div>
            {analysis.tailoring && <Tailoring tailoring={analysis.tailoring} />}
            <PhrasingList phrasing={analysis.phrasing} />
            <RewriteList rewrites={analysis.rewrites} />
            <AtsReport ats={analysis.ats} />
            <FindingList findings={analysis.findings} />
            <div className="flex flex-col items-start gap-4 border-t border-border pt-10 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                {isSample
                  ? 'That was a made-up resume. Run it on yours to see where you stand.'
                  : 'Applying to something else? Run the same resume against another posting.'}
              </p>
              <Link
                href="/upload"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-ring/30"
              >
                {isSample ? 'Check my own resume' : 'Compare another posting'}
              </Link>
            </div>
          </div>
          <aside className="order-first lg:order-none">
            <PriorityList actions={priorities} />
          </aside>
        </div>
      </div>
    </main>
  )
}
