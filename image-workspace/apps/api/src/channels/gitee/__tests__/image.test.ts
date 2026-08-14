import { ApiErrorCode } from '@z-image/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { giteeImage } from '../image'

describe('giteeImage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws AUTH_REQUIRED when no token provided', async () => {
    await expect(
      giteeImage.generate(
        { prompt: 'a cat', model: 'z-image-turbo', width: 1024, height: 1024 },
        null
      )
    ).rejects.toMatchObject({ code: ApiErrorCode.AUTH_REQUIRED })
  })

  it('calls Gitee API with correct parameters', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ url: 'https://example.com/img.png' }] }),
    } as Response)

    await giteeImage.generate(
      {
        prompt: 'a beautiful sunset',
        model: 'z-image-turbo',
        width: 1024,
        height: 768,
        steps: 12,
        seed: 42,
      },
      'test-api-key'
    )

    expect(mockFetch).toHaveBeenCalledWith(
      'https://ai.gitee.com/v1/images/generations',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-api-key',
        }),
      })
    )

    const call = mockFetch.mock.calls[0]
    const body = JSON.parse(call[1]?.body as string)
    expect(body).toMatchObject({
      prompt: 'a beautiful sunset',
      model: 'z-image-turbo',
      width: 1024,
      height: 768,
      seed: 42,
      num_inference_steps: 12,
      response_format: 'url',
    })
  })
})
