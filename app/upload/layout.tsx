import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Compare your resume — ResumeFit',
  description: 'Add your resume and a job posting to see which requirements your resume proves.',
}

export default function UploadLayout({ children }: { children: React.ReactNode }) {
  return children
}
