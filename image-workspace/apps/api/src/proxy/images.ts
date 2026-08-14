import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { Hono } from 'hono'
import { bodyLimit, rateLimitPresets } from '../middleware'

type ProxyBody = {
  baseUrl?: string
  apiKey?: string
  payload?: Record<string, unknown>
}

type UploadedImage = Blob & { name?: string }

type UpstreamImageResponse = {
  data?: Array<{ url?: string; b64_json?: string }>
  error?: { message?: string }
}

const MAX_EDIT_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_EDIT_IMAGES = 4

const PRIVATE_V4 = /^(10\.|127\.|169\.254\.|192\.168\.|0\.|22[4-9]\.|23\d\.|24\d\.|25[0-5]\.)/

function allowedHosts(): Set<string> {
  return new Set(
    (process.env.IMAGE_PROXY_ALLOWED_HOSTS || 'sub2.hhlai.xyz')
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean)
  )
}

function allowAnyPublicHost(): boolean {
  return /^(1|true|yes|on)$/i.test(process.env.IMAGE_PROXY_ALLOW_ANY_HOST?.trim() || '')
}

function isUploadedImage(value: unknown): value is UploadedImage {
  return value instanceof Blob
}

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) {
    if (PRIVATE_V4.test(address)) return true
    const [a, b] = address.split('.').map(Number)
    return a === 172 && b >= 16 && b <= 31
  }
  const value = address.toLowerCase()
  return value === '::1' || value === '::' || value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe8') || value.startsWith('fe9') || value.startsWith('fea') || value.startsWith('feb')
}

export async function validateUrl(
  input: string,
  enforceAllowlist: boolean,
  allowPublicHttp = false
): Promise<URL> {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new Error('Base URL 格式无效')
  }
  const allowedProtocol = url.protocol === 'https:' || (allowPublicHttp && url.protocol === 'http:')
  if (!allowedProtocol) {
    throw new Error(allowPublicHttp ? '图片下载地址必须使用 HTTP 或 HTTPS' : '仅允许 HTTPS 中转地址')
  }
  if (url.username || url.password) throw new Error('URL 中不能包含账号或密码')
  if (enforceAllowlist && !allowAnyPublicHost() && !allowedHosts().has(url.hostname.toLowerCase())) {
    throw new Error(`该中转域名未被管理员允许：${url.hostname}`)
  }
  const records = await lookup(url.hostname, { all: true })
  if (!records.length || records.some((record) => isPrivateAddress(record.address))) {
    throw new Error('不允许访问内网地址')
  }
  return url
}

function imageEndpointFor(baseUrl: URL, operation: 'generations' | 'edits'): string {
  let path = baseUrl.pathname.replace(/\/+$/, '')
  path = path.replace(/\/v1\/images\/(?:generations|edits)$/i, '')
  path = path.replace(/\/images\/(?:generations|edits)$/i, '')
  path = path.replace(/\/v1$/i, '')
  baseUrl.pathname = `${path}/v1/images/${operation}`.replace(/\/{2,}/g, '/')
  baseUrl.search = ''
  baseUrl.hash = ''
  return baseUrl.toString()
}

function endpointFor(baseUrl: URL): string {
  return imageEndpointFor(baseUrl, 'generations')
}

function editEndpointFor(baseUrl: URL): string {
  return imageEndpointFor(baseUrl, 'edits')
}

function isNoCompatibleImageAccount(data: UpstreamImageResponse): boolean {
  return /no available compatible accounts/i.test(data.error?.message || '')
}

function buildEditForm(
  source: FormData,
  images: UploadedImage[],
  model: string,
  includeNativeOptions: boolean
): FormData {
  const upstream = new FormData()
  upstream.set('prompt', String(source.get('prompt') || '').trim())

  // Sub2API classifies an explicit model or native options as images-native.
  // Its OAuth image accounts only support the basic form, where gpt-image-2 is the default.
  if (includeNativeOptions) {
    upstream.set('model', model)
    for (const key of ['size', 'quality', 'background', 'output_format', 'n']) {
      const value = source.get(key)
      if (value !== null && String(value).trim()) upstream.set(key, String(value))
    }
  }

  const imageField = images.length === 1 ? 'image' : 'image[]'
  for (const image of images) upstream.append(imageField, image, image.name || 'reference.png')
  return upstream
}

async function parseUpstreamImageResponse(response: Response): Promise<{
  response: Response
  data: UpstreamImageResponse
}> {
  const text = await response.text()
  try {
    return { response, data: JSON.parse(text) as UpstreamImageResponse }
  } catch {
    return { response, data: {} }
  }
}

async function toBase64FromUrl(input: string): Promise<{ b64_json: string }> {
  // The API key is never sent to this URL. Some compatible relays return a
  // public HTTP asset URL even though their API endpoint itself uses HTTPS.
  const url = await validateUrl(input, false, true)
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(60000) })
  if (!response.ok) throw new Error('无法读取中转站返回的图片')
  const type = response.headers.get('content-type') || ''
  if (!type.startsWith('image/')) throw new Error('中转站返回的图片格式无效')
  const bytes = await response.arrayBuffer()
  if (bytes.byteLength > 30 * 1024 * 1024) throw new Error('图片超过 30MB 限制')
  return { b64_json: Buffer.from(bytes).toString('base64') }
}

