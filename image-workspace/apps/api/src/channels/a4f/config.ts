import type { ChannelConfig } from '../../core/types'

export const a4fConfig: ChannelConfig = {
  baseUrl: 'https://api.a4f.co/v1',
  auth: { type: 'bearer' },
  endpoints: {
    image: '/images/generations',
    llm: '/chat/completions',
  },
  llmModels: [{ id: 'provider-3/deepseek-v3', name: 'DeepSeek V3 (provider-3)' }],
  imageModels: [
    { id: 'provider-4/imagen-3.5', name: 'Imagen 3.5 (provider-4)' },
    { id: 'provider-4/imagen-4', name: 'Imagen 4 (provider-4)' },
    { id: 'provider-8/imagen-3', name: 'Imagen 3 (provider-8)' },
    { id: 'provider-4/flux-schnell', name: 'FLUX Schnell (provider-4)' },
    { id: 'provider-8/z-image', name: 'Z-Image (provider-8)' },
  ],
}
