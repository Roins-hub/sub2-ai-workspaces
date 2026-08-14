import { Errors } from '@z-image/shared'
import { createHttpClient } from './http-client'
import type {
  ChannelConfig,
  ImageCapability,
  ImageRequest,
  ImageResult,
  LLMCapability,
  LLMRequest,
  LLMResult,
} from './types'

interface OpenAIImageResponse {
  data?: Array<{ url?: string; b64_json?: string }>
}

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>
}

export function createOpenAICompatImage(config: ChannelConfig): ImageCapability {
  const endpoint = config.endpoints?.image || '/images/generations'

  return {
    async generate(request: ImageRequest, token?: string | null): Promise<ImageResult> {
      const client = createHttpClient(config, token)
      const seed = request.seed ?? Math.floor(Math.random() * 2147483647)
      const res = await client.request<OpenAIImageResponse>(endpoint, {
        method: 'POST',
        json: {
          prompt: request.prompt,
          model: request.model,
          width: request.width,
          height: request.height,
          seed,
          num_inference_steps: request.steps,
          guidance_scale: request.guidanceScale,
          negative_prompt: request.negativePrompt,
          response_format: 'url',
        },
      })

      const url = res.data?.[0]?.url
      if (!url) throw Errors.generationFailed('OpenAI Compatible', 'No image returned')
      return { url, seed, model: request.model }
    },
  }
}

export function createOpenAICompatLLM(config: ChannelConfig): LLMCapability {
  const endpoint = config.endpoints?.llm || '/chat/completions'

  return {
    async complete(request: LLMRequest, token?: string | null): Promise<LLMResult> {
      const client = createHttpClient(config, token)
      const model = request.model || config.llmModels?.[0]?.id || ''
      if (!model) throw Errors.invalidParams('model', 'No model specified')

      const res = await client.request<OpenAIChatResponse>(endpoint, {
        method: 'POST',
        json: {
          model,
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.prompt },
          ],
          max_tokens: request.maxTokens || 1000,
          temperature: request.temperature ?? 0.7,
          stream: false,
        },
      })

      const content = res.choices?.[0]?.message?.content?.trim()
      if (!content) throw Errors.providerError('OpenAI Compatible', 'Empty response from provider')
      return { content, model }
    },
  }
}
