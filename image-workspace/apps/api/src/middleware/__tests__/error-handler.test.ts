/**
 * Error Handler Middleware Tests
 */

import { ApiError, ApiErrorCode, Errors } from '@z-image/shared'
import { describe, expect, it } from 'vitest'
import { toApiError } from '../error-handler'

describe('toApiError', () => {
  describe('ApiError passthrough', () => {
    it('should return ApiError as-is', () => {
      const original = Errors.authRequired('Test Provider')
      const result = toApiError(original)
      expect(result).toBe(original)
      expect(result.code).toBe(ApiErrorCode.AUTH_REQUIRED)
    })

    it('should preserve all ApiError properties', () => {
      const original = Errors.invalidParams('prompt', 'Too long')
      const result = toApiError(original)
      expect(result.message).toBe('Too long')
      expect(result.code).toBe(ApiErrorCode.INVALID_PARAMS)
      expect(result.details?.field).toBe('prompt')
    })
  })

  describe('Error conversion', () => {
    it('should convert timeout Error to TIMEOUT ApiError', () => {
      const err = new Error('Request timeout exceeded')
      const result = toApiError(err)
      expect(result.code).toBe(ApiErrorCode.TIMEOUT)
      expect(result.message).toContain('timed out')
    })

    it('should convert Timeout Error (capitalized)', () => {
      const err = new Error('Timeout: operation took too long')
      const result = toApiError(err)
      expect(result.code).toBe(ApiErrorCode.TIMEOUT)
    })

    it('should convert generic Error to UNKNOWN ApiError', () => {
      const err = new Error('Something went wrong')
      const result = toApiError(err)
      expect(result.code).toBe(ApiErrorCode.UNKNOWN)
      expect(result.message).toBe('Something went wrong')
    })
  })

  describe('Unknown types', () => {
    it('should handle string input', () => {
      const result = toApiError('string error')
      expect(result.code).toBe(ApiErrorCode.UNKNOWN)
      expect(result.message).toBe('An unknown error occurred')
    })

    it('should handle null', () => {
      const result = toApiError(null)
      expect(result.code).toBe(ApiErrorCode.UNKNOWN)
    })

    it('should handle undefined', () => {
      const result = toApiError(undefined)
      expect(result.code).toBe(ApiErrorCode.UNKNOWN)
    })

    it('should handle object without message', () => {
      const result = toApiError({ code: 500 })
      expect(result.code).toBe(ApiErrorCode.UNKNOWN)
    })
  })
})

describe('ApiError', () => {
  describe('constructor', () => {
    it('should set correct properties', () => {
      const error = new ApiError('Test message', ApiErrorCode.AUTH_REQUIRED, {
        provider: 'TestProvider',
      })
      expect(error.message).toBe('Test message')
      expect(error.code).toBe(ApiErrorCode.AUTH_REQUIRED)
      expect(error.statusCode).toBe(401)
      expect(error.details?.provider).toBe('TestProvider')
    })

    it('should map error codes to correct status codes', () => {
      expect(new ApiError('', ApiErrorCode.AUTH_REQUIRED).statusCode).toBe(401)
      expect(new ApiError('', ApiErrorCode.RATE_LIMITED).statusCode).toBe(429)
      expect(new ApiError('', ApiErrorCode.INVALID_PROMPT).statusCode).toBe(400)
      expect(new ApiError('', ApiErrorCode.PROVIDER_ERROR).statusCode).toBe(502)
      expect(new ApiError('', ApiErrorCode.TIMEOUT).statusCode).toBe(504)
    })
  })

  describe('toResponse', () => {
    it('should return correct response structure', () => {
      const error = Errors.quotaExceeded('Gitee AI')
      const response = error.toResponse()

      expect(response).toEqual({
        error: 'API quota exceeded for Gitee AI',
        code: ApiErrorCode.QUOTA_EXCEEDED,
        details: { provider: 'Gitee AI' },
      })
    })

    it('should omit details if not provided', () => {
      const error = new ApiError('Test', ApiErrorCode.UNKNOWN)
      const response = error.toResponse()

      expect(response).toEqual({
        error: 'Test',
        code: ApiErrorCode.UNKNOWN,
      })
      expect(response.details).toBeUndefined()
    })
  })
})

describe('Errors factory', () => {
  it('should create authRequired error', () => {
    const error = Errors.authRequired('Gitee AI')
    expect(error.code).toBe(ApiErrorCode.AUTH_REQUIRED)
    expect(error.message).toContain('required')
    expect(error.message).toContain('Gitee AI')
  })

  it('should create authInvalid error with upstream', () => {
    const error = Errors.authInvalid('HuggingFace', 'Invalid token format')
    expect(error.code).toBe(ApiErrorCode.AUTH_INVALID)
    expect(error.details?.upstream).toBe('Invalid token format')
  })

  it('should create rateLimited error with retryAfter', () => {
    const error = Errors.rateLimited('API', 60)
    expect(error.code).toBe(ApiErrorCode.RATE_LIMITED)
    expect(error.details?.retryAfter).toBe(60)
  })

  it('should create invalidPrompt error', () => {
    const error = Errors.invalidPrompt('Prompt too long')
    expect(error.code).toBe(ApiErrorCode.INVALID_PROMPT)
    expect(error.details?.field).toBe('prompt')
  })

  it('should create providerError with upstream message', () => {
    const error = Errors.providerError('Gitee', 'Internal server error')
    expect(error.code).toBe(ApiErrorCode.PROVIDER_ERROR)
    expect(error.message).toContain('Gitee')
    expect(error.details?.upstream).toBe('Internal server error')
  })
})
