import { z } from 'zod'
import { buildAnalysis } from '@/lib/resume/analyze'
import { looksLikeResume, resumeRejectionMessage } from '@/lib/resume/looks-like-resume'
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
      { error: 'You have run a lot of analyses in a short window. Try again in a few minutes.' },
      { status: 429, headers: limitHeaders },
    )
  }

  let payload: z.infer<typeof requestSchema>
  try {
    payload = requestSchema.parse(await request.json())
  } catch {
    return Response.json(
      { error: 'Add both a resume and a job description, at least 80 characters each.' },
      { status: 400, headers: limitHeaders },
    )
  }

  const check = looksLikeResume(payload.resume)
  if (!check.ok) {
    return Response.json(
      { error: resumeRejectionMessage(check) },
      { status: 422, headers: limitHeaders },
    )
  }

  try {
    const analysis = await buildAnalysis(payload.resume, payload.jobDescription)
    return Response.json({ analysis }, { headers: limitHeaders })
  } catch {
    return Response.json(
      { error: 'The analysis did not finish. Try again.' },
      { status: 500, headers: limitHeaders },
    )
  }
}
