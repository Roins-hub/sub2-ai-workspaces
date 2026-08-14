/**
 * Token Rotation Service
 *
 * Manages multiple API tokens with automatic rotation on rate limit (429) errors.
 * Features:
 * - Support for multiple comma-separated tokens per provider
 * - Automatic daily reset of exhausted token status
 * - Round-robin selection of available tokens
 * - Retry wrapper for API calls with automatic token switching
 */

import type { TokenProvider } from './crypto'

// Storage key for token exhaustion status
const TOKEN_STATUS_KEY = 'zenith-token-status'

// Maximum retry attempts before giving up
const MAX_RETRY_ATTEMPTS = 10

/**
 * Token status store structure
 * Stored in localStorage, resets daily (UTC)
 */
interface TokenStatusStore {
  /** UTC date string (YYYY-MM-DD) when status was last updated */
  date: string
  /** Map of provider -> { token: exhausted } */
  exhausted: Record<string, Record<string, boolean>>
}

/**
 * Get current UTC date string
 */
function getUTCDateString(): string {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

/**
 * Get token status store from localStorage
 * Automatically resets if date has changed (daily reset)
 */
function getTokenStatusStore(): TokenStatusStore {
  try {
    const stored = localStorage.getItem(TOKEN_STATUS_KEY)
    if (stored) {
      const store = JSON.parse(stored) as TokenStatusStore
      // Reset if day has changed
      if (store.date !== getUTCDateString()) {
        return { date: getUTCDateString(), exhausted: {} }
      }
      return store
    }
  } catch {
    // Ignore parse errors
  }
  return { date: getUTCDateString(), exhausted: {} }
}

/**
 * Save token status store to localStorage
 */
function saveTokenStatusStore(store: TokenStatusStore): void {
  localStorage.setItem(TOKEN_STATUS_KEY, JSON.stringify(store))
}

/**
 * Basic token format validation
 * Tokens should be alphanumeric with common special chars, min 8 chars
 */
function isValidTokenFormat(token: string): boolean {
  return token.length >= 8 && /^[a-zA-Z0-9_\-:.]+$/.test(token)
}

/**
 * Parse comma-separated tokens into array with basic validation
 */
export function parseTokens(rawInput: string | null | undefined): string[] {
  if (!rawInput) return []
  return rawInput
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && isValidTokenFormat(t))
}

/**
 * Check if a specific token is exhausted for a provider
 */
export function isTokenExhausted(provider: TokenProvider, token: string): boolean {
  const store = getTokenStatusStore()
  return store.exhausted[provider]?.[token] === true
}

/**
 * Mark a token as exhausted for a provider
 */
export function markTokenExhausted(provider: TokenProvider, token: string): void {
  const store = getTokenStatusStore()
  if (!store.exhausted[provider]) {
    store.exhausted[provider] = {}
  }
  store.exhausted[provider][token] = true
  saveTokenStatusStore(store)
}

/**
 * Get the next available (non-exhausted) token for a provider
 * Returns null if all tokens are exhausted or no tokens configured
 */
export function getNextAvailableToken(provider: TokenProvider, allTokens: string[]): string | null {
  if (allTokens.length === 0) return null

  const store = getTokenStatusStore()
  const exhaustedMap = store.exhausted[provider] || {}

  // Find first non-exhausted token
  return allTokens.find((token) => !exhaustedMap[token]) || null
}

/**
 * Get token statistics for a provider
 */
export interface TokenStats {
  /** Total number of configured tokens */
  total: number
  /** Number of tokens still available */
  active: number
  /** Number of exhausted tokens */
  exhausted: number
}

export function getTokenStats(provider: TokenProvider, allTokens: string[]): TokenStats {
  const store = getTokenStatusStore()
  const exhaustedMap = store.exhausted[provider] || {}

  const exhaustedCount = allTokens.filter((t) => exhaustedMap[t]).length

  return {
    total: allTokens.length,
    active: allTokens.length - exhaustedCount,
    exhausted: exhaustedCount,
  }
}

/**
 * Reset exhausted status for a specific provider
 */
export function resetProviderTokens(provider: TokenProvider): void {
  const store = getTokenStatusStore()
  delete store.exhausted[provider]
  saveTokenStatusStore(store)
}

/**
 * Reset all exhausted tokens (manual reset)
 */
