# Providers & Models

This document lists all supported AI providers and their available models.

## Overview

| Provider | Auth Required | Image Format | Models Count |
|----------|---------------|--------------|--------------|
| [A4F](#a4f) | Yes | PNG | 5 |
| [Gitee AI](#gitee-ai) | Yes | PNG | 7 |
| [HuggingFace](#huggingface) | Optional | WebP | 4 |
| [ModelScope](#modelscope) | Yes | PNG | 5 |

---

## A4F

OpenAI-compatible gateway provider. Model IDs must include a provider prefix (e.g. `provider-4/...`).

| Field | Value |
|-------|-------|
| Auth Header | `Authorization: Bearer a4f:<token>` |
| Auth Required | Yes |
| Image Format | PNG |
| Get API Key | [a4f.co](https://www.a4f.co) |
| Docs | https://www.a4f.co/docs |

### Models (tested / free-tier friendly)

| Model ID | Display Name | Negative Prompt | Steps | Guidance Scale |
|----------|--------------|-----------------|-------|----------------|
| `provider-4/imagen-3.5` | Imagen 3.5 (provider-4) | No | - | - |
| `provider-4/imagen-4` | Imagen 4 (provider-4) | No | - | - |
| `provider-8/imagen-3` | Imagen 3 (provider-8) | No | - | - |
| `provider-4/flux-schnell` | FLUX Schnell (provider-4) | No | - | - |
| `provider-8/z-image` | Z-Image (provider-8) | No | - | - |

Example `model` values for `/v1/images/generations`:

- `a4f/provider-4/imagen-3.5`
- `a4f/provider-8/z-image`

Chat (LLM) model example:

- `a4f/provider-3/deepseek-v3`

---

## Gitee AI

Official China-based AI platform with high-quality image generation.

| Field | Value |
|-------|-------|
| Auth Header | `Authorization: Bearer gitee:<token>` |
| Auth Required | Yes |
| Image Format | PNG |
| Get API Key | [ai.gitee.com](https://ai.gitee.com) |

### Models

| Model ID | Display Name | Negative Prompt | Steps | Guidance Scale |
|----------|--------------|-----------------|-------|----------------|
| `z-image-turbo` | Z-Image Turbo | Yes | 1-20 (default: 9) | - |
| `GLM-Image` | GLM Image | Yes | 1-50 (default: 30) | 0-20 (default: 1.5) |
| `Qwen-Image` | Qwen Image | Yes | 4-50 (default: 20) | - |
| `Qwen-Image-2512` | Qwen Image 2512 | Yes | 1-50 (default: 4) | 0-20 (default: 1) |
| `flux-1-schnell` | FLUX.1 Schnell | No | 1-50 (default: 8) | 0-50 (default: 7.5) |
| `FLUX_1-Krea-dev` | FLUX.1 Krea | No | 1-50 (default: 20) | 0-20 (default: 4.5) |
| `FLUX.1-dev` | FLUX.1 | No | 1-50 (default: 20) | 0-20 (default: 4.5) |

---

## HuggingFace

Free community-powered AI platform using Gradio Spaces.

| Field | Value |
|-------|-------|
| Auth Header | `Authorization: Bearer <token>` (or `Bearer hf:<token>`) |
| Auth Required | No (rate limited without token) |
| Image Format | WebP |
| Get Token | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) |

### Models

| Model ID | Display Name | Negative Prompt | Steps | Guidance Scale |
|----------|--------------|-----------------|-------|----------------|
| `z-image-turbo` | Z-Image Turbo | No | 1-20 (default: 9) | - |
| `qwen-image-fast` | Qwen Image Fast | No | 4-28 (default: 8) | - |
| `ovis-image` | Ovis Image | No | 1-50 (default: 24) | - |
| `flux-1-schnell` | FLUX.1 Schnell | No | 1-50 (default: 8) | - |

### HuggingFace Spaces

| Model | Space URL |
|-------|-----------|
| z-image-turbo | `https://luca115-z-image-turbo.hf.space` |
| qwen-image-fast | `https://mcp-tools-qwen-image-fast.hf.space` |
| ovis-image | `https://aidc-ai-ovis-image-7b.hf.space` |
| flux-1-schnell | `https://black-forest-labs-flux-1-schnell.hf.space` |

---

## ModelScope

China-based AI model hosting platform by Alibaba.

| Field | Value |
|-------|-------|
| Auth Header | `Authorization: Bearer ms:<token>` |
| Auth Required | Yes |
| Image Format | PNG |
| Get Token | [modelscope.cn](https://modelscope.cn) |

### Models

| Model ID | Display Name | Negative Prompt | Steps | Guidance Scale |
|----------|--------------|-----------------|-------|----------------|
| `Tongyi-MAI/Z-Image-Turbo` | Z-Image Turbo | Yes | 1-20 (default: 9) | - |
| `Qwen/Qwen-Image-2512` | Qwen Image 2512 | Yes | 1-50 (default: 4) | - |
| `black-forest-labs/FLUX.2-dev` | FLUX.2 | Yes | 1-50 (default: 24) | 1-10 (default: 3.5) |
| `black-forest-labs/FLUX.1-Krea-dev` | FLUX.1 Krea | Yes | 1-50 (default: 24) | 1-20 (default: 3.5) |
| `MusePublic/489_ckpt_FLUX_1` | FLUX.1 | Yes | 1-50 (default: 24) | 1-20 (default: 3.5) |

---

## Feature Comparison

### Negative Prompt Support

| Provider | Models with Negative Prompt |
|----------|----------------------------|
| Gitee AI | `z-image-turbo`, `GLM-Image`, `Qwen-Image`, `Qwen-Image-2512` |
| HuggingFace | None |
| ModelScope | `Tongyi-MAI/Z-Image-Turbo`, `Qwen/Qwen-Image-2512`, `FLUX.2-dev`, `FLUX.1-Krea-dev`, `FLUX.1` |

### Guidance Scale Support

| Provider | Models with Guidance Scale |
|----------|---------------------------|
| Gitee AI | `GLM-Image`, `Qwen-Image-2512`, `flux-1-schnell`, `FLUX_1-Krea-dev`, `FLUX.1-dev` |
| HuggingFace | None |
| ModelScope | `FLUX.2-dev`, `FLUX.1-Krea-dev`, `FLUX.1` |

---

## Usage Examples

### Gitee AI with Z-Image Turbo

```bash
curl -X POST https://your-project.pages.dev/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer gitee:your-gitee-api-key" \
  -d '{
    "model": "gitee/z-image-turbo",
    "prompt": "a cute cat",
    "negative_prompt": "low quality, blurry",
    "size": "1024x1024",
    "steps": 9,
    "n": 1,
    "response_format": "url"
  }'
```

### HuggingFace with FLUX.1 Schnell

```bash
curl -X POST https://your-project.pages.dev/v1/images/generations \
  -H "Content-Type: application/json" \
  -d '{
    "model": "flux-1-schnell",
    "prompt": "a cute cat",
    "size": "1024x1024",
    "steps": 8,
    "n": 1,
    "response_format": "url"
  }'
```

### ModelScope with FLUX.2

```bash
curl -X POST https://your-project.pages.dev/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ms:your-ms-token" \
  -d '{
    "model": "ms/flux-2",
    "prompt": "a cute cat",
    "size": "1024x1024",
    "steps": 24,
    "guidance_scale": 3.5,
    "n": 1,
    "response_format": "url"
  }'
```

### A4F with Imagen 3.5

```bash
curl -X POST https://your-project.pages.dev/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer a4f:your-a4f-api-key" \
  -d '{
    "model": "a4f/provider-4/imagen-3.5",
    "prompt": "a cute cat",
    "size": "1024x1024",
    "n": 1,
    "response_format": "url"
  }'
```
