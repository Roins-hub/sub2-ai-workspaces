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
      { w: 1536, h: 1536 },
      { w: 2048, h: 2048 },
      { w: 2864, h: 2864 },
    ],
  },
  {
    label: '4:3',
    presets: [
      { w: 960, h: 720 },
      { w: 1472, h: 1104 },
      { w: 2048, h: 1536 },
      { w: 3264, h: 2448 },
    ],
  },
  {
    label: '3:4',
    presets: [
      { w: 720, h: 960 },
      { w: 1104, h: 1472 },
      { w: 1536, h: 2048 },
      { w: 2448, h: 3264 },
    ],
  },
  {
    label: '16:9',
    presets: [
      { w: 1280, h: 720 },
      { w: 1920, h: 1088 },
      { w: 2560, h: 1440 },
      { w: 3840, h: 2160 },
    ],
  },
  {
    label: '9:16',
    presets: [
      { w: 720, h: 1280 },
      { w: 1088, h: 1920 },
      { w: 1440, h: 2560 },
      { w: 2160, h: 3840 },
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
