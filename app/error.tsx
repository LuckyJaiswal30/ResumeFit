'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main id="main" className="flex flex-1 items-center bg-background px-5 py-24 text-foreground">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-3xl font-semibold tracking-[-0.05em]">Something went wrong</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          The page didn’t load properly. Try again, and if it keeps happening, let us know from the
          link in the footer.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-8 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-ring/30"
        >
          Try again
        </button>
      </div>
    </main>
  )
}
