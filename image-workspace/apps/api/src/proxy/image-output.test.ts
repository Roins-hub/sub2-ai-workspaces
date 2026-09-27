import { afterEach, describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { generationSize, withComposition, upscaleImages, parseUpscaleTier } from './image-output'

async function fixture(width: number, height: number, format: 'png' | 'jpeg' | 'webp' = 'png') {
  const bytes = await sharp({ create: { width, height, channels: 4, background: '#217caacc' } }).toFormat(format).toBuffer()
  return { b64_json: bytes.toString('base64') }
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs() })

describe('image aspect and resolution contract', () => {
  it('requires cloud configuration only when requesting upscaling', () => {
    vi.stubEnv('IMAGE_UPSCALE_URL', '')
    expect(() => parseUpscaleTier('4k')).toThrow()
    expect(parseUpscaleTier(undefined)).toBeUndefined()
    expect(() => parseUpscaleTier('8k')).toThrow()
  })
  it('preserves all five ratios and rejects invalid sizes before calling upstream', () => {
    for (const [input, expected] of [['4096x2304','1536x864'], ['4096x3072','1536x1152'], ['2304x4096','864x1536'], ['3072x4096','1152x1536'], ['4096x4096','1024x1024']]) expect(generationSize(input)).toBe(expected)
    expect(() => generationSize('auto')).toThrow()
    expect(() => generationSize('bad')).toThrow()
    expect(() => generationSize('0x0')).toThrow()
    expect(withComposition('海报', '4096x2304')).toContain('16:9，横版')
    expect(withComposition('海报', '3072x4096')).toContain('3:4，竖版')
  })

  it('retains a portrait original and never spends on upscaling a landscape mismatch', async () => {
    const original = await fixture(1024,1536)
    const call = vi.spyOn(globalThis,'fetch')
    const result = await upscaleImages([original], '4k', 'png', '4096x2304')
    expect(call).not.toHaveBeenCalled()
    expect(result.data[0]).toEqual(original)
    expect(result.upscale).toMatchObject({status:'ratio_mismatch',meets_target:false,width:1024,height:1536})
  })

  it('accepts measured provider rounding and emits exact 16:9 4K with alpha', async () => {
    const original = await fixture(1672,941)
    const returned = await fixture(5016,2823)
    const call = vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({data:[returned]}))
    const result = await upscaleImages([original], '4k', 'png', '4096x2304')
    const meta = await sharp(Buffer.from(result.data[0].b64_json,'base64')).metadata()
    expect(call).toHaveBeenCalledTimes(1)
    expect((call.mock.calls[0][1]?.body as FormData).get('long_edge')).toBe('4096')
    expect(meta).toMatchObject({width:4096,height:2304,hasAlpha:true})
    expect(result.upscale).toMatchObject({status:'upscaled',meets_target:true})
  })

  for (const [width,height] of [[2048,1152],[2048,1536],[4096,2304],[4096,3072],[2304,4096],[3072,4096],[4096,4096]]) {
    it(`normalizes an already-large original to ${width}x${height} without cloud calls`, async () => {
      const original = await fixture(width+width/2,height+height/2)
      const call = vi.spyOn(globalThis,'fetch')
      const tier = Math.max(width,height) === 4096 ? '4k' : '2k'
      const result = await upscaleImages([original],tier,'png',`${width}x${height}`)
      expect(call).not.toHaveBeenCalled()
      expect(await sharp(Buffer.from(result.data[0].b64_json,'base64')).metadata()).toMatchObject({width,height})
      expect(result.upscale?.meets_target).toBe(true)
    })
  }

  it('does not interpolate when the cloud returns an undersized result', async () => {
    const original = await fixture(1536,864)
    vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({data:[original]}))
    const result = await upscaleImages([original],'4k','png','4096x2304')
    expect(result.upscale).toMatchObject({status:'partial',meets_target:false})
    expect(result.data[0].b64_json).toBe(original.b64_json)
  })

  it('retains originals on failed cloud calls or invalid returned aspect ratio', async () => {
    const original = await fixture(1536,864)
    const call = vi.spyOn(globalThis,'fetch').mockResolvedValueOnce(new Response('failed',{status:502}))
    let result = await upscaleImages([original],'4k','png','4096x2304')
    expect(result.data[0]).toEqual(original)
    expect(result.upscale?.status).toBe('failed')
    call.mockResolvedValueOnce(Response.json({data:[await fixture(2880,4320)]}))
    result = await upscaleImages([original],'4k','png','4096x2304')
    expect(result.data[0]).toEqual(original)
    expect(result.upscale?.status).toBe('ratio_mismatch')
  })

  it('validates non-upscale JPEG/WebP images without calling the cloud', async () => {
    const call = vi.spyOn(globalThis,'fetch')
    for (const format of ['jpeg','webp'] as const) {
      const original = await fixture(1448,1086,format)
      const result = await upscaleImages([original],undefined,format,'1536x1152')
      expect(result.data[0]).toEqual(original)
      expect(result.upscale?.status).toBe('ratio_verified')
    }
    expect(call).not.toHaveBeenCalled()
  })

  it('flags corrupt image data and preserves every image in mixed results', async () => {
    const corrupt = {b64_json:Buffer.from('invalid').toString('base64')}
    const portrait = await fixture(600,900)
    const result = await upscaleImages([corrupt,portrait], '2k', 'png', '2048x1152')
    expect(result.data).toEqual([corrupt,portrait])
    expect(result.upscale?.images?.map(x=>x.status)).toEqual(['validation_failed','ratio_mismatch'])
  })
})
