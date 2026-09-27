type Dimensions = { width: number; height: number }
type Metadata = { status: string; meets_target?: boolean; original_width?: number; original_height?: number }

export function imageOutputStatus(actual: Dimensions, requested: Dimensions, tier: '2k' | '4k' | undefined, metadata?: Metadata) {
  const actualSize = `${actual.width} × ${actual.height}`
  const expectedSize = `${requested.width} × ${requested.height}`
  const ratioMismatch = Math.abs((actual.width / actual.height) / (requested.width / requested.height) - 1) > 0.001
  if (metadata?.status === 'ratio_mismatch' || ratioMismatch) {
    return { warning: true, message: `图片比例与所选设置不符：目标 ${expectedSize}，实际 ${actualSize}。已保留原图，未继续超分或自动重试。` }
  }
  if (metadata?.status === 'validation_failed') {
    return { warning: true, message: '未能完成图片比例校验，已保留原图，未继续超分。' }
  }
  if (!tier) return undefined
  const exact = actual.width === requested.width && actual.height === requested.height
  if (metadata?.status === 'failed' || metadata?.status === 'partial' || metadata?.meets_target === false || !exact) {
    return { warning: true, message: `AI 超分未达到目标 ${expectedSize}，实际 ${actualSize}，已保留图片。` }
  }
  return { warning: false, message: `输出尺寸已校验：${metadata?.original_width ?? '?'} × ${metadata?.original_height ?? '?'} → ${actualSize}（${tier.toUpperCase()}）` }
}
