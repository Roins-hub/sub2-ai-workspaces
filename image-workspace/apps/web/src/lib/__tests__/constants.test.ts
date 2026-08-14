/**
 * Constants and Settings Tests
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it } from 'vitest'
import {
  ASPECT_RATIOS,
  getDefaultModel,
  loadSettings,
  PROVIDER_OPTIONS,
  STORAGE_KEY,
  saveSettings,
} from '../constants'

describe('loadSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should return empty object when no settings saved', () => {
    const result = loadSettings()
    expect(result).toEqual({})
  })

  it('should return saved settings', () => {
    const settings = { prompt: 'test prompt', width: 1024 }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))

    const result = loadSettings()
    expect(result).toEqual(settings)
  })

  it('should return empty object on invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid json {{{')

    const result = loadSettings()
    expect(result).toEqual({})
  })

  it('should handle complex settings object', () => {
    const settings = {
      prompt: 'a beautiful sunset',
      negativePrompt: 'blurry',
      width: 1024,
      height: 768,
      steps: 12,
      selectedRatio: '4:3',
      uhd: true,
      provider: 'gitee',
      model: 'z-image-turbo',
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))

    const result = loadSettings()
    expect(result).toEqual(settings)
  })
})

describe('saveSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should save settings to localStorage', () => {
    const settings = { prompt: 'test', width: 512 }
    saveSettings(settings)

    const stored = localStorage.getItem(STORAGE_KEY)
    expect(stored).not.toBeNull()
    expect(JSON.parse(stored!)).toEqual(settings)
  })

  it('should overwrite existing settings', () => {
    saveSettings({ prompt: 'first' })
    saveSettings({ prompt: 'second', width: 1024 })

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(stored.prompt).toBe('second')
    expect(stored.width).toBe(1024)
  })

  it('should handle empty settings', () => {
    saveSettings({})

    const stored = localStorage.getItem(STORAGE_KEY)
    expect(stored).toBe('{}')
  })
})

describe('ASPECT_RATIOS', () => {
  it('should have all required aspect ratios', () => {
    const labels = ASPECT_RATIOS.map((r) => r.label)
    expect(labels).toContain('1:1')
    expect(labels).toContain('4:3')
    expect(labels).toContain('3:4')
    expect(labels).toContain('16:9')
    expect(labels).toContain('9:16')
  })

  it('should have icon property for each ratio', () => {
    for (const ratio of ASPECT_RATIOS) {
      expect(ratio.icon).toBeDefined()
    }
  })

  it('should have presets for each ratio', () => {
    for (const ratio of ASPECT_RATIOS) {
      expect(ratio.presets).toBeDefined()
      expect(ratio.presets.length).toBeGreaterThanOrEqual(2)
      expect(ratio.presets[0].w).toBeGreaterThan(0)
      expect(ratio.presets[0].h).toBeGreaterThan(0)
    }
  })

  it('should have 1:1 ratio with square dimensions', () => {
    const squareRatio = ASPECT_RATIOS.find((r) => r.label === '1:1')
    expect(squareRatio).toBeDefined()
    expect(squareRatio!.presets[0].w).toBe(squareRatio!.presets[0].h)
  })
})

describe('PROVIDER_OPTIONS', () => {
  it('should have huggingface as a provider', () => {
    const hf = PROVIDER_OPTIONS.find((p) => p.value === 'huggingface')
    expect(hf).toBeDefined()
    expect(hf!.requiresAuth).toBe(false)
  })

  it('should have gitee as a provider with auth required', () => {
    const gitee = PROVIDER_OPTIONS.find((p) => p.value === 'gitee')
    expect(gitee).toBeDefined()
    expect(gitee!.requiresAuth).toBe(true)
  })

  it('should have modelscope as a provider with auth required', () => {
    const ms = PROVIDER_OPTIONS.find((p) => p.value === 'modelscope')
    expect(ms).toBeDefined()
    expect(ms!.requiresAuth).toBe(true)
  })

  it('should have a4f as a provider with auth required', () => {
    const a4f = PROVIDER_OPTIONS.find((p) => p.value === 'a4f')
    expect(a4f).toBeDefined()
    expect(a4f!.requiresAuth).toBe(true)
  })

  it('should have labels for all providers', () => {
    for (const provider of PROVIDER_OPTIONS) {
      expect(provider.label).toBeTruthy()
      expect(typeof provider.label).toBe('string')
    }
  })
})

describe('getDefaultModel', () => {
  it('should return default model for huggingface', () => {
    const model = getDefaultModel('huggingface')
    expect(model).toBeTruthy()
    expect(typeof model).toBe('string')
  })

  it('should return default model for gitee', () => {
    const model = getDefaultModel('gitee')
    expect(model).toBeTruthy()
  })

  it('should return default model for modelscope', () => {
    const model = getDefaultModel('modelscope')
    expect(model).toBeTruthy()
  })

  it('should return default model for a4f', () => {
    const model = getDefaultModel('a4f')
    expect(model).toBeTruthy()
  })

  it('should return fallback for unknown provider', () => {
    // TypeScript would catch this, but testing runtime behavior
    const model = getDefaultModel('unknown' as unknown as Parameters<typeof getDefaultModel>[0])
    expect(model).toBe('z-image-turbo')
  })
})

describe('STORAGE_KEY', () => {
  it('should be a non-empty string', () => {
    expect(STORAGE_KEY).toBeTruthy()
    expect(typeof STORAGE_KEY).toBe('string')
  })

  it('should be consistent', () => {
    expect(STORAGE_KEY).toBe('zenith-settings')
  })
})
