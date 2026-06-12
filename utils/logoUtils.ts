// utils/logoUtils.ts
// Utility-Funktionen für Logo-Verarbeitung und dynamische Einfärbung

export interface LogoConfig {
  url?: string
  svgContent?: string
  type: 'svg' | 'masked' | 'image' | 'fallback'
  colors: {
    primary: string
    secondary: string
  }
}

/**
 * Erkennt automatisch den Logo-Typ basierend auf URL oder Content
 */
export function detectLogoType(url?: string, svgContent?: string): 'svg' | 'masked' | 'image' | 'fallback' {
  if (svgContent) return 'svg'
  if (url?.endsWith('.svg')) return 'svg'
  if (url?.match(/\.(png|jpg|jpeg|webp)$/i)) return 'masked'
  if (url) return 'image'
  return 'fallback'
}

/**
 * Verarbeitet SVG-Content und ersetzt Farben
 */
export function processSvgColors(svgContent: string, primaryColor: string, secondaryColor: string): string {
  return svgContent
    // Ersetze direkte Farb-Attribute
    .replace(/fill="#[0-9a-fA-F]{6}"/g, `fill="${primaryColor}"`)
    .replace(/stroke="#[0-9a-fA-F]{6}"/g, `stroke="${secondaryColor}"`)
    
    // Ersetze CSS-Variablen
    .replace(/var\(--color-primary\)/g, primaryColor)
    .replace(/var\(--color-secondary\)/g, secondaryColor)
    .replace(/var\(--primary-color\)/g, primaryColor)
    .replace(/var\(--secondary-color\)/g, secondaryColor)
    
    // Ersetze currentColor mit Primärfarbe
    .replace(/fill="currentColor"/g, `fill="${primaryColor}"`)
    .replace(/stroke="currentColor"/g, `stroke="${secondaryColor}"`)
    
    // Ersetze häufige Standard-Farben
    .replace(/fill="#000000?"/g, `fill="${primaryColor}"`)
    .replace(/fill="#ffffff?"/g, `fill="${secondaryColor}"`)
    .replace(/stroke="#000000?"/g, `stroke="${primaryColor}"`)
    .replace(/stroke="#ffffff?"/g, `stroke="${secondaryColor}"`)
}

/**
 * Erstellt CSS für maskierte Logos
 */
export function createMaskedLogoStyles(logoUrl: string, primaryColor: string) {
  return {
    mask: `url('${logoUrl}') no-repeat center / contain`,
    WebkitMask: `url('${logoUrl}') no-repeat center / contain`,
    backgroundColor: primaryColor,
    maskSize: 'contain',
    WebkitMaskSize: 'contain'
  }
}

/**
 * Generiert ein SVG-Logo aus Text (für Fallback)
 */
export function generateTextLogo(
  text: string, 
  primaryColor: string, 
  secondaryColor: string = 'white',
  size: number = 100
): string {
  const fontSize = Math.round(size * 0.4)
  
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="${primaryColor}"/>
      <text 
        x="50%" 
        y="50%" 
        text-anchor="middle" 
        dominant-baseline="central" 
        fill="${secondaryColor}" 
        font-family="system-ui, -apple-system, sans-serif" 
        font-size="${fontSize}" 
        font-weight="bold"
      >
        ${text}
      </text>
    </svg>
  `.trim()
}

/**
 * Lädt ein SVG von einer URL und verarbeitet es
 */
export async function loadAndProcessSvg(url: string, primaryColor: string, secondaryColor: string): Promise<string> {
  try {
    const response = await fetch(url)
    const svgContent = await response.text()
    return processSvgColors(svgContent, primaryColor, secondaryColor)
  } catch (error) {
    console.error('Failed to load SVG:', error)
    throw new Error(`Failed to load SVG from ${url}`)
  }
}

/**
 * Konvertiert ein PNG/JPG Logo zu einem SVG mit Farbüberlagerung
 */
export function convertToColoredSvg(
  imageUrl: string, 
  primaryColor: string, 
  width: number = 100, 
  height: number = 100
): string {
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <mask id="logo-mask">
          <image href="${imageUrl}" width="${width}" height="${height}" />
        </mask>
      </defs>
      <rect width="${width}" height="${height}" fill="${primaryColor}" mask="url(#logo-mask)" />
    </svg>
  `.trim()
}

