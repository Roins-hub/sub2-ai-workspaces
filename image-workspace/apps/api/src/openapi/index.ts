/**
 * OpenAPI Configuration
 *
 * Exports OpenAPI app factory and documentation endpoint.
 */

import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono } from '@hono/zod-openapi'

export * from './routes'

/**
 * OpenAPI document configuration
 */
export const openApiConfig = {
  openapi: '3.1.0',
  info: {
    title: 'Z-Image API',
    version: '1.0.0',
    description: 'AI-powered image generation API supporting multiple providers.',
    contact: {
      name: 'Z-Image',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'API Server',
    },
  ],
  tags: [
    { name: 'Image Generation', description: 'Generate images using AI models' },
    { name: 'Image Processing', description: 'Process and enhance images' },
    { name: 'Prompt', description: 'Prompt optimization and translation' },
    { name: 'Video Generation', description: 'Generate videos from images' },
    { name: 'Providers', description: 'Provider and model information' },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey' as const,
        in: 'header' as const,
        name: 'X-API-Key',
        description: 'API key for Gitee AI provider',
      },
      HFTokenAuth: {
        type: 'apiKey' as const,
        in: 'header' as const,
        name: 'X-HF-Token',
        description: 'Token for HuggingFace provider (optional)',
      },
    },
  },
}

/**
 * Create an OpenAPI-enabled Hono app.
 * This can be used alongside the main app or as a replacement.
 *
 * @example
 * ```ts
 * import { createOpenAPIApp } from './openapi'
 *
 * const app = createOpenAPIApp()
 *
 * // Register routes using OpenAPI definitions
 * app.openapi(generateRoute, async (c) => {
 *   const body = c.req.valid('json')
 *   // ...
 * })
 *
 * // Serve OpenAPI documentation
 * app.doc('/doc', openApiConfig)
 * app.get('/ui', swaggerUI({ url: '/api/doc' }))
 * ```
 */
export function createOpenAPIApp() {
  const app = new OpenAPIHono()

  // Add OpenAPI documentation endpoint
  app.doc('/doc', openApiConfig)

  // Add Swagger UI (optional, can be removed in production)
  app.get(
    '/ui',
    swaggerUI({
      url: '/api/doc',
    })
  )

  return app
}
