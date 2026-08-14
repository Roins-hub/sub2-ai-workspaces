import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { huggingfaceImage } from '../image'

describe('huggingfaceImage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function mockGradioSuccess(imageUrl: string, seed?: number) {
    const mockFetch = vi.mocked(fetch)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ event_id: 'test-event-123' }),
    } as Response)

    const sseData =
      seed !== undefined
        ? `event: complete\ndata: [{"url": "${imageUrl}"}, ${seed}]\n\n`
        : `event: complete\ndata: [{"url": "${imageUrl}"}]\n\n`

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => sseData,
    } as Response)
  }

  it('returns image URL from Gradio API', async () => {
    mockGradioSuccess('https://hf.space/generated.png', 12345)

    const result = await huggingfaceImage.generate(
      {
        prompt: 'a beautiful landscape',
        model: 'z-image-turbo',
        width: 1024,
        height: 1024,
        steps: 9,
        seed: 12345,
      },
      null
    )

    expect(result.url).toBe('https://hf.space/generated.png')
    expect(result.seed).toBe(12345)
  })

  it('includes auth token in headers when provided', async () => {
    mockGradioSuccess('https://hf.space/img.png')

    await huggingfaceImage.generate(
      { prompt: 'a cat', model: 'z-image-turbo', width: 1024, height: 1024 },
      'hf_test_token'
    )

    const mockFetch = vi.mocked(fetch)
    const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer hf_test_token')
  })
})
