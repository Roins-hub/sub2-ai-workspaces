import { createOpenAICompatImage } from '../../core/openai-compat'
import type { ChannelConfig, ImageCapability } from '../../core/types'

export function createCustomImage(config: ChannelConfig): ImageCapability {
  return createOpenAICompatImage(config)
}
