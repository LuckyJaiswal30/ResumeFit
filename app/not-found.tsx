import Link from 'next/link'

export default function NotFound() {
  return (
    <main id="main" className="flex flex-1 items-center bg-background px-5 py-24 text-foreground">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-3xl font-semibold tracking-[-0.05em]">That page doesn’t exist</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          The link may be old or mistyped. Start from the home page, or run a comparison.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/upload"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-ring/30"
          >
            Start a comparison
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-input bg-background px-5 py-3.5 text-sm font-semibold outline-none transition-colors hover:bg-muted focus-visible:ring-4 focus-visible:ring-ring/30"
          >
            Back home
          </Link>
        </div>
      </div>
    </main>
  )
}
