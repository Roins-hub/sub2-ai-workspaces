import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../app'

describe('custom OpenAI proxy', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.IMAGE_PROXY_ALLOW_ANY_HOST
  })

  it('forwards model listing through the server', async () => {
    process.env.IMAGE_PROXY_ALLOW_ANY_HOST = 'true'
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ object: 'list', data: [{ id: 'gpt-5.5', object: 'model' }] })
    )

    const response = await createApp().request('/api/proxy/openai/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseUrl: 'https://example.com/v1',
        apiKey: 'secret-key',
      }),
    })

    expect(response.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example.com/v1/models',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer secret-key' }),
      })
    )
  })

  it('forwards chat completions and preserves an upstream error', async () => {
    process.env.IMAGE_PROXY_ALLOW_ANY_HOST = 'true'
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ error: { message: 'model unavailable' } }, { status: 400 })
    )

    const response = await createApp().request('/api/proxy/openai/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseUrl: 'https://example.com/chat/completions',
        apiKey: 'secret-key',
        payload: { model: 'gpt-5.5', messages: [{ role: 'user', content: 'hello' }] },
      }),
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: { message: 'model unavailable' } })
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example.com/v1/chat/completions',
      expect.objectContaining({ method: 'POST' })
    )
  })
})
