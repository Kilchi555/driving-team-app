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

export type ImageType = 'square' | 'wide' | 'hero'

/**
 * Get canvas dimensions based on image type
 */
function getCanvasDimensions(type: ImageType) {
  if (type === 'square') {
    return { width: 400, height: 400 }
  }
  if (type === 'hero') {
    return { width: 1600, height: 900 }
  }
  return { width: 800, height: 400 }
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
  const maxSizeKB = options.maxSize ?? (type === 'hero' ? 420 : 150)
  const minQuality = options.minQuality ?? 0.4
  const format = options.format ?? 'webp'
  const cover = type === 'hero'

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

          // Fill background
          ctx.fillStyle = cover ? '#0c1222' : '#ffffff'
          ctx.fillRect(0, 0, canvasWidth, canvasHeight)

          // Calculate dimensions to maintain aspect ratio
          const imgRatio = img.width / img.height
          const canvasRatio = canvasWidth / canvasHeight

          let drawWidth = canvasWidth
          let drawHeight = canvasHeight
          let offsetX = 0
          let offsetY = 0

          if (cover) {
            // Cover: fill canvas, crop overflow
            if (imgRatio > canvasRatio) {
              drawHeight = canvasHeight
              drawWidth = canvasHeight * imgRatio
              offsetX = (canvasWidth - drawWidth) / 2
            } else {
              drawWidth = canvasWidth
              drawHeight = canvasWidth / imgRatio
              offsetY = (canvasHeight - drawHeight) / 2
            }
          } else if (imgRatio > canvasRatio) {
            // Contain: fit to width
            drawWidth = canvasWidth
            drawHeight = canvasWidth / imgRatio
            offsetY = (canvasHeight - drawHeight) / 2
          } else {
            // Contain: fit to height
            drawHeight = canvasHeight
            drawWidth = canvasHeight * imgRatio
            offsetX = (canvasWidth - drawWidth) / 2
          }

          // Draw image centered
          ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)

          // Convert to Base64 with compression.
          // Safari/iOS often cannot encode WebP and silently returns PNG — detect that.
          let effectiveFormat = format
          let mimeType = `image/${effectiveFormat}`
          let quality = 0.8
          let base64Data = canvas.toDataURL(mimeType, quality)

          const returnedMime = base64Data.match(/^data:([^;]+);/)?.[1] || ''
          if (returnedMime && returnedMime !== mimeType) {
            // Browser ignored the requested format (common for image/webp on Safari)
            if (returnedMime === 'image/png' || returnedMime === 'image/jpeg') {
              effectiveFormat = returnedMime === 'image/png' ? 'png' : 'jpeg'
              mimeType = returnedMime
              base64Data = canvas.toDataURL(mimeType, quality)
            } else {
              // Last resort: JPEG is universally supported
              effectiveFormat = 'jpeg'
              mimeType = 'image/jpeg'
              base64Data = canvas.toDataURL(mimeType, quality)
            }
          }

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
            format: effectiveFormat,
            requestedFormat: format,
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

export interface PhotoUploadCompressionOptions {
  /** Longest side in px (default 2048 — sharp enough for GBP, small enough for API limits) */
  maxEdge?: number
  /** Target max file size in bytes (default ~1.8 MB — stays under typical 4.5 MB body limits) */
  maxBytes?: number
  minQuality?: number
}

/**
 * Compress a photo for multipart upload while keeping aspect ratio (no crop).
 * Returns a JPEG File ready for FormData.
 */
export async function compressPhotoForUpload(
  file: File,
  options: PhotoUploadCompressionOptions = {}
): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Bitte eine Bilddatei wählen')
  }

  const maxEdge = options.maxEdge ?? 2048
  const maxBytes = options.maxBytes ?? Math.round(1.8 * 1024 * 1024)
  const minQuality = options.minQuality ?? 0.5

  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas context not available')
    ctx.drawImage(bitmap, 0, 0, width, height)

    const encode = (quality: number) =>
      new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
      })

    let quality = 0.85
    let blob = await encode(quality)
    while (blob && blob.size > maxBytes && quality > minQuality) {
      quality = Math.max(minQuality, quality - 0.1)
      blob = await encode(quality)
    }

    // Still too large: shrink dimensions and re-encode from the original bitmap
    let outW = width
    let outH = height
    while (blob && blob.size > maxBytes && Math.max(outW, outH) > 800) {
      outW = Math.max(1, Math.round(outW * 0.8))
      outH = Math.max(1, Math.round(outH * 0.8))
      canvas.width = outW
      canvas.height = outH
      ctx.drawImage(bitmap, 0, 0, outW, outH)
      quality = Math.max(minQuality, 0.75)
      blob = await encode(quality)
    }

    if (!blob) throw new Error('Bild konnte nicht komprimiert werden')

    const baseName = (file.name.replace(/\.[^.]+$/, '') || 'photo').slice(0, 80)
    const out = new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })

    logger.debug('🖼️ Photo upload compression:', {
      original: `${(file.size / 1024).toFixed(0)}KB ${bitmap.width}x${bitmap.height}`,
      compressed: `${(out.size / 1024).toFixed(0)}KB ${canvas.width}x${canvas.height}`,
      quality: quality.toFixed(2),
    })

    return out
  } finally {
    bitmap.close()
  }
}

