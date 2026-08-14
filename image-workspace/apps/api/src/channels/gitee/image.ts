import { Errors } from '@z-image/shared'
import { MAX_INT32 } from '../../constants'
import type { ImageCapability, ImageRequest, ImageResult } from '../../core/types'

interface GiteeImageResponse {
  data: Array<{
    url?: string
    b64_json?: string
  }>
}

interface GiteeErrorResponse {
  message?: string
  error?: {
    message?: string
    code?: string
    type?: string
  }
}

function parseGiteeError(status: number, data: GiteeErrorResponse): Error {
  const provider = 'Gitee AI'
  const message = data.error?.message || data.message || `HTTP ${status}`

  if (
    status === 401 ||
    message.toLowerCase().includes('unauthorized') ||
    message.toLowerCase().includes('invalid api key')
  ) {
    return Errors.authInvalid(provider, message)
  }

  if (
    status === 429 ||
    message.toLowerCase().includes('rate limit') ||
    message.toLowerCase().includes('quota')
  ) {
    if (message.toLowerCase().includes('quota')) return Errors.quotaExceeded(provider)
    return Errors.rateLimited(provider)
  }

  if (message.toLowerCase().includes('expired')) {
    return Errors.authExpired(provider)
  }

  return Errors.providerError(provider, message)
}

export const giteeImage: ImageCapability = {
  async generate(request: ImageRequest, token?: string | null): Promise<ImageResult> {
    if (!token) throw Errors.authRequired('Gitee AI')

    const seed = request.seed ?? Math.floor(Math.random() * MAX_INT32)
    const modelId = request.model || 'z-image-turbo'
    const isFluxModel = modelId.toLowerCase().includes('flux')
    const isQwenModel = modelId.toLowerCase().startsWith('qwen-image')
    const isGlmModel = modelId.toLowerCase() === 'glm-image'

    const requestBody: Record<string, unknown> = {
      prompt: request.prompt,
      model: modelId,
      width: request.width,
      height: request.height,
      seed,
      num_inference_steps: request.steps ?? 9,
      response_format: 'url',
    }

    if (!isFluxModel && request.negativePrompt) {
      requestBody.negative_prompt = request.negativePrompt
    }

    if (request.guidanceScale !== undefined) {
      if (isQwenModel) requestBody.cfg_scale = request.guidanceScale
      else requestBody.guidance_scale = request.guidanceScale
    } else {
      if (isQwenModel) requestBody.cfg_scale = 1
      if (isGlmModel) requestBody.guidance_scale = 1.5
    }

    const response = await fetch('https://ai.gitee.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.trim()}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errData = (await response.json().catch(() => ({}))) as GiteeErrorResponse
      throw parseGiteeError(response.status, errData)
    }

    const data = (await response.json()) as GiteeImageResponse
    const url = data.data?.[0]?.url
    if (!url) throw Errors.generationFailed('Gitee AI', 'No image returned')
    return { url, seed, model: modelId }
  },
}
