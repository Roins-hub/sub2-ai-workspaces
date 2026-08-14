# API Reference (OpenAI Format)

This project exposes **OpenAI-compatible** endpoints under `/v1/*`.

## Base URL

- Cloudflare Pages: `https://your-project.pages.dev`
- Vercel: `https://your-project.vercel.app`
- Netlify: `https://your-project.netlify.app`

## Authentication

All endpoints use the OpenAI-style header:

```
Authorization: Bearer <token>
```

Provider token prefixes:

- `Bearer a4f:<token>` -> A4F
- `Bearer gitee:<token>` -> Gitee AI
- `Bearer ms:<token>` -> ModelScope
- `Bearer hf:<token>` -> HuggingFace (optional; you can also omit `hf:`)
- No prefix -> HuggingFace (default)

## `GET /`

Health check.

Response:

```json
{ "status": "ok" }
```

## `POST /v1/images/generations`

Generate an image (OpenAI Images API + extensions).

Notes:

- `n` is supported only when `n=1`
- `response_format` is supported only when `response_format="url"`
- Provider routing is based on the `model` prefix:
  - `a4f/...` -> A4F
  - `gitee/...` -> Gitee
  - `ms/...` -> ModelScope
  - no prefix -> HuggingFace

Request body:

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

Response:

```json
{
  "created": 1700000000,
  "data": [{ "url": "https://..." }]
}
```

### Examples

A4F:

```bash
curl -X POST https://your-project.pages.dev/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer a4f:YOUR_TOKEN" \
  -d '{"model":"a4f/provider-4/imagen-3.5","prompt":"a cat","size":"1024x1024","n":1,"response_format":"url"}'
```

Gitee:

```bash
curl -X POST https://your-project.pages.dev/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer gitee:YOUR_TOKEN" \
  -d '{"model":"gitee/z-image-turbo","prompt":"a cat","size":"1024x1024","n":1,"response_format":"url"}'
```

ModelScope:

```bash
curl -X POST https://your-project.pages.dev/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ms:YOUR_TOKEN" \
  -d '{"model":"ms/flux-2","prompt":"a cat","size":"1024x1024","n":1,"response_format":"url"}'
```

HuggingFace (token optional):

```bash
curl -X POST https://your-project.pages.dev/v1/images/generations \
  -H "Content-Type: application/json" \
  -d '{"model":"z-image-turbo","prompt":"a cat","size":"1024x1024","n":1,"response_format":"url"}'
```

## `GET /v1/models`

List available models (OpenAI format).

Response:

```json
{
  "object": "list",
  "data": [
    { "id": "z-image-turbo", "object": "model", "created": 1700000000, "owned_by": "huggingface" }
  ]
}
```

## `POST /v1/chat/completions`

Chat Completions endpoint (used by the web UI for prompt optimize/translate).

Provider routing uses the `model` prefix:

- `pollinations/<model>` -> Pollinations (default)
- `a4f/<model>` -> A4F (requires `Bearer a4f:<token>`)
- `gitee/<model>` -> Gitee AI (requires `Bearer gitee:<token>`)
- `ms/<model>` -> ModelScope (requires `Bearer ms:<token>`)
- `hf/<model>` -> HuggingFace (token optional; supports `Bearer hf:<token>` or no token)
- `deepseek/<model>` -> DeepSeek Official (requires `Bearer deepseek:<token>`)

Example (A4F DeepSeek):

- `model: "a4f/provider-3/deepseek-v3"`

Request:

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

Response:

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
