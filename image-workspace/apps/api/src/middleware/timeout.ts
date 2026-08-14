/**
 * Timeout Middleware
 */

import { Errors } from '@z-image/shared'
import type { MiddlewareHandler } from 'hono'

/**
 * Create timeout middleware
 * @param timeoutMs Timeout in milliseconds (default: 120000ms = 2 minutes)
 */
export function timeout(timeoutMs = 120000): MiddlewareHandler {
  return async (_c, next) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    // Store reject function to call it from abort handler
    let rejectTimeout: ((reason: Error) => void) | null = null

    // Create abort handler that can be removed later
    const abortHandler = () => {
      rejectTimeout?.(Errors.timeout('API'))
    }

    try {
      // Create a promise that rejects on timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        rejectTimeout = reject
        controller.signal.addEventListener('abort', abortHandler)
      })

      // Race between the actual handler and timeout
      await Promise.race([next(), timeoutPromise])
    } finally {
      // Clean up: clear timeout and remove event listener to prevent memory leak
      clearTimeout(timeoutId)
      controller.signal.removeEventListener('abort', abortHandler)
      rejectTimeout = null
    }
  }
}
