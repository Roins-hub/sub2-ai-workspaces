import type { ChannelConfig } from '../../core/types'

export const giteeConfig: ChannelConfig = {
  baseUrl: 'https://ai.gitee.com/v1',
  auth: { type: 'bearer' },
  endpoints: {
    image: '/images/generations',
    llm: '/chat/completions',
  },
}
