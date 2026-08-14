/**
 * Aspect Ratio Configuration
 */

import type { AspectRatioConfig } from '../types/image'

/** Aspect ratio configurations */
export const ASPECT_RATIOS: AspectRatioConfig[] = [
  {
    label: '1:1',
    presets: [
      { w: 1024, h: 1024 },
      { w: 2048, h: 2048 },
    ],
  },
  {
    label: '4:3',
    presets: [
      { w: 1152, h: 896 },
      { w: 2048, h: 1536 },
    ],
  },
  {
    label: '3:4',
    presets: [
      { w: 768, h: 1024 },
      { w: 1536, h: 2048 },
    ],
  },
  {
    label: '16:9',
    presets: [
      { w: 1024, h: 576 },
      { w: 2048, h: 1152 },
    ],
  },
  {
    label: '9:16',
    presets: [
      { w: 576, h: 1024 },
      { w: 1152, h: 2048 },
    ],
  },
]

/** Get aspect ratio configuration by label */
export function getAspectRatioByLabel(label: string): AspectRatioConfig | undefined {
  return ASPECT_RATIOS.find((r) => r.label === label)
}

/** Get default aspect ratio */
export function getDefaultAspectRatio(): AspectRatioConfig {
  return ASPECT_RATIOS[0]
}
