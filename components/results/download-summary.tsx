'use client'

import { Download } from 'lucide-react'
import { buildSummary } from '@/lib/resume/summary'
import type { Analysis } from '@/lib/resume/types'

export function DownloadSummary({ analysis, fileName }: { analysis: Analysis; fileName: string }) {
  const download = () => {
    const text = buildSummary(analysis, fileName)
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${fileName.replace(/\.[^.]+$/, '')}-resumefit.md`
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      type="button"
      onClick={download}
      className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3.5 py-2 text-sm font-medium outline-none transition-colors hover:bg-muted focus-visible:ring-4 focus-visible:ring-ring/30"
    >
      <Download className="size-4" aria-hidden="true" />
      Download summary
    </button>
  )
}
