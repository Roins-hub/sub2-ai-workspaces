import { createOpenAICompatLLM } from '../../core/openai-compat'
import type { ChannelConfig, LLMCapability } from '../../core/types'

export function createCustomLLM(config: ChannelConfig): LLMCapability {
  return createOpenAICompatLLM(config)
}
