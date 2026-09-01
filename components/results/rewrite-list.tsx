import type { BulletRewrite } from '@/lib/resume/types'

export function RewriteList({ rewrites }: { rewrites: BulletRewrite[] }) {
  if (rewrites.length === 0) return null

  return (
    <section>
      <h2 className="text-xl font-semibold tracking-[-0.03em]">Bullets worth rewriting</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Same facts, sharper wording. Nothing added.
      </p>
      <ul className="mt-6 flex flex-col gap-3">
        {rewrites.map((rewrite) => (
          <li key={rewrite.original} className="rounded-lg border border-border p-4 text-sm">
            <p className="font-mono text-[11px] text-muted-foreground">yours</p>
            <p className="mt-1.5 leading-6 text-muted-foreground">{rewrite.original}</p>
            <p className="mt-4 font-mono text-[11px] text-muted-foreground">suggested</p>
            <p className="mt-1.5 leading-6 font-medium">{rewrite.rewrite}</p>
            {rewrite.reason && (
              <p className="mt-3 border-t border-border pt-3 leading-6 text-muted-foreground">
                {rewrite.reason}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
