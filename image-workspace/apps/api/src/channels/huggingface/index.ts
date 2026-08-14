import { createChannel } from '../../core/channel-factory'
import type { Channel } from '../../core/types'
import { huggingfaceConfig } from './config'
import { huggingfaceImage } from './image'
import { huggingfaceLLM } from './llm'

export const huggingfaceChannel: Channel = createChannel({
  id: 'huggingface',
  name: 'HuggingFace',
  config: huggingfaceConfig,
  image: huggingfaceImage,
  llm: huggingfaceLLM,
})
