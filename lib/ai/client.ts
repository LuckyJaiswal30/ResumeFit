import type { z } from 'zod'
import { resolveProvider, type ProviderConfig, type ProviderName } from './config'

const GEMINI_HOST = 'https://generativelanguage.googleapis.com/v1beta/models'
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

type JsonSchema = Record<string, unknown>

type GeminiPart = { text?: string; thought?: boolean }

export class AiUnavailableError extends Error {}

export class AiRequestError extends Error {}

export { resolveProvider }

export function isAiConfigured() {
  return resolveProvider() !== null
}

export function activeModel() {
  return resolveProvider()?.model ?? null
}

export function promptCharBudget() {
  return resolveProvider()?.promptChars ?? 9_000
}

function describeStatus(provider: ProviderName, status: number) {
  if (status === 401 || status === 403) return `the ${provider} API key was rejected`
  if (status === 404) return `the configured ${provider} model was not found`
  if (status === 413) return "the resume and posting were too long for this provider's limit"
  if (status === 429) return `${provider} is rate limiting right now`
  if (status >= 500) return `${provider} is having trouble`
  return `${provider} returned ${status}`
}

function toGeminiSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toGeminiSchema)
  if (node === null || typeof node !== 'object') return node

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === 'additionalProperties') continue
    if (key === 'type' && Array.isArray(value)) {
      const concrete = value.filter((entry) => entry !== 'null')
      result.type = concrete[0]
      if (value.length !== concrete.length) result.nullable = true
      continue
    }
    result[key] = toGeminiSchema(value)
  }
  return result
}

function extractGeminiText(payload: unknown) {
  const data = payload as {
    candidates?: Array<{ content?: { parts?: GeminiPart[] }; finishReason?: string }>
    promptFeedback?: { blockReason?: string }
  }

  const blockReason = data.promptFeedback?.blockReason
  if (blockReason) throw new AiRequestError(`the provider blocked the request (${blockReason})`)

  const candidate = data.candidates?.[0]
  const text = (candidate?.content?.parts ?? [])
    .filter((part) => part.thought !== true && typeof part.text === 'string')
    .map((part) => part.text as string)
    .join('')
    .trim()

  if (!text && candidate?.finishReason && candidate.finishReason !== 'STOP') {
    throw new AiRequestError(`the provider stopped early (${candidate.finishReason})`)
  }
  return text
}

function extractGroqText(payload: unknown) {
  const content = (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0]
    ?.message?.content
  return typeof content === 'string' ? content.trim() : ''
}

function stripCodeFence(text: string) {
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
  return fenced ? fenced[1].trim() : text
}

function isRetryable(status: number) {
  return status === 400 || status === 408 || status === 429 || status >= 500
}

function request(provider: ProviderConfig, prompt: string, schema: JsonSchema, timeoutMs: number) {
  if (provider.name === 'gemini') {
    return fetch(`${GEMINI_HOST}/${encodeURIComponent(provider.model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': provider.apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: toGeminiSchema(schema),
          maxOutputTokens: provider.completionTokens,
          temperature: provider.temperature,
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })
  }

  return fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: provider.temperature,
      max_completion_tokens: provider.completionTokens,
      messages: [{ role: 'user', content: prompt }],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'resumefit_response', strict: true, schema },
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  })
}

export async function generateJson<T>(options: {
  prompt: string
  schema: JsonSchema
  validator: z.ZodType<T>
  timeoutScale?: number
}): Promise<T> {
  const provider = resolveProvider()
  if (!provider) throw new AiUnavailableError('No AI provider is configured.')

  const timeoutMs = Math.round(provider.timeoutMs * (options.timeoutScale ?? 1))
  let response: Response | undefined
  let lastError: unknown

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await request(provider, options.prompt, options.schema, timeoutMs)
      if (response.ok || !isRetryable(response.status)) break
      lastError = new AiRequestError(describeStatus(provider.name, response.status))
    } catch (error) {
      lastError = error
      response = undefined
      if (error instanceof Error && error.name === 'TimeoutError') break
    }
  }

  if (!response) {
    throw new AiRequestError(
      lastError instanceof Error && lastError.name === 'TimeoutError'
        ? `${provider.name} did not respond in time`
        : `${provider.name} could not be reached`,
    )
  }
  if (!response.ok) throw new AiRequestError(describeStatus(provider.name, response.status))

  const payload: unknown = await response.json()
  const text = provider.name === 'gemini' ? extractGeminiText(payload) : extractGroqText(payload)
  if (!text) throw new AiRequestError(`${provider.name} returned an empty response`)

  return options.validator.parse(JSON.parse(stripCodeFence(text)))
}
