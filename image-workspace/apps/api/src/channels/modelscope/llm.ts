import { Errors } from '@z-image/shared'
import type { LLMCapability, LLMRequest, LLMResult } from '../../core/types'
import { modelscopeConfig } from './config'

interface ModelScopeLLMResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

interface ModelScopeLLMErrorResponse {
  message?: string
  error?: {
    message?: string
    code?: string
    type?: string
  }
}

async function handleModelScopeLLMError(response: Response): Promise<never> {
  const errorText = await response.text().catch(() => 'Unknown error')

  let errorData: ModelScopeLLMErrorResponse = {}
  try {
    errorData = JSON.parse(errorText)
  } catch {
    // ignore
  }

  const provider = 'ModelScope'
  const message = errorData.error?.message || errorData.message || errorText

  if (
    response.status === 401 ||
    message.toLowerCase().includes('unauthorized') ||
    message.toLowerCase().includes('invalid')
  ) {
    throw Errors.authInvalid(provider, message)
  }

  if (
    response.status === 429 ||
    message.toLowerCase().includes('rate limit') ||
    message.toLowerCase().includes('quota')
  ) {
    if (message.toLowerCase().includes('quota')) throw Errors.quotaExceeded(provider)
    throw Errors.rateLimited(provider)
  }

  if (message.toLowerCase().includes('expired')) {
    throw Errors.authExpired(provider)
  }

  throw Errors.providerError(provider, message)
}

export const modelscopeLLM: LLMCapability = {
  async complete(request: LLMRequest, token?: string | null): Promise<LLMResult> {
    if (!token) throw Errors.authRequired('ModelScope')

    const model = request.model || 'deepseek-ai/DeepSeek-V3.2'
    const response = await fetch(`${modelscopeConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.trim()}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.prompt },
        ],
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature ?? 0.7,
        stream: false,
      }),
    })

    if (!response.ok) return handleModelScopeLLMError(response)

    const data = (await response.json()) as ModelScopeLLMResponse
    const content = data.choices?.[0]?.message?.content?.trim()
    if (!content) throw Errors.providerError('ModelScope', 'Empty response from provider')
    return { content, model }
  },
}
