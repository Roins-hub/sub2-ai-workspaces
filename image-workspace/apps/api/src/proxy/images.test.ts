import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../app'

describe('custom image proxy', () => {
  afterEach(() => vi.restoreAllMocks())

  it('rejects incomplete requests without contacting upstream', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const response = await createApp().request('/api/proxy/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseUrl: 'https://sub2.hhlai.xyz/v1' }),
    })
    expect(response.status).toBe(400)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects hosts outside the administrator allowlist', async () => {
    const response = await createApp().request('/api/proxy/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseUrl: 'https://example.com/v1',
        apiKey: 'secret-key',
        payload: { model: 'gpt-image-2', prompt: 'test' },
      }),
    })
    expect(response.status).toBe(502)
    expect(await response.text()).not.toContain('secret-key')
  })

  it('rejects image edits without reference images', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const form = new FormData()
    form.set('baseUrl', 'https://sub2.hhlai.xyz/v1')
    form.set('apiKey', 'secret-key')
    form.set('model', 'gpt-image-2')
    form.set('prompt', 'edit this image')

    const response = await createApp().request('/api/proxy/images/edits', {
      method: 'POST',
      body: form,
    })

    expect(response.status).toBe(400)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(await response.text()).not.toContain('secret-key')
  })

  it('adds the full generation endpoint to a root relay URL', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [{ b64_json: 'aGVsbG8=' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const response = await createApp().request('/api/proxy/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseUrl: 'https://sub2.hhlai.xyz',
        apiKey: 'secret-key',
        payload: { model: 'gpt-image-2', prompt: 'test' },
      }),
    })

    expect(response.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://sub2.hhlai.xyz/v1/images/generations',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('downloads a public HTTP result URL without weakening relay URL validation', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ url: 'http://sub2.hhlai.xyz/generated.png' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response('image-bytes', {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        })
      )

    const response = await createApp().request('/api/proxy/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseUrl: 'https://sub2.hhlai.xyz',
        apiKey: 'secret-key',
        payload: { model: 'gpt-image-2', prompt: 'test' },
      }),
    })

    expect(response.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(fetchSpy.mock.calls[1][0]).toBeInstanceOf(URL)
    expect(String(fetchSpy.mock.calls[1][0])).toBe('http://sub2.hhlai.xyz/generated.png')
    expect(fetchSpy.mock.calls[1][1]).toEqual(
      expect.objectContaining({ redirect: 'error' })
    )
  })

  it('still rejects an HTTP relay base URL before sending the API key', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const response = await createApp().request('/api/proxy/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseUrl: 'http://sub2.hhlai.xyz',
        apiKey: 'secret-key',
        payload: { model: 'gpt-image-2', prompt: 'test' },
      }),
    })

    expect(response.status).toBe(502)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(await response.text()).toContain('HTTPS')
  })

  it('retries image edits as a Sub2API basic request when native accounts are unavailable', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: 'No available compatible accounts' } }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ b64_json: 'aGVsbG8=' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

    const form = new FormData()
    form.set('baseUrl', 'https://sub2.hhlai.xyz')
    form.set('apiKey', 'secret-key')
    form.set('model', 'gpt-image-2')
    form.set('prompt', 'make it cinematic')
    form.set('size', '1024x1536')
    form.set('quality', 'high')
    form.set('background', 'opaque')
    form.set('output_format', 'png')
    form.append('image', new File(['image-bytes'], 'reference.png', { type: 'image/png' }))

    const response = await createApp().request('/api/proxy/images/edits', {
      method: 'POST',
      body: form,
    })

    expect(response.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledTimes(2)

    const firstBody = fetchSpy.mock.calls[0][1]?.body as FormData
    expect(firstBody.get('model')).toBe('gpt-image-2')
    expect(firstBody.get('size')).toBe('1024x1536')
    expect(firstBody.get('quality')).toBe('high')

    const fallbackBody = fetchSpy.mock.calls[1][1]?.body as FormData
    expect(fallbackBody.get('prompt')).toBe('make it cinematic')
    expect(fallbackBody.get('image')).toBeInstanceOf(Blob)
    expect(fallbackBody.get('model')).toBeNull()
    expect(fallbackBody.get('size')).toBeNull()
    expect(fallbackBody.get('quality')).toBeNull()
    expect(fallbackBody.get('background')).toBeNull()
    expect(fallbackBody.get('output_format')).toBeNull()
  })

  it('does not retry image edits for unrelated upstream errors', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Invalid API key' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const form = new FormData()
    form.set('baseUrl', 'https://sub2.hhlai.xyz')
    form.set('apiKey', 'invalid-key')
    form.set('model', 'gpt-image-2')
    form.set('prompt', 'edit this')
    form.append('image', new File(['image-bytes'], 'reference.png', { type: 'image/png' }))

    const response = await createApp().request('/api/proxy/images/edits', {
      method: 'POST',
      body: form,
    })

    expect(response.status).toBe(400)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(await response.text()).toContain('Invalid API key')
  })
})
