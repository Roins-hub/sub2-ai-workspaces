/**
 * Frontend Constants
 *
 * Uses shared types and constants from @z-image/shared
 * with frontend-specific additions (icons)
 */

import {
  type AspectRatioConfig,
  DEFAULT_OPTIMIZE_SYSTEM_PROMPT,
  getModelsByProvider,
  LLM_PROVIDER_CONFIGS,
  type LLMProviderType,
  MODEL_CONFIGS,
  PROVIDER_CONFIGS,
  type ProviderType,
  ASPECT_RATIOS as SHARED_ASPECT_RATIOS,
} from '@z-image/shared'
import { RectangleHorizontal, RectangleVertical, Square } from 'lucide-react'

// Re-export shared types
export type { ProviderType, AspectRatioConfig, LLMProviderType }
export { PROVIDER_CONFIGS, MODEL_CONFIGS, getModelsByProvider, LLM_PROVIDER_CONFIGS }
export { DEFAULT_OPTIMIZE_SYSTEM_PROMPT }

// Environment defaults (with fallbacks to prevent undefined)
export const DEFAULT_PROMPT = import.meta.env.VITE_DEFAULT_PROMPT ?? ''
export const DEFAULT_NEGATIVE_PROMPT = import.meta.env.VITE_DEFAULT_NEGATIVE_PROMPT ?? ''

// Aspect ratios with icons for UI
const ASPECT_RATIO_ICONS = {
  '1:1': Square,
  '4:3': RectangleHorizontal,
  '3:4': RectangleVertical,
  '16:9': RectangleHorizontal,
  '9:16': RectangleVertical,
} as const

export interface AspectRatioWithIcon extends AspectRatioConfig {
  icon: typeof Square
}

export const ASPECT_RATIOS: AspectRatioWithIcon[] = SHARED_ASPECT_RATIOS.map((ratio) => ({
  ...ratio,
  icon: ASPECT_RATIO_ICONS[ratio.label as keyof typeof ASPECT_RATIO_ICONS] || Square,
}))

export type AspectRatio = (typeof ASPECT_RATIOS)[number]

export const RESOLUTION_OPTIONS = [
  { id: '720p', label: '720P' },
  { id: '1080p', label: '1080P' },
  { id: '2k', label: '2K' },
  { id: '4k', label: '4K' },
] as const

export type ResolutionLevel = (typeof RESOLUTION_OPTIONS)[number]['id']

export function isResolutionLevel(value: unknown): value is ResolutionLevel {
  return RESOLUTION_OPTIONS.some((option) => option.id === value)
}

export function getResolutionPreset(ratio: AspectRatio, level: ResolutionLevel) {
  const index = RESOLUTION_OPTIONS.findIndex((option) => option.id === level)
  return ratio.presets[index] ?? ratio.presets[0]
}

export function findResolutionForDimensions(width: number, height: number) {
  for (const ratio of ASPECT_RATIOS) {
    const index = ratio.presets.findIndex((preset) => preset.w === width && preset.h === height)
    if (index >= 0) {
      return { ratio: ratio.label, level: RESOLUTION_OPTIONS[index]?.id ?? '720p' }
    }
  }
  return null
}

// Storage
export const STORAGE_KEY = 'zenith-settings'

export function loadSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

