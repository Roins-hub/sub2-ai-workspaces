/**
 * Vitest Setup File
 * Global mocks and test utilities
 */

import { afterEach, beforeEach, vi } from 'vitest'

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})

// Cleanup after each test
afterEach(() => {
  vi.restoreAllMocks()
})

// Suppress console.error in tests (optional - remove if you want to see errors)
// vi.spyOn(console, 'error').mockImplementation(() => {})
