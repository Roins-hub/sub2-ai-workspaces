import { Errors } from '@z-image/shared'
import type { LLMRequest, LLMResult } from '../../core/types'

const POLLINATIONS_API_URL = 'https://text.pollinations.ai/openai'

export const POLLINATIONS_MODELS = new Set(['openai-fast', 'openai', 'mistral', 'llama'])

interface PollinationsResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

export async function pollinationsComplete(request: LLMRequest): Promise<LLMResult> {
  const model =
    request.model && POLLINATIONS_MODELS.has(request.model) ? request.model : 'openai-fast'

  const response = await fetch(POLLINATIONS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.prompt },
      ],
      max_tokens: request.maxTokens || 1000,
      temperature: request.temperature ?? 0.7,
    }),
  })

  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error')
    if (response.status === 429) throw Errors.rateLimited('Pollinations AI')
    throw Errors.providerError('Pollinations AI', error)
  }

  const data = (await response.json()) as PollinationsResponse
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw Errors.providerError('Pollinations AI', 'Empty response from provider')
  return { content, model }
}
