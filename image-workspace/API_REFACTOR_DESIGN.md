# API 重构设计：按渠道划分架构

> 本文档设计新的 API 目录结构，将代码按渠道（Channel）组织，便于扩展和维护。

---

## 目录

1. [当前结构问题](#当前结构问题)
2. [新架构设计](#新架构设计)
3. [核心概念](#核心概念)
4. [详细目录结构](#详细目录结构)
5. [关键接口设计](#关键接口设计)
6. [迁移建议](#迁移建议)
7. [扩展指南](#扩展指南)

---

## 当前结构问题

### 现状

```
apps/api/src/
├── providers/           # 图像生成提供商
│   ├── gitee.ts
│   ├── huggingface.ts
│   ├── modelscope.ts
│   └── registry.ts
├── llm-providers/       # LLM 提供商
│   ├── gitee-llm.ts
│   ├── huggingface-llm.ts
│   ├── modelscope-llm.ts
│   ├── pollinations.ts   # 将合并到 HuggingFace 渠道
│   └── registry.ts
└── ...
```

### 问题分析

| 问题 | 说明 |
|------|------|
| **代码分散** | 同一渠道的代码分布在 `providers/` 和 `llm-providers/` 两个目录 |
| **API 地址分散** | ModelScope 的 API URL 分别在 `modelscope.ts:70` 和 `modelscope-llm.ts:10` |
| **重复代码** | 每个渠道都有相似的错误处理、认证逻辑 |
| **Token 管理分离** | Token 轮换在前端 (`apps/web/src/lib/tokenRotation.ts`)，后端无法复用 |
| **扩展困难** | 添加新渠道需要修改多个文件和注册表 |
| **自定义渠道难** | 没有统一的渠道配置机制，用户自定义渠道需要改代码 |

---

## 新架构设计

### 设计原则

1. **按渠道聚合**: 同一渠道的所有代码放在一个目录
2. **配置集中**: 每个渠道的 API 地址、模型列表、认证方式在一处定义
3. **Token 管理统一**: 后端统一管理 Token 轮换，前端只负责存储
4. **插件化扩展**: 用户自定义渠道通过配置文件注册，无需改代码
5. **共享基础设施**: 公共的错误处理、HTTP 客户端、重试逻辑抽取到 `core/`

### 新目录结构概览

```
apps/api/src/
├── core/                    # 核心基础设施
│   ├── types.ts             # 统一类型定义
│   ├── http-client.ts       # HTTP 客户端封装
│   ├── error.ts             # 错误处理
│   ├── token-manager.ts     # Token 轮换管理
│   └── channel-registry.ts  # 渠道注册表
│
├── channels/                # 渠道目录 (核心!)
│   ├── modelscope/          # 魔塔渠道
│   │   ├── index.ts         # 渠道入口 + 导出
│   │   ├── config.ts        # API 地址、模型列表、认证配置
│   │   ├── image.ts         # 图像生成实现
│   │   ├── llm.ts           # LLM 实现
│   │   ├── video.ts         # 视频生成 (可选)
│   │   └── __tests__/
│   │
│   ├── gitee/               # Gitee AI 渠道
│   │   ├── index.ts
│   │   ├── config.ts
│   │   ├── image.ts
│   │   ├── llm.ts
│   │   └── video.ts
│   │
│   ├── huggingface/         # HuggingFace 渠道
│   │   ├── index.ts
│   │   ├── config.ts
│   │   ├── image.ts
│   │   ├── llm.ts           # 包含 Pollinations 作为免费后端
│   │   └── pollinations.ts  # Pollinations 免费 LLM (无需认证)
│   │
│   ├── custom/              # 用户自定义渠道
│   │   ├── index.ts
│   │   ├── config.ts        # 从环境变量/配置文件读取
│   │   ├── image.ts         # OpenAI 兼容实现
│   │   └── llm.ts           # OpenAI 兼容实现
│   │
│   └── index.ts             # 渠道统一导出 + 自动注册
│
├── middleware/              # 中间件 (保持不变)
├── openai/                  # OpenAI 兼容层 (保持不变)
├── openapi/                 # OpenAPI 规范 (保持不变)
├── schemas/                 # Zod 验证 (保持不变)
├── utils/                   # 工具函数 (保持不变)
│
├── app.ts                   # Hono 应用
├── index.ts                 # Workers 入口
├── server.ts                # Node.js 入口
└── config.ts                # 全局配置
```

### 渠道概览

| 渠道 | 图像生成 | LLM | 视频 | 认证 |
|------|----------|-----|------|------|
| **modelscope** | ✅ | ✅ | ❌ | Bearer Token |
| **gitee** | ✅ | ✅ | ✅ | API Key |
| **huggingface** | ✅ | ✅ (含 Pollinations 免费后端) | ❌ | 可选 Token |
| **custom** | ✅ | ✅ | ❌ | 用户配置 |

---

## 核心概念

### 1. Channel (渠道)

渠道是一个 AI 服务提供商的完整抽象，包含:

```typescript
interface Channel {
  /** 渠道 ID (唯一标识) */
  id: string
  /** 显示名称 */
  name: string
  /** 渠道配置 */
  config: ChannelConfig
  /** 图像生成能力 (可选) */
  image?: ImageCapability
  /** LLM 能力 (可选) */
  llm?: LLMCapability
  /** 视频生成能力 (可选) */
  video?: VideoCapability
}
```

### 2. ChannelConfig (渠道配置)

集中管理 API 地址和认证:

```typescript
interface ChannelConfig {
  /** API 基础地址 */
  baseUrl: string
  /** 认证方式 */
  auth: {
    type: 'bearer' | 'api-key' | 'none'
    headerName?: string  // 默认 'Authorization'
    prefix?: string      // 默认 'Bearer '
  }
  /** 支持的图像模型 */
  imageModels?: ModelInfo[]
  /** 支持的 LLM 模型 */
  llmModels?: ModelInfo[]
  /** 支持的视频模型 */
  videoModels?: ModelInfo[]
  /** 速率限制配置 */
  rateLimit?: {
    requestsPerMinute: number
    requestsPerDay?: number
  }
  /** 自定义请求头 */
  headers?: Record<string, string>
}
```

### 3. Capability (能力)

每种能力是一个独立的接口:

```typescript
interface ImageCapability {
  generate(request: ImageRequest, token?: string): Promise<ImageResult>
}

interface LLMCapability {
  complete(request: LLMRequest, token?: string): Promise<LLMResult>
}

interface VideoCapability {
  generate(request: VideoRequest, token?: string): Promise<VideoResult>
  getStatus(taskId: string, token?: string): Promise<VideoStatus>
}
```

### 4. TokenManager (Token 管理器)

统一的 Token 轮换管理:

```typescript
interface TokenManager {
  /** 获取下一个可用 Token */
  getNextToken(channelId: string): string | null
  /** 标记 Token 已耗尽 */
  markExhausted(channelId: string, token: string): void
  /** 获取 Token 统计 */
  getStats(channelId: string): TokenStats
  /** 重置所有 Token 状态 */
  reset(channelId?: string): void
}
```

---

## 详细目录结构

### `core/` - 核心基础设施

```
core/
├── types.ts              # 统一类型定义
│   ├── Channel
│   ├── ChannelConfig
│   ├── ImageCapability / LLMCapability / VideoCapability
│   ├── ImageRequest / LLMRequest / VideoRequest
│   └── ImageResult / LLMResult / VideoResult
│
├── http-client.ts        # HTTP 客户端
│   ├── createHttpClient(config)  # 创建带认证的客户端
│   ├── withRetry(fn, options)    # 重试包装器
│   └── parseErrorResponse(res)   # 统一错误解析
│
├── error.ts              # 错误处理
│   ├── ChannelError (基类)
│   ├── AuthError
│   ├── RateLimitError
│   ├── QuotaError
│   └── GenerationError
│
├── token-manager.ts      # Token 轮换管理
│   ├── TokenManager class
│   ├── parseTokens(raw)
│   ├── isQuotaError(error)
│   └── runWithRotation(channelId, tokens, operation)
│
└── channel-registry.ts   # 渠道注册表
    ├── registerChannel(channel)
    ├── getChannel(id)
    ├── getImageChannel(id)
    ├── getLLMChannel(id)
    └── listChannels()
```

### `channels/modelscope/` - 魔塔渠道示例

```
channels/modelscope/
├── index.ts              # 渠道入口
│   export const modelscopeChannel: Channel = {
│     id: 'modelscope',
│     name: '魔塔社区',
│     config: modelscopeConfig,
│     image: modelscopeImage,
│     llm: modelscopeLLM,
│   }
│
├── config.ts             # 配置集中管理
│   export const modelscopeConfig: ChannelConfig = {
│     baseUrl: 'https://api-inference.modelscope.cn/v1',
│     auth: { type: 'bearer' },
│     imageModels: [
│       { id: 'Tongyi-MAI/Z-Image-Turbo', name: 'Z-Image Turbo' },
│       { id: 'black-forest-labs/FLUX.1-schnell', name: 'FLUX.1 Schnell' },
│     ],
│     llmModels: [
│       { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B' },
│       { id: 'Qwen/Qwen3-235B-A22B', name: 'Qwen 3 235B' },
│     ],
│     rateLimit: { requestsPerMinute: 10 },
│   }
│
├── image.ts              # 图像生成
│   export const modelscopeImage: ImageCapability = {
│     async generate(request, token) {
│       // 使用 config.baseUrl + '/images/generations'
│       // 异步任务模式: 提交 -> 轮询
│     }
│   }
│
├── llm.ts                # LLM 调用
│   export const modelscopeLLM: LLMCapability = {
│     async complete(request, token) {
│       // 使用 config.baseUrl + '/chat/completions'
│     }
│   }
│
└── __tests__/
    ├── image.test.ts
    └── llm.test.ts
```

### `channels/custom/` - 用户自定义渠道

```
channels/custom/
├── index.ts              # 动态创建自定义渠道
│   // 从环境变量或配置文件读取
│   // CUSTOM_CHANNEL_1_URL, CUSTOM_CHANNEL_1_KEY, etc.
│
├── config.ts             # 配置解析
│   export function parseCustomChannelConfig(env): ChannelConfig[]
│
├── image.ts              # OpenAI 兼容图像生成
│   // 通用实现，适配 OpenAI /v1/images/generations 格式
│
└── llm.ts                # OpenAI 兼容 LLM
    // 通用实现，适配 OpenAI /v1/chat/completions 格式
```

### `channels/huggingface/` - HuggingFace 渠道 (含 Pollinations)

```
channels/huggingface/
├── index.ts              # 渠道入口
├── config.ts             # 配置
├── image.ts              # 图像生成 (Gradio Spaces)
├── llm.ts                # LLM 调用 (HF Inference API)
└── pollinations.ts       # Pollinations 免费 LLM 后端
```

```typescript
// channels/huggingface/config.ts
export const huggingfaceConfig: ChannelConfig = {
  baseUrl: 'https://api-inference.huggingface.co',
  auth: { type: 'bearer', optional: true },  // Token 可选
  imageModels: [
    { id: 'black-forest-labs/FLUX.1-schnell', name: 'FLUX.1 Schnell' },
    { id: 'stabilityai/stable-diffusion-xl-base-1.0', name: 'SDXL' },
  ],
  llmModels: [
    { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B' },
    { id: 'meta-llama/Llama-3.1-70B-Instruct', name: 'Llama 3.1 70B' },
  ],
  // Pollinations 作为免费后端
  freeLLMBackend: {
    url: 'https://text.pollinations.ai/openai',
    models: [
      { id: 'openai', name: 'Pollinations OpenAI' },
      { id: 'mistral', name: 'Pollinations Mistral' },
    ],
  },
}

// channels/huggingface/llm.ts
export const huggingfaceLLM: LLMCapability = {
  async complete(request, token) {
    // 如果没有 Token，使用 Pollinations 免费后端
    if (!token) {
      return pollinationsComplete(request)
    }
    // 有 Token，使用 HuggingFace Inference API
    return hfInferenceComplete(request, token)
  }
}

// channels/huggingface/pollinations.ts
export async function pollinationsComplete(request: LLMRequest): Promise<LLMResult> {
  const response = await fetch('https://text.pollinations.ai/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: request.model || 'openai',
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.prompt },
      ],
      max_tokens: request.maxTokens || 1000,
      temperature: request.temperature ?? 0.7,
    }),
  })
  // ...
}
```

### `channels/index.ts` - 统一导出和自动注册

```typescript
// channels/index.ts
import { registerChannel } from '../core/channel-registry'
import { modelscopeChannel } from './modelscope'
import { giteeChannel } from './gitee'
import { huggingfaceChannel } from './huggingface'
import { loadCustomChannels } from './custom'

// 注册内置渠道
const builtinChannels = [
  modelscopeChannel,
  giteeChannel,
  huggingfaceChannel,
]

for (const channel of builtinChannels) {
  registerChannel(channel)
}

// 注册自定义渠道 (从环境变量加载)
export function initCustomChannels(env: Record<string, string>) {
  const customChannels = loadCustomChannels(env)
  for (const channel of customChannels) {
    registerChannel(channel)
  }
}

// 导出所有渠道
export * from './modelscope'
export * from './gitee'
export * from './huggingface'
export * from './custom'
```

---

## 关键接口设计

### `core/types.ts`

```typescript
// ============ 渠道配置 ============

export interface ModelInfo {
  id: string
  name: string
  description?: string
  maxTokens?: number
  supportedSizes?: string[]
}

export interface AuthConfig {
  type: 'bearer' | 'api-key' | 'none'
  headerName?: string
  prefix?: string
}

export interface RateLimitConfig {
  requestsPerMinute: number
  requestsPerDay?: number
}

export interface ChannelConfig {
  baseUrl: string
  auth: AuthConfig
  imageModels?: ModelInfo[]
  llmModels?: ModelInfo[]
  videoModels?: ModelInfo[]
  rateLimit?: RateLimitConfig
  headers?: Record<string, string>
  /** 异步任务模式 (如 ModelScope) */
  asyncMode?: boolean
  /** 轮询间隔 (ms) */
  pollInterval?: number
  /** 最大轮询次数 */
  maxPollAttempts?: number
}

// ============ 能力接口 ============

export interface ImageRequest {
  prompt: string
  negativePrompt?: string
  model?: string
  width?: number
  height?: number
  steps?: number
  guidanceScale?: number
  seed?: number
  loras?: Array<{ model: string; weight: number }>
}

export interface ImageResult {
  url: string
  seed: number
  model: string
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

export interface ImageCapability {
  generate(request: ImageRequest, token?: string): Promise<ImageResult>
}

export interface LLMCapability {
  complete(request: LLMRequest, token?: string): Promise<LLMResult>
}

// ============ 渠道定义 ============

export interface Channel {
  id: string
  name: string
  config: ChannelConfig
  image?: ImageCapability
  llm?: LLMCapability
  video?: VideoCapability
}
```

### `core/token-manager.ts`

```typescript
export interface TokenStats {
  total: number
  active: number
  exhausted: number
}

export class TokenManager {
  private exhaustedTokens: Map<string, Set<string>> = new Map()
  private lastResetDate: string = ''

  constructor() {
    this.checkDailyReset()
  }

  private checkDailyReset() {
    const today = new Date().toISOString().split('T')[0]
    if (this.lastResetDate !== today) {
      this.exhaustedTokens.clear()
      this.lastResetDate = today
    }
  }

  getNextToken(channelId: string, allTokens: string[]): string | null {
    this.checkDailyReset()
    const exhausted = this.exhaustedTokens.get(channelId) || new Set()
    return allTokens.find(t => !exhausted.has(t)) || null
  }

  markExhausted(channelId: string, token: string): void {
    if (!this.exhaustedTokens.has(channelId)) {
      this.exhaustedTokens.set(channelId, new Set())
    }
    this.exhaustedTokens.get(channelId)!.add(token)
  }

  getStats(channelId: string, allTokens: string[]): TokenStats {
    const exhausted = this.exhaustedTokens.get(channelId) || new Set()
    const exhaustedCount = allTokens.filter(t => exhausted.has(t)).length
    return {
      total: allTokens.length,
      active: allTokens.length - exhaustedCount,
      exhausted: exhaustedCount,
    }
  }

  reset(channelId?: string): void {
    if (channelId) {
      this.exhaustedTokens.delete(channelId)
    } else {
      this.exhaustedTokens.clear()
    }
  }
}

// 全局单例
export const tokenManager = new TokenManager()

// 便捷函数
export async function runWithTokenRotation<T>(
  channelId: string,
  allTokens: string[],
  operation: (token: string | null) => Promise<T>,
  options: { allowAnonymous?: boolean; maxRetries?: number } =
): Promise<T> {
  const { allowAnonymous = false, maxRetries = 10 } = options

  if (allTokens.length === 0) {
    if (allowAnonymous) {
      return operation(null)
    }
    throw new Error('No API tokens configured')
  }

  let attempts = 0
  while (attempts < maxRetries) {
    const token = tokenManager.getNextToken(channelId, allTokens)

    if (!token) {
      if (allowAnonymous) {
        return operation(null)
      }
      throw new Error('All API tokens exhausted')
    }

    try {
      return await operation(token)
    } catch (error) {
      if (isQuotaError(error)) {
        tokenManager.markExhausted(channelId, token)
        attempts++
        continue
      }
      throw error
    }
  }

  throw new Error('Maximum retry attempts reached')
}
```

### `core/channel-registry.ts`

```typescript
import type { Channel, ImageCapability, LLMCapability } from './types'

const channels = new Map<string, Channel>()

export function registerChannel(channel: Channel): void {
  if (channels.has(channel.id)) {
    console.warn(`Channel ${channel.id} already registered, overwriting`)
  }
  channels.set(channel.id, channel)
}

export function getChannel(id: string): Channel | undefined {
  return channels.get(id)
}

export function getImageChannel(id: string): ImageCapability | undefined {
  return channels.get(id)?.image
}

export function getLLMChannel(id: string): LLMCapability | undefined {
  return channels.get(id)?.llm
}

export function listChannels(): Channel[] {
  return Array.from(channels.values())
}

export function listImageChannels(): Channel[] {
  return listChannels().filter(c => c.image)
}

export function listLLMChannels(): Channel[] {
  return listChannels().filter(c => c.llm)
}

export function hasChannel(id: string): boolean {
  return channels.has(id)
}
```

---

## 迁移建议

### 阶段 1: 创建 core/ 基础设施

1. 创建 `core/types.ts` - 定义统一类型
2. 创建 `core/error.ts` - 统一错误处理
3. 创建 `core/http-client.ts` - HTTP 客户端封装
4. 创建 `core/token-manager.ts` - Token 管理 (从前端迁移)
5. 创建 `core/channel-registry.ts` - 渠道注册表

### 阶段 2: 迁移现有渠道

按以下顺序迁移 (从简单到复杂):

1. **huggingface** - 图像 + LLM (含 Pollinations 免费后端)
2. **gitee** - 图像 + LLM + 视频
3. **modelscope** - 图像 + LLM，异步任务模式

每个渠道迁移步骤:
```
1. 创建 channels/{name}/config.ts
2. 创建 channels/{name}/image.ts (如有)
3. 创建 channels/{name}/llm.ts (如有)
4. 创建 channels/{name}/index.ts
5. 添加测试
6. 在 channels/index.ts 注册
```

**HuggingFace 渠道特殊处理**:
- 将 `pollinations.ts` 作为 HuggingFace 渠道的免费 LLM 后端
- 当用户没有 HF Token 时，自动降级到 Pollinations
- 删除独立的 `deepseek` 和 `pollinations` 渠道

### 阶段 3: 实现自定义渠道

1. 创建 `channels/custom/config.ts` - 解析环境变量
2. 创建 `channels/custom/image.ts` - OpenAI 兼容实现
3. 创建 `channels/custom/llm.ts` - OpenAI 兼容实现
4. 创建 `channels/custom/index.ts` - 动态创建渠道

### 阶段 4: 更新路由和适配器

1. 更新 `openai/adapter.ts` 使用新的渠道注册表
2. 更新 `openai/routes.ts` 使用新的 Token 管理
3. 删除旧的 `providers/` 和 `llm-providers/` 目录

### 阶段 5: 前端适配

1. 移除前端的 `tokenRotation.ts` (后端已处理)
2. 更新 API 调用，传递所有 Token 给后端
3. 或保留前端 Token 管理，后端仅处理单 Token

---

## 扩展指南

### 添加新的内置渠道

1. 创建目录 `channels/{new-channel}/`
2. 创建配置文件:

```typescript
// channels/new-channel/config.ts
export const newChannelConfig: ChannelConfig = {
  baseUrl: 'https://api.new-channel.com/v1',
  auth: { type: 'bearer' },
  imageModels: [
    { id: 'model-1', name: 'Model 1' },
  ],
}
```

3. 实现能力:

```typescript
// channels/new-channel/image.ts
import { newChannelConfig } from './config'
import { createHttpClient } from '../../core/http-client'

export const newChannelImage: ImageCapability = {
  async generate(request, token) {
    const client = createHttpClient(newChannelConfig, token)
    const response = await client.post('/images/generations', {
      prompt: request.prompt,
      // ...
    })
    return { url: response.data[0].url, seed: 0, model: request.model }
  }
}
```

4. 导出渠道:

```typescript
// channels/new-channel/index.ts
export const newChannel: Channel = {
  id: 'new-channel',
  name: 'New Channel',
  config: newChannelConfig,
  image: newChannelImage,
}
```

5. 注册:

```typescript
// channels/index.ts
import { newChannel } from './new-channel'
registerChannel(newChannel)
```

### 用户自定义渠道 (通过环境变量)

```bash
# .env
CUSTOM_CHANNEL_1_ID=my-provider
CUSTOM_CHANNEL_1_NAME=My Provider
CUSTOM_CHANNEL_1_URL=https://api.my-provider.com/v1
CUSTOM_CHANNEL_1_AUTH_TYPE=bearer
CUSTOM_CHANNEL_1_IMAGE_MODELS=model-a,model-b
CUSTOM_CHANNEL_1_LLM_MODELS=gpt-4,gpt-3.5
```

系统自动解析并注册为可用渠道。

### 用户自定义渠道 (通过配置文件)

```json
// custom-channels.json
{
  "channels": [
    {
      "id": "my-provider",
      "name": "My Provider",
      "baseUrl": "https://api.my-provider.com/v1",
      "auth": { "type": "bearer" },
      "imageModels": [
        { "id": "model-a", "name": "Model A" }
      ]
    }
  ]
}
```

---

## 对比总结

### 旧结构 vs 新结构

| 方面 | 旧结构 | 新结构 |
|------|--------|--------|
| **代码组织** | 按功能 (providers, llm-providers) | 按渠道 (channels/modelscope, channels/gitee) |
| **API 地址** | 分散在各实现文件 | 集中在 config.ts |
| **Token 管理** | 前端处理 | 后端统一管理 (可选) |
| **添加渠道** | 修改多个文件 + 注册表 | 创建目录 + 自动注册 |
| **自定义渠道** | 需要改代码 | 环境变量/配置文件 |
| **错误处理** | 每个文件重复 | 统一在 core/error.ts |
| **测试** | 分散 | 每个渠道独立测试目录 |

### 优势

1. **高内聚**: 同一渠道的所有代码在一起
2. **低耦合**: 渠道之间相互独立
3. **易扩展**: 添加新渠道只需创建目录
4. **易维护**: 修改某渠道不影响其他
5. **配置集中**: API 地址、模型列表一目了然
6. **用户友好**: 支持自定义渠道无需改代码

### 风险

1. **迁移工作量**: 需要重构现有代码
2. **测试覆盖**: 需要确保迁移后功能正常
3. **向后兼容**: 需要保持 API 接口不变

---

## 建议

1. **分阶段迁移**: 不要一次性重构，按阶段进行
2. **保持 API 兼容**: 外部 API 接口保持不变
3. **充分测试**: 每个阶段完成后运行完整测试
4. **文档同步**: 更新 CLAUDE.md 和 API 文档
5. **Token 管理决策**:
   - 方案 A: 后端统一管理 (推荐，更安全)
   - 方案 B: 保留前端管理 (兼容现有逻辑)

如果你确认这个设计方向，我可以开始实施迁移。

---

## Serverless 部署兼容性

### 当前部署架构

项目支持多种 serverless 部署方式，所有方式都通过 `createApp()` 函数创建 Hono 应用：

```
┌─────────────────────────────────────────────────────────────────┐
│                        createApp()                               │
│                    (apps/api/src/app.ts)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Cloudflare   │    │    Vercel     │    │   Netlify     │
│    Pages      │    │  Functions    │    │  Functions    │
├───────────────┤    ├───────────────┤    ├───────────────┤
│ functions/v1/ │    │ apps/web/api/ │    │ netlify/      │
│ [[route]].ts  │    │               │    │ functions/    │
│               │    │               │    │ api.ts        │
│ hono/         │    │ hono/         │    │ hono/         │
│ cloudflare-   │    │ vercel        │    │ aws-lambda    │
│ pages         │    │               │    │               │
└───────────────┘    └───────────────┘    └───────────────┘
```

### 兼容性保证

重构后 **不需要修改任何部署配置文件**：

| 文件 | 状态 | 说明 |
|------|------|------|
| `functions/v1/[[route]].ts` | ✅ 无需修改 | 继续调用 `createApp()` |
| `apps/web/netlify/functions/api.ts` | ✅ 无需修改 | 继续调用 `createApp()` |
| `apps/web/vercel.json` | ✅ 无需修改 | 路由配置不变 |
| `apps/web/netlify.toml` | ✅ 无需修改 | 函数配置不变 |
| `wrangler.toml` | ✅ 无需修改 | Workers 配置不变 |

### 关键设计：自动初始化

渠道注册在模块加载时自动完成，无需显式调用：

```typescript
// apps/api/src/app.ts (重构后)
import { Hono } from 'hono'
import './channels'  // 导入即自动注册所有渠道
import { registerOpenAIRoutes } from './openai/routes'

export function createApp(config: AppConfig = {}) {
  const app = new Hono()
  // ... 中间件配置 (保持不变)
  registerOpenAIRoutes(app)
  return app
}
```

```typescript
// apps/api/src/channels/index.ts
import { registerChannel } from '../core/channel-registry'
import { modelscopeChannel } from './modelscope'
import { giteeChannel } from './gitee'
import { huggingfaceChannel } from './huggingface'

// 模块加载时自动注册
;[modelscopeChannel, giteeChannel, huggingfaceChannel].forEach(registerChannel)

// 导出供外部使用
export { getChannel, getImageChannel, getLLMChannel } from '../core/channel-registry'
```

### Serverless 环境变量

各平台环境变量配置保持不变：

```bash
# 所有平台通用
CORS_ORIGINS=https://your-domain.com

# 自定义渠道 (可选)
CUSTOM_CHANNEL_1_ID=my-provider
CUSTOM_CHANNEL_1_URL=https://api.my-provider.com/v1
CUSTOM_CHANNEL_1_AUTH_TYPE=bearer
```

---

## 简化配置方案

### 1. 单一配置入口

所有渠道配置集中在 `channels/{name}/config.ts`，无需分散到多个文件：

```typescript
// channels/modelscope/config.ts - 一个文件包含所有配置
export const config = {
  id: 'modelscope',
  name: '魔塔社区',

  // API 配置
  api: {
    baseUrl: 'https://api-inference.modelscope.cn/v1',
    imageEndpoint: '/images/generations',
    llmEndpoint: '/chat/completions',
    taskEndpoint: '/tasks',
  },

  // 认证配置
  auth: {
    type: 'bearer' as const,
    headerName: 'Authorization',
  },

  // 异步任务配置
  async: {
    enabled: true,
    pollInterval: 3000,
    maxAttempts: 35,
    headers: {
      'X-ModelScope-Async-Mode': 'true',
    },
  },

  // 模型列表
  models: {
    image: [
      { id: 'Tongyi-MAI/Z-Image-Turbo', name: 'Z-Image Turbo', default: true },
      { id: 'black-forest-labs/FLUX.1-schnell', name: 'FLUX.1 Schnell' },
    ],
    llm: [
      { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B', default: true },
      { id: 'Qwen/Qwen3-235B-A22B', name: 'Qwen 3 235B' },
    ],
  },
}
```

### 2. 共享基础实现

大部分渠道使用 OpenAI 兼容格式，可复用基础实现：

```typescript
// core/openai-compat.ts - 通用 OpenAI 兼容实现
export function createOpenAICompatImage(config: ChannelConfig): ImageCapability {
  return {
    async generate(request, token) {
      const response = await fetch(`${config.api.baseUrl}${config.api.imageEndpoint}`, {
        method: 'POST',
        headers: buildHeaders(config, token),
        body: JSON.stringify(buildImageBody(request)),
      })
      return parseImageResponse(response)
    }
  }
}

export function createOpenAICompatLLM(config: ChannelConfig): LLMCapability {
  return {
    async complete(request, token) {
      const response = await fetch(`${config.api.baseUrl}${config.api.llmEndpoint}`, {
        method: 'POST',
        headers: buildHeaders(config, token),
        body: JSON.stringify(buildLLMBody(request)),
      })
      return parseLLMResponse(response)
    }
  }
}
```

### 3. 渠道定义简化

大多数渠道只需配置 + 复用基础实现：

```typescript
// channels/gitee/index.ts - 简化的渠道定义
import { config } from './config'
import { createOpenAICompatImage, createOpenAICompatLLM } from '../../core/openai-compat'
import { createChannel } from '../../core/channel-factory'

export const giteeChannel = createChannel({
  ...config,
  image: createOpenAICompatImage(config),
  llm: createOpenAICompatLLM(config),
})
```

```typescript
// channels/modelscope/index.ts - 需要自定义实现的渠道
import { config } from './config'
import { modelscopeImage } from './image'  // 异步任务模式，需自定义
import { createOpenAICompatLLM } from '../../core/openai-compat'
import { createChannel } from '../../core/channel-factory'

export const modelscopeChannel = createChannel({
  ...config,
  image: modelscopeImage,  // 自定义实现
  llm: createOpenAICompatLLM(config),  // 复用通用实现
})
```

### 4. 配置文件对比

**重构前** (分散在多个文件):
```
providers/modelscope.ts:70      → baseUrl
llm-providers/modelscope-llm.ts:10 → MODELSCOPE_LLM_API_URL
packages/shared/src/constants/models.ts → 模型列表
```

**重构后** (集中在一个文件):
```
channels/modelscope/config.ts → 所有配置
```

---

## 实施计划文档

### 文件变更清单

#### 新增文件

```
apps/api/src/
├── core/
│   ├── types.ts              # 新增: 统一类型定义
│   ├── error.ts              # 新增: 错误处理
│   ├── http-client.ts        # 新增: HTTP 客户端
│   ├── token-manager.ts      # 新增: Token 管理
│   ├── channel-registry.ts   # 新增: 渠道注册表
│   ├── channel-factory.ts    # 新增: 渠道工厂
│   └── openai-compat.ts      # 新增: OpenAI 兼容实现
│
├── channels/
│   ├── index.ts              # 新增: 统一导出
│   ├── modelscope/
│   │   ├── index.ts          # 新增
│   │   ├── config.ts         # 新增
│   │   ├── image.ts          # 新增 (从 providers/modelscope.ts 迁移)
│   │   └── llm.ts            # 新增 (从 llm-providers/modelscope-llm.ts 迁移)
│   ├── gitee/
│   │   ├── index.ts          # 新增
│   │   ├── config.ts         # 新增
│   │   ├── image.ts          # 新增 (从 providers/gitee.ts 迁移)
│   │   ├── llm.ts            # 新增 (从 llm-providers/gitee-llm.ts 迁移)
│   │   └── video.ts          # 新增 (如有视频功能)
│   ├── huggingface/
│   │   ├── index.ts          # 新增
│   │   ├── config.ts         # 新增
│   │   ├── image.ts          # 新增 (从 providers/huggingface.ts 迁移)
│   │   ├── llm.ts            # 新增 (从 llm-providers/huggingface-llm.ts 迁移)
│   │   └── pollinations.ts   # 新增 (从 llm-providers/pollinations.ts 迁移)
│   └── custom/
│       ├── index.ts          # 新增
│       ├── config.ts         # 新增
│       ├── image.ts          # 新增
│       └── llm.ts            # 新增
```

#### 删除文件

```
apps/api/src/
├── providers/                # 删除整个目录
│   ├── types.ts              # → core/types.ts
│   ├── gitee.ts              # → channels/gitee/image.ts
│   ├── huggingface.ts        # → channels/huggingface/image.ts
│   ├── modelscope.ts         # → channels/modelscope/image.ts
│   ├── registry.ts           # → core/channel-registry.ts
│   └── index.ts
│
├── llm-providers/            # 删除整个目录
│   ├── types.ts              # → core/types.ts
│   ├── gitee-llm.ts          # → channels/gitee/llm.ts
│   ├── huggingface-llm.ts    # → channels/huggingface/llm.ts
│   ├── modelscope-llm.ts     # → channels/modelscope/llm.ts
│   ├── pollinations.ts       # → channels/huggingface/pollinations.ts
│   ├── deepseek.ts           # 删除 (不再需要)
│   ├── custom.ts             # → channels/custom/llm.ts
│   ├── registry.ts           # → core/channel-registry.ts
│   └── index.ts
```

#### 修改文件

```
apps/api/src/
├── app.ts                    # 修改: 导入 channels 替代 providers
├── openai/
│   ├── routes.ts             # 修改: 使用新的渠道注册表
│   └── adapter.ts            # 修改: 使用新的渠道接口
```

### 不变文件 (Serverless 兼容)

```
# 部署配置 - 完全不变
functions/v1/[[route]].ts
apps/web/netlify/functions/api.ts
apps/web/vercel.json
apps/web/netlify.toml
apps/api/wrangler.toml
docker-compose.yml
Dockerfile

# 中间件 - 完全不变
apps/api/src/middleware/*

# OpenAPI - 完全不变
apps/api/src/openapi/*

# 工具函数 - 完全不变
apps/api/src/utils/*
```

---

## 测试计划

### 单元测试

每个渠道独立测试：

```
channels/modelscope/__tests__/
├── config.test.ts            # 配置验证
├── image.test.ts             # 图像生成测试
└── llm.test.ts               # LLM 测试

channels/huggingface/__tests__/
├── image.test.ts
├── llm.test.ts
└── pollinations.test.ts      # 免费后端测试
```

### 集成测试

```bash
# 本地测试
pnpm dev:api
curl http://localhost:8787/v1/images/generations -X POST -H "Content-Type: application/json" -d '{"prompt":"test"}'

# Serverless 测试 (部署后)
curl https://your-cf-pages.pages.dev/v1/images/generations ...
curl https://your-vercel.vercel.app/v1/images/generations ...
curl https://your-netlify.netlify.app/api/v1/images/generations ...
```

### 回归测试清单

- [ ] Cloudflare Workers 部署正常
- [ ] Cloudflare Pages Functions 正常
- [ ] Vercel Functions 正常
- [ ] Netlify Functions 正常
- [ ] Docker 部署正常
- [ ] 所有现有 API 端点响应格式不变
- [ ] Token 轮换功能正常
- [ ] 错误响应格式不变
