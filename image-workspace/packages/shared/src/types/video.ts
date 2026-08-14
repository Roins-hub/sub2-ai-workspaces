export interface VideoGenerateRequest {
  provider: 'gitee' | 'huggingface'
  imageUrl: string
  prompt: string
  width: number
  height: number
  seed?: number
}

export type VideoTaskStatus = 'pending' | 'processing' | 'success' | 'failed'

export interface VideoTaskResponse {
  taskId?: string
  status: VideoTaskStatus
  videoUrl?: string
  error?: string
}

export const VIDEO_NEGATIVE_PROMPT =
  'Vivid colors, overexposed, static, blurry details, subtitles, style, artwork, painting, image, still, overall grayish tone, worst quality, low quality, JPEG compression artifacts, ugly, incomplete, extra fingers, poorly drawn hands, poorly drawn face, deformed, disfigured, malformed limbs, fused fingers, still image, cluttered background, three legs, many people in the background, walking backward'

export const VIDEO_MODELS = {
  gitee: 'Wan2_2-I2V-A14B',
  huggingface: 'Wan2.1-I2V-14B',
} as const
