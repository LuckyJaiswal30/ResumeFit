import { FlaskConical } from 'lucide-react'

export function SampleNote() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary p-5 text-sm">
      <FlaskConical
        className="mt-0.5 size-4 shrink-0 text-secondary-foreground"
        aria-hidden="true"
      />
      <div>
        <p className="font-medium text-secondary-foreground">This is example output</p>
        <p className="mt-1.5 leading-6 text-muted-foreground">
          A made-up resume against a made-up posting. The score, the quote checks and the parser
          report are worked out by the same code as a real run. Only the model’s wording is saved,
          so nothing was sent anywhere. Two of its quotes were rejected because they aren’t in the
          resume: that demoted Next.js to “Mentioned, not shown” and cut GraphQL to a partial match.
          To run it yourself, use the sample on the upload page.
        </p>
      </div>
    </div>
  )
}
