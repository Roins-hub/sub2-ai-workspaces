import type { Channel, ImageCapability, LLMCapability } from './types'

const channels = new Map<string, Channel>()

export function registerChannel(channel: Channel): void {
  if (channels.has(channel.id)) {
    console.warn(`Channel ${channel.id} already registered, overwriting`)
  }
  channels.set(channel.id, channel)
}

export function getChannel(id: string): Channel | undefined {
  return channels.get(id)
}

export function hasChannel(id: string): boolean {
  return channels.has(id)
}

export function getImageChannel(id: string): ImageCapability | undefined {
  return channels.get(id)?.image
}

export function getLLMChannel(id: string): LLMCapability | undefined {
  return channels.get(id)?.llm
}

export function listChannels(): Channel[] {
  return Array.from(channels.values())
}

export function listImageChannels(): Channel[] {
  return listChannels().filter((c) => c.image)
}

export function listLLMChannels(): Channel[] {
  return listChannels().filter((c) => c.llm)
}
