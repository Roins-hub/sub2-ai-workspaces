import sharp from 'sharp'

export type UpscaleTier = '2k' | '4k'
type Dimensions = { width: number; height: number }
type ImageData = { b64_json: string; mime_type?: string }
type ImageCheck = {
  status: string
  original_width?: number
  original_height?: number
  width?: number
  height?: number
  target_width?: number
  target_height?: number
  meets_target: boolean
}
export type UpscaleResult = { data: ImageData[]; upscale?: ImageCheck & { images?: ImageCheck[] } }
// Accept only provider pixel rounding, e.g. 1672 x 941 for 16:9.
export const RATIO_TOLERANCE = 0.001

export function parseUpscaleTier(value: unknown): UpscaleTier | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (value !== '2k' && value !== '4k') throw new Error('Invalid upscale tier')
  if (!process.env.IMAGE_UPSCALE_URL || !process.env.IMAGE_UPSCALE_KEY) throw new Error('AI 超分服务尚未配置')
  return value
}

export function parseDimensions(size: unknown): Dimensions | undefined {
  if (size === undefined || size === null || size === '' || size === 'auto') return undefined
  const match = /^(\d+)x(\d+)$/.exec(String(size))
  if (!match) throw new Error('图片尺寸格式无效，应为宽x高')
  const width = Number(match[1]), height = Number(match[2])
  if (width < 64 || height < 64 || width > 8192 || height > 8192) throw new Error('图片尺寸超出范围')
  return { width, height }
}

function divisor(a: number, b: number): number {
  return b === 0 ? a : divisor(b, a % b)
}

export function generationSize(size: unknown): string {
  const dims = parseDimensions(size)
  if (!dims) throw new Error('超分需要指定图片尺寸')
  const gcd = divisor(dims.width, dims.height)
  const w = dims.width / gcd, h = dims.height / gcd
  const edge = w === h ? 1024 : 1536
  const scale = Math.max(1, Math.floor(edge / Math.max(w, h)))
  return `${w * scale}x${h * scale}`
}

export function withComposition(prompt: unknown, size: unknown): string {
  const text = String(prompt)
  const dims = parseDimensions(size)
  if (!dims) return text
  const gcd = divisor(dims.width, dims.height)
  const direction = dims.width === dims.height ? '正方形' : dims.width > dims.height ? '横版' : '竖版'
  return `${text}\n\n画布要求：宽高比必须为 ${dims.width / gcd}:${dims.height / gcd}，${direction}构图。按该比例安排完整画面，文字与主体留在安全区域。画布比例以此设置为准。`
}

export function ratioMatches(actual: Dimensions, target: Dimensions): boolean {
  return Math.abs((actual.width / actual.height) / (target.width / target.height) - 1) <= RATIO_TOLERANCE
}

function targetDimensions(requested: Dimensions, tier: UpscaleTier): Dimensions {
  const edge = tier === '4k' ? 4096 : 2048
  const scale = edge / Math.max(requested.width, requested.height)
  return { width: Math.round(requested.width * scale), height: Math.round(requested.height * scale) }
}

async function dimensions(bytes: Buffer): Promise<Dimensions> {
  const meta = await sharp(bytes, { limitInputPixels: 64_000_000 }).metadata()
  if (!meta.width || !meta.height) throw new Error('无法读取图片尺寸')
  return { width: meta.width, height: meta.height }
}

export async function upscaleImages(images: ImageData[], tier: UpscaleTier | undefined, format: unknown, requestedSize?: unknown): Promise<UpscaleResult> {
  const requested = parseDimensions(requestedSize)
  if (!requested && !tier) return { data: images }
  if (!requested) throw new Error('超分需要指定图片尺寸')
  const target = tier ? targetDimensions(requested, tier) : requested
  const outputFormat = ['png', 'jpeg', 'webp'].includes(String(format)) ? String(format) as 'png' | 'jpeg' | 'webp' : 'png'
  const data: ImageData[] = [], checks: ImageCheck[] = []
  for (const image of images) {
    let original: Dimensions | undefined
    const targetFields = { target_width: target.width, target_height: target.height }
    try {
      let bytes = Buffer.from(image.b64_json, 'base64')
      original = await dimensions(bytes)
      const originalFields = { original_width: original.width, original_height: original.height }
      if (!ratioMatches(original, requested)) {
        data.push(image)
        checks.push({ status: 'ratio_mismatch', ...originalFields, ...targetFields, ...original, meets_target: false })
        continue // Never upscale, crop, or regenerate a mismatched image automatically.
      }
      if (!tier) {
        data.push(image)
        checks.push({ status: 'ratio_verified', ...originalFields, ...targetFields, ...original, meets_target: original.width === target.width && original.height === target.height })
        continue
      }
      const needsUpscale = original.width < target.width || original.height < target.height
      if (needsUpscale) {
        const form = new FormData()
        form.set('image', new Blob([new Uint8Array(bytes)]), 'source.png')
        form.set('long_edge', tier === '4k' ? '4096' : '2048')
        form.set('output_format', outputFormat)
        const response = await fetch(`${process.env.IMAGE_UPSCALE_URL}/v1/images/upscale`, {
          method: 'POST', headers: { Authorization: `Bearer ${process.env.IMAGE_UPSCALE_KEY}` }, body: form,
          signal: AbortSignal.timeout(180000),
        })
        if (!response.ok) throw new Error(`Upscale HTTP ${response.status}`)
        const result = await response.json() as UpscaleResult
        if (!result.data?.[0]?.b64_json) throw new Error('Empty upscale response')
        bytes = Buffer.from(result.data[0].b64_json, 'base64')
      }
      const actual = await dimensions(bytes)
      if (!ratioMatches(actual, target)) {
        data.push(image)
        checks.push({ status: 'ratio_mismatch', ...originalFields, ...targetFields, ...original, meets_target: false })
        continue
      }
      if (actual.width < target.width || actual.height < target.height) {
        // Missing AI resolution must not be replaced with interpolation.
        data.push({ b64_json: bytes.toString('base64') })
        checks.push({ status: 'partial', ...originalFields, ...targetFields, ...actual, meets_target: false })
        continue
      }
      const output = await sharp(bytes, { limitInputPixels: 64_000_000 })
        .resize(target.width, target.height, { fit: 'cover', position: 'centre', withoutEnlargement: true })
        .toFormat(outputFormat).toBuffer()
      const final = await dimensions(output)
      const exact = final.width === target.width && final.height === target.height
      data.push({ b64_json: output.toString('base64'), mime_type: `image/${outputFormat}` })
      checks.push({ status: exact ? needsUpscale ? 'upscaled' : 'already_large_enough' : 'partial', ...originalFields, ...targetFields, ...final, meets_target: exact })
    } catch {
      data.push(image)
      checks.push({ status: original ? 'failed' : 'validation_failed', ...targetFields, ...(original ? { original_width: original.width, original_height: original.height, ...original } : {}), meets_target: false })
    }
  }
  const failure = checks.find(check => ['ratio_mismatch', 'validation_failed', 'failed', 'partial'].includes(check.status))
  return { data, upscale: { ...(failure ?? checks[0]), images: checks } }
}
