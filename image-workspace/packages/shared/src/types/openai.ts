/**
 * OpenAI-Compatible API Types
 *
 * These types are used by the OpenAI-format `/v1/*` endpoints.
 */

// -------- Errors --------

export interface OpenAIErrorResponse {
  error: {
    message: string
    type: string
    param?: string | null
    code?: string | null
  }
}

// -------- Models --------

export interface OpenAIModelInfo {
  id: string
  object: 'model'
  created: number
  owned_by: string
}

export interface OpenAIModelsListResponse {
  object: 'list'
  data: OpenAIModelInfo[]
}

// -------- Images --------

export interface OpenAIImageRequest {
  model?: string
  prompt: string
  n?: number
  size?: string
  quality?: 'auto' | 'low' | 'medium' | 'high' | 'standard' | 'hd'
  background?: 'auto' | 'opaque' | 'transparent'
  output_format?: 'png' | 'jpeg' | 'webp'
  response_format?: 'url' | 'b64_json'
  negative_prompt?: string
  // Extensions / provider-compat aliases
  // - Gitee AI uses `num_inference_steps` instead of `steps`
  // - Some providers use `cfg_scale` instead of `guidance_scale`
  num_inference_steps?: number
  steps?: number
  seed?: number
  cfg_scale?: number
  guidance_scale?: number
}

export interface OpenAIImageResponse {
  created: number
  data: Array<{
    url?: string
    b64_json?: string
    revised_prompt?: string
  }>
}

// -------- Chat Completions --------

export type OpenAIChatRole = 'system' | 'user' | 'assistant'

export interface OpenAIChatMessage {
  role: OpenAIChatRole
  content: string
}

export interface OpenAIChatRequest {
  model: string
  messages: OpenAIChatMessage[]
  temperature?: number
  max_tokens?: number
}

export interface OpenAIChatResponse {
  id: string
  object: 'chat.completion'
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: 'assistant'
      content: string
    }
    finish_reason: 'stop' | 'length' | 'content_filter' | null
  }>
}
