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
  title: 'ResumeFit — Know exactly why you fit',
  description: 'See which requirements your resume actually meets, with the line that proves each one.',
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
        {children}
        <SiteFooter />
      </body>
    </html>
  )
}
