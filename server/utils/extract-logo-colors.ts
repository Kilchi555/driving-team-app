import sharp from 'sharp'

export type BrandPalette = [string, string, string]

type Pixel = [number, number, number]

/**
 * Server-side logo palette. Used by every persist path (upload, register, branding)
 * and by /api/brand/extract-colors so previews match what gets stored.
 *
 * Pass 1 keeps saturated mid-tones. Pass 2 keeps any visible ink so grey / black
 * wordmarks still become a usable UI primary instead of silently doing nothing.
 */
export async function extractColorsFromImageBuffer(data: Buffer): Promise<BrandPalette | null> {
  if (!data?.length) return null
  try {
    const { data: raw, info } = await sharp(data)
      .rotate()
      .resize(120, 120, { fit: 'cover' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    let pixels = collectPixels(raw, info.channels, 'vivid')
    if (pixels.length < 10) pixels = collectPixels(raw, info.channels, 'ink')
    if (pixels.length < 10) return null

    return clusterPalette(pixels)
  } catch {
    return null
  }
}

function collectPixels(raw: Buffer, channels: number, mode: 'vivid' | 'ink'): Pixel[] {
  const pixels: Pixel[] = []
  for (let i = 0; i < raw.length; i += channels) {
    const r = raw[i]
    const g = raw[i + 1]
    const b = raw[i + 2]
    const a = channels > 3 ? raw[i + 3] : 255
    if (a < 128) continue
    const lum = (r * 299 + g * 587 + b * 114) / 1000
    if (mode === 'vivid') {
      if (lum > 218 || lum < 22) continue
      if (getSaturation(r, g, b) < 0.08) continue
    } else if (lum > 248) {
      continue
    }
    pixels.push([r, g, b])
  }
  return pixels
}

function clusterPalette(pixels: Pixel[]): BrandPalette {
  const k = 3
  let centroids: Pixel[] = [
    pixels[0],
    pixels[Math.floor(pixels.length / 2)],
    pixels[pixels.length - 1],
  ]

  for (let iter = 0; iter < 12; iter++) {
    const clusters: Pixel[][] = Array.from({ length: k }, () => [])
    for (const px of pixels) {
      let minD = Infinity
      let best = 0
      centroids.forEach((c, i) => {
        const d = colorDistance(px[0], px[1], px[2], c[0], c[1], c[2])
        if (d < minD) {
          minD = d
          best = i
        }
      })
      clusters[best].push(px)
    }
    centroids = clusters.map((cluster, i) => {
      if (cluster.length === 0) return centroids[i]
      const s = cluster.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0])
      return [
        Math.round(s[0] / cluster.length),
        Math.round(s[1] / cluster.length),
        Math.round(s[2] / cluster.length),
      ] as Pixel
    })
  }

  centroids.sort((a, b) => getSaturation(b[0], b[1], b[2]) - getSaturation(a[0], a[1], a[2]))

  return normalizeBrandPalette(
    rgbToHex(centroids[0][0], centroids[0][1], centroids[0][2]),
    rgbToHex(centroids[1][0], centroids[1][1], centroids[1][2]),
    rgbToHex(centroids[2][0], centroids[2][1], centroids[2][2]),
  )
}

function normalizeBrandPalette(c0: string, c1: string, c2: string): BrandPalette {
  const primary = ensureUiContrast(c0, 130)
  let secondary = ensureUiContrast(c1, 110)
  if (hexDistance(primary, secondary) < 35) secondary = scaleHex(primary, 0.72)
  let accentOut = c2
  if (hexDistance(c0, accentOut) < 25) accentOut = c0
  return [primary, secondary, accentOut]
}

function ensureUiContrast(hex: string, maxLum: number): string {
  const [r, g, b] = hexToRgb(hex)
  let f = 1
  while (luminance(r * f, g * f, b * f) > maxLum && f > 0.35) f -= 0.05
  return rgbToHex(Math.round(r * f), Math.round(g * f), Math.round(b * f))
}

function scaleHex(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(Math.round(r * factor), Math.round(g * factor), Math.round(b * factor))
}

function hexToRgb(hex: string): Pixel {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function luminance(r: number, g: number, b: number): number {
  return (r * 299 + g * 587 + b * 114) / 1000
}

function hexDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  return colorDistance(r1, g1, b1, r2, g2, b2)
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`
}

function clamp(n: number): number {
  return Math.max(0, Math.min(255, n))
}

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

function getSaturation(r: number, g: number, b: number): number {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return 0
  const d = max - min
  return d / (l > 0.5 ? 2 - max - min : max + min)
}
