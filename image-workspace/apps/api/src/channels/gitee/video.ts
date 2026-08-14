import type { VideoTaskResponse } from '@z-image/shared'
import { Errors, VIDEO_NEGATIVE_PROMPT } from '@z-image/shared'
import type { VideoCapability, VideoRequest, VideoResult, VideoStatus } from '../../core/types'

const GITEE_VIDEO_API = 'https://ai.gitee.com/v1/async/videos/image-to-video'
const GITEE_TASK_API = 'https://ai.gitee.com/api/v1/task'

interface GiteeErrorResponse {
  message?: string
  error?: {
    message?: string
    code?: string
    type?: string
  }
}

function parseGiteeError(status: number, data: GiteeErrorResponse): Error {
  const provider = 'Gitee AI'
  const message = data.error?.message || data.message || `HTTP ${status}`

  if (
    status === 401 ||
    message.toLowerCase().includes('unauthorized') ||
    message.toLowerCase().includes('invalid api key')
  ) {
    return Errors.authInvalid(provider, message)
  }

  if (
    status === 429 ||
    message.toLowerCase().includes('rate limit') ||
    message.toLowerCase().includes('quota')
  ) {
    if (message.toLowerCase().includes('quota')) return Errors.quotaExceeded(provider)
    return Errors.rateLimited(provider)
  }

  if (message.toLowerCase().includes('expired')) {
    return Errors.authExpired(provider)
  }

  return Errors.providerError(provider, message)
}

interface GiteeVideoTaskResponse {
  task_id: string
}

interface GiteeTaskStatusResponse {
  status: 'pending' | 'is_process' | 'success' | 'failure'
  output?: {
    file_url?: string
    error?: string
  }
}

export const giteeVideo: VideoCapability = {
  async createTask(request: VideoRequest, token?: string | null): Promise<VideoResult> {
    if (!token) throw Errors.authRequired('Gitee AI')

    const formData = new FormData()
    formData.append('image', request.imageUrl)
    formData.append('prompt', request.prompt)
    formData.append('negative_prompt', VIDEO_NEGATIVE_PROMPT)
    formData.append('model', request.model || 'Wan2_2-I2V-A14B')
    formData.append('num_inference_steps', '6')
    formData.append('num_frames', '48')
    formData.append('guidance_scale', '1')
    formData.append('width', request.width.toString())
    formData.append('height', request.height.toString())

    const response = await fetch(GITEE_VIDEO_API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.trim()}` },
      body: formData,
    })

    if (!response.ok) {
      const errData = (await response.json().catch(() => ({}))) as GiteeErrorResponse
      throw parseGiteeError(response.status, errData)
    }

    const data = (await response.json()) as GiteeVideoTaskResponse
    return { taskId: data.task_id }
  },

  async getStatus(taskId: string, token?: string | null): Promise<VideoStatus> {
    if (!token) throw Errors.authRequired('Gitee AI')

    const response = await fetch(`${GITEE_TASK_API}/${taskId}`, {
      headers: { Authorization: `Bearer ${token.trim()}` },
    })

    if (!response.ok) {
      const errData = (await response.json().catch(() => ({}))) as GiteeErrorResponse
      throw parseGiteeError(response.status, errData)
    }

    const data = (await response.json()) as GiteeTaskStatusResponse

    if (data.status === 'success') return { status: 'success', videoUrl: data.output?.file_url }
    if (data.status === 'failure') return { status: 'failed', error: data.output?.error }
    return { status: data.status === 'is_process' ? 'processing' : 'pending' }
  },
}

export function toVideoTaskResponse(status: VideoStatus): VideoTaskResponse {
  if (status.status === 'success') return { status: 'success', videoUrl: status.videoUrl }
  if (status.status === 'failed') return { status: 'failed', error: status.error }
  return { status: status.status }
}