export function registerImageProxy(app: Hono) {
  app.post('/api/proxy/images/generations', bodyLimit(100 * 1024), rateLimitPresets.generate, async (c) => {
    let body: ProxyBody
    try {
      body = await c.req.json<ProxyBody>()
    } catch {
      return c.json({ error: { message: '请求格式无效' } }, 400)
    }
    if (!body.baseUrl || !body.apiKey || !body.payload?.prompt || !body.payload?.model) {
      return c.json({ error: { message: '请填写 Base URL、API Key、模型和提示词' } }, 400)
    }

    try {
      const endpoint = endpointFor(await validateUrl(body.baseUrl, true))
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${body.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body.payload),
        redirect: 'error',
        signal: AbortSignal.timeout(300000),
      })
      const text = await response.text()
      let data: { data?: Array<{ url?: string; b64_json?: string }>; error?: { message?: string } }
      try {
        data = JSON.parse(text)
      } catch {
        data = {}
      }
      if (!response.ok) {
        return c.json({ error: { message: data.error?.message || `中转站请求失败 (${response.status})` } }, response.status >= 500 ? 502 : 400)
      }
      const images = await Promise.all(
        (data.data || []).map(async (item) => item.b64_json ? { b64_json: item.b64_json } : item.url ? toBase64FromUrl(item.url) : null)
      )
      const valid = images.filter((item): item is { b64_json: string } => item !== null)
      if (!valid.length) return c.json({ error: { message: '中转站没有返回图片' } }, 502)
      return c.json({ created: Math.floor(Date.now() / 1000), data: valid })
    } catch (error) {
      const message = error instanceof Error ? error.message : '代理请求失败'
      return c.json({ error: { message } }, 502)
    }
  })

  app.post('/api/proxy/images/edits', bodyLimit(50 * 1024 * 1024), rateLimitPresets.generate, async (c) => {
    let form: FormData
    try {
      form = await c.req.raw.formData()
    } catch {
      return c.json({ error: { message: '图生图请求格式无效' } }, 400)
    }

    const baseUrl = String(form.get('baseUrl') || '').trim()
    const apiKey = String(form.get('apiKey') || '').trim()
    const model = String(form.get('model') || '').trim()
    const prompt = String(form.get('prompt') || '').trim()
    const files = (form.getAll('image') as unknown[]).filter(isUploadedImage)
    const arrayFiles = (form.getAll('image[]') as unknown[]).filter(isUploadedImage)
    const images = [...files, ...arrayFiles]

    if (!baseUrl || !apiKey || !model || !prompt) {
      return c.json({ error: { message: '请填写 Base URL、API Key、模型和提示词' } }, 400)
    }
    if (images.length < 1 || images.length > MAX_EDIT_IMAGES) {
      return c.json({ error: { message: `请上传 1-${MAX_EDIT_IMAGES} 张参考图` } }, 400)
    }

    for (const image of images) {
      if (!image.type.startsWith('image/')) {
        return c.json({ error: { message: '参考文件必须是图片' } }, 400)
      }
      if (image.size > MAX_EDIT_IMAGE_BYTES) {
        return c.json({ error: { message: '单张参考图不能超过 10MB' } }, 400)
      }
    }

    try {
      const endpoint = editEndpointFor(await validateUrl(baseUrl, true))
      const sendEdit = (upstream: FormData) => fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: upstream,
        redirect: 'error',
        signal: AbortSignal.timeout(300000),
      })

      let upstreamResult = await parseUpstreamImageResponse(
        await sendEdit(buildEditForm(form, images, model, true))
      )

      if (!upstreamResult.response.ok && isNoCompatibleImageAccount(upstreamResult.data)) {
        upstreamResult = await parseUpstreamImageResponse(
          await sendEdit(buildEditForm(form, images, model, false))
        )
      }

      const { response, data } = upstreamResult
      if (!response.ok) {
        return c.json(
          { error: { message: data.error?.message || `中转站请求失败 (${response.status})` } },
          response.status >= 500 ? 502 : 400
        )
      }
      const result = await Promise.all(
        (data.data || []).map(async (item) =>
          item.b64_json ? { b64_json: item.b64_json } : item.url ? toBase64FromUrl(item.url) : null
        )
      )
      const valid = result.filter((item): item is { b64_json: string } => item !== null)
      if (!valid.length) return c.json({ error: { message: '中转站没有返回图片' } }, 502)
      return c.json({ created: Math.floor(Date.now() / 1000), data: valid })
    } catch (error) {
      const message = error instanceof Error ? error.message : '代理请求失败'
      return c.json({ error: { message } }, 502)
    }
  })
}
