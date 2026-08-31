'use client'

import { ChangeEvent, DragEvent, useState } from 'react'
import { ArrowLeft, ArrowRight, FileText, Upload, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [job, setJob] = useState('')
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)

  const addFile = (selected?: File) => {
    if (!selected) return
    if (!/\.(pdf|docx)$/i.test(selected.name)) return setError('Please choose a PDF or DOCX file.')
    if (selected.size > 10 * 1024 * 1024) return setError('Please choose a file smaller than 10MB.')
    setError('')
    setFile(selected)
  }

  const submit = () => {
    if (!file) return setError('Add your resume to continue.')
    if (job.trim().length < 50) return setError('Paste at least 50 characters from the full job description.')
    setLoading(true)
    window.setTimeout(() => router.push('/results'), 900)
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    addFile(event.dataTransfer.files?.[0])
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex h-20 max-w-7xl items-center justify-between border-b border-border px-5 sm:px-8 lg:px-10">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"><ArrowLeft aria-hidden="true" /> Home</Link>
        <Link href="/" className="text-[17px] font-semibold tracking-[-0.04em]">resumefit<span className="text-primary">.</span></Link>
        <a href="mailto:luckyjaiswal3405@gmail.com" className="text-sm text-muted-foreground transition hover:text-foreground">Help</a>
      </header>

      <div className="mx-auto max-w-7xl px-5 pb-24 pt-14 sm:px-8 sm:pt-20 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mt-12 max-w-2xl text-center sm:mt-20"><h1 className="text-balance text-4xl font-semibold tracking-[-0.06em] sm:text-6xl">Compare your resume to the role.</h1><p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">Upload your resume and paste the job description to get clear, useful feedback.</p></div>

          <section className="mt-14 border-t border-border py-8 sm:mt-20 sm:py-10">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
              <div>
                <div><p className="text-sm font-semibold">Your resume</p><p className="mt-1 text-sm text-muted-foreground">PDF or DOCX, up to 10MB</p></div>
                <div onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={onDrop} className={`mt-6 rounded-2xl border-2 border-dashed p-8 transition sm:p-10 ${dragging ? 'border-primary bg-accent' : 'border-input bg-card'}`}>
                  <input id="resume-upload" type="file" accept=".pdf,.docx" className="sr-only" onChange={(event: ChangeEvent<HTMLInputElement>) => addFile(event.target.files?.[0])} />
                  {file ? <div className="flex items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-3 text-left"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary"><FileText aria-hidden="true" /></span><div className="min-w-0"><p className="truncate text-sm font-medium">{file.name}</p><p className="mt-1 text-xs text-muted-foreground">Ready to review</p></div></div><button type="button" onClick={() => setFile(null)} className="rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Remove resume"><X aria-hidden="true" /></button></div> : <div className="text-center"><span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-accent text-primary"><Upload aria-hidden="true" /></span><p className="mt-4 text-sm font-medium">Drop your resume here</p><p className="mt-1 text-sm text-muted-foreground">or <label htmlFor="resume-upload" className="cursor-pointer font-medium text-primary underline underline-offset-4">browse files</label></p></div>}
                </div>
              </div>

              <div><div><p className="text-sm font-semibold">Job description</p><p className="mt-1 text-sm text-muted-foreground">Paste the complete listing for the best match.</p></div><textarea value={job} onChange={(event) => setJob(event.target.value)} placeholder="Paste the job description here..." className="mt-6 min-h-56 w-full resize-y rounded-2xl border border-input bg-card p-5 text-sm leading-6 outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-ring/15" aria-label="Job description" /><div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>Include responsibilities and requirements</span><span>{job.length} characters</span></div></div>
            </div>
            {error && <p className="mt-6 text-sm text-destructive" role="alert">{error}</p>}
            <div className="mt-8 flex flex-col-reverse gap-5 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-muted-foreground">Your documents are used only to create this analysis.</p><button type="button" onClick={submit} disabled={loading} className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70">{loading ? 'Preparing your review...' : 'Start analysis'} {!loading && <ArrowRight className="ml-2" aria-hidden="true" />}</button></div>
          </section>
        </div>
      </div>
    </main>
  )
}
