'use client'

import { ChangeEvent, DragEvent, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, FileImage, FileText, Upload, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SampleLink } from '@/components/sample-link'
import { storeAnalysisSession } from '@/lib/analysis-session'
import type { Analysis } from '@/lib/resume/types'
import { SAMPLE_POSTING } from '@/lib/samples/sample-posting'
import { SAMPLE_RESUME_FILE } from '@/lib/samples/sample-resume'
import {
  ACCEPTED_FILES,
  describeFiles,
  fileKey,
  isImage,
  MAX_PAGES,
  prepareFiles,
} from '@/lib/prepare-upload'

const MAX_JOB_LENGTH = 40_000
const MAX_RESUME_LENGTH = 80_000

async function readJson(response: Response): Promise<{ error?: string; [key: string]: unknown }> {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

function fallbackMessage(response: Response, fallback: string) {
  if (response.status === 429)
    return 'Too many attempts in a short space of time. Try again in a few minutes.'
  return fallback
}

export default function UploadPage() {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [pasting, setPasting] = useState(false)
  const [pasted, setPasted] = useState('')
  const [preparing, setPreparing] = useState(false)
  const [job, setJob] = useState('')
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('')
  const inFlightRef = useRef(false)

  const addFiles = async (incoming: File[]) => {
    if (incoming.length === 0) return
    setPreparing(true)
    const prepared = await prepareFiles(incoming, files)
    setPreparing(false)
    if ('error' in prepared) return setError(prepared.error)
    setError('')
    setFiles(prepared.files)
  }

  const removeFile = (index: number) => setFiles(files.filter((_, at) => at !== index))

  const readResumeText = async () => {
    if (pasting) return pasted.trim()

    const form = new FormData()
    for (const entry of files) form.append('resume', entry)
    const extracted = await fetch('/api/extract-text', { method: 'POST', body: form })
    const extractedBody = await readJson(extracted)
    if (!extracted.ok || typeof extractedBody.text !== 'string') {
      throw new Error(
        extractedBody.error ??
          fallbackMessage(
            extracted,
            extracted.status === 413
              ? 'That file is over 4 MB. Try a smaller export.'
              : 'That file could not be read.',
          ),
      )
    }
    return extractedBody.text
  }

  const submit = async () => {
    if (inFlightRef.current || preparing) return
    if (pasting) {
      if (pasted.trim().length < 80)
        return setError('Paste your whole resume, not just a line or two.')
      if (pasted.trim().length > MAX_RESUME_LENGTH)
        return setError('That resume is too long. Keep it under 80,000 characters.')
    } else if (files.length === 0) {
      return setError('Add your resume first.')
    }
    if (job.trim().length < 80) {
      return setError('Too short to compare. Paste the whole posting.')
    }
    if (job.trim().length > MAX_JOB_LENGTH) {
      return setError('That posting is too long. Keep it under 40,000 characters.')
    }

    inFlightRef.current = true
    setError('')
    setLoading(true)

    try {
      setStep('Reading your resume')
      const resume = await readResumeText()

      setStep('Comparing it to the posting')
      const analyzed = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, jobDescription: job.trim() }),
      })
      const analyzedBody = await readJson(analyzed)
      if (!analyzed.ok || !analyzedBody.analysis) {
        throw new Error(
          analyzedBody.error ?? fallbackMessage(analyzed, 'The analysis didn’t finish. Try again.'),
        )
      }

      storeAnalysisSession({
        analysis: analyzedBody.analysis as Analysis,
        fileName: pasting ? 'Pasted resume' : describeFiles(files),
        completedAt: Date.now(),
      })
      router.push('/results')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That didn’t go through. Try again.')
      setLoading(false)
      setStep('')
      inFlightRef.current = false
    }
  }

  const loadSample = async () => {
    try {
      const response = await fetch(`/samples/${SAMPLE_RESUME_FILE}`)
      if (!response.ok) throw new Error('sample missing')
      const blob = await response.blob()
      setFiles([new File([blob], SAMPLE_RESUME_FILE, { type: 'application/pdf' })])
      setPasting(false)
      setJob(SAMPLE_POSTING)
      setError('')
    } catch {
      setError('The sample couldn’t be loaded. Try again, or upload your own resume.')
    }
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    void addFiles(Array.from(event.dataTransfer.files ?? []))
  }

  return (
    <main id="main" className="flex-1 bg-background text-foreground">
      <header className="mx-auto flex h-20 max-w-[84rem] items-center justify-between border-b border-border px-5 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" /> Home
        </Link>
        <Link href="/" className="text-[17px] font-semibold tracking-[-0.04em]">
          resumefit<span className="text-primary">.</span>
        </Link>
        <a
          href="mailto:luckyjaiswal3405@gmail.com"
          className="text-sm text-muted-foreground transition hover:text-foreground"
        >
          Help
        </a>
      </header>

      <div className="mx-auto max-w-[84rem] px-5 pb-24 pt-14 sm:px-8 sm:pt-20 lg:px-10">
        <div className="mx-auto max-w-[84rem]">
          <div className="mx-auto mt-12 max-w-2xl text-center sm:mt-20">
            <h1 className="text-balance text-4xl font-semibold tracking-[-0.06em] sm:text-6xl">
              Compare your resume to the job.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Add your resume and the posting. That’s all it needs.
            </p>
          </div>

          <section className="mt-14 border-t border-border py-8 sm:mt-20 sm:py-10">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">Your resume</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {pasting
                        ? 'All of it, contact details included.'
                        : `PDF, Word, TXT, or photos of up to ${MAX_PAGES} pages. 4 MB in all.`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPasting(!pasting)
                      setError('')
                    }}
                    className="shrink-0 rounded-sm text-xs font-medium text-primary underline underline-offset-4 outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
                  >
                    {pasting ? 'Upload a file instead' : 'Paste text instead'}
                  </button>
                </div>
                {pasting ? (
                  <textarea
                    value={pasted}
                    onChange={(event) => setPasted(event.target.value)}
                    placeholder="Paste your resume here..."
                    className="mt-6 min-h-56 w-full resize-y rounded-2xl border border-input bg-card p-5 text-sm leading-6 outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-ring/15"
                    aria-label="Resume text"
                  />
                ) : (
                  <div
                    onDragOver={(event) => {
                      event.preventDefault()
                      setDragging(true)
                    }}
                    onDragLeave={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                        setDragging(false)
                      }
                    }}
                    onDrop={onDrop}
                    className={`mt-6 rounded-2xl border-2 border-dashed p-8 transition has-[input:focus-visible]:ring-4 has-[input:focus-visible]:ring-ring/30 sm:p-10 ${dragging ? 'border-primary bg-accent' : 'border-input bg-card'}`}
                  >
                    <input
                      id="resume-upload"
                      type="file"
                      accept={ACCEPTED_FILES}
                      multiple
                      className="sr-only"
                      onChange={(event: ChangeEvent<HTMLInputElement>) => {
                        void addFiles(Array.from(event.target.files ?? []))
                        event.target.value = ''
                      }}
                    />
                    {files.length > 0 ? (
                      <div className="flex flex-col gap-4">
                        {files.map((entry, index) => (
                          <div
                            key={fileKey(entry)}
                            className="flex items-center justify-between gap-4"
                          >
                            <div className="flex min-w-0 items-center gap-3 text-left">
                              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                                {isImage(entry) ? (
                                  <FileImage aria-hidden="true" />
                                ) : (
                                  <FileText aria-hidden="true" />
                                )}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{entry.name}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {files.length > 1 ? `Page ${index + 1}` : 'Ready to read'}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                              aria-label={
                                files.length > 1 ? `Remove page ${index + 1}` : 'Remove resume'
                              }
                            >
                              <X aria-hidden="true" />
                            </button>
                          </div>
                        ))}
                        {isImage(files[0]) && files.length < MAX_PAGES && (
                          <label
                            htmlFor="resume-upload"
                            className="cursor-pointer self-start text-sm font-medium text-primary underline underline-offset-4"
                          >
                            Add another page
                          </label>
                        )}
                      </div>
                    ) : (
                      <div className="text-center">
                        <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
                          <Upload aria-hidden="true" />
                        </span>
                        <p className="mt-4 text-sm font-medium">
                          {preparing ? 'Getting your photos ready...' : 'Drop your resume here'}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          or{' '}
                          <label
                            htmlFor="resume-upload"
                            className="cursor-pointer font-medium text-primary underline underline-offset-4"
                          >
                            browse files
                          </label>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div>
                  <p className="text-sm font-semibold">Job description</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    All of it, requirements included.
                  </p>
                </div>
                <textarea
                  value={job}
                  onChange={(event) => setJob(event.target.value)}
                  placeholder="Paste the job description here..."
                  className="mt-6 min-h-56 w-full resize-y rounded-2xl border border-input bg-card p-5 text-sm leading-6 outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-ring/15"
                  aria-label="Job description"
                />
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>The requirements section matters most</span>
                  <span className={job.length > MAX_JOB_LENGTH ? 'text-destructive' : undefined}>
                    {job.length.toLocaleString('en-US')} / {MAX_JOB_LENGTH.toLocaleString('en-US')}{' '}
                    characters
                  </span>
                </div>
              </div>
            </div>
            <p className="sr-only" role="status">
              {loading ? `${step}...` : ''}
            </p>
            {error && (
              <p className="mt-6 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <div className="mt-8 flex flex-col-reverse gap-5 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col items-start gap-1">
                <p className="text-xs leading-5 text-muted-foreground">
                  Read once for this comparison. Never stored.
                </p>
                <div className="flex flex-wrap gap-x-5 gap-y-1">
                  <button
                    type="button"
                    onClick={loadSample}
                    disabled={loading}
                    className="rounded-sm text-xs font-medium text-primary underline underline-offset-4 outline-none focus-visible:ring-4 focus-visible:ring-ring/30 disabled:opacity-60"
                  >
                    Try the sample resume and posting
                  </button>
                  <SampleLink className="rounded-sm text-xs font-medium text-primary underline underline-offset-4 outline-none focus-visible:ring-4 focus-visible:ring-ring/30" />
                </div>
              </div>
              <button
                type="button"
                onClick={submit}
                disabled={loading || preparing}
                aria-busy={loading || preparing}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-ring/30 disabled:cursor-wait disabled:opacity-70"
              >
                {loading ? `${step}...` : 'Start analysis'}{' '}
                {!loading && <ArrowRight className="ml-2" aria-hidden="true" />}
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
