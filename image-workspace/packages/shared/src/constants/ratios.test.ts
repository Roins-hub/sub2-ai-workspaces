import { describe, expect, it } from 'vitest'
import { validateDimensions } from '../utils/validation'
import { ASPECT_RATIOS } from './ratios'

describe('gpt-image-2 resolution presets', () => {
  it('provides four valid resolution levels for every aspect ratio', () => {
    for (const ratio of ASPECT_RATIOS) {
      expect(ratio.presets).toHaveLength(4)
      for (const preset of ratio.presets) {
        expect(validateDimensions(preset.w, preset.h)).toEqual({ valid: true })
      }
    }
  })

  it('uses the supported maximum 16:9 4K output', () => {
    const landscape = ASPECT_RATIOS.find((ratio) => ratio.label === '16:9')
    expect(landscape?.presets[3]).toEqual({ w: 3840, h: 2160 })
  })

  it('keeps the 4:3 4K tier below the total pixel limit', () => {
    const landscape = ASPECT_RATIOS.find((ratio) => ratio.label === '4:3')
    expect(landscape?.presets[3]).toEqual({ w: 3264, h: 2448 })
  })
})
