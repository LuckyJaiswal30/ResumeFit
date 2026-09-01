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
          A real analysis of a made-up resume, saved so you can look around without uploading
          anything. Nothing was sent anywhere to show you this.
        </p>
      </div>
    </div>
  )
}
