# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Install dependencies
pnpm install

# Development (all apps)
pnpm dev

# Development (specific apps)
pnpm dev:web          # Frontend only (port 5173)
pnpm dev:api          # API only (port 8787)

# Local development (recommended: run in two terminals)
# Terminal 1: pnpm dev:api
# Terminal 2: pnpm dev:web
# Note: Set VITE_API_URL=http://localhost:8787 in apps/web/.env

# Build
pnpm build
pnpm build:web
pnpm build:api
pnpm build:shared     # Build shared package

# Lint & Format (Biome)
pnpm lint             # Lint all files
pnpm format           # Format all files
pnpm check            # Lint + format check

# Test (Vitest)
pnpm test             # Run tests in watch mode
pnpm test:run         # Run tests once
pnpm test:coverage    # Run tests with coverage

# Deploy API to Cloudflare Workers
cd apps/api && wrangler deploy --minify src/index.ts
```

## Architecture

This is a pnpm monorepo using Turborepo with three packages:

- `apps/web` - React 19 frontend (Vite, Tailwind CSS, shadcn/ui)
- `apps/api` - Hono API for Cloudflare Workers
- `packages/shared` - Shared types, constants, and utilities

### Shared Package (`packages/shared`)

Contains code shared between frontend and API:

- `src/types/` - TypeScript type definitions (provider, image, api)
- `src/constants/` - Provider configs, model configs, aspect ratios
- `src/utils/` - Validation utilities (prompt, dimensions, steps)

### API Channel System

The API is organized by provider "channels" (single folder per provider) plus shared core infra:

- `apps/api/src/core/types.ts` - Unified channel/capability types
- `apps/api/src/core/channel-registry.ts` - Channel registry (in-memory)
- `apps/api/src/core/token-manager.ts` - Token parsing + rotation (server-side)
- `apps/api/src/core/openai-compat.ts` - OpenAI-compatible capability helpers
- `apps/api/src/channels/index.ts` - Auto-register built-in channels (+ best-effort custom init)
- `apps/api/src/channels/huggingface/*` - HF image (Gradio Spaces) + LLM (HF token optional, falls back to Pollinations)
- `apps/api/src/channels/gitee/*` - Gitee image + LLM + video
- `apps/api/src/channels/modelscope/*` - ModelScope image (async task mode) + LLM
- `apps/api/src/channels/custom/*` - User-defined OpenAI-compatible channels (env-driven)

### Key Endpoints

- `GET  /` - Health check
- `GET  /v1/models` - OpenAI-compatible model list
- `POST /v1/images/generations` - OpenAI-compatible image generation
- `POST /v1/chat/completions` - OpenAI-compatible chat completions

Authentication (OpenAI-style):

- Header: `Authorization: Bearer <token>`
- Optional provider hint prefix (kept for backward compatibility): `gitee:` / `ms:` / `hf:` / `deepseek:`
- Multiple tokens supported: `Authorization: Bearer gitee:tok1,tok2,tok3` (server rotates on 429/quota errors)

Custom channels:

- Configure via env (`CUSTOM_CHANNELS_JSON` or `CUSTOM_CHANNEL_1_*`, etc.)
- Use model id `custom/<channelId>/<model>` for both image + chat (routes resolve the channelId from the model string)

### Frontend Structure

- `src/pages/ImageGenerator.tsx` - Main page with single image generation
- `src/pages/FlowPageV2.tsx` - Visual canvas for batch generation using React Flow
- `src/hooks/useImageGenerator.ts` - Core state management and API calls
- `src/components/ui/` - shadcn/ui components
- `src/components/feature/` - Feature-specific components (PromptCard, ImageResultCard, etc.)
- `src/components/flow/` - React Flow nodes and layout utilities
- `src/lib/crypto.ts` - AES-256-GCM encryption for API key storage
- `src/lib/constants.ts` - Settings persistence and default values
- `src/lib/flow-storage.ts` - IndexedDB storage for Flow mode state

### Frontend Patterns

- Uses `@/` path alias for imports (maps to `src/`)
- Settings and API keys are persisted to localStorage (encrypted)
- Flow mode persists nodes/edges/images to IndexedDB
- API URL configured via `VITE_API_URL` env var (defaults to relative path for same-origin deployment)

### Token Rotation System

The app supports multiple API tokens per provider for automatic rotation on rate limits:

- Frontend: `apps/web/src/lib/tokenRotation.ts` can rotate per-request (Flow mode)
- Backend: `apps/api/src/core/token-manager.ts` rotates when multiple tokens are supplied in `Authorization`

### Middleware Stack (API)

Applied in order:

1. `requestId` - Generates unique request ID for tracing
2. `cors` - CORS headers with configurable origins
3. `securityHeaders` - Security headers (CSP, X-Frame-Options, etc.)
4. `requestLogger` - Logs requests with timing
5. `timeout` - Request timeout (varies by endpoint: 30s-120s)
6. `bodyLimit` - Request body size limit (20KB-50KB)
7. `rateLimitPresets` - Rate limiting (5-60 req/min depending on endpoint)

### Tooling

- **Biome** - Linting and formatting (replaces ESLint + Prettier)
- **Vitest** - Testing framework for both frontend and API
- **Turborepo** - Monorepo build orchestration
