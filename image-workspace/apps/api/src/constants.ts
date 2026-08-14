/**
 * API Constants
 *
 * Centralized constants for the API to avoid magic numbers throughout the codebase.
 */

/** Maximum value for 32-bit signed integer (used for seed generation) */
export const MAX_INT32 = 2147483647

/** Timeout durations in milliseconds */
export const TIMEOUTS = {
  /** Default timeout for generation endpoints (2 minutes) */
  GENERATION: 120_000,
  /** Timeout for LLM optimization (1 minute) */
  OPTIMIZE: 60_000,
  /** Timeout for translation (30 seconds) */
  TRANSLATE: 30_000,
  /** Timeout for video task operations (30 seconds) */
  VIDEO: 30_000,
} as const

/** Request body size limits in bytes */
export const BODY_LIMITS = {
  /** Default body limit (50KB) */
  DEFAULT: 50 * 1024,
  /** Translation body limit (20KB) */
  TRANSLATE: 20 * 1024,
} as const

/** Image proxy configuration */
export const IMAGE_PROXY = {
  /** Maximum image size for proxy (10MB) */
  MAX_SIZE: 10 * 1024 * 1024,
  /** Cache duration in seconds (24 hours) */
  CACHE_DURATION: 86400,
} as const

/** Video generation configuration */
export const VIDEO = {
  /** Recommended polling interval in seconds */
  POLL_INTERVAL: 3,
} as const

/** Prompt length limits */
export const PROMPT_LIMITS = {
  /** Maximum prompt length for optimization */
  OPTIMIZE: 4000,
  /** Maximum prompt length for translation */
  TRANSLATE: 2000,
} as const
