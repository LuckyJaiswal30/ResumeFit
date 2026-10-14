import Link from 'next/link'
import { ReportBug } from '@/components/report-bug'

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-[84rem] flex-col gap-10 px-5 py-12 sm:px-8 lg:px-10">
        <div className="grid gap-10 sm:grid-cols-[1.2fr_2fr]">
          <div>
            <Link
              href="/"
              className="rounded-sm text-lg font-semibold tracking-[-0.05em] outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
            >
              resumefit<span className="text-primary">.</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
              See where you stand before you hit send.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <div className="flex flex-col gap-3">
              <p className="font-medium text-foreground">Product</p>
              <Link
                href="/upload"
                className="rounded-sm text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/30"
              >
                Start a comparison
              </Link>
              <Link
                href="/#features"
                className="rounded-sm text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/30"
              >
                Features
              </Link>
              <Link
                href="/#faq"
                className="rounded-sm text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/30"
              >
                FAQ
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              <p className="font-medium text-foreground">Support</p>
              <a
                href="mailto:luckyjaiswal3405@gmail.com"
                className="rounded-sm text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/30"
              >
                Contact us
              </a>
              <ReportBug />
            </div>
            <div className="flex flex-col gap-3">
              <p className="font-medium text-foreground">Legal</p>
              <Link
                href="/privacy"
                className="rounded-sm text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/30"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="rounded-sm text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/30"
              >
                Terms
              </Link>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <span>© 2026 ResumeFit</span>
          <span>Your resume stays yours.</span>
        </div>
      </div>
    </footer>
  )
}
