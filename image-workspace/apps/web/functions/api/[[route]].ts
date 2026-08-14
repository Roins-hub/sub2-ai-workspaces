/**
 * Cloudflare Pages Functions - API Handler
 *
 * This file handles all /api/* routes when deployed to Cloudflare Pages.
 * It uses the [[route]] catch-all pattern to route all API requests to Hono.
 */

import { handle } from 'hono/cloudflare-pages'
import { createApp } from '../../../api/src/app'

export interface Env {
  CORS_ORIGINS?: string
}

// Handler for Cloudflare Pages Functions
export const onRequest: PagesFunction<Env> = (context) => {
  // Parse CORS origins from environment binding
  const corsOrigins = context.env.CORS_ORIGINS
    ? context.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
    : ['http://localhost:5173', 'http://localhost:3000']

  const app = createApp({ corsOrigins })
  return handle(app)(context)
}
