/** Canonical Simy marketing brand colors — single source of truth. */
export const SIMY_BRAND = {
  primary: '#6000BD',
  secondary: '#8B2FE8',
  accent: '#BEA3FF',
} as const

export const SIMY_BRAND_STORAGE_KEY = 'simy_brand_preview'

export function hexToRgb(hex: string): string {
  const cleaned = hex.replace('#', '')
  if (cleaned.length !== 6) return '96,0,189'
  const r = parseInt(cleaned.slice(0, 2), 16)
  const g = parseInt(cleaned.slice(2, 4), 16)
  const b = parseInt(cleaned.slice(4, 6), 16)
  if ([r, g, b].some((n) => Number.isNaN(n))) return '96,0,189'
  return `${r},${g},${b}`
}

export function hexToHsl(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '')
  if (cleaned.length !== 6) return [0, 0, 0]
  const r = parseInt(cleaned.slice(0, 2), 16) / 255
  const g = parseInt(cleaned.slice(2, 4), 16) / 255
  const b = parseInt(cleaned.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return [h * 360, s * 100, l * 100]
}

/**
 * CSS filter that shifts the default Simy logo (#6000BD) to a target brand color.
 * Returns `none` when a custom logo is used or the color is already the Simy default.
 */
export function simyLogoColorFilter(
  targetHex: string,
  options: { hasCustomLogo?: boolean } = {},
): string {
  if (options.hasCustomLogo) return 'none'
  const color = (targetHex || SIMY_BRAND.primary).toUpperCase()
  if (color === SIMY_BRAND.primary.toUpperCase()) return 'none'
  const [tH, tS, tL] = hexToHsl(color)
  const [oH, oS, oL] = hexToHsl(SIMY_BRAND.primary)
  const hRot = Math.round(tH - oH)
  const sat = Math.round(oS > 0 ? (tS / oS) * 100 : 100)
  const bri = Math.round(oL > 0 ? (tL / oL) * 100 : 100)
  return `hue-rotate(${hRot}deg) saturate(${sat}%) brightness(${bri}%)`
}

export function applyBrandCssVars(
  primary: string = SIMY_BRAND.primary,
  secondary: string = SIMY_BRAND.secondary,
  accent: string = SIMY_BRAND.accent,
) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--brand-primary', primary)
  root.style.setProperty('--brand-secondary', secondary)
  root.style.setProperty('--brand-accent', accent)
  root.style.setProperty('--brand-rgb', hexToRgb(primary))
  root.style.setProperty('--brand-2-rgb', hexToRgb(secondary))
}
