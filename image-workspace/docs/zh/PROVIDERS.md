# 供应商与模型

本文档列出所有支持的 AI 供应商及其可用模型。

## 总览

| 供应商 | 需要认证 | 图片格式 | 模型数量 |
|--------|----------|----------|----------|
| [A4F](#a4f) | 是 | PNG | 5 |
| [Gitee AI](#gitee-ai) | 是 | PNG | 7 |
| [HuggingFace](#huggingface) | 可选 | WebP | 4 |
| [ModelScope](#modelscope) | 是 | PNG | 5 |

---

## A4F

OpenAI 兼容的网关服务商。模型 ID 必须带 provider 前缀（例如 `provider-4/...`）。

| 字段 | 值 |
|------|-----|
| 认证请求头 | `Authorization: Bearer a4f:<token>` |
| 需要认证 | 是 |
| 图片格式 | PNG |
| 获取 API Key | [a4f.co](https://www.a4f.co) |
| 官方文档 | https://www.a4f.co/docs |

### 模型列表（已验证 / 免费层友好）

| 模型 ID | 显示名称 | 负面提示词 | 步数范围 | 引导比例 |
|---------|----------|------------|----------|----------|
| `provider-4/imagen-3.5` | Imagen 3.5（provider-4） | 不支持 | - | - |
| `provider-4/imagen-4` | Imagen 4（provider-4） | 不支持 | - | - |
| `provider-8/imagen-3` | Imagen 3（provider-8） | 不支持 | - | - |
| `provider-4/flux-schnell` | FLUX Schnell（provider-4） | 不支持 | - | - |
| `provider-8/z-image` | Z-Image（provider-8） | 不支持 | - | - |

在 `/v1/images/generations` 的 `model` 示例：

- `a4f/provider-4/imagen-3.5`
- `a4f/provider-8/z-image`

Chat（LLM）模型示例：

- `a4f/provider-3/deepseek-v3`

---

## Gitee AI

中国本土 AI 平台，提供高质量图片生成服务。

| 字段 | 值 |
|------|-----|
| 认证请求头 | `Authorization: Bearer gitee:<token>` |
| 需要认证 | 是 |
| 图片格式 | PNG |
| 获取 API Key | [ai.gitee.com](https://ai.gitee.com) |

### 模型列表

| 模型 ID | 显示名称 | 负面提示词 | 步数范围 | 引导比例 |
|---------|----------|------------|----------|----------|
| `z-image-turbo` | Z-Image Turbo | 支持 | 1-20 (默认: 9) | - |
| `GLM-Image` | GLM Image | 支持 | 1-50 (默认: 30) | 0-20 (默认: 1.5) |
| `Qwen-Image` | Qwen Image | 支持 | 4-50 (默认: 20) | - |
| `Qwen-Image-2512` | Qwen Image 2512 | 支持 | 1-50 (默认: 4) | 0-20 (默认: 1) |
| `flux-1-schnell` | FLUX.1 Schnell | 不支持 | 1-50 (默认: 8) | 0-50 (默认: 7.5) |
| `FLUX_1-Krea-dev` | FLUX.1 Krea | 不支持 | 1-50 (默认: 20) | 0-20 (默认: 4.5) |
| `FLUX.1-dev` | FLUX.1 | 不支持 | 1-50 (默认: 20) | 0-20 (默认: 4.5) |

---

## HuggingFace

免费的社区驱动 AI 平台，基于 Gradio Spaces。

| 字段 | 值 |
|------|-----|
| 认证请求头 | `Authorization: Bearer <token>`（或 `Bearer hf:<token>`） |
| 需要认证 | 否 (无 token 有速率限制) |
| 图片格式 | WebP |
| 获取 Token | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) |

### 模型列表

| 模型 ID | 显示名称 | 负面提示词 | 步数范围 | 引导比例 |
|---------|----------|------------|----------|----------|
| `z-image-turbo` | Z-Image Turbo | 不支持 | 1-20 (默认: 9) | - |
| `qwen-image-fast` | Qwen Image Fast | 不支持 | 4-28 (默认: 8) | - |
| `ovis-image` | Ovis Image | 不支持 | 1-50 (默认: 24) | - |
| `flux-1-schnell` | FLUX.1 Schnell | 不支持 | 1-50 (默认: 8) | - |

### HuggingFace Spaces 地址

| 模型 | Space URL |
|------|-----------|
| z-image-turbo | `https://luca115-z-image-turbo.hf.space` |
| qwen-image-fast | `https://mcp-tools-qwen-image-fast.hf.space` |
| ovis-image | `https://aidc-ai-ovis-image-7b.hf.space` |
| flux-1-schnell | `https://black-forest-labs-flux-1-schnell.hf.space` |

---

## ModelScope

阿里巴巴旗下的中国 AI 模型托管平台。

| 字段 | 值 |
|------|-----|
| 认证请求头 | `Authorization: Bearer ms:<token>` |
| 需要认证 | 是 |
| 图片格式 | PNG |
| 获取 Token | [modelscope.cn](https://modelscope.cn) |

### 模型列表

| 模型 ID | 显示名称 | 负面提示词 | 步数范围 | 引导比例 |
|---------|----------|------------|----------|----------|
| `Tongyi-MAI/Z-Image-Turbo` | Z-Image Turbo | 支持 | 1-20 (默认: 9) | - |
| `Qwen/Qwen-Image-2512` | Qwen Image 2512 | 支持 | 1-50 (默认: 4) | - |
| `black-forest-labs/FLUX.2-dev` | FLUX.2 | 支持 | 1-50 (默认: 24) | 1-10 (默认: 3.5) |
| `black-forest-labs/FLUX.1-Krea-dev` | FLUX.1 Krea | 支持 | 1-50 (默认: 24) | 1-20 (默认: 3.5) |
| `MusePublic/489_ckpt_FLUX_1` | FLUX.1 | 支持 | 1-50 (默认: 24) | 1-20 (默认: 3.5) |

---

## 功能对比

### 负面提示词支持

| 供应商 | 支持负面提示词的模型 |
|--------|---------------------|
| Gitee AI | `z-image-turbo`, `GLM-Image`, `Qwen-Image`, `Qwen-Image-2512` |
| HuggingFace | 无 |
| ModelScope | `Tongyi-MAI/Z-Image-Turbo`, `Qwen/Qwen-Image-2512`, `FLUX.2-dev`, `FLUX.1-Krea-dev`, `FLUX.1` |

### 引导比例支持

| 供应商 | 支持引导比例的模型 |
|--------|-------------------|
| Gitee AI | `GLM-Image`, `Qwen-Image-2512`, `flux-1-schnell`, `FLUX_1-Krea-dev`, `FLUX.1-dev` |
| HuggingFace | 无 |
| ModelScope | `FLUX.2-dev`, `FLUX.1-Krea-dev`, `FLUX.1` |

---

## 使用示例

### Gitee AI + Z-Image Turbo

```bash
curl -X POST https://your-project.pages.dev/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer gitee:your-gitee-api-key" \
  -d '{
    "model": "gitee/z-image-turbo",
    "prompt": "一只可爱的猫",
    "negative_prompt": "低质量, 模糊",
    "size": "1024x1024",
    "steps": 9,
    "n": 1,
    "response_format": "url"
  }'
```

### HuggingFace + FLUX.1 Schnell

```bash
curl -X POST https://your-project.pages.dev/v1/images/generations \
  -H "Content-Type: application/json" \
  -d '{
    "model": "flux-1-schnell",
    "prompt": "一只可爱的猫",
    "size": "1024x1024",
    "steps": 8,
    "n": 1,
    "response_format": "url"
  }'
```

### ModelScope + FLUX.2

```bash
curl -X POST https://your-project.pages.dev/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ms:your-ms-token" \
  -d '{
    "model": "ms/flux-2",
    "prompt": "一只可爱的猫",
    "size": "1024x1024",
    "steps": 24,
    "guidance_scale": 3.5,
    "n": 1,
    "response_format": "url"
  }'
```

### A4F + Imagen 3.5

```bash
curl -X POST https://your-project.pages.dev/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer a4f:your-a4f-api-key" \
  -d '{
    "model": "a4f/provider-4/imagen-3.5",
    "prompt": "一只可爱的猫",
    "size": "1024x1024",
    "n": 1,
    "response_format": "url"
  }'
```
