/**
 * Z-Image API - Cloudflare Workers Entry Point
 *
 * This is the entry point for deploying the API to Cloudflare Workers.
 * It exports the Hono app as the default export which Workers expects.
 */

import { createApp } from './app'
import { getCorsOriginsFromBindings } from './config'

export interface Env {
  CORS_ORIGINS?: string
}

// Cache app instance to avoid recreating on every request
let cachedApp: ReturnType<typeof createApp> | null = null
let cachedCorsOrigins: string | undefined

/**
 * Get or create cached app instance.
 * Only recreates if CORS_ORIGINS binding changes.
 */
function getApp(env: Env): ReturnType<typeof createApp> {
  const currentOrigins = env.CORS_ORIGINS

  // Return cached app if CORS config hasn't changed
  if (cachedApp && cachedCorsOrigins === currentOrigins) {
    return cachedApp
  }

  // Create new app and cache it
  cachedCorsOrigins = currentOrigins
  cachedApp = createApp({ corsOrigins: getCorsOriginsFromBindings(env) })

  return cachedApp
}

// Create app factory for Workers with bindings support
const handler = {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const app = getApp(env)
    return app.fetch(request, env, ctx)
  },
}

export default handler
