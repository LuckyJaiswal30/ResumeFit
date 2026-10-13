import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Your analysis — ResumeFit',
  robots: { index: false, follow: false },
}

export default function ResultsLayout({ children }: { children: React.ReactNode }) {
  return children
}
