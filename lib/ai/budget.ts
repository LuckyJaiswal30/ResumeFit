import { checkSharedLimit } from '@/lib/security/rate-limit'
import type { ProviderConfig } from './config'

const DAY_MS = 24 * 60 * 60_000

export async function reserveProviderBudget(provider: ProviderConfig) {
  const scope = `${provider.name}:${provider.model}`
  const perMinute = await checkSharedLimit(`${scope}:minute`, provider.budgetPerMinute, 60_000)
  if (!perMinute.allowed) return false
  const perDay = await checkSharedLimit(`${scope}:day`, provider.budgetPerDay, DAY_MS)
  return perDay.allowed
}
