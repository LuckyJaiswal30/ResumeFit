export type ProviderName = 'gemini' | 'groq'

export type ProviderConfig = {
  name: ProviderName
  apiKey: string
  model: string
  temperature: number
  timeoutMs: number
  promptChars: number
  completionTokens: number
}

type Defaults = {
  model: string
  promptChars: number
  completionTokens: number
}

const DEFAULTS: Record<ProviderName, Defaults> = {
  gemini: { model: 'gemini-3.5-flash-lite', promptChars: 16_000, completionTokens: 4500 },
  groq: { model: 'openai/gpt-oss-20b', promptChars: 9_000, completionTokens: 4500 },
}

const TEMPERATURE = { min: 0, max: 2, fallback: 0 }
const TIMEOUT_MS = { min: 5_000, max: 120_000, fallback: 30_000 }
const PROMPT_CHARS = { min: 2_000, max: 200_000 }
const COMPLETION_TOKENS = { min: 512, max: 32_000 }
const CACHE_MINUTES = { min: 0, max: 1440, fallback: 60 }

function readNumber(name: string, bounds: { min: number; max: number }, fallback: number) {
  const raw = process.env[name]?.trim()
  if (!raw) return fallback
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(bounds.max, Math.max(bounds.min, parsed))
}

function readKey(name: string) {
  const value = process.env[name]?.trim()
  return value && !value.startsWith('your_') ? value : null
}

function build(name: ProviderName, apiKey: string): ProviderConfig {
  const defaults = DEFAULTS[name]
  const modelVar = name === 'gemini' ? 'GEMINI_MODEL' : 'GROQ_MODEL'
  return {
    name,
    apiKey,
    model: process.env[modelVar]?.trim() || defaults.model,
    temperature: readNumber('AI_TEMPERATURE', TEMPERATURE, TEMPERATURE.fallback),
    timeoutMs: readNumber('AI_TIMEOUT_MS', TIMEOUT_MS, TIMEOUT_MS.fallback),
    promptChars: readNumber('AI_MAX_PROMPT_CHARS', PROMPT_CHARS, defaults.promptChars),
    completionTokens: readNumber(
      'AI_MAX_OUTPUT_TOKENS',
      COMPLETION_TOKENS,
      defaults.completionTokens,
    ),
  }
}

export function resolveProvider(): ProviderConfig | null {
  const requested = process.env.AI_PROVIDER?.trim().toLowerCase()
  const geminiKey = readKey('GEMINI_API_KEY')
  const groqKey = readKey('GROQ_API_KEY')

  if (requested === 'gemini') return geminiKey ? build('gemini', geminiKey) : null
  if (requested === 'groq') return groqKey ? build('groq', groqKey) : null
  if (geminiKey) return build('gemini', geminiKey)
  if (groqKey) return build('groq', groqKey)
  return null
}

export function cacheTtlMs() {
  return readNumber('AI_CACHE_MINUTES', CACHE_MINUTES, CACHE_MINUTES.fallback) * 60_000
}
