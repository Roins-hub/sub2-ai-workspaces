/**
 * OpenAPI Route Definitions
 *
 * Defines OpenAPI-compliant routes using @hono/zod-openapi.
 * These can be used to generate OpenAPI documentation automatically.
 */

import { createRoute, z } from '@hono/zod-openapi'
import {
  ErrorResponseSchema,
  GenerateRequestSchema,
  GenerateResponseSchema,
  OptimizeRequestSchema,
  OptimizeResponseSchema,
  TranslateRequestSchema,
  TranslateResponseSchema,
  UpscaleRequestSchema,
  UpscaleResponseSchema,
  VideoGenerateRequestSchema,
  VideoStatusResponseSchema,
  VideoTaskResponseSchema,
} from '../schemas'

// ============================================================================
// Generate Routes
// ============================================================================

export const generateRoute = createRoute({
  method: 'post',
  path: '/generate',
  tags: ['Image Generation'],
  summary: 'Generate an image',
  description: 'Generate an image using the specified provider and model.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: GenerateRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Image generated successfully',
      content: {
        'application/json': {
          schema: GenerateResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request parameters',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Authentication required',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    429: {
      description: 'Rate limit exceeded',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    502: {
      description: 'Provider error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
})

// ============================================================================
// Optimize Routes
// ============================================================================

export const optimizeRoute = createRoute({
  method: 'post',
  path: '/optimize',
  tags: ['Prompt'],
  summary: 'Optimize a prompt',
  description: 'Optimize an image generation prompt using an LLM.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: OptimizeRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Prompt optimized successfully',
      content: {
        'application/json': {
          schema: OptimizeResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request parameters',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
})

// ============================================================================
// Translate Routes
// ============================================================================

export const translateRoute = createRoute({
  method: 'post',
  path: '/translate',
  tags: ['Prompt'],
  summary: 'Translate a prompt',
  description: 'Translate a Chinese prompt to English.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: TranslateRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Prompt translated successfully',
      content: {
        'application/json': {
          schema: TranslateResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request parameters',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
})

// ============================================================================
// Upscale Routes
// ============================================================================

export const upscaleRoute = createRoute({
  method: 'post',
  path: '/upscale',
  tags: ['Image Processing'],
  summary: 'Upscale an image',
  description: 'Upscale an image using RealESRGAN.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: UpscaleRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Image upscaled successfully',
      content: {
        'application/json': {
          schema: UpscaleResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request parameters',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
})

// ============================================================================
// Video Routes
// ============================================================================

export const videoGenerateRoute = createRoute({
  method: 'post',
  path: '/video/generate',
  tags: ['Video Generation'],
  summary: 'Create a video generation task',
  description: 'Create an image-to-video generation task.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: VideoGenerateRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Video task created successfully',
      content: {
        'application/json': {
          schema: VideoTaskResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request parameters',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Authentication required',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
})

export const videoStatusRoute = createRoute({
  method: 'get',
  path: '/video/status/{taskId}',
  tags: ['Video Generation'],
  summary: 'Get video task status',
  description: 'Query the status of a video generation task.',
  request: {
    params: z.object({
      taskId: z.string().openapi({ description: 'The video task ID' }),
    }),
  },
  responses: {
    200: {
      description: 'Video task status',
      content: {
        'application/json': {
          schema: VideoStatusResponseSchema,
        },
      },
      headers: z.object({
        'Retry-After': z.string().optional().openapi({
          description: 'Recommended polling interval in seconds (for pending/processing status)',
        }),
      }),
    },
    401: {
      description: 'Authentication required',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
})

// ============================================================================
// Provider Routes
// ============================================================================

export const getProvidersRoute = createRoute({
  method: 'get',
  path: '/providers',
  tags: ['Providers'],
  summary: 'List all providers',
  description: 'Get a list of all available image generation providers.',
  responses: {
    200: {
      description: 'List of providers',
      content: {
        'application/json': {
          schema: z.object({
            providers: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                requiresAuth: z.boolean(),
                authHeader: z.string(),
              })
            ),
          }),
        },
      },
    },
  },
})

export const getModelsRoute = createRoute({
  method: 'get',
  path: '/models',
  tags: ['Providers'],
  summary: 'List all models',
  description: 'Get a list of all available models across all providers.',
  responses: {
    200: {
      description: 'List of models',
      content: {
        'application/json': {
          schema: z.object({
            models: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                provider: z.string(),
                features: z.record(z.string(), z.unknown()).optional(),
              })
            ),
          }),
        },
      },
    },
  },
})
