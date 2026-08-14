/**
 * Rate Limiting Middleware
 *
 * Simple in-memory rate limiter using sliding window algorithm.
 * For production with multiple Workers instances, consider using
 * Cloudflare Rate Limiting, KV, or Durable Objects.
 */

import { Errors } from '@z-image/shared'
import type { MiddlewareHandler } from 'hono'
import { sendError } from './error-handler'

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitConfig {
  /** Time window in milliseconds (default: 60000 = 1 minute) */
  windowMs?: number
  /** Maximum requests per window (default: 10) */
  limit?: number
  /** Function to generate a unique key for the client */
  keyGenerator?: (c: Parameters<MiddlewareHandler>[0]) => string
  /** Skip rate limiting for certain requests */
  skip?: (c: Parameters<MiddlewareHandler>[0]) => boolean
}

// In-memory store (works for single instance, use KV/DO for distributed)
const store = new Map<string, RateLimitEntry>()

// Cleanup old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanupExpiredEntries(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return

  lastCleanup = now
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key)
    }
  }
}

/**
 * Default key generator - uses API key or IP address
 */
function defaultKeyGenerator(c: Parameters<MiddlewareHandler>[0]): string {
  // Prefer Authorization token for authenticated requests (OpenAI-style).
  const auth = c.req.header('Authorization')
  if (auth?.startsWith('Bearer ')) {
    const raw = auth.slice('Bearer '.length).trim()
    if (raw) return `key:${hashString(raw)}`
  }

  // Fall back to IP address
  const cfIp = c.req.header('CF-Connecting-IP')
  const xForwardedFor = c.req.header('X-Forwarded-For')
  const ip = cfIp || xForwardedFor?.split(',')[0]?.trim() || 'anonymous'

  return `ip:${ip}`
}

/**
 * Simple string hash function
 */
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}

/**
 * Create rate limiting middleware
 */
export function rateLimit(config: RateLimitConfig = {}): MiddlewareHandler {
  const {
    windowMs = 60 * 1000, // 1 minute
    limit = 10,
    keyGenerator = defaultKeyGenerator,
    skip,
  } = config

  return async (c, next) => {
    // Skip if configured
    if (skip?.(c)) {
      return next()
    }

    // Cleanup expired entries periodically
    cleanupExpiredEntries()

    const key = keyGenerator(c)
    const now = Date.now()

    let entry = store.get(key)

    // Create new entry or reset if window expired
    if (!entry || entry.resetAt < now) {
      entry = {
        count: 0,
        resetAt: now + windowMs,
      }
    }

    entry.count++
    store.set(key, entry)

    // Calculate remaining requests and reset time
    const remaining = Math.max(0, limit - entry.count)
    const resetInSeconds = Math.ceil((entry.resetAt - now) / 1000)

    // Set rate limit headers
    c.header('X-RateLimit-Limit', limit.toString())
    c.header('X-RateLimit-Remaining', remaining.toString())
    c.header('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000).toString())

    // Check if rate limit exceeded
    if (entry.count > limit) {
      c.header('Retry-After', resetInSeconds.toString())
      return sendError(c, Errors.rateLimited('API'))
    }

    return next()
  }
}

/**
 * Preset configurations for different endpoints
 */
export const rateLimitPresets = {
  /** Strict limit for generation endpoints (10 req/min) */
  generate: rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
  }),

  /** Moderate limit for optimization endpoints (20 req/min) */
  optimize: rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
  }),

  /** Relaxed limit for read-only endpoints (60 req/min) */
  readonly: rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
  }),

  /** Very strict limit for video generation (5 req/min) */
  video: rateLimit({
    windowMs: 60 * 1000,
    limit: 5,
  }),
}
