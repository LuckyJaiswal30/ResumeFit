import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import { SiteFooter } from '@/components/site-footer'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ResumeFit — Know what your resume proves',
  description: 'See which requirements your resume meets, and the line that proves each one.',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#fbfaf7',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="flex min-h-screen flex-col antialiased">
        <a
          href="#main"
          className="sr-only rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:absolute focus:left-5 focus:top-5 focus:z-50"
        >
          Skip to content
        </a>
        {children}
        <SiteFooter />
      </body>
    </html>
  )
}