export function resetAllTokens(): void {
  saveTokenStatusStore({ date: getUTCDateString(), exhausted: {} })
}

/**
 * Check if an error indicates rate limiting / quota exhaustion
 */
export function isQuotaError(error: unknown): boolean {
  if (!error) return false

  // Check Response status
  if (error instanceof Response) {
    return error.status === 429
  }

  // Check error object properties
  if (typeof error === 'object') {
    const err = error as Record<string, unknown>

    // Check status code
    if (err.status === 429) return true

    // Check error code
    if (err.code === 'RATE_LIMITED' || err.code === 'QUOTA_EXCEEDED') return true

    // OpenAI-style nested error object
    if (err.error && typeof err.error === 'object') {
      const oai = err.error as Record<string, unknown>
      if (oai.code === 'RATE_LIMITED' || oai.code === 'QUOTA_EXCEEDED') return true
      if (oai.type === 'RATE_LIMITED' || oai.type === 'QUOTA_EXCEEDED') return true
      if (typeof oai.message === 'string') {
        const msg = oai.message.toLowerCase()
        if (
          msg.includes('429') ||
          msg.includes('rate limit') ||
          msg.includes('quota') ||
          msg.includes('too many requests')
        ) {
          return true
        }
      }
    }

    // Check message
    if (typeof err.message === 'string') {
      const msg = err.message.toLowerCase()
      if (
        msg.includes('429') ||
        msg.includes('rate limit') ||
        msg.includes('quota') ||
        msg.includes('too many requests')
      ) {
        return true
      }
    }

    // Check nested error
    if (err.error && typeof err.error === 'string') {
      const errStr = err.error.toLowerCase()
      if (
        errStr.includes('429') ||
        errStr.includes('rate limit') ||
        errStr.includes('quota') ||
        errStr.includes('too many requests')
      ) {
        return true
      }
    }
  }

  // Check Error message
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return (
      msg.includes('429') ||
      msg.includes('rate limit') ||
      msg.includes('quota') ||
      msg.includes('too many requests')
    )
  }

  return false
}

/**
 * Token rotation operation result
 */
export interface TokenRotationResult<T> {
  success: true
  data: T
  tokenUsed: string | null
}

export interface TokenRotationError {
  success: false
  error: string
  isAllExhausted: boolean
}

export type TokenRotationResponse<T> = TokenRotationResult<T> | TokenRotationError

/**
 * Run an operation with automatic token rotation
 *
 * @param provider - The provider to use
 * @param allTokens - All available tokens for the provider
 * @param operation - The async operation to run (receives token, may be null for anonymous)
 * @param options - Additional options
 * @returns The operation result or error
 */
export async function runWithTokenRotation<T>(
  provider: TokenProvider,
  allTokens: string[],
  operation: (token: string | null) => Promise<T>,
  options: {
    /** Allow anonymous (no token) calls if all tokens exhausted */
    allowAnonymous?: boolean
  } = {}
): Promise<TokenRotationResponse<T>> {
  const { allowAnonymous = false } = options

  // No tokens configured
  if (allTokens.length === 0) {
    if (allowAnonymous) {
      try {
        const result = await operation(null)
        return { success: true, data: result, tokenUsed: null }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          isAllExhausted: false,
        }
      }
    }
    return {
      success: false,
      error: 'No API tokens configured',
      isAllExhausted: false,
    }
  }

  let attempts = 0

  while (attempts < MAX_RETRY_ATTEMPTS) {
    const token = getNextAvailableToken(provider, allTokens)

    // All tokens exhausted
    if (!token) {
      if (allowAnonymous) {
        try {
          const result = await operation(null)
          return { success: true, data: result, tokenUsed: null }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            isAllExhausted: true,
          }
        }
      }
      return {
        success: false,
        error: 'All API tokens exhausted. Quota will reset tomorrow.',
        isAllExhausted: true,
      }
    }

    try {
      const result = await operation(token)
      return { success: true, data: result, tokenUsed: token }
    } catch (error) {
      if (isQuotaError(error)) {
        // Mark token as exhausted and try next
        markTokenExhausted(provider, token)
        attempts++
        continue
      }

      // Non-quota error, throw immediately
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        isAllExhausted: false,
      }
    }
  }

  return {
    success: false,
    error: 'Maximum retry attempts reached',
    isAllExhausted: true,
  }
}
