import { describe, expect, it } from 'vitest'
import { buildBatchPrompts, runWithConcurrency } from '../batchQueue'

describe('batchQueue', () => {
  it('builds repeated prompts within the supported range', () => {
    expect(buildBatchPrompts('repeat', '  cinematic city  ', '', 4)).toEqual([
      'cinematic city',
      'cinematic city',
      'cinematic city',
      'cinematic city',
    ])
    expect(buildBatchPrompts('repeat', ' ', '', 4)).toEqual([])
    expect(buildBatchPrompts('repeat', 'portrait', '', 99)).toHaveLength(8)
  })

  it('parses non-empty prompt lines and caps the batch at eight', () => {
    const input = Array.from({ length: 10 }, (_, index) => ` prompt ${index + 1} `).join('\n')
    expect(buildBatchPrompts('lines', '', input, 4)).toEqual(
      Array.from({ length: 8 }, (_, index) => `prompt ${index + 1}`)
    )
  })

  it('never exceeds the requested concurrency', async () => {
    let active = 0
    let peak = 0
    const completed: number[] = []

    await runWithConcurrency(
      [0, 1, 2, 3, 4],
      2,
      () => false,
      async (item) => {
        active += 1
        peak = Math.max(peak, active)
        await new Promise((resolve) => setTimeout(resolve, 5))
        completed.push(item)
        active -= 1
      }
    )

    expect(peak).toBe(2)
    expect(completed.sort()).toEqual([0, 1, 2, 3, 4])
  })
})
