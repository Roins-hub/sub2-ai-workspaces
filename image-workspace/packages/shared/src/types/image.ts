/**
 * Image Related Type Definitions
 */

import type { ProviderType } from './provider'

/** Generated image */
export interface GeneratedImage {
  /** Unique ID */
  id: string
  /** Image URL */
  url: string
  /** Base64 encoded data (optional) */
  b64Json?: string
  /** Prompt text */
  prompt: string
  /** Negative prompt */
  negativePrompt?: string
  /** Aspect ratio label */
  aspectRatio: string
  /** Width in pixels */
  width: number
  /** Height in pixels */
  height: number
  /** Generation timestamp */
  timestamp: number
  /** Model used */
  model: string
  /** Provider used */
  provider: ProviderType
  /** Random seed */
  seed?: number
  /** Inference steps */
  steps?: number
  /** Guidance scale */
  guidanceScale?: number
  /** Generation duration in milliseconds */
  duration?: number
  /** Whether image is blurred */
  isBlurred?: boolean
  /** Whether image has been upscaled */
  isUpscaled?: boolean
}

/** Aspect ratio preset */
export interface AspectRatioPreset {
  w: number
  h: number
}

/** Aspect ratio configuration */
export interface AspectRatioConfig {
  /** Label (e.g. "1:1", "16:9") */
  label: string
  /** Preset dimensions list */
  presets: AspectRatioPreset[]
}