/**
 * Validiert Hex-Farben
 */
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
}

/**
 * Konvertiert Hex zu RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

/**
 * Berechnet Kontrast zwischen zwei Farben
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)
  
  if (!rgb1 || !rgb2) return 1
  
  const getLuminance = (r: number, g: number, b: number) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }
  
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b)
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b)
  
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  
  return (brightest + 0.05) / (darkest + 0.05)
}

/**
 * Schlägt eine Textfarbe basierend auf Hintergrundfarbe vor
 */
export function suggestTextColor(backgroundColor: string): string {
  const whiteContrast = getContrastRatio(backgroundColor, '#FFFFFF')
  const blackContrast = getContrastRatio(backgroundColor, '#000000')
  
  return whiteContrast > blackContrast ? '#FFFFFF' : '#000000'
}

/**
 * Gibt die Initialen eines Namens zurück:
 * - "Driving Team"   → "DT"
 * - "Müller"         → "MÜ"
 * - ""               → "?"
 */
export function getInitials(name: string): string {
  const words = (name || '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

/**
 * Logo-Konfiguration für verschiedene Kontexte
 */
export const logoContexts = {
  header: { size: 'md', variant: 'wide' },
  sidebar: { size: 'sm', variant: 'square' },
  favicon: { size: 'xs', variant: 'square' },
  login: { size: 'lg', variant: 'standard' },
  footer: { size: 'sm', variant: 'wide' }
} as const

export type LogoContext = keyof typeof logoContexts


/**
 * Extracts the 3 most vibrant colors from a logo image using K-means clustering.
 * Returns [primary, secondary, accent] as hex strings, or null if not enough color data.
 */
export async function extractColorsFromLogo(dataUrl: string): Promise<[string, string, string] | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 120
        canvas.height = 120
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, 120, 120)
        const data = ctx.getImageData(0, 0, 120, 120).data

        const pixels: [number, number, number][] = []
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
          if (a < 128) continue
          const lum = (r * 299 + g * 587 + b * 114) / 1000
          if (lum > 218 || lum < 22) continue
          if (_getSaturation(r, g, b) < 0.08) continue
          pixels.push([r, g, b])
        }

        if (pixels.length < 10) { resolve(null); return }

        const k = 3
        let centroids: [number, number, number][] = [
          pixels[0],
          pixels[Math.floor(pixels.length / 2)],
          pixels[pixels.length - 1],
        ]

        for (let iter = 0; iter < 12; iter++) {
          const clusters: [number, number, number][][] = Array.from({ length: k }, () => [])
          for (const px of pixels) {
            let minD = Infinity, best = 0
            centroids.forEach((c, i) => {
              const d = _colorDistance(px[0], px[1], px[2], c[0], c[1], c[2])
              if (d < minD) { minD = d; best = i }
            })
            clusters[best].push(px)
          }
          centroids = clusters.map((cluster, i) => {
            if (cluster.length === 0) return centroids[i]
            const s = cluster.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0])
            return [Math.round(s[0] / cluster.length), Math.round(s[1] / cluster.length), Math.round(s[2] / cluster.length)] as [number, number, number]
          })
        }

        centroids.sort((a, b) => _getSaturation(b[0], b[1], b[2]) - _getSaturation(a[0], a[1], a[2]))

        resolve([
          _rgbToHex(centroids[0][0], centroids[0][1], centroids[0][2]),
          _rgbToHex(centroids[1][0], centroids[1][1], centroids[1][2]),
          _rgbToHex(centroids[2][0], centroids[2][1], centroids[2][2]),
        ])
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

function _rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}
function _colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}
function _getSaturation(r: number, g: number, b: number): number {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return 0
  const d = max - min
  return d / (l > 0.5 ? 2 - max - min : max + min)
}





















