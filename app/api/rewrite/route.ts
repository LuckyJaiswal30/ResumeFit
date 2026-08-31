import { z } from 'zod'
import { AiUnavailableError, isAiConfigured } from '@/lib/ai/client'
import { requestBulletRewrite } from '@/lib/ai/review'
import { addsUnsupportedNumber } from '@/lib/resume/match'
import { checkRateLimit, rateLimitHeaders } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 30

const requestSchema = z.object({
  bullet: z.string().trim().min(20).max(900),
  jobDescription: z.string().trim().min(80).max(40_000),
})

export async function POST(request: Request) {
  const rate = await checkRateLimit(request, 'rewrite', 20, 10 * 60_000)
  const limitHeaders = rateLimitHeaders(rate)
  if (!rate.allowed) {
    return Response.json(
      { error: 'That is a lot of rewrites in a short space of time. Try again in a few minutes.' },
      { status: 429, headers: limitHeaders },
    )
  }

  if (!isAiConfigured()) {
    return Response.json(
      { error: 'Rewrites need a model key. Add one to .env.local and restart the server.' },
      { status: 503 },
    )
  }

  let payload: z.infer<typeof requestSchema>
  try {
    payload = requestSchema.parse(await request.json())
  } catch {
    return Response.json({ error: 'Send a whole bullet and the posting it is aimed at.' }, { status: 400 })
  }

  try {
    const result = await requestBulletRewrite(payload.bullet, payload.jobDescription)
    if (addsUnsupportedNumber(payload.bullet, result.rewrite)) {
      return Response.json(
        { error: 'The rewrite made up a number that is not in your bullet, so it was thrown away.' },
        { status: 422 },
      )
    }
    return Response.json(result, { headers: limitHeaders })
  } catch (error) {
    if (error instanceof AiUnavailableError) {
      return Response.json({ error: 'No model is set up.' }, { status: 503 })
    }
    return Response.json({ error: 'The rewrite did not come back. Try again.' }, { status: 502 })
  }
}
