import { Hono } from 'hono'
import { bodyLimit, rateLimitPresets } from '../middleware'
import { validateUrl } from './images'

type RelayBody = {
  baseUrl?: string
  apiKey?: string
  payload?: Record<string, unknown>
}

function endpointFor(baseUrl: URL, operation: 'models' | 'chat/completions'): string {
  let path = baseUrl.pathname.replace(/\/+$/, '')
  path = path.replace(/\/v1\/(?:models|chat\/completions)$/i, '')
  path = path.replace(/\/(?:models|chat\/completions)$/i, '')
  path = path.replace(/\/v1$/i, '')
  baseUrl.pathname = `${path}/v1/${operation}`.replace(/\/{2,}/g, '/')
  baseUrl.search = ''
  baseUrl.hash = ''
  return baseUrl.toString()
}

function relayError(message: string, status = 400): Response {
  return Response.json({ error: { message } }, { status })
}

async function parseBody(request: Request): Promise<RelayBody | null> {
  try {
    return (await request.json()) as RelayBody
  } catch {
    return null
  }
}

async function forward(body: RelayBody, operation: 'models' | 'chat/completions'): Promise<Response> {
  if (!body.baseUrl || !body.apiKey) return relayError('请填写 Base URL 和 API Key')
  if (body.apiKey.length > 4096 || body.baseUrl.length > 2048) return relayError('连接参数过长')
  if (operation === 'chat/completions' && (!body.payload || !body.payload.model)) {
    return relayError('请填写模型名称')
  }

  try {
    const endpoint = endpointFor(await validateUrl(body.baseUrl, true), operation)
    const response = await fetch(endpoint, {
      method: operation === 'models' ? 'GET' : 'POST',
      headers: {
        Authorization: `Bearer ${body.apiKey}`,
        ...(operation === 'chat/completions' ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(operation === 'chat/completions' ? { body: JSON.stringify(body.payload) } : {}),
      redirect: 'error',
      signal: AbortSignal.timeout(operation === 'models' ? 15000 : 120000),
    })
    const text = await response.text()
    return new Response(text, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
    })
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'TimeoutError'
        ? '中转站请求超时'
        : error instanceof Error
          ? error.message
          : '代理请求失败'
    return relayError(message, 502)
  }
}

export function registerOpenAIProxy(app: Hono) {
  app.post(
    '/api/proxy/openai/models',
    bodyLimit(16 * 1024),
    rateLimitPresets.readonly,
    async (c) => {
      const body = await parseBody(c.req.raw)
      return body ? forward(body, 'models') : relayError('请求格式无效')
    }
  )

  app.post(
    '/api/proxy/openai/chat/completions',
    bodyLimit(256 * 1024),
    rateLimitPresets.optimize,
    async (c) => {
      const body = await parseBody(c.req.raw)
      return body ? forward(body, 'chat/completions') : relayError('请求格式无效')
    }
  )
}
