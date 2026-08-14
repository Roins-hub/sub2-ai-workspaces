/**
 * Zod Validation Middleware
 *
 * Provides request validation using Zod schemas with proper error handling.
 */

import { zValidator } from '@hono/zod-validator'
import { Errors } from '@z-image/shared'
import type { z } from 'zod'
import { sendError } from './error-handler'

/**
 * Create a JSON body validator middleware with custom error handling.
 * Returns validated and typed request body.
 *
 * @example
 * ```ts
 * import { validateJson } from './middleware/validate'
 * import { GenerateRequestSchema } from './schemas'
 *
 * app.post('/generate', validateJson(GenerateRequestSchema), async (c) => {
 *   const body = c.req.valid('json') // Typed as GenerateRequest
 *   // ...
 * })
 * ```
 */
export function validateJson<T extends z.ZodType>(schema: T) {
  return zValidator('json', schema, (result, c) => {
    if (!result.success) {
      const firstIssue = result.error.issues[0]
      const field = firstIssue?.path.join('.') || 'body'
      const message = firstIssue?.message || 'Invalid request body'

      return sendError(c, Errors.invalidParams(field, message))
    }
  })
}

/**
 * Create a query parameter validator middleware with custom error handling.
 *
 * @example
 * ```ts
 * import { validateQuery } from './middleware/validate'
 *
 * const QuerySchema = z.object({ url: z.string().url() })
 *
 * app.get('/proxy', validateQuery(QuerySchema), async (c) => {
 *   const { url } = c.req.valid('query')
 *   // ...
 * })
 * ```
 */
export function validateQuery<T extends z.ZodType>(schema: T) {
  return zValidator('query', schema, (result, c) => {
    if (!result.success) {
      const firstIssue = result.error.issues[0]
      const field = firstIssue?.path.join('.') || 'query'
      const message = firstIssue?.message || 'Invalid query parameters'

      return sendError(c, Errors.invalidParams(field, message))
    }
  })
}

/**
 * Create a URL parameter validator middleware with custom error handling.
 *
 * @example
 * ```ts
 * import { validateParam } from './middleware/validate'
 *
 * const ParamSchema = z.object({ taskId: z.string().uuid() })
 *
 * app.get('/task/:taskId', validateParam(ParamSchema), async (c) => {
 *   const { taskId } = c.req.valid('param')
 *   // ...
 * })
 * ```
 */
export function validateParam<T extends z.ZodType>(schema: T) {
  return zValidator('param', schema, (result, c) => {
    if (!result.success) {
      const firstIssue = result.error.issues[0]
      const field = firstIssue?.path.join('.') || 'param'
      const message = firstIssue?.message || 'Invalid URL parameters'

      return sendError(c, Errors.invalidParams(field, message))
    }
  })
}
