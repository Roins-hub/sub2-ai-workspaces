/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearAllHistory,
  clearExpiredHistory,
  getAllHistoryIncludingExpired,
  getHistory,
  HISTORY_STORAGE_KEY,
  HISTORY_TTL_MS,
  saveToHistory,
} from '../historyStore'

describe('historyStore', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('saves metadata-only history entries and returns the newest first', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000)

    const id1 = saveToHistory({
      url: 'https://example.com/a.png',
      prompt: 'a',
      negativePrompt: '',
      providerId: 'huggingface',
      providerName: 'HuggingFace',
      modelId: 'z-image-turbo',
      modelName: 'Z-Image Turbo',
      width: 1024,
      height: 1024,
      steps: 9,
      seed: 1,
      duration: '1.0s',
      source: 'home',
    })

    vi.spyOn(Date, 'now').mockReturnValue(1_000_100)

    const id2 = saveToHistory({
      url: 'https://example.com/b.png',
      prompt: 'b',
      negativePrompt: '',
      providerId: 'huggingface',
      providerName: 'HuggingFace',
      modelId: 'z-image-turbo',
      modelName: 'Z-Image Turbo',
      width: 1024,
      height: 1024,
      steps: 9,
      seed: 2,
      duration: '1.1s',
      source: 'home',
    })

    expect(id1).not.toBe(id2)

    const items = getHistory()
    expect(items.length).toBe(2)
    expect(items[0].id).toBe(id2)
    expect(items[1].id).toBe(id1)
  })

  it('cleans expired items on read', () => {
    vi.spyOn(Date, 'now').mockReturnValue(10_000)

    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'expired',
          url: 'https://example.com/expired.png',
          prompt: 'expired',
          providerId: 'huggingface',
          providerName: 'HuggingFace',
          modelId: 'z-image-turbo',
          modelName: 'Z-Image Turbo',
          width: 1024,
          height: 1024,
          steps: 9,
          seed: 1,
          duration: '1.0s',
          timestamp: 0,
          expiresAt: 9_999,
        },
        {
          id: 'valid',
          url: 'https://example.com/valid.png',
          prompt: 'valid',
          providerId: 'huggingface',
          providerName: 'HuggingFace',
          modelId: 'z-image-turbo',
          modelName: 'Z-Image Turbo',
          width: 1024,
          height: 1024,
          steps: 9,
          seed: 2,
          duration: '1.0s',
          timestamp: 0,
          expiresAt: 10_001,
        },
      ])
    )

    const items = getHistory()
    expect(items.map((i) => i.id)).toEqual(['valid'])

    const stored = getAllHistoryIncludingExpired()
    expect(stored.map((i) => i.id)).toEqual(['valid'])
  })

  it('clearExpiredHistory returns number of removed entries', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000)

    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'a',
          url: 'https://example.com/a.png',
          prompt: 'a',
          providerId: 'huggingface',
          providerName: 'HuggingFace',
          modelId: 'z-image-turbo',
          modelName: 'Z-Image Turbo',
          width: 1024,
          height: 1024,
          steps: 9,
          seed: 1,
          duration: '1.0s',
          timestamp: 0,
          expiresAt: 999,
        },
        {
          id: 'b',
          url: 'https://example.com/b.png',
          prompt: 'b',
          providerId: 'huggingface',
          providerName: 'HuggingFace',
          modelId: 'z-image-turbo',
          modelName: 'Z-Image Turbo',
          width: 1024,
          height: 1024,
          steps: 9,
          seed: 2,
          duration: '1.0s',
          timestamp: 0,
          expiresAt: 1_000 + HISTORY_TTL_MS,
        },
      ])
    )

    const cleared = clearExpiredHistory()
    expect(cleared).toBe(1)
    expect(getHistory().map((i) => i.id)).toEqual(['b'])
  })

  it('clearAllHistory removes the storage key', () => {
    saveToHistory({
      url: 'https://example.com/a.png',
      prompt: 'a',
      negativePrompt: '',
      providerId: 'huggingface',
      providerName: 'HuggingFace',
      modelId: 'z-image-turbo',
      modelName: 'Z-Image Turbo',
      width: 1024,
      height: 1024,
      steps: 9,
      seed: 1,
      duration: '1.0s',
      source: 'home',
    })

    expect(localStorage.getItem(HISTORY_STORAGE_KEY)).not.toBeNull()
    clearAllHistory()
    expect(localStorage.getItem(HISTORY_STORAGE_KEY)).toBeNull()
  })
})
