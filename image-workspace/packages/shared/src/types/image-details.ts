/**
 * UI-friendly image details (used by the web app).
 *
 * Note: This is not an OpenAI API type; it's derived on the client side.
 */

export interface ImageDetails {
  url: string
  provider: string
  model: string
  dimensions: string
  duration: string
  seed: number
  steps: number
  prompt: string
  negativePrompt: string
}
