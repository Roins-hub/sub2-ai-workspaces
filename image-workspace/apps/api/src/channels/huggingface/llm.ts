import { Errors } from '@z-image/shared'
import type { LLMCapability, LLMRequest, LLMResult } from '../../core/types'
import { huggingfaceConfig } from './config'
import { pollinationsComplete } from './pollinations'

interface HuggingFaceTextGenResponse {
  generated_text?: string
}

interface HuggingFaceChatResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

interface HuggingFaceErrorResponse {
  error?: string
  estimated_time?: number
}

async function handleHfError(response: Response): Promise<never> {
  const errorText = await response.text().catch(() => 'Unknown error')

  let errorData: HuggingFaceErrorResponse = {}
  try {
    errorData = JSON.parse(errorText)
  } catch {
    // ignore
  }

  const provider = 'HuggingFace'
  const message = errorData.error || errorText

  if (response.status === 503 || message.includes('loading')) {
    const waitTime = errorData.estimated_time ? Math.ceil(errorData.estimated_time) : 20
    throw Errors.providerError(provider, `Model is loading, please retry in ${waitTime} seconds`)
  }

  if (response.status === 401) throw Errors.authInvalid(provider, message)
  if (response.status === 429) throw Errors.rateLimited(provider)
  if (response.status === 402 || message.toLowerCase().includes('quota'))
    throw Errors.quotaExceeded(provider)

  throw Errors.providerError(provider, message)
}

export const huggingfaceLLM: LLMCapability = {
  async complete(request: LLMRequest, token?: string | null): Promise<LLMResult> {
    if (!token) {
      return pollinationsComplete(request)
    }

    const model = request.model || 'Qwen/Qwen2.5-72B-Instruct'
    const url = `${huggingfaceConfig.baseUrl}/models/${model}`

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    headers.Authorization = `Bearer ${token.trim()}`

    const fullPrompt = `<|system|>\n${request.systemPrompt}\n<|user|>\n${request.prompt}\n<|assistant|>\n`

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        inputs: fullPrompt,
        parameters: {
          max_new_tokens: request.maxTokens || 1000,
          temperature: request.temperature ?? 0.7,
          do_sample: true,
          return_full_text: false,
        },
      }),
    })

    if (!response.ok) return handleHfError(response)

    const data: unknown = await response.json()
    let content: string | undefined

    if (Array.isArray(data)) {
      const first = data[0] as HuggingFaceTextGenResponse | undefined
      if (first?.generated_text) content = first.generated_text.trim()
    } else if (data && typeof data === 'object') {
      const textGenResponse = data as HuggingFaceTextGenResponse
      const chatResponse = data as HuggingFaceChatResponse
      if (textGenResponse.generated_text) content = textGenResponse.generated_text.trim()
      else if (chatResponse.choices?.[0]?.message?.content)
        content = chatResponse.choices[0].message.content.trim()
    }

    if (!content) throw Errors.providerError('HuggingFace', 'Empty response from provider')
    return { content, model }
  },
}
