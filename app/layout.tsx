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
  description: 'Clear, specific resume feedback for the job you want.',
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
