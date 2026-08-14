/**
 * Z-Image API - Configuration Module
 *
 * Unified configuration for all deployment platforms.
 * Supports environment variables for Node.js/Docker and bindings for Cloudflare.
 */

export interface ApiConfig {
  port: number
  corsOrigins: string[]
  environment: 'development' | 'production'
}

/**
 * Get configuration from environment variables
 * Works for Node.js, Docker, and platforms that support process.env
 */
export function getConfig(): ApiConfig {
  const env = process.env.NODE_ENV || 'development'
  const isDev = env === 'development'

  // Parse CORS origins from environment or use defaults
  const corsOriginsEnv = process.env.CORS_ORIGINS
  const defaultOrigins = isDev
    ? [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
        'http://localhost:4173',
      ]
    : []

  const corsOrigins = corsOriginsEnv
    ? corsOriginsEnv.split(',').map((origin) => origin.trim())
    : defaultOrigins

  return {
    port: Number(process.env.PORT) || 8787,
    corsOrigins,
    environment: isDev ? 'development' : 'production',
  }
}

/**
 * Get CORS origins for Cloudflare Workers/Pages
 * Uses bindings (env parameter) instead of process.env
 */
export function getCorsOriginsFromBindings(env?: { CORS_ORIGINS?: string }): string[] {
  const defaultOrigins = ['http://localhost:5173', 'http://localhost:3000']

  if (env?.CORS_ORIGINS) {
    return env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
  }

  return defaultOrigins
}
