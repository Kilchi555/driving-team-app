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













