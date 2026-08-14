import { parseTokens } from '../../core/token-manager'
import type { ChannelConfig, EnvLike, ModelInfo } from '../../core/types'

export interface CustomChannelDefinition {
  id: string
  name: string
  config: ChannelConfig
}

function parseModelList(raw: string | undefined): ModelInfo[] | undefined {
  if (!raw) return undefined
  const ids = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (ids.length === 0) return undefined
  return ids.map((id) => ({ id, name: id }))
}

function getEnvString(env: EnvLike, key: string): string | undefined {
  const v = env[key]
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined
}

export function parseCustomChannelsFromEnv(env: EnvLike): CustomChannelDefinition[] {
  const defs: CustomChannelDefinition[] = []

  const jsonRaw = getEnvString(env, 'CUSTOM_CHANNELS_JSON')
  if (jsonRaw) {
    try {
      const parsed = JSON.parse(jsonRaw) as { channels?: Array<Record<string, unknown>> }
      for (const ch of parsed.channels || []) {
        const id = typeof ch.id === 'string' ? ch.id : ''
        const name = typeof ch.name === 'string' ? ch.name : id
        const baseUrl = typeof ch.baseUrl === 'string' ? ch.baseUrl : ''
        if (!id || !baseUrl) continue

        const auth = (ch.auth || {}) as Record<string, unknown>
        const authType =
          auth.type === 'bearer' || auth.type === 'api-key' || auth.type === 'none'
            ? (auth.type as 'bearer' | 'api-key' | 'none')
            : 'bearer'

        const endpoints = (ch.endpoints || {}) as Record<string, unknown>
        const jsonTokens = Array.isArray(ch.tokens)
          ? (ch.tokens as unknown[]).filter(
              (t): t is string => typeof t === 'string' && t.trim().length > 0
            )
          : undefined

        defs.push({
          id,
          name,
          config: {
            baseUrl,
            auth: {
              type: authType,
              optional: auth.optional === true,
              headerName: typeof auth.headerName === 'string' ? auth.headerName : undefined,
              prefix: typeof auth.prefix === 'string' ? auth.prefix : undefined,
            },
            endpoints: {
              ...(typeof endpoints.image === 'string' && { image: endpoints.image }),
              ...(typeof endpoints.llm === 'string' && { llm: endpoints.llm }),
            },
            headers:
              typeof ch.headers === 'object' && ch.headers
                ? (ch.headers as Record<string, string>)
                : undefined,
            tokens: jsonTokens?.length ? jsonTokens : undefined,
            imageModels: Array.isArray(ch.imageModels)
              ? (ch.imageModels as unknown[])
                  .filter((m): m is Record<string, unknown> => typeof m === 'object' && m !== null)
                  .map((m) => ({ id: String(m.id), name: String(m.name || m.id) }))
              : undefined,
            llmModels: Array.isArray(ch.llmModels)
              ? (ch.llmModels as unknown[])
                  .filter((m): m is Record<string, unknown> => typeof m === 'object' && m !== null)
                  .map((m) => ({ id: String(m.id), name: String(m.name || m.id) }))
              : undefined,
          },
        })
      }
    } catch {
      // ignore invalid JSON
    }
  }

  for (let i = 1; i <= 20; i++) {
    const id = getEnvString(env, `CUSTOM_CHANNEL_${i}_ID`)
    const baseUrl = getEnvString(env, `CUSTOM_CHANNEL_${i}_URL`)
    if (!id || !baseUrl) continue

    const name = getEnvString(env, `CUSTOM_CHANNEL_${i}_NAME`) || id
    const authTypeRaw = getEnvString(env, `CUSTOM_CHANNEL_${i}_AUTH_TYPE`) || 'bearer'
    const authType =
      authTypeRaw === 'bearer' || authTypeRaw === 'api-key' || authTypeRaw === 'none'
        ? (authTypeRaw as 'bearer' | 'api-key' | 'none')
        : 'bearer'

    const tokensRaw = getEnvString(env, `CUSTOM_CHANNEL_${i}_TOKENS`)
    const keyRaw = getEnvString(env, `CUSTOM_CHANNEL_${i}_KEY`)
    const tokensParsed = parseTokens(tokensRaw)
    const keysParsed = parseTokens(keyRaw)
    const tokens = tokensParsed.length ? tokensParsed : keysParsed

    const imageEndpoint = getEnvString(env, `CUSTOM_CHANNEL_${i}_IMAGE_ENDPOINT`)
    const llmEndpoint = getEnvString(env, `CUSTOM_CHANNEL_${i}_LLM_ENDPOINT`)

    defs.push({
      id,
      name,
      config: {
        baseUrl,
        auth: {
          type: authType,
          headerName: getEnvString(env, `CUSTOM_CHANNEL_${i}_AUTH_HEADER`),
          prefix: getEnvString(env, `CUSTOM_CHANNEL_${i}_AUTH_PREFIX`),
        },
        endpoints: {
          ...(imageEndpoint && { image: imageEndpoint }),
          ...(llmEndpoint && { llm: llmEndpoint }),
        },
        tokens: tokens.length ? tokens : undefined,
        imageModels: parseModelList(getEnvString(env, `CUSTOM_CHANNEL_${i}_IMAGE_MODELS`)),
        llmModels: parseModelList(getEnvString(env, `CUSTOM_CHANNEL_${i}_LLM_MODELS`)),
      },
    })
  }

  return defs
}
