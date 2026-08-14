import { ApiErrorCode } from '@z-image/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { a4fImage } from '../image'

describe('a4fImage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws AUTH_REQUIRED when no token provided', async () => {
    await expect(
      a4fImage.generate(
        { prompt: 'a cat', width: 1024, height: 1024, model: 'provider-4/imagen-3.5' },
        null
      )
    ).rejects.toMatchObject({ code: ApiErrorCode.AUTH_REQUIRED })
  })

  it('calls A4F API with size', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ url: 'https://example.com/img.png' }] }),
    } as Response)

    const result = await a4fImage.generate(
      { prompt: 'a cat', width: 1024, height: 768, model: 'provider-4/imagen-3.5' },
      'tok'
    )

    expect(result.url).toBe('https://example.com/img.png')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.a4f.co/v1/images/generations',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer tok',
        }),
      })
    )

    const body = JSON.parse((mockFetch.mock.calls[0]?.[1]?.body as string) || '{}')
    expect(body).toMatchObject({
      model: 'provider-4/imagen-3.5',
      prompt: 'a cat',
      n: 1,
      size: '1024x768',
      response_format: 'url',
    })
  })
})
