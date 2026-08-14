import { ApiErrorCode } from '@z-image/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { modelscopeConfig } from '../config'
import { modelscopeImage } from '../image'

describe('modelscopeImage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    if (modelscopeConfig.asyncMode) {
      modelscopeConfig.asyncMode.pollIntervalMs = 0
      modelscopeConfig.asyncMode.maxPollAttempts = 3
    }
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws AUTH_REQUIRED when no token provided', async () => {
    await expect(
      modelscopeImage.generate(
        { prompt: 'a cat', model: 'Tongyi-MAI/Z-Image-Turbo', width: 1024, height: 1024 },
        null
      )
    ).rejects.toMatchObject({ code: ApiErrorCode.AUTH_REQUIRED })
  })

  it('submits async task and polls for result', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ task_id: 'task-123' }),
    } as Response)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        task_status: 'SUCCEED',
        output_images: ['https://example.com/result.png'],
      }),
    } as Response)

    const result = await modelscopeImage.generate(
      {
        prompt: 'a cat',
        model: 'Tongyi-MAI/Z-Image-Turbo',
        width: 1024,
        height: 1024,
        seed: 42,
        steps: 9,
      },
      'test-token-12345'
    )

    expect(result.url).toBe('https://example.com/result.png')
    expect(result.seed).toBe(42)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})
