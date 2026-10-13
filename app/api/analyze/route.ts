import { z } from 'zod'
import { buildAnalysis } from '@/lib/resume/analyze'
import { looksLikeResume, resumeRejectionMessage } from '@/lib/resume/looks-like-resume'
import { looksLikeJobPosting, postingRejectionMessage } from '@/lib/resume/looks-like-job-posting'
import { checkRateLimit, rateLimitHeaders } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 60

const requestSchema = z.object({
  resume: z.string().trim().min(80).max(80_000),
  jobDescription: z.string().trim().min(80).max(40_000),
})

export async function POST(request: Request) {
  const rate = await checkRateLimit(request, 'analyze', 15, 10 * 60_000)
  const limitHeaders = rateLimitHeaders(rate)
  if (!rate.allowed) {
    return Response.json(
      {
        error: 'That’s a lot of comparisons in a short space of time. Try again in a few minutes.',
      },
      { status: 429, headers: limitHeaders },
    )
  }

  let payload: z.infer<typeof requestSchema>
  try {
    payload = requestSchema.parse(await request.json())
  } catch (cause) {
    const tooLong =
      cause instanceof z.ZodError && cause.issues.some((issue) => issue.code === 'too_big')
    return Response.json(
      {
        error: tooLong
          ? 'The resume or the posting is too long. Trim it and try again.'
          : 'Send both a resume and a posting, at least 80 characters each.',
      },
      { status: tooLong ? 413 : 400, headers: limitHeaders },
    )
  }

  const check = looksLikeResume(payload.resume)
  if (!check.ok) {
    return Response.json(
      { error: resumeRejectionMessage(check) },
      { status: 422, headers: limitHeaders },
    )
  }

  const posting = looksLikeJobPosting(payload.jobDescription)
  if (!posting.ok) {
    return Response.json(
      { error: postingRejectionMessage(posting) },
      { status: 422, headers: limitHeaders },
    )
  }

  try {
    const analysis = await buildAnalysis(payload.resume, payload.jobDescription)
    return Response.json({ analysis }, { headers: limitHeaders })
  } catch {
    return Response.json(
      { error: 'The comparison didn’t finish. Try again.' },
      { status: 500, headers: limitHeaders },
    )
  }
}
