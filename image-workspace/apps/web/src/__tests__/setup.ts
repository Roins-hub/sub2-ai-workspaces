/**
 * Vitest Setup for Web Package
 * Mock browser APIs and reset state between tests
 */

import { afterEach, beforeEach, vi } from 'vitest'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock import.meta.env
vi.stubGlobal('import.meta', {
  env: {
    VITE_API_URL: 'http://localhost:8787',
    VITE_DEFAULT_PROMPT: 'A beautiful landscape',
    VITE_DEFAULT_NEGATIVE_PROMPT: 'blurry, low quality',
  },
})

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
  localStorageMock.clear()
})

// Cleanup after each test
afterEach(() => {
  vi.restoreAllMocks()
})
