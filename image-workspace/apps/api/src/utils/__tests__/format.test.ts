/**
 * Utils Unit Tests
 * Tests for formatting utilities
 */

import { describe, expect, it } from 'vitest'
import { formatDimensions, formatDuration } from '../format'

describe('formatDimensions', () => {
  it('should format square dimensions with 1:1 ratio', () => {
    expect(formatDimensions(1024, 1024)).toBe('1024 x 1024 (1:1)')
  })

  it('should format 4:3 aspect ratio', () => {
    expect(formatDimensions(1024, 768)).toBe('1024 x 768 (4:3)')
  })

  it('should format 16:9 aspect ratio', () => {
    expect(formatDimensions(1920, 1080)).toBe('1920 x 1080 (16:9)')
  })

  it('should format 3:4 portrait ratio', () => {
    expect(formatDimensions(768, 1024)).toBe('768 x 1024 (3:4)')
  })

  it('should handle small dimensions', () => {
    expect(formatDimensions(256, 256)).toBe('256 x 256 (1:1)')
  })

  it('should calculate correct GCD for complex ratios', () => {
    // 1280 x 720 = 16:9
    expect(formatDimensions(1280, 720)).toBe('1280 x 720 (16:9)')
  })
})

describe('formatDuration', () => {
  it('should format milliseconds for values under 1 second', () => {
    expect(formatDuration(500)).toBe('500ms')
    expect(formatDuration(100)).toBe('100ms')
    expect(formatDuration(999)).toBe('999ms')
  })

  it('should format seconds for values >= 1 second', () => {
    expect(formatDuration(1000)).toBe('1.0s')
    expect(formatDuration(1500)).toBe('1.5s')
    expect(formatDuration(8500)).toBe('8.5s')
  })

  it('should handle edge case at exactly 1 second', () => {
    expect(formatDuration(1000)).toBe('1.0s')
  })

  it('should format large durations correctly', () => {
    expect(formatDuration(60000)).toBe('60.0s')
    expect(formatDuration(120500)).toBe('120.5s')
  })

  it('should handle zero', () => {
    expect(formatDuration(0)).toBe('0ms')
  })
})