export function saveSettings(settings: Record<string, unknown>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

// Provider options for UI
export const PROVIDER_OPTIONS: { value: ProviderType; label: string; requiresAuth: boolean }[] = [
  { value: 'custom', label: '自定义中转站', requiresAuth: true },
]

// Get default model for provider
export function getDefaultModel(provider: ProviderType): string {
  const models = getModelsByProvider(provider)
  return models[0]?.id || 'z-image-turbo'
}

export interface ImageRelaySettings {
  baseUrl: string
  quality: 'auto' | 'low' | 'medium' | 'high'
  background: 'auto' | 'opaque' | 'transparent'
  outputFormat: 'png' | 'jpeg' | 'webp'
}

export type ImageGenerationMode = 'generate' | 'edit' | 'batch'
export type BatchPromptMode = 'repeat' | 'lines'

export const IMAGE_RELAY_PRESETS = [
  { value: 'https://sub2.hhlai.xyz', label: 'HHL AI' },
  { value: 'https://xiaoxin8.com', label: 'Xiaoxin8' },
] as const

export function normalizeImageRelayRoot(input: string): string {
  let value = input
    .trim()
    .replace(/[，,]+$/, '')
    .replace(/\/+$/, '')
  if (value && !/^[a-z][a-z\d+.-]*:\/\//i.test(value)) {
    value = `https://${value}`
  }
  return value
    .replace(/\/v1\/images\/(?:generations|edits)$/i, '')
    .replace(/\/images\/(?:generations|edits)$/i, '')
    .replace(/\/v1$/i, '')
}

export const DEFAULT_IMAGE_RELAY_SETTINGS: ImageRelaySettings = {
  baseUrl: 'https://sub2.hhlai.xyz',
  quality: 'auto',
  background: 'auto',
  outputFormat: 'png',
}

// ============================================================================
// LLM Settings (for prompt optimization)
// ============================================================================

/** LLM provider options for UI (excluding deepseek for now, can add later) */
export const LLM_PROVIDER_OPTIONS: { value: LLMProviderType; label: string; needsAuth: boolean }[] =
  [{ value: 'custom', label: 'Custom (OpenAI Compatible)', needsAuth: true }]

/** Get models for LLM provider */
export function getLLMModels(provider: LLMProviderType) {
  return LLM_PROVIDER_CONFIGS[provider]?.models || []
}

/** Get default LLM model for provider */
export function getDefaultLLMModel(provider: LLMProviderType): string {
  return LLM_PROVIDER_CONFIGS[provider]?.defaultModel || 'openai'
}

/** Custom LLM provider configuration */
export interface CustomLLMConfig {
  /** API base URL (e.g., https://api.openai.com/v1) */
  baseUrl: string
  /** API key */
  apiKey: string
  /** Model name */
  model: string
}

/** LLM Settings interface */
export interface LLMSettings {
  /** LLM provider for optimization */
  llmProvider: LLMProviderType
  /** LLM model for optimization */
  llmModel: string
  /** LLM provider for translation */
  translateProvider: LLMProviderType
  /** LLM model for translation */
  translateModel: string
  /** Auto-translate enabled (Chinese to English) */
  autoTranslate: boolean
  /** Custom system prompt for optimization */
  customSystemPrompt: string
  /** Custom provider config for optimization */
  customOptimizeConfig: CustomLLMConfig
  /** Custom provider config for translation */
  customTranslateConfig: CustomLLMConfig
}

/** Default custom LLM config */
export const DEFAULT_CUSTOM_LLM_CONFIG: CustomLLMConfig = {
  baseUrl: '',
  apiKey: '',
  model: '',
}

/** Default LLM settings */
export const DEFAULT_LLM_SETTINGS: LLMSettings = {
  llmProvider: 'custom',
  llmModel: '',
  translateProvider: 'custom',
  translateModel: '',
  autoTranslate: false,
  customSystemPrompt: '',
  customOptimizeConfig: { ...DEFAULT_CUSTOM_LLM_CONFIG },
  customTranslateConfig: { ...DEFAULT_CUSTOM_LLM_CONFIG },
}

/** LLM settings storage key */
export const LLM_SETTINGS_KEY = 'zenith-llm-settings'

/** Load LLM settings from localStorage */
export function loadLLMSettings(): LLMSettings {
  try {
    const saved = localStorage.getItem(LLM_SETTINGS_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // Ensure all fields have proper default values (handle undefined/null from old data)
      const validProvider = (value: unknown): LLMProviderType =>
        value === 'custom' ? 'custom' : 'custom'
      return {
        // Older versions exposed free providers that may be unavailable or quota-limited.
        // Migrate those saved settings to the only supported UI provider.
        llmProvider: validProvider(parsed.llmProvider),
        llmModel: parsed.llmProvider === 'custom' ? (parsed.llmModel ?? '') : '',
        translateProvider: validProvider(parsed.translateProvider),
        translateModel: parsed.translateProvider === 'custom' ? (parsed.translateModel ?? '') : '',
        autoTranslate:
          parsed.translateProvider === 'custom'
            ? (parsed.autoTranslate ?? DEFAULT_LLM_SETTINGS.autoTranslate)
            : false,
        customSystemPrompt: parsed.customSystemPrompt ?? DEFAULT_LLM_SETTINGS.customSystemPrompt,
        customOptimizeConfig: {
          baseUrl: parsed.customOptimizeConfig?.baseUrl ?? DEFAULT_CUSTOM_LLM_CONFIG.baseUrl,
          apiKey: parsed.customOptimizeConfig?.apiKey ?? DEFAULT_CUSTOM_LLM_CONFIG.apiKey,
          model: parsed.customOptimizeConfig?.model ?? DEFAULT_CUSTOM_LLM_CONFIG.model,
        },
        customTranslateConfig: {
          baseUrl: parsed.customTranslateConfig?.baseUrl ?? DEFAULT_CUSTOM_LLM_CONFIG.baseUrl,
          apiKey: parsed.customTranslateConfig?.apiKey ?? DEFAULT_CUSTOM_LLM_CONFIG.apiKey,
          model: parsed.customTranslateConfig?.model ?? DEFAULT_CUSTOM_LLM_CONFIG.model,
        },
      }
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_LLM_SETTINGS
}

/** Save LLM settings to localStorage */
export function saveLLMSettings(settings: Partial<LLMSettings>): void {
  const current = loadLLMSettings()
  const updated = { ...current, ...settings }
  localStorage.setItem(LLM_SETTINGS_KEY, JSON.stringify(updated))
}

/** Get the effective system prompt (custom or default) */
export function getEffectiveSystemPrompt(customPrompt: string | undefined | null): string {
  const trimmed = (customPrompt ?? '').trim()
  return trimmed || DEFAULT_OPTIMIZE_SYSTEM_PROMPT
}
