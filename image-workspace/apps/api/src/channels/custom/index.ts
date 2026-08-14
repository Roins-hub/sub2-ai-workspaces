import { createChannel } from '../../core/channel-factory'
import { createOpenAICompatLLM } from '../../core/openai-compat'
import type { Channel, EnvLike } from '../../core/types'
import { parseCustomChannelsFromEnv } from './config'
import { createCustomImage } from './image'
import { createCustomLLM } from './llm'

export function loadCustomChannels(env: EnvLike): Channel[] {
  return parseCustomChannelsFromEnv(env).map((def) => {
    const config = {
      ...def.config,
      endpoints: {
        image: def.config.endpoints?.image || '/images/generations',
        llm: def.config.endpoints?.llm || '/chat/completions',
        ...(def.config.endpoints?.tasks && { tasks: def.config.endpoints.tasks }),
      },
    }

    return createChannel({
      id: def.id,
      name: def.name,
      config,
      image: createCustomImage(config),
      llm: createCustomLLM(config),
    })
  })
}

export function createDeepseekChannel(): Channel {
  const config = {
    baseUrl: 'https://api.deepseek.com/v1',
    auth: { type: 'bearer' as const },
    endpoints: { llm: '/chat/completions' },
    llmModels: [{ id: 'deepseek-chat', name: 'DeepSeek Chat' }],
  }

  return createChannel({
    id: 'deepseek',
    name: 'DeepSeek',
    config,
    llm: createOpenAICompatLLM(config),
  })
}
