import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-5 py-12 sm:px-8 lg:px-10">
        <div className="grid gap-10 sm:grid-cols-[1.2fr_2fr]">
          <div>
            <Link href="/" className="text-lg font-semibold tracking-[-0.05em]">
              resumefit<span className="text-primary">.</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
              See where you actually stand before you hit send.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <div className="flex flex-col gap-3">
              <p className="font-medium text-foreground">Product</p>
              <Link
                href="/upload"
                className="text-muted-foreground transition hover:text-foreground"
              >
                Start a comparison
              </Link>
              <Link
                href="/#features"
                className="text-muted-foreground transition hover:text-foreground"
              >
                Features
              </Link>
              <Link href="/#faq" className="text-muted-foreground transition hover:text-foreground">
                FAQ
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              <p className="font-medium text-foreground">Support</p>
              <a
                href="mailto:luckyjaiswal3405@gmail.com"
                className="text-muted-foreground transition hover:text-foreground"
              >
                Contact us
              </a>
              <a
                href="mailto:luckyjaiswal3405@gmail.com?subject=ResumeFit%20bug%20report"
                className="text-muted-foreground transition hover:text-foreground"
              >
                Report a bug
              </a>
            </div>
            <div className="flex flex-col gap-3">
              <p className="font-medium text-foreground">Legal</p>
              <Link
                href="/privacy"
                className="text-muted-foreground transition hover:text-foreground"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-muted-foreground transition hover:text-foreground"
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
