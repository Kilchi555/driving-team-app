// utils/colors.ts
import { useRuntimeConfig } from '#app'

// Function to get brand primary color from runtime config
export const getBrandPrimary = (): string => {
  const runtimeConfig = useRuntimeConfig()
  return runtimeConfig.public.tenantConfig?.brand_primary_color || '#007BFF' // Default to blue if not set
}

// Function to lighten a hex color
export const lightenColor = (hex: string, percent: number): string => {
  let r = parseInt(hex.slice(1, 3), 16)
  let g = parseInt(hex.slice(3, 5), 16)
  let b = parseInt(hex.slice(5, 7), 16)

  r = Math.min(255, r + Math.floor((255 - r) * percent))
  g = Math.min(255, g + Math.floor((255 - g) * percent))
  b = Math.min(255, b + Math.floor((255 - b) * percent))

  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`
}

// Function to add alpha to a hex color
export const withAlpha = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
