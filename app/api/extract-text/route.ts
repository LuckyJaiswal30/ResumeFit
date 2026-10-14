import { AiRequestError } from '@/lib/ai/client'
import { ImageReaderBusyError, ImageUnreadableError } from '@/lib/resume/image-text'
import { looksLikeResume, resumeRejectionMessage } from '@/lib/resume/looks-like-resume'
import { PasswordProtectedError } from '@/lib/resume/pdf-text'
import { readResume, ResumeReadError } from '@/lib/resume/read-resume'
import { checkRateLimit, rateLimitHeaders } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_FILE_BYTES = 4 * 1024 * 1024
const MAX_BODY_BYTES = MAX_FILE_BYTES + 64 * 1024

function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

export async function POST(request: Request) {
  const rate = await checkRateLimit(request, 'extract', 30, 10 * 60_000)
  const limitHeaders = rateLimitHeaders(rate)
  if (!rate.allowed) {
    return Response.json(
      { error: 'That’s a lot of uploads in a short space of time. Try again in a few minutes.' },
      { status: 429, headers: limitHeaders },
    )
  }

  const declaredSize = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredSize) && declaredSize > MAX_BODY_BYTES) {
    return Response.json(
      { error: 'That file is over 4 MB. Try a smaller export.' },
      { status: 413, headers: limitHeaders },
    )
  }

  try {
    const formData = await request.formData()
    const files = formData.getAll('resume').filter((entry) => entry instanceof File)

    if (files.length === 0) return fail('Pick a resume file first.')
    const total = files.reduce((sum, file) => sum + file.size, 0)
    if (total > MAX_FILE_BYTES) return fail('That’s over 4 MB. Try a smaller export.')

    const { text } = await readResume(
      await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          bytes: new Uint8Array(await file.arrayBuffer()),
        })),
      ),
    )

    const check = looksLikeResume(text)
    if (!check.ok) return fail(resumeRejectionMessage(check), 422)

    return Response.json({ text }, { headers: limitHeaders })
  } catch (error) {
    if (error instanceof ResumeReadError) return fail(error.message, error.status)
    if (error instanceof PasswordProtectedError) {
      return fail('That PDF is password protected. Save an unlocked copy and upload that.', 422)
    }
    if (error instanceof ImageUnreadableError) {
      return fail(
        'No resume text could be made out. Try a sharper, well-lit photo of the whole page.',
        422,
      )
    }
    if (error instanceof ImageReaderBusyError) {
      return fail(
        'Reading scans and photos is busy right now. Try again in a minute, or upload a PDF, DOCX or TXT.',
        503,
      )
    }
    if (error instanceof AiRequestError) {
      return fail(
        'That scan or photo couldn’t be read just now. Try again, or upload a PDF, DOCX or TXT.',
        502,
      )
    }
    return fail(
      'That file could not be read. Try a different export, or save it as a .txt file.',
      422,
    )
  }
}
