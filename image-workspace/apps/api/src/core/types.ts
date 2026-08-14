export interface ModelInfo {
  id: string
  name: string
  description?: string
  maxTokens?: number
  supportedSizes?: string[]
}

export interface AuthConfig {
  type: 'bearer' | 'api-key' | 'none'
  optional?: boolean
  headerName?: string
  prefix?: string
}

export interface ChannelEndpoints {
  image?: string
  llm?: string
  tasks?: string
}

export interface ChannelConfig {
  baseUrl: string
  auth: AuthConfig
  endpoints?: ChannelEndpoints
  headers?: Record<string, string>
  tokens?: string[]

  imageModels?: ModelInfo[]
  llmModels?: ModelInfo[]
  videoModels?: ModelInfo[]

  asyncMode?: {
    enabled: boolean
    pollIntervalMs?: number
    maxPollAttempts?: number
    headers?: Record<string, string>
  }
}

export interface ImageRequest {
  prompt: string
  negativePrompt?: string
  model?: string
  width: number
  height: number
  steps?: number
  guidanceScale?: number
  seed?: number
  loras?: unknown
}

export interface ImageResult {
  url: string
  seed: number
  model?: string
}

export interface LLMRequest {
  prompt: string
  systemPrompt: string
  model?: string
  maxTokens?: number
  temperature?: number
}

export interface LLMResult {
  content: string
  model: string
}

export interface VideoRequest {
  imageUrl: string
  prompt: string
  width: number
  height: number
  model?: string
}

export interface VideoResult {
  taskId: string
}

export interface VideoStatus {
  status: 'pending' | 'processing' | 'success' | 'failed'
  videoUrl?: string
  error?: string
}

export interface ImageCapability {
  generate(request: ImageRequest, token?: string | null): Promise<ImageResult>
}

export interface LLMCapability {
  complete(request: LLMRequest, token?: string | null): Promise<LLMResult>
}

export interface VideoCapability {
  createTask(request: VideoRequest, token?: string | null): Promise<VideoResult>
  getStatus(taskId: string, token?: string | null): Promise<VideoStatus>
}

export interface Channel {
  id: string
  name: string
  config: ChannelConfig
  image?: ImageCapability
  llm?: LLMCapability
  video?: VideoCapability
}

export type EnvLike = Record<string, string | undefined>
