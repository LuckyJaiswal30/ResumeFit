'use client'

import { useRouter } from 'next/navigation'
import { storeAnalysisSession } from '@/lib/analysis-session'
import { SAMPLE_ANALYSIS, SAMPLE_FILE_NAME } from '@/lib/sample-analysis'

export function SampleLink({ className }: { className?: string }) {
  const router = useRouter()

  const openSample = () => {
    storeAnalysisSession({
      analysis: SAMPLE_ANALYSIS,
      fileName: SAMPLE_FILE_NAME,
      completedAt: Date.now(),
      isSample: true,
    })
    router.push('/results')
  }

  return (
    <button type="button" onClick={openSample} className={className}>
      See an example
    </button>
  )
}
