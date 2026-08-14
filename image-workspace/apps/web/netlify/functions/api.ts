/**
 * Netlify Functions - API Handler
 */

import { handle } from 'hono/aws-lambda'
import { createApp } from '../../../api/src/app'

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin: string) => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3000']

const app = createApp({ corsOrigins })

export const handler = handle(app)
