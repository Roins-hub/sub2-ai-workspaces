import { Errors } from '@z-image/shared'
import type { ImageCapability, ImageRequest, ImageResult } from '../../core/types'
import { a4fConfig } from './config'

interface A4FImageResponse {
  data?: Array<{
    url?: string
    b64_json?: string
  }>
  error?: {
    message?: string
    code?: string
    type?: string
  }
}

function parseA4FError(status: number, data: A4FImageResponse): Error {
  const provider = 'A4F'
  const message = data.error?.message || `HTTP ${status}`

  if (status === 401 || status === 403) return Errors.authInvalid(provider, message)
  if (status === 429) return Errors.rateLimited(provider)
  if (status === 402) return Errors.quotaExceeded(provider)

  if (message.toLowerCase().includes('quota') || message.toLowerCase().includes('insufficient')) {
    return Errors.quotaExceeded(provider)
  }

  return Errors.providerError(provider, message)
}

export const a4fImage: ImageCapability = {
  async generate(request: ImageRequest, token?: string | null): Promise<ImageResult> {
    if (!token) throw Errors.authRequired('A4F')

    const model = request.model || a4fConfig.imageModels?.[0]?.id
    if (!model) throw Errors.invalidParams('model', 'model is required')

    const size = `${request.width}x${request.height}`

    const response = await fetch(`${a4fConfig.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.trim()}`,
      },
      body: JSON.stringify({
        model,
        prompt: request.prompt,
        n: 1,
        size,
        response_format: 'url',
      }),
    })

    const data = (await response.json().catch(() => ({}))) as A4FImageResponse
    if (!response.ok) throw parseA4FError(response.status, data)

    const url = data.data?.[0]?.url
    if (!url) throw Errors.generationFailed('A4F', 'No image returned')

    const seed = request.seed ?? 0
    return { url, seed, model }
  },
}
