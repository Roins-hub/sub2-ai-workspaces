import { isQuotaError } from './error'

export interface TokenStats {
  total: number
  active: number
  exhausted: number
}

function getUTCDateString(): string {
  return new Date().toISOString().split('T')[0]
}

function isValidTokenFormat(token: string): boolean {
  return token.length >= 8 && /^[a-zA-Z0-9_\-:.]+$/.test(token)
}

export function parseTokens(rawInput: string | null | undefined): string[] {
  if (!rawInput) return []
  return rawInput
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && isValidTokenFormat(t))
}

export class TokenManager {
  private exhaustedTokens: Map<string, Set<string>> = new Map()
  private lastResetDate = ''

  private checkDailyReset() {
    const today = getUTCDateString()
    if (this.lastResetDate !== today) {
      this.exhaustedTokens.clear()
      this.lastResetDate = today
    }
  }

  getNextToken(channelId: string, allTokens: string[]): string | null {
    this.checkDailyReset()
    const exhausted = this.exhaustedTokens.get(channelId) || new Set<string>()
    return allTokens.find((t) => !exhausted.has(t)) || null
  }

  markExhausted(channelId: string, token: string): void {
    if (!this.exhaustedTokens.has(channelId)) {
      this.exhaustedTokens.set(channelId, new Set())
    }
    this.exhaustedTokens.get(channelId)!.add(token)
  }

  getStats(channelId: string, allTokens: string[]): TokenStats {
    const exhausted = this.exhaustedTokens.get(channelId) || new Set<string>()
    const exhaustedCount = allTokens.filter((t) => exhausted.has(t)).length
    return {
      total: allTokens.length,
      active: allTokens.length - exhaustedCount,
      exhausted: exhaustedCount,
    }
  }

  reset(channelId?: string): void {
    if (channelId) this.exhaustedTokens.delete(channelId)
    else this.exhaustedTokens.clear()
  }
}

export const tokenManager = new TokenManager()

export async function runWithTokenRotation<T>(
  channelId: string,
  allTokens: string[],
  operation: (token: string | null) => Promise<T>,
  options: { allowAnonymous?: boolean; maxRetries?: number } = {}
): Promise<T> {
  const { allowAnonymous = false, maxRetries = 10 } = options

  if (allTokens.length === 0) {
    if (allowAnonymous) return operation(null)
    throw new Error('No API tokens configured')
  }

  let attempts = 0
  while (attempts < maxRetries) {
    const token = tokenManager.getNextToken(channelId, allTokens)

    if (!token) {
      if (allowAnonymous) return operation(null)
      throw new Error('All API tokens exhausted')
    }

    try {
      return await operation(token)
    } catch (err) {
      if (isQuotaError(err)) {
        tokenManager.markExhausted(channelId, token)
        attempts++
        continue
      }
      throw err
    }
  }

  throw new Error('Maximum retry attempts reached')
}
