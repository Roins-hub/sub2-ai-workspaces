import { Errors } from '@z-image/shared'
import type { ChannelConfig } from './types'

function joinUrl(baseUrl: string, path: string): string {
  if (!path) return baseUrl
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

export function buildAuthHeaders(
  config: ChannelConfig,
  token?: string | null
): Record<string, string> {
  const headers: Record<string, string> = { ...(config.headers || {}) }
  const auth = config.auth

  if (auth.type === 'none') return headers
  if (!token) return headers

  if (auth.type === 'api-key') {
    headers[auth.headerName || 'X-API-Key'] = token
    return headers
  }

  const headerName = auth.headerName || 'Authorization'
  const prefix = auth.prefix ?? 'Bearer '
  headers[headerName] = `${prefix}${token}`
  return headers
}

export function createHttpClient(config: ChannelConfig, token?: string | null) {
  return {
    async request<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
      const url = joinUrl(config.baseUrl, path)
      const headers: Record<string, string> = {
        ...(typeof init.headers === 'object' ? (init.headers as Record<string, string>) : {}),
        ...buildAuthHeaders(config, token),
      }

      let body = init.body
      if (init.json !== undefined) {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json'
        body = JSON.stringify(init.json)
      }

      const res = await fetch(url, { ...init, headers, body })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw Errors.providerError('Upstream', `${res.status} ${url}${text ? `: ${text}` : ''}`)
      }
      return (await res.json()) as T
    },
  }
}
