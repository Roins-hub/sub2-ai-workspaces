/**
 * Global Error Handler Middleware
 */

import { ApiError, Errors, type OpenAIErrorResponse } from '@z-image/shared'
import type { Context, ErrorHandler, NotFoundHandler } from 'hono'

/**
 * Convert any error to ApiError
 */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) {
    return err
  }
  if (err instanceof Error) {
    // Check for timeout errors
    if (err.message.includes('timeout') || err.message.includes('Timeout')) {
      return Errors.timeout('API')
    }
    return Errors.unknown(err.message)
  }
  return Errors.unknown('An unknown error occurred')
}

/**
 * Send error response helper
 */
export function sendError(c: Context, err: unknown): Response {
  const apiError = toApiError(err)
  const response: OpenAIErrorResponse = {
    error: {
      message: apiError.message,
      type: apiError.code,
      param: apiError.details?.field ?? null,
      code: apiError.code,
    },
  }
  return c.json(response, apiError.statusCode as 400 | 401 | 429 | 500 | 502 | 504)
}

/**
 * Sanitize error for logging to prevent sensitive data leakage
 */
function sanitizeErrorForLogging(err: unknown): { name: string; message: string; stack?: string } {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      // Only include stack in development
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    }
  }
  return {
    name: 'UnknownError',
    message: typeof err === 'string' ? err : 'An unknown error occurred',
  }
}

/**
 * Global error handler for Hono
 */
export const errorHandler: ErrorHandler = (err, c) => {
  // Log error with request ID if available
  const requestId = c.get('requestId') || 'unknown'

  // Sanitize error to prevent logging sensitive information (e.g., API keys in error messages)
  const safeError = sanitizeErrorForLogging(err)
  console.error(`[${requestId}] Unhandled error:`, safeError)

  return sendError(c, err)
}

/**
 * Not found handler for Hono
 */
export const notFoundHandler: NotFoundHandler = (c) => {
  const response: OpenAIErrorResponse = {
    error: { message: 'Not found', type: 'NOT_FOUND', param: null, code: 'NOT_FOUND' },
  }
  return c.json(response, 404)
}
