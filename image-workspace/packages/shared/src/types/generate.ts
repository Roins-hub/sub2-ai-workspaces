/**
 * Internal image-generation request type used by providers.
 *
 * This is not an HTTP API type anymore (HTTP is OpenAI-format only).
 */

import type { ProviderType } from './provider'

export interface GenerateRequest {
  provider: ProviderType
  model: string
  prompt: string
  negativePrompt?: string
  loras?: string | Record<string, number>
  width: number
  height: number
  steps?: number
  seed?: number
  guidanceScale?: number
}
