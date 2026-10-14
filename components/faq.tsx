'use client'

import { ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'

const FAQS = [
  [
    'What does it actually check?',
    'It pulls the requirements out of the posting and checks each one against your resume. A match has to quote a line from your text, or it moves to your gaps.',
  ],
  [
    'What happens to my resume?',
    'The file is never saved. Your text goes to the model that writes the analysis, and the result is cached for an hour so a repeat costs nothing. A photo or scan goes to the same model once so it can read the text. What you see lives in this tab and goes when you close it.',
  ],
  [
    'What can I upload?',
    'A PDF, Word document (DOCX or the older DOC), ODT, RTF or text file, up to 4 MB. Scanned PDFs work, and so do photos or screenshots, up to five pages of them. Two-column templates are read one column at a time. If nothing uploads cleanly, paste the text instead. Blurred words come back as [illegible] rather than guessed at.',
  ],
  [
    'Will it rewrite my bullets?',
    'It suggests rewrites for a few of them. No number, employer or title appears that you didn’t write. A bullet with no result gets a stronger verb. The edit stays yours.',
  ],
]

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0)
  const baseId = useId()
  return (
    <div className="flex flex-col divide-y divide-border border-y border-border">
      {FAQS.map(([q, a], i) => (
        <div key={q}>
          <button
            type="button"
            id={`${baseId}-q${i}`}
            aria-expanded={open === i}
            aria-controls={`${baseId}-a${i}`}
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center justify-between gap-6 rounded-sm py-6 text-left text-base font-medium outline-none transition hover:text-primary focus-visible:ring-4 focus-visible:ring-ring/30"
          >
            <span>{q}</span>
            <ChevronDown
              aria-hidden="true"
              className={`size-5 shrink-0 text-muted-foreground transition-transform ${open === i ? 'rotate-180' : ''}`}
            />
          </button>
          <div
            id={`${baseId}-a${i}`}
            role="region"
            aria-labelledby={`${baseId}-q${i}`}
            inert={open !== i}
            className={`grid transition-[grid-template-rows] duration-300 ${open === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
          >
            <p className="min-h-0 overflow-hidden pr-10 text-sm leading-7 text-muted-foreground">
              {a}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
