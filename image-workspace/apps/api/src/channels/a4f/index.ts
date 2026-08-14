import { createChannel } from '../../core/channel-factory'
import { createOpenAICompatLLM } from '../../core/openai-compat'
import type { Channel } from '../../core/types'
import { a4fConfig } from './config'
import { a4fImage } from './image'

export const a4fChannel: Channel = createChannel({
  id: 'a4f',
  name: 'A4F',
  config: a4fConfig,
  image: a4fImage,
  llm: createOpenAICompatLLM(a4fConfig),
})
