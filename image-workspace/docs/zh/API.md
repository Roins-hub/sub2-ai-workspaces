# API 参考（OpenAI 格式）

本项目仅提供 **OpenAI 兼容** 的 `/v1/*` 接口。

## 基础 URL

- Cloudflare Pages: `https://your-project.pages.dev`
- Vercel: `https://your-project.vercel.app`
- Netlify: `https://your-project.netlify.app`

## 认证

统一使用 OpenAI 风格请求头：

```
Authorization: Bearer <token>
```

Provider token 前缀：

- `Bearer a4f:<token>` -> A4F
- `Bearer gitee:<token>` -> Gitee AI
- `Bearer ms:<token>` -> ModelScope
- `Bearer hf:<token>` -> HuggingFace（可选；也可不写 `hf:`）
- 无前缀 -> HuggingFace（默认）

## `GET /`

健康检查。

响应：

```json
{ "status": "ok" }
```

## `POST /v1/images/generations`

图片生成（OpenAI Images API + 扩展字段）。

说明：

- 仅支持 `n=1`
- 仅支持 `response_format="url"`
- Provider 路由由 `model` 前缀决定：
  - `a4f/...` -> A4F
  - `gitee/...` -> Gitee
  - `ms/...` -> ModelScope
  - 无前缀 -> HuggingFace

请求体：

```json
{
  "model": "z-image-turbo",
  "prompt": "a cat",
  "negative_prompt": "ugly",
  "size": "1024x1024",
  "quality": "standard",
  "steps": 9,
  "seed": 12345,
  "guidance_scale": 7.5,
  "n": 1,
  "response_format": "url"
}
```

响应：

```json
{
  "created": 1700000000,
  "data": [{ "url": "https://..." }]
}
```

示例：

A4F：

```bash
curl -X POST https://your-project.pages.dev/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer a4f:YOUR_TOKEN" \
  -d '{"model":"a4f/provider-4/imagen-3.5","prompt":"a cat","size":"1024x1024","n":1,"response_format":"url"}'
```

Gitee：

```bash
curl -X POST https://your-project.pages.dev/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer gitee:YOUR_TOKEN" \
  -d '{"model":"gitee/z-image-turbo","prompt":"a cat","size":"1024x1024","n":1,"response_format":"url"}'
```

ModelScope：

```bash
curl -X POST https://your-project.pages.dev/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ms:YOUR_TOKEN" \
  -d '{"model":"ms/flux-2","prompt":"a cat","size":"1024x1024","n":1,"response_format":"url"}'
```

HuggingFace（token 可选）：

```bash
curl -X POST https://your-project.pages.dev/v1/images/generations \
  -H "Content-Type: application/json" \
  -d '{"model":"z-image-turbo","prompt":"a cat","size":"1024x1024","n":1,"response_format":"url"}'
```

## `GET /v1/models`

获取模型列表（OpenAI 格式）。

响应：

```json
{
  "object": "list",
  "data": [
    { "id": "z-image-turbo", "object": "model", "created": 1700000000, "owned_by": "huggingface" }
  ]
}
```

## `POST /v1/chat/completions`

Chat Completions（网页端用于提示词优化/翻译）。

Provider 路由由 `model` 前缀决定：

- `pollinations/<model>` -> Pollinations（默认）
- `a4f/<model>` -> A4F（需要 `Bearer a4f:<token>`）
- `gitee/<model>` -> Gitee AI（需要 `Bearer gitee:<token>`）
- `ms/<model>` -> ModelScope（需要 `Bearer ms:<token>`）
- `hf/<model>` -> HuggingFace（token 可选；支持 `Bearer hf:<token>` 或不传）
- `deepseek/<model>` -> DeepSeek 官方（需要 `Bearer deepseek:<token>`）

示例（A4F DeepSeek）：

- `model: "a4f/provider-3/deepseek-v3"`

请求：

```json
{
  "model": "pollinations/openai-fast",
  "messages": [
    { "role": "system", "content": "You are a prompt optimizer..." },
    { "role": "user", "content": "optimize: a cat" }
  ],
  "temperature": 0.7,
  "max_tokens": 1000
}
```

响应：

```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1700000000,
  "model": "openai-fast",
  "choices": [
    { "index": 0, "message": { "role": "assistant", "content": "..." }, "finish_reason": "stop" }
  ]
}
```
