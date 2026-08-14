import { createChannel } from '../../core/channel-factory'
import type { Channel } from '../../core/types'
import { giteeConfig } from './config'
import { giteeImage } from './image'
import { giteeLLM } from './llm'
import { giteeVideo } from './video'

export const giteeChannel: Channel = createChannel({
  id: 'gitee',
  name: 'Gitee AI',
  config: giteeConfig,
  image: giteeImage,
  llm: giteeLLM,
  video: giteeVideo,
})
