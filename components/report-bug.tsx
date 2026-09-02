'use client'

import { useRef } from 'react'

const CHECKLIST = [
  ['What you were doing', 'The page you were on and the step you had reached.'],
  ['What you expected', 'One line is enough.'],
  ['What happened instead', 'Any message on screen, copied exactly.'],
  ['The file, if one was involved', 'Type and rough size. Please do not attach your resume.'],
]

function draft() {
  const browser = typeof navigator === 'undefined' ? '' : navigator.userAgent
  return [
    'What I was doing:',
    '',
    'What I expected:',
    '',
    'What happened instead:',
    '',
    'File type and rough size, if one was involved:',
    '',
    `Browser: ${browser}`,
    '',
  ].join('\n')
}

export function ReportBug() {
  const dialogRef = useRef<HTMLDialogElement>(null)

  const openEmail = () => {
    const subject = encodeURIComponent('ResumeFit bug report')
    const body = encodeURIComponent(draft())
    dialogRef.current?.close()
    window.location.href = `mailto:luckyjaiswal3405@gmail.com?subject=${subject}&body=${body}`
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="rounded-sm text-left text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/30"
      >
        Report a bug
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="report-bug-title"
        className="m-auto w-[min(32rem,calc(100vw-2.5rem))] rounded-2xl border border-border bg-card p-0 text-foreground backdrop:bg-foreground/40"
      >
        <div className="p-6 sm:p-8">
          <h2 id="report-bug-title" className="text-xl font-semibold tracking-[-0.03em]">
            Before you send it
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            A few details make a bug findable. The email opens with these as blank headings, so you
            only have to fill them in.
          </p>
          <ul className="mt-6 flex flex-col divide-y divide-border border-y border-border">
            {CHECKLIST.map(([title, detail]) => (
              <li key={title} className="py-4 text-sm">
                <p className="font-medium">{title}</p>
                <p className="mt-1 leading-6 text-muted-foreground">{detail}</p>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openEmail}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-ring/30"
            >
              Open my email
            </button>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="inline-flex items-center justify-center rounded-xl border border-input bg-background px-5 py-3 text-sm font-semibold outline-none transition-colors hover:bg-muted focus-visible:ring-4 focus-visible:ring-ring/30"
            >
              Not now
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}
