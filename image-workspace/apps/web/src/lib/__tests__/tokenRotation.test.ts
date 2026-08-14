/**
 * Token Rotation Service Tests
 * Tests for multi-token management with automatic rotation on rate limits
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getNextAvailableToken,
  getTokenStats,
  isQuotaError,
  markTokenExhausted,
  parseTokens,
  resetAllTokens,
  resetProviderTokens,
} from '../tokenRotation'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('parseTokens', () => {
  // Note: parseTokens validates tokens (min 8 chars, alphanumeric with _-:.)
  it('should parse comma-separated tokens', () => {
    const result = parseTokens('hf_token_abc, hf_token_def, hf_token_ghi')
    expect(result).toEqual(['hf_token_abc', 'hf_token_def', 'hf_token_ghi'])
  })

  it('should trim whitespace from tokens', () => {
    const result = parseTokens('  hf_token_abc  ,  hf_token_def  ,  hf_token_ghi  ')
    expect(result).toEqual(['hf_token_abc', 'hf_token_def', 'hf_token_ghi'])
  })

  it('should filter empty tokens', () => {
    const result = parseTokens('hf_token_abc,,hf_token_def,  ,hf_token_ghi')
    expect(result).toEqual(['hf_token_abc', 'hf_token_def', 'hf_token_ghi'])
  })

  it('should return empty array for null/undefined input', () => {
    expect(parseTokens(null)).toEqual([])
    expect(parseTokens(undefined)).toEqual([])
    expect(parseTokens('')).toEqual([])
  })

  it('should handle single token', () => {
    const result = parseTokens('single_token_value')
    expect(result).toEqual(['single_token_value'])
  })

  it('should NOT split on Chinese comma', () => {
    const result = parseTokens('hf_token_abc，hf_token_def，hf_token_ghi')
    // Chinese commas are NOT recognized as separators, but the token contains invalid chars
    // so it gets filtered out by validation
    expect(result).toEqual([])
  })

  it('should filter out tokens that are too short', () => {
    const result = parseTokens('short, hf_valid_token_123')
    expect(result).toEqual(['hf_valid_token_123'])
  })

  it('should filter out tokens with invalid characters', () => {
    const result = parseTokens('valid_token_123, invalid@token!, another_valid_1')
    expect(result).toEqual(['valid_token_123', 'another_valid_1'])
  })
})

describe('Token Status Management', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  describe('getNextAvailableToken', () => {
    it('should return first token when none are exhausted', () => {
      const tokens = ['token1', 'token2', 'token3']
      const result = getNextAvailableToken('huggingface', tokens)
      expect(result).toBe('token1')
    })

    it('should skip exhausted tokens', () => {
      const tokens = ['token1', 'token2', 'token3']
      markTokenExhausted('huggingface', 'token1')

      const result = getNextAvailableToken('huggingface', tokens)
      expect(result).toBe('token2')
    })

    it('should return null when all tokens are exhausted', () => {
      const tokens = ['token1', 'token2']
      markTokenExhausted('huggingface', 'token1')
      markTokenExhausted('huggingface', 'token2')

      const result = getNextAvailableToken('huggingface', tokens)
      expect(result).toBeNull()
    })

    it('should return null for empty token array', () => {
      const result = getNextAvailableToken('huggingface', [])
      expect(result).toBeNull()
    })

    it('should track exhaustion per provider', () => {
      const tokens = ['token1', 'token2']

      // Exhaust token1 for huggingface
      markTokenExhausted('huggingface', 'token1')

      // token1 should still be available for gitee
      expect(getNextAvailableToken('gitee', tokens)).toBe('token1')

      // token1 should be skipped for huggingface
      expect(getNextAvailableToken('huggingface', tokens)).toBe('token2')
    })
  })

  describe('markTokenExhausted', () => {
    it('should mark a token as exhausted', () => {
      const tokens = ['token1', 'token2']
      markTokenExhausted('huggingface', 'token1')

      const stats = getTokenStats('huggingface', tokens)
      expect(stats.exhausted).toBe(1)
      expect(stats.active).toBe(1)
    })

    it('should handle marking same token multiple times', () => {
      const tokens = ['token1', 'token2']
      markTokenExhausted('huggingface', 'token1')
      markTokenExhausted('huggingface', 'token1')

      const stats = getTokenStats('huggingface', tokens)
      expect(stats.exhausted).toBe(1)
    })
  })

  describe('getTokenStats', () => {
    it('should return correct stats for fresh tokens', () => {
      const tokens = ['token1', 'token2', 'token3']
      const stats = getTokenStats('huggingface', tokens)

      expect(stats.total).toBe(3)
      expect(stats.active).toBe(3)
      expect(stats.exhausted).toBe(0)
    })

    it('should return correct stats after exhaustion', () => {
      const tokens = ['token1', 'token2', 'token3']
      markTokenExhausted('huggingface', 'token1')
      markTokenExhausted('huggingface', 'token2')

      const stats = getTokenStats('huggingface', tokens)
      expect(stats.total).toBe(3)
      expect(stats.active).toBe(1)
      expect(stats.exhausted).toBe(2)
    })

    it('should return zero stats for empty token array', () => {
      const stats = getTokenStats('huggingface', [])
      expect(stats.total).toBe(0)
      expect(stats.active).toBe(0)
      expect(stats.exhausted).toBe(0)
    })
  })

  describe('resetProviderTokens', () => {
    it('should reset exhausted tokens for a specific provider', () => {
      const tokens = ['token1', 'token2']

      // Exhaust tokens for both providers
      markTokenExhausted('huggingface', 'token1')
      markTokenExhausted('gitee', 'token1')

      // Reset only huggingface
      resetProviderTokens('huggingface')

      // huggingface should be reset
      expect(getTokenStats('huggingface', tokens).exhausted).toBe(0)

      // gitee should still have exhausted token
      expect(getTokenStats('gitee', tokens).exhausted).toBe(1)
    })
  })

  describe('resetAllTokens', () => {
    it('should reset all exhausted tokens for all providers', () => {
      const tokens = ['token1', 'token2']

      markTokenExhausted('huggingface', 'token1')
      markTokenExhausted('gitee', 'token1')
      markTokenExhausted('modelscope', 'token1')

      resetAllTokens()

      expect(getTokenStats('huggingface', tokens).exhausted).toBe(0)
      expect(getTokenStats('gitee', tokens).exhausted).toBe(0)
      expect(getTokenStats('modelscope', tokens).exhausted).toBe(0)
    })
  })
})

describe('isQuotaError', () => {
  it('should detect 429 status code', () => {
    expect(isQuotaError({ status: 429 })).toBe(true)
    expect(isQuotaError({ status: 200 })).toBe(false)
  })

  it('should detect rate limit error codes', () => {
    expect(isQuotaError({ code: 'RATE_LIMITED' })).toBe(true)
    expect(isQuotaError({ code: 'QUOTA_EXCEEDED' })).toBe(true)
    expect(isQuotaError({ code: 'INVALID_PROMPT' })).toBe(false)
  })

  it('should detect rate limit in error message', () => {
    expect(isQuotaError({ message: 'Rate limit exceeded' })).toBe(true)
    expect(isQuotaError({ message: 'Too many requests' })).toBe(true)
    expect(isQuotaError({ message: 'Quota exceeded for today' })).toBe(true)
    expect(isQuotaError({ message: 'Error 429: Too Many Requests' })).toBe(true)
    expect(isQuotaError({ message: 'Invalid token' })).toBe(false)
  })

  it('should detect rate limit in error property', () => {
    expect(isQuotaError({ error: 'Rate limit exceeded' })).toBe(true)
    expect(isQuotaError({ error: '429 Too Many Requests' })).toBe(true)
  })

  it('should detect Error instances with rate limit message', () => {
    expect(isQuotaError(new Error('Rate limit exceeded'))).toBe(true)
    expect(isQuotaError(new Error('429'))).toBe(true)
    expect(isQuotaError(new Error('Network error'))).toBe(false)
  })

  it('should return false for null/undefined', () => {
    expect(isQuotaError(null)).toBe(false)
    expect(isQuotaError(undefined)).toBe(false)
  })

  it('should return false for non-quota errors', () => {
    expect(isQuotaError({ status: 401 })).toBe(false)
    expect(isQuotaError({ status: 500 })).toBe(false)
    expect(isQuotaError({ code: 'AUTH_INVALID' })).toBe(false)
    expect(isQuotaError({ message: 'Invalid API key' })).toBe(false)
  })
})

describe('Daily Reset Behavior', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  afterEach(() => {
    localStorageMock.clear()
    vi.useRealTimers()
  })

  it('should reset exhausted tokens on new day', () => {
    const tokens = ['token1', 'token2']

    // Mock current date
    const today = new Date('2025-12-14T12:00:00Z')
    vi.useFakeTimers()
    vi.setSystemTime(today)

    // Mark token as exhausted
    markTokenExhausted('huggingface', 'token1')
    expect(getTokenStats('huggingface', tokens).exhausted).toBe(1)

    // Move to next day
    const tomorrow = new Date('2025-12-15T12:00:00Z')
    vi.setSystemTime(tomorrow)

    // Token should be available again (daily reset)
    expect(getTokenStats('huggingface', tokens).exhausted).toBe(0)
    expect(getNextAvailableToken('huggingface', tokens)).toBe('token1')
  })

  it('should keep exhausted status within same day', () => {
    const tokens = ['token1', 'token2']

    // Mock current date
    const morning = new Date('2025-12-14T08:00:00Z')
    vi.useFakeTimers()
    vi.setSystemTime(morning)

    // Mark token as exhausted
    markTokenExhausted('huggingface', 'token1')

    // Move to later same day
    const evening = new Date('2025-12-14T20:00:00Z')
    vi.setSystemTime(evening)

    // Token should still be exhausted
    expect(getTokenStats('huggingface', tokens).exhausted).toBe(1)
    expect(getNextAvailableToken('huggingface', tokens)).toBe('token2')
  })
})

describe('Token Rotation Flow', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  it('should simulate token rotation on consecutive rate limits', () => {
    const tokens = ['token1', 'token2', 'token3']

    // First request uses token1
    let currentToken = getNextAvailableToken('huggingface', tokens)
    expect(currentToken).toBe('token1')

    // Simulate 429 error - mark token1 as exhausted
    markTokenExhausted('huggingface', 'token1')

    // Second request uses token2
    currentToken = getNextAvailableToken('huggingface', tokens)
    expect(currentToken).toBe('token2')

    // Simulate another 429 error - mark token2 as exhausted
    markTokenExhausted('huggingface', 'token2')

    // Third request uses token3
    currentToken = getNextAvailableToken('huggingface', tokens)
    expect(currentToken).toBe('token3')

    // Simulate another 429 error - mark token3 as exhausted
    markTokenExhausted('huggingface', 'token3')

    // No more tokens available
    currentToken = getNextAvailableToken('huggingface', tokens)
    expect(currentToken).toBeNull()

    // Verify stats
    const stats = getTokenStats('huggingface', tokens)
    expect(stats.total).toBe(3)
    expect(stats.active).toBe(0)
    expect(stats.exhausted).toBe(3)
  })
})
