import { type ClassValue, clsx } from 'clsx'
import JSZip from 'jszip'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Check if URL is from HuggingFace
 */
function isHuggingFaceUrl(url: string): boolean {
  return url.includes('.hf.space') || url.includes('huggingface.co')
}

/**
 * Download image, converting HuggingFace images to PNG format
 */
export async function downloadImage(
  url: string,
  filename: string,
  provider?: string
): Promise<void> {
  // Check if it's a HuggingFace image (by URL or provider name)
  const isHF = isHuggingFaceUrl(url) || provider?.toLowerCase().includes('huggingface')

  if (isHF && url.startsWith('http')) {
    try {
      // Fetch the image and convert to PNG blob
      const response = await fetch(url)
      const blob = await response.blob()

      // Create a canvas to convert to PNG
      const img = new Image()
      img.crossOrigin = 'anonymous'

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }
          ctx.drawImage(img, 0, 0)

          canvas.toBlob(
            (pngBlob) => {
              if (!pngBlob) {
                reject(new Error('Failed to convert to PNG'))
                return
              }
              const blobUrl = URL.createObjectURL(pngBlob)
              const a = document.createElement('a')
              a.href = blobUrl
              a.download = filename.replace(/\.(jpg|jpeg|webp)$/i, '.png')
              a.click()
              URL.revokeObjectURL(blobUrl)
              resolve()
            },
            'image/png',
            1.0
          )
        }
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = URL.createObjectURL(blob)
      })
    } catch (error) {
      console.error('Failed to convert image to PNG, falling back to direct download:', error)
      // Fallback to direct download
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
    }
  } else {
    // Direct download for non-HF images
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Convert image URL or base64 data URL to PNG blob
 * Uses proxy for external URLs to avoid CORS issues
 */
async function convertToPngBlob(url: string): Promise<Blob> {
  let blob: Blob

  // Handle base64 data URLs directly
  if (url.startsWith('data:')) {
    const response = await fetch(url)
    blob = await response.blob()
  } else {
    const response = await fetch(url)
    blob = await response.blob()
  }

  // If already PNG, return as-is
  if (blob.type === 'image/png') {
    return blob
  }

  // Convert to PNG using canvas
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }
      ctx.drawImage(img, 0, 0)

      canvas.toBlob(
        (pngBlob) => {
          if (!pngBlob) {
            reject(new Error('Failed to convert to PNG'))
            return
          }
          resolve(pngBlob)
        },
        'image/png',
        1.0
      )
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(blob)
  })
}

/**
 * Download multiple images as a zip file
 * Converts webp images to PNG format
 */
export async function downloadImagesAsZip(
  images: Array<{ url: string; filename: string }>,
  zipFilename: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const zip = new JSZip()
  const imagesFolder = zip.folder('images')

  if (!imagesFolder) {
    throw new Error('Failed to create zip folder')
  }

  for (let i = 0; i < images.length; i++) {
    const { url, filename } = images[i]
    onProgress?.(i + 1, images.length)

    try {
      // Convert to PNG blob
      const pngBlob = await convertToPngBlob(url)
      // Ensure filename ends with .png
      const pngFilename = filename.replace(/\.(webp|jpg|jpeg)$/i, '.png')
      imagesFolder.file(pngFilename, pngBlob)
    } catch (error) {
      console.error(`Failed to process image ${filename}:`, error)
      // Try to add original image as fallback
      try {
        let blob: Blob
        if (url.startsWith('data:')) {
          // Handle base64 data URLs
          const response = await fetch(url)
          blob = await response.blob()
        } else {
          const response = await fetch(url)
          blob = await response.blob()
        }
        imagesFolder.file(filename, blob)
      } catch {
        console.error(`Failed to add image ${filename} to zip`)
      }
    }
  }

  // Generate zip and download
  const content = await zip.generateAsync({ type: 'blob' })
  const blobUrl = URL.createObjectURL(content)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = zipFilename
  a.click()
  URL.revokeObjectURL(blobUrl)
}
