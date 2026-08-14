import type { ChannelConfig } from '../../core/types'

export const huggingfaceConfig: ChannelConfig = {
  baseUrl: 'https://api-inference.huggingface.co',
  auth: { type: 'bearer', optional: true },
  endpoints: {
    llm: '/models',
  },
}
