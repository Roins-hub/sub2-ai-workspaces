import { ApiError, ApiErrorCode, Errors } from '@z-image/shared'

export { ApiError, ApiErrorCode, Errors }

export function isQuotaError(error: unknown): boolean {
  if (!error) return false

  if (error instanceof ApiError) {
    return error.code === ApiErrorCode.RATE_LIMITED || error.code === ApiErrorCode.QUOTA_EXCEEDED
  }

  if (error instanceof Response) {
    return error.status === 429
  }

  if (typeof error === 'object') {
    const err = error as Record<string, unknown>
    if (err.status === 429) return true
    if (err.code === ApiErrorCode.RATE_LIMITED || err.code === ApiErrorCode.QUOTA_EXCEEDED)
      return true

    if (typeof err.message === 'string') {
      const msg = err.message.toLowerCase()
      if (msg.includes('429') || msg.includes('rate limit') || msg.includes('quota')) return true
    }
  }

  return false
}
