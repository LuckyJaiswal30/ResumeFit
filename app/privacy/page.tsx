import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <main className="flex-1 bg-background px-5 py-12 text-foreground sm:px-8">
      <article className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-primary">
          ← Back to ResumeFit
        </Link>
        <h1 className="mt-16 text-5xl font-semibold tracking-[-0.06em]">Privacy</h1>
        <p className="mt-5 text-muted-foreground">Last updated August 31, 2026</p>
        <div className="mt-12 flex flex-col gap-8 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">Your documents</h2>
            <p className="mt-2">
              Your resume and the posting produce the comparison you asked for, and nothing else.
              The file is never saved. Your text goes to the model that writes the analysis. The
              result is held for about an hour, so running the same pair again costs nothing. What
              you see stays in your browser tab and goes when you close it.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">Data minimization</h2>
            <p className="mt-2">
              There is no account and nothing to sign up for. Leave out anything a hiring manager
              wouldn’t need. The only thing checked is how your experience lines up with the
              posting.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">Questions</h2>
            <p className="mt-2">
              Questions about any of this go to{' '}
              <a className="text-primary underline" href="mailto:luckyjaiswal3405@gmail.com">
                luckyjaiswal3405@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </main>
  )
}
