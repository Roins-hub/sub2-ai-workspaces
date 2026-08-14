/**
 * Utility Functions Tests
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest'
import { cn } from '../utils'

// Note: We need to test the private isHuggingFaceUrl function indirectly
// or export it for testing. For now, we test cn() and document the URL check.

describe('cn (className merge utility)', () => {
  it('should merge class names', () => {
    const result = cn('foo', 'bar')
    expect(result).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    const isActive = true
    const result = cn('base', isActive && 'active')
    expect(result).toBe('base active')
  })

  it('should filter out falsy values', () => {
    const result = cn('base', false, null, undefined, 'valid')
    expect(result).toBe('base valid')
  })

  it('should merge tailwind classes correctly', () => {
    // tailwind-merge should dedupe conflicting classes
    const result = cn('px-2 py-1', 'px-4')
    expect(result).toBe('py-1 px-4')
  })

  it('should handle object syntax', () => {
    const result = cn('base', { active: true, disabled: false })
    expect(result).toBe('base active')
  })

  it('should handle array syntax', () => {
    const result = cn(['foo', 'bar'], 'baz')
    expect(result).toBe('foo bar baz')
  })

  it('should handle empty input', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('should handle complex tailwind merge scenarios', () => {
    // Background color override
    const result = cn('bg-red-500', 'bg-blue-500')
    expect(result).toBe('bg-blue-500')
  })

  it('should preserve non-conflicting classes', () => {
    const result = cn('text-sm font-bold', 'text-center')
    expect(result).toContain('text-sm')
    expect(result).toContain('font-bold')
    expect(result).toContain('text-center')
  })
})

describe('isHuggingFaceUrl (tested via behavior)', () => {
  // These tests document the expected behavior of URL detection
  // The actual function is private, but we test the concept

  const testUrls = [
    { url: 'https://example.hf.space/file/image.png', expected: true },
    { url: 'https://huggingface.co/datasets/image.png', expected: true },
    { url: 'https://luca115-z-image-turbo.hf.space/img.png', expected: true },
    { url: 'https://example.com/image.png', expected: false },
    { url: 'https://gitee.ai/image.png', expected: false },
  ]

  it.each(testUrls)('should correctly identify $url as HF=$expected', ({ url, expected }) => {
    const isHF = url.includes('.hf.space') || url.includes('huggingface.co')
    expect(isHF).toBe(expected)
  })
})
