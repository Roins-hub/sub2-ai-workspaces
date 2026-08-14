import { describe, expect, it } from 'vitest'
import {
  buildBatchPrompts,
  getBatchTaskDuration,
  MAX_BATCH_CONCURRENCY,
  runWithConcurrency,
} from '../batchQueue'

describe('batchQueue', () => {
  it('builds repeated prompts within the supported range', () => {
    expect(buildBatchPrompts('repeat', '  cinematic city  ', [], 4)).toEqual([
      'cinematic city',
      'cinematic city',
      'cinematic city',
      'cinematic city',
    ])
    expect(buildBatchPrompts('repeat', ' ', [], 4)).toEqual([])
    expect(buildBatchPrompts('repeat', 'portrait', [], 1)).toHaveLength(1)
    expect(buildBatchPrompts('repeat', 'portrait', [], 99)).toHaveLength(MAX_BATCH_CONCURRENCY)
  })

  it('normalizes confirmed prompts and caps the batch at eight', () => {
    const input = Array.from({ length: 10 }, (_, index) => ` prompt ${index + 1} `)
    expect(buildBatchPrompts('lines', '', input, 4)).toEqual(
      Array.from({ length: 8 }, (_, index) => `prompt ${index + 1}`)
    )
  })

  it('formats running and completed task duration independently', () => {
    expect(getBatchTaskDuration({}, 5000)).toBeNull()
    expect(getBatchTaskDuration({ startedAt: 1000 }, 2450)).toBe('1.4s')
    expect(getBatchTaskDuration({ startedAt: 1000, finishedAt: 3250 }, 9000)).toBe('2.3s')
  })

  it('never exceeds the requested concurrency', async () => {
    let active = 0
    let peak = 0
    const completed: number[] = []

    await runWithConcurrency(
      [0, 1, 2, 3, 4, 5, 6, 7],
      MAX_BATCH_CONCURRENCY,
      () => false,
      async (item) => {
        active += 1
        peak = Math.max(peak, active)
        await new Promise((resolve) => setTimeout(resolve, 5))
        completed.push(item)
        active -= 1
      }
    )

    expect(peak).toBe(MAX_BATCH_CONCURRENCY)
    expect(completed.sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })
})
