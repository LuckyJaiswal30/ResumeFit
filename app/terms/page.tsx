import Link from 'next/link'

export default function TermsPage() {
  return (
    <main id="main" className="flex-1 bg-background px-5 py-12 text-foreground sm:px-8">
      <article className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-primary">
          ← Back to ResumeFit
        </Link>
        <h1 className="mt-16 text-5xl font-semibold tracking-[-0.06em]">Terms</h1>
        <p className="mt-5 text-muted-foreground">Last updated August 31, 2026</p>
        <div className="mt-12 flex flex-col gap-8 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">Use of the service</h2>
            <p className="mt-2">
              ResumeFit shows how your resume lines up with a posting. Every suggestion is yours to
              accept or ignore. The edits are yours to make.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">No guarantee</h2>
            <p className="mt-2">
              This isn’t employment, legal or recruiting advice. A good score doesn’t mean an
              interview. It reads two documents. It doesn’t predict anything.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">Contact</h2>
            <p className="mt-2">
              Questions or bug reports go to{' '}
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
