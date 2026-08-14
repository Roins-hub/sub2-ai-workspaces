# Zenith Image Generator 项目结构分析

> 本文档详细分析项目的目录结构、文件作用和架构模式，供重构参考。

---

## 目录

1. [项目概览](#项目概览)
2. [根目录文件](#根目录文件)
3. [apps/api - API 应用](#appsapi---api-应用)
4. [apps/web - 前端应用](#appsweb---前端应用)
5. [packages/shared - 共享包](#packagesshared---共享包)
6. [其他目录](#其他目录)
7. [架构模式和约定](#架构模式和约定)
8. [关键文件路径索引](#关键文件路径索引)

---

## 项目概览

**zenith-image-generator** 是一个基于 **pnpm monorepo** 的全栈 AI 图像生成应用：

- **构建工具**: Turborepo
- **包管理器**: pnpm 10.25.0
- **支持的 AI 提供商**: Gitee AI、HuggingFace、ModelScope
- **API 兼容性**: OpenAI 兼容接口

### 整体目录树

```
zenith-image-generator/
├── apps/
│   ├── api/                    # Hono API (Cloudflare Workers)
│   └── web/                    # React 19 前端 (Vite)
├── packages/
│   └── shared/                 # 共享类型、常量、工具
├── docs/                       # 文档 (中英文)
├── functions/                  # Cloudflare Pages Functions
├── .github/                    # GitHub Actions 和模板
├── package.json                # 根配置
├── turbo.json                  # Turborepo 配置
├── biome.json                  # Linter/Formatter 配置
├── pnpm-workspace.yaml         # 工作区定义
├── wrangler.toml               # Cloudflare Pages 配置
├── Dockerfile                  # API Docker 镜像
├── Dockerfile.web              # Web Docker 镜像
├── docker-compose.yml          # Docker Compose 编排
└── ...
```

---

## 根目录文件

### 核心配置文件

| 文件 | 作用 |
|------|------|
| `package.json` | 项目元数据、脚本命令、依赖管理 |
| `pnpm-workspace.yaml` | 定义 monorepo 工作区 (`apps/*`, `packages/*`) |
| `turbo.json` | Turborepo 任务依赖和缓存配置 |
| `biome.json` | 代码格式化和 Lint 规则 (替代 ESLint + Prettier) |
| `vitest.config.ts` | 全局测试配置 |
| `wrangler.toml` | Cloudflare Pages 部署配置 |

### 部署配置文件

| 文件 | 作用 |
|------|------|
| `Dockerfile` | API 服务 Docker 镜像 (多阶段构建, node:20-alpine) |
| `Dockerfile.web` | 前端 Nginx 部署镜像 |
| `docker-compose.yml` | 服务编排 (api, web, 开发环境) |

### 文档文件

| 文件 | 作用 |
|------|------|
| `README.md` / `README.zh.md` | 项目介绍和使用说明 |
| `CLAUDE.md` | Claude Code 工作指南 |
| `.env.example` | 环境变量模板 |

### 其他配置

| 文件 | 作用 |
|------|------|
| `.gitignore` | Git 忽略规则 |
| `.mcp.json` | MCP 服务器配置 (shadcn) |

---

## apps/api - API 应用

### 目录结构

```
apps/api/
├── src/
│   ├── index.ts              # Cloudflare Workers 入口
│   ├── app.ts                # Hono 应用工厂
│   ├── server.ts             # Node.js 服务器入口 (本地开发)
│   ├── config.ts             # 配置管理
│   ├── constants.ts          # 常量定义
│   ├── providers/            # 图像生成提供商
│   │   ├── types.ts          # Provider 接口定义
│   │   ├── gitee.ts          # Gitee AI 实现
│   │   ├── huggingface.ts    # HuggingFace 实现
│   │   ├── modelscope.ts     # ModelScope 实现
│   │   ├── registry.ts       # 提供商注册和查找
│   │   ├── index.ts          # 导出
│   │   └── __tests__/        # 单元测试
│   ├── llm-providers/        # LLM 提供商 (提示词优化)
│   │   ├── types.ts          # LLM Provider 接口
│   │   ├── gitee-llm.ts      # Gitee AI LLM
│   │   ├── huggingface-llm.ts
│   │   ├── modelscope-llm.ts
│   │   ├── deepseek.ts       # DeepSeek LLM
│   │   ├── pollinations.ts   # Pollinations (无需认证)
│   │   ├── custom.ts         # 自定义 OpenAI 兼容
│   │   ├── registry.ts       # LLM 提供商注册
│   │   └── index.ts
│   ├── middleware/           # 中间件
│   │   ├── index.ts          # 导出所有中间件
│   │   ├── error-handler.ts  # 错误处理
│   │   ├── body-limit.ts     # 请求体大小限制
│   │   ├── logger.ts         # 请求日志
│   │   ├── rate-limit.ts     # 速率限制
│   │   ├── request-id.ts     # 请求 ID 生成
│   │   ├── security.ts       # 安全头
│   │   ├── timeout.ts        # 请求超时
│   │   ├── validate.ts       # 数据验证
│   │   └── __tests__/
│   ├── openai/               # OpenAI 兼容 API
│   │   ├── routes.ts         # 路由注册
│   │   ├── adapter.ts        # 请求/响应适配器
│   │   ├── chat.ts           # Chat Completions 端点
│   │   ├── model-resolver.ts # 模型解析
│   │   ├── types.ts          # OpenAI 类型定义
│   │   └── __tests__/
│   ├── openapi/              # OpenAPI 规范
│   │   ├── index.ts          # OpenAPI 规范定义
│   │   └── routes.ts         # Swagger UI 路由
│   ├── schemas/              # Zod 验证模式
│   │   └── index.ts
│   ├── utils/                # 工具函数
│   │   ├── index.ts
│   │   ├── format.ts         # 格式化工具
│   │   ├── gradio.ts         # Gradio 客户端工具
│   │   └── __tests__/
│   └── __tests__/
│       └── setup.ts          # 测试环境设置
├── package.json
├── tsconfig.json
└── wrangler.toml             # Cloudflare Workers 配置
```

### 核心文件说明

#### `src/index.ts` (入口点)
- Cloudflare Workers 的 `fetch` handler
- 导出 `Env` 接口 (环境变量类型)
- 缓存 app 实例避免重复创建

#### `src/app.ts` (应用工厂)
- `createApp()` 函数创建 Hono 应用
- 中间件栈顺序:
  1. errorHandler / notFoundHandler
  2. requestId
  3. cors
  4. securityHeaders
  5. requestLogger
- 注册 OpenAI 路由
- 健康检查: `GET /`

#### `src/providers/` (Provider 抽象模式)
- **types.ts**: 定义 `ImageProvider` 接口
- **gitee.ts / huggingface.ts / modelscope.ts**: 具体实现
- **registry.ts**: 统一注册和查找

#### `src/middleware/` (中间件栈)
每个中间件独立文件，可组合使用:
- `request-id.ts`: 生成唯一请求 ID
- `rate-limit.ts`: 速率限制 (5-60 req/min)
- `timeout.ts`: 请求超时 (30s-120s)
- `body-limit.ts`: 请求体限制 (20KB-50KB)
- `security.ts`: 安全头 (CSP, X-Frame-Options 等)

#### `src/openai/` (OpenAI 兼容层)
- **routes.ts**: 注册 `/v1/images/generations` 等端点
- **adapter.ts**: 转换 OpenAI 格式到内部格式
- **model-resolver.ts**: 解析模型名称到 provider + model

### 配置文件

#### `wrangler.toml`
```toml
name = "z-image-api"
main = "src/index.ts"
compatibility_flags = ["nodejs_compat"]

[env.production]
name = "z-image-api"

[env.staging]
name = "z-image-api-staging"
```

---

## apps/web - 前端应用

### 目录结构

```
apps/web/
├── src/
│   ├── main.tsx              # React 应用入口
│   ├── App.tsx               # 路由配置
│   ├── index.css             # Tailwind CSS 入口
│   ├── pages/                # 页面组件
│   │   ├── ImageGenerator.tsx    # 主页面 (单图生成)
│   │   └── FlowPageV2.tsx        # React Flow 画布 (批量生成)
│   ├── components/
│   │   ├── feature/          # 功能组件
│   │   │   ├── Header.tsx
│   │   │   ├── PromptCard.tsx
│   │   │   ├── ImageResultCard.tsx
│   │   │   ├── StatusCard.tsx
│   │   │   ├── ImageHistory.tsx
│   │   │   ├── HistoryItem.tsx
│   │   │   ├── ApiConfigAccordion.tsx
│   │   │   ├── LLMSettingsAccordion.tsx
│   │   │   └── SettingsModal.tsx
│   │   ├── flow/             # Flow 模式组件
│   │   │   ├── UserPromptNode.tsx
│   │   │   ├── PromptConfigNode.tsx
│   │   │   ├── ConfigNode.tsx
│   │   │   ├── ImageNode.tsx
│   │   │   ├── SingleImageNode.tsx
│   │   │   ├── ImageGridNode.tsx
│   │   │   ├── AIResultNode.tsx
│   │   │   ├── MessageNode.tsx
│   │   │   ├── FlowInput.tsx
│   │   │   ├── FloatingInput.tsx
│   │   │   ├── NodeContextMenu.tsx
│   │   │   ├── Lightbox.tsx
│   │   │   ├── StorageLimitModal.tsx
│   │   │   └── layout.ts     # 自动布局算法 (dagre)
│   │   └── ui/               # shadcn/ui 组件
│   │       ├── accordion.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── scroll-area.tsx
│   │       ├── select.tsx
│   │       ├── separator.tsx
│   │       ├── slider.tsx
│   │       ├── sonner.tsx    # Toast
│   │       ├── switch.tsx
│   │       ├── textarea.tsx
│   │       ├── ImageComparison.tsx
│   │       └── LanguageSwitcher.tsx
│   ├── hooks/
│   │   └── useImageGenerator.ts  # 核心状态管理和 API 调用
│   ├── lib/                  # 工具库
│   │   ├── api.ts            # API 客户端
│   │   ├── constants.ts      # 常量和默认值
│   │   ├── crypto.ts         # AES-256-GCM 加密
│   │   ├── flow-storage.ts   # IndexedDB 存储 (Flow 模式)
│   │   ├── historyStore.ts   # 历史记录存储
│   │   ├── imageBlobStore.ts # 图像 Blob 存储
│   │   ├── tokenRotation.ts  # Token 轮换逻辑
│   │   ├── migration.ts      # 数据迁移
│   │   ├── i18n.ts           # i18next 配置
│   │   ├── utils.ts          # 工具函数 (cn 等)
│   │   └── __tests__/
│   ├── stores/               # Zustand 状态管理
│   │   ├── flowStore.ts      # Flow 模式状态
│   │   └── conversationFlowStore.ts
│   ├── locales/              # 国际化
│   │   ├── en.json           # 英文
│   │   └── zh.json           # 中文
│   ├── assets/               # 静态资源
│   └── __tests__/
│       └── setup.ts
├── public/                   # 公共静态资源
├── api/                      # Vercel API 路由
├── functions/                # Netlify Functions
├── netlify/functions/        # Netlify Functions 实现
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── components.json           # shadcn/ui 配置
├── vercel.json               # Vercel 部署配置
└── netlify.toml              # Netlify 部署配置
```

### 核心文件说明

#### `src/main.tsx` (入口)
```tsx
import { createRoot } from 'react-dom/client'
import App from './App'
import './lib/i18n'
import './index.css'

createRoot(document.getElementById('root')!).render(<App />)
```

#### `src/App.tsx` (路由)
```tsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={<ImageGenerator />} />
    <Route path="/flow" element={<FlowPageV2 />} />
  </Routes>
  <Toaster />
</BrowserRouter>
```

#### `src/pages/ImageGenerator.tsx`
- 主页面，单图生成模式
- 使用 `useImageGenerator` hook 管理状态
- 包含提示词输入、参数配置、结果展示

#### `src/pages/FlowPageV2.tsx`
- React Flow 可视化画布
- 支持批量生成和工作流编排
- 使用 `flowStore` (Zustand) 管理状态

#### `src/hooks/useImageGenerator.ts`
- 核心 Hook，封装:
  - 图像生成 API 调用
  - 状态管理 (loading, error, result)
  - 历史记录管理
  - Token 轮换

#### `src/lib/` (工具库)

| 文件 | 作用 |
|------|------|
| `api.ts` | API 客户端，封装 fetch 调用 |
| `crypto.ts` | AES-256-GCM 加密 API key |
| `flow-storage.ts` | IndexedDB 存储 Flow 模式数据 |
| `historyStore.ts` | 历史记录持久化 |
| `imageBlobStore.ts` | 图像 Blob 缓存 |
| `tokenRotation.ts` | Token 轮换 (429 错误自动切换) |
| `i18n.ts` | i18next 国际化配置 |
| `utils.ts` | 通用工具 (cn, clsx 等) |

#### `src/stores/` (Zustand)

| 文件 | 作用 |
|------|------|
| `flowStore.ts` | Flow 模式全局状态 |
| `conversationFlowStore.ts` | 对话流状态 |

### 配置文件

#### `vite.config.ts`
```ts
export default defineConfig({
  plugins: [
    react({ babel: { plugins: [['babel-plugin-react-compiler']] } }),
    tailwindcss(),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

#### `components.json` (shadcn/ui)
```json
{
  "style": "new-york",
  "tailwind": { "baseColor": "neutral" },
  "iconLibrary": "lucide"
}
```

---

## packages/shared - 共享包

### 目录结构

```
packages/shared/
├── src/
│   ├── index.ts              # 主导出
│   ├── types/                # TypeScript 类型定义
│   │   ├── index.ts
│   │   ├── provider.ts       # Provider 类型
│   │   ├── image.ts          # 图像类型
│   │   ├── image-details.ts  # 图像详情
│   │   ├── generate.ts       # 生成请求/响应
│   │   ├── video.ts          # 视频生成
│   │   ├── llm.ts            # LLM 类型
│   │   ├── openai.ts         # OpenAI 类型
│   │   └── error.ts          # 错误类型
│   ├── constants/            # 常量配置
│   │   ├── index.ts
│   │   ├── providers.ts      # Provider 配置
│   │   ├── models.ts         # 模型配置
│   │   ├── llm-providers.ts  # LLM Provider 配置
│   │   └── ratios.ts         # 宽高比配置
│   └── utils/                # 工具函数
│       ├── index.ts
│       ├── validation.ts     # 验证工具
│       └── validation.test.ts
├── package.json
└── tsconfig.json
```

### 导出结构

```ts
// package.json exports
{
  ".": "./src/index.ts",
  "./types": "./src/types/index.ts",
  "./constants": "./src/constants/index.ts",
  "./utils": "./src/utils/index.ts"
}
```

### 使用方式

```ts
// 导入类型
import type { ImageProvider, GenerateRequest } from '@z-image/shared/types'

// 导入常量
import { PROVIDERS, MODELS } from '@z-image/shared/constants'

// 导入工具
import { validatePrompt, validateDimensions } from '@z-image/shared/utils'
```

---

## 其他目录

### `.github/` (GitHub 配置)

```
.github/
├── workflows/                # GitHub Actions
│   ├── ci.yml                # 持续集成
│   ├── deploy-cf-pages.yml   # Cloudflare Pages 部署
│   ├── deploy-cf-workers.yml # Cloudflare Workers 部署
│   ├── docker.yml            # Docker 构建
│   ├── labeler.yml           # PR 标签
│   ├── preview.yml           # 预览部署
│   ├── release.yml           # 发布流程
│   ├── security.yml          # 安全扫描
│   └── stale.yml             # Stale issue 管理
├── ISSUE_TEMPLATE/           # Issue 模板
│   ├── bug_report.md
│   ├── feature_request.md
│   └── config.yml
├── dependabot.yml            # 依赖更新
└── labeler.yml               # 标签配置
```

### `docs/` (文档)

```
docs/
├── en/                       # 英文文档
│   ├── API.md
│   ├── CONTRIBUTING.md
│   ├── DEPLOYMENT.md
│   └── PROVIDERS.md
├── zh/                       # 中文文档
│   ├── API.md
│   ├── CONTRIBUTING.md
│   ├── DEPLOYMENT.md
│   └── PROVIDERS.md
└── CHANGELOG.md              # 变更日志
```

### `functions/` (Cloudflare Pages Functions)

```
functions/
└── v1/
    └── [[route]].ts          # 处理所有 /v1/* 路由
```

---

## 架构模式和约定

### 1. Monorepo 结构

```
工具链: pnpm + Turborepo
包引用: workspace 协议 ("@z-image/shared": "workspace:*")
构建顺序: shared → api/web (并行)
```

### 2. Provider 抽象模式

```
接口定义 → 具体实现 → 注册表
   ↓           ↓          ↓
types.ts   gitee.ts   registry.ts
           huggingface.ts
           modelscope.ts
```

### 3. 中间件栈 (API)

```
请求 → requestId → cors → securityHeaders → requestLogger
    → timeout → bodyLimit → rateLimit → 路由处理
```

### 4. 前端架构

| 层级 | 技术 |
|------|------|
| 状态管理 | Zustand (全局) + React Hooks (局部) |
| 路由 | React Router v7 |
| 样式 | Tailwind CSS v4 + shadcn/ui |
| 存储 | localStorage (加密) + IndexedDB |
| 国际化 | i18next (en/zh) |

### 5. 部署策略

| 平台 | 用途 |
|------|------|
| Cloudflare Workers | API 无服务器部署 |
| Cloudflare Pages | 前端 + Functions |
| Vercel | 前端 + Serverless Functions |
| Netlify | 前端 + Netlify Functions |
| Docker | 容器化部署 |

### 6. 代码质量

| 工具 | 用途 |
|------|------|
| Biome | Linter + Formatter |
| Vitest | 测试框架 |
| TypeScript | 类型检查 (strict mode) |

### 7. 安全特性

- **API Key 加密**: AES-256-GCM
- **Token 轮换**: 429 错误自动切换，每日重置
- **CORS**: 可配置 origins
- **安全头**: CSP, X-Frame-Options 等
- **速率限制**: 中间件实现

### 8. 命名约定

| 类型 | 约定 |
|------|------|
| 包名 | `@z-image/*` |
| 路径别名 | `@/` → `src/` |
| 配置文件 | kebab-case |
| 组件文件 | PascalCase |
| 工具文件 | camelCase |

---

## 关键文件路径索引

### 根配置
- `package.json` - 项目配置
- `turbo.json` - Turborepo 配置
- `biome.json` - 代码质量配置
- `pnpm-workspace.yaml` - 工作区定义

### API 核心
- `apps/api/src/index.ts` - Workers 入口
- `apps/api/src/app.ts` - 应用工厂
- `apps/api/src/providers/registry.ts` - Provider 注册
- `apps/api/src/openai/routes.ts` - OpenAI 兼容路由

### Web 核心
- `apps/web/src/main.tsx` - React 入口
- `apps/web/src/App.tsx` - 路由配置
- `apps/web/src/pages/ImageGenerator.tsx` - 主页面
- `apps/web/src/pages/FlowPageV2.tsx` - Flow 画布
- `apps/web/src/hooks/useImageGenerator.ts` - 核心 Hook

### Shared 核心
- `packages/shared/src/index.ts` - 主导出
- `packages/shared/src/types/index.ts` - 类型定义
- `packages/shared/src/constants/index.ts` - 常量配置

### 部署配置
- `apps/api/wrangler.toml` - Workers 配置
- `apps/web/vercel.json` - Vercel 配置
- `apps/web/netlify.toml` - Netlify 配置
- `functions/v1/[[route]].ts` - Pages Functions

---

## 总结

这是一个设计良好的全栈 monorepo 项目，具有以下特点:

1. **清晰的关注点分离**: API、Web、Shared 三个包职责明确
2. **强类型安全**: TypeScript strict mode + Zod 验证
3. **多平台部署**: 支持 Cloudflare、Vercel、Netlify、Docker
4. **Provider 抽象**: 易于扩展新的图像生成提供商
5. **完善的工具链**: Biome + Vitest + Turborepo

如需调整结构，建议保留 monorepo 模式和 Provider 抽象模式，这两个是项目的核心架构优势。
