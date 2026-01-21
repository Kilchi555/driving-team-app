/**
 * Image Compression Utilities
 * Compress and resize images while maintaining aspect ratio
 */

import { logger } from '~/utils/logger'

export interface CompressionOptions {
  maxSize?: number // Max file size in KB (default: 150)
  minQuality?: number // Min quality (default: 0.4)
  format?: 'webp' | 'jpeg' | 'png' // Output format (default: webp)
}

export type ImageType = 'square' | 'wide'

/**
 * Get canvas dimensions based on image type
 */
function getCanvasDimensions(type: ImageType) {
  if (type === 'square') {
    return { width: 400, height: 400 }
  } else {
    return { width: 800, height: 400 }
  }
}

/**
 * Compress and resize image while maintaining aspect ratio
 * @param file - Image file to compress
 * @param type - 'square' (400x400) or 'wide' (800x400)
 * @param options - Compression options
 * @returns Base64 encoded WebP/JPEG image
 */
export async function compressImage(
  file: File,
  type: ImageType = 'square',
  options: CompressionOptions = {}
): Promise<string> {
  const maxSizeKB = options.maxSize ?? 150
  const minQuality = options.minQuality ?? 0.4
  const format = options.format ?? 'webp'

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')

          if (!ctx) {
            reject(new Error('Canvas context not available'))
            return
          }

          // Get target dimensions
          const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(type)
          canvas.width = canvasWidth
          canvas.height = canvasHeight

          // Fill with white background
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvasWidth, canvasHeight)

          // Calculate dimensions to maintain aspect ratio
          const imgRatio = img.width / img.height
          const canvasRatio = canvasWidth / canvasHeight

          let drawWidth = canvasWidth
          let drawHeight = canvasHeight
          let offsetX = 0
          let offsetY = 0

          if (imgRatio > canvasRatio) {
            // Image is wider - fit to width
            drawWidth = canvasWidth
            drawHeight = canvasWidth / imgRatio
            offsetY = (canvasHeight - drawHeight) / 2
          } else {
            // Image is taller - fit to height
            drawHeight = canvasHeight
            drawWidth = canvasHeight * imgRatio
            offsetX = (canvasWidth - drawWidth) / 2
          }

          // Draw image centered
          ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)

          // Convert to Base64 with compression
          const mimeType = `image/${format}`
          let quality = 0.8
          let base64Data = canvas.toDataURL(mimeType, quality)

          // Reduce quality if needed to meet target size
          while (base64Data.length > maxSizeKB * 1024 && quality > minQuality) {
            quality -= 0.1
            base64Data = canvas.toDataURL(mimeType, quality)
          }

          const compressedSizeKB = (base64Data.length / 1.33 / 1024).toFixed(1)
          const originalSizeKB = (file.size / 1024).toFixed(1)

          logger.debug('🖼️ Image compression complete:', {
            type,
            originalSize: `${originalSizeKB}KB`,
            compressedSize: `${compressedSizeKB}KB`,
            compression: `${(100 - (parseFloat(compressedSizeKB) / parseFloat(originalSizeKB)) * 100).toFixed(0)}%`,
            quality: quality.toFixed(2),
            format,
            imgRatio: imgRatio.toFixed(2),
            canvasRatio: canvasRatio.toFixed(2),
            drawDimensions: `${drawWidth.toFixed(0)}x${drawHeight.toFixed(0)}`
          })

          resolve(base64Data)
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Validate image file
 */
export function validateImageFile(
  file: File,
  maxSizeMB: number = 5
): { valid: boolean; error?: string } {
  // Check type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'Bitte wählen Sie eine Bilddatei' }
  }

  // Check size
  if (file.size > maxSizeMB * 1024 * 1024) {
    return {
      valid: false,
      error: `Datei ist zu groß (max. ${maxSizeMB}MB)`
    }
  }

  return { valid: true }
}

/**
 * Get file size in human-readable format
 */
export function getFileSizeKB(base64String: string): string {
  const sizeKB = (base64String.length / 1.33 / 1024).toFixed(1)
  return `${sizeKB}KB`
}

