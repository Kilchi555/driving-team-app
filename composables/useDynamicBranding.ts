// composables/useDynamicBranding.ts
import { computed, watch } from 'vue'
import { useTenant } from '~/composables/useTenant'

/**
 * Globaler Composable für dynamisches Branding
 * Stellt Logos und Farben für alle Komponenten zur Verfügung
 */
export const useDynamicBranding = () => {
  const {
    currentTenant,
    tenantName,
    tenantLogo,
    tenantLogoSquare,
    tenantLogoWide,
    tenantPrimaryColor,
    tenantSecondaryColor,
    loadTenant
  } = useTenant()

  // Default Fallback-Werte - kein Logo als Fallback
  const DEFAULT_LOGO = null
  const DEFAULT_PRIMARY_COLOR = '#3B82F6'
  const DEFAULT_SECONDARY_COLOR = '#10B981'
  const DEFAULT_NAME = 'Driving Team'

  /**
   * Holt das beste Logo für einen bestimmten Kontext
   */
  const getLogo = (type: 'square' | 'wide' | 'auto' = 'auto') => {
    switch (type) {
      case 'square':
        return tenantLogoSquare.value
      case 'wide':
        return tenantLogoWide.value
      case 'auto':
      default:
        return tenantLogo.value
    }
  }

  /**
   * Generiert CSS-Styles für dynamische Farben
   */
  const getPrimaryColorStyle = (opacity: number = 1) => {
    const color = tenantPrimaryColor.value || DEFAULT_PRIMARY_COLOR
    return opacity === 1 ? color : `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`
  }

  const getSecondaryColorStyle = (opacity: number = 1) => {
    const color = tenantSecondaryColor.value || DEFAULT_SECONDARY_COLOR
    return opacity === 1 ? color : `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`
  }

  /**
   * Generiert Tailwind-kompatible Farb-Klassen
   */
  const getPrimaryColorClasses = () => {
    // Da Tailwind keine dynamischen Farben unterstützt, verwenden wir CSS-Variablen
    return {
      bg: 'bg-primary',
      text: 'text-primary',
      border: 'border-primary',
      hover: {
        bg: 'hover:bg-primary-dark',
        text: 'hover:text-primary-dark',
        border: 'hover:border-primary-dark'
      }
    }
  }

  const getSecondaryColorClasses = () => {
    return {
      bg: 'bg-secondary',
      text: 'text-secondary',
      border: 'border-secondary',
      hover: {
        bg: 'hover:bg-secondary-dark',
        text: 'hover:text-secondary-dark',
        border: 'hover:border-secondary-dark'
      }
    }
  }

  /**
   * Generiert CSS-Variablen für das gesamte Dokument
   */
  const setCSSVariables = () => {
    if (process.client) {
      const root = document.documentElement
      root.style.setProperty('--color-primary', tenantPrimaryColor.value || DEFAULT_PRIMARY_COLOR)
      root.style.setProperty('--color-primary-dark', adjustColor(tenantPrimaryColor.value || DEFAULT_PRIMARY_COLOR, -20))
      root.style.setProperty('--color-secondary', tenantSecondaryColor.value || DEFAULT_SECONDARY_COLOR)
      root.style.setProperty('--color-secondary-dark', adjustColor(tenantSecondaryColor.value || DEFAULT_SECONDARY_COLOR, -20))
    }
  }

  /**
   * Hilfsfunktion: Farbe aufhellen/abdunkeln
   */
  const adjustColor = (color: string, amount: number): string => {
    const usePound = color[0] === '#'
    const col = usePound ? color.slice(1) : color
    const num = parseInt(col, 16)
    
    let r = (num >> 16) + amount
    let g = (num >> 8 & 0x00FF) + amount
    let b = (num & 0x0000FF) + amount
    
    r = r > 255 ? 255 : r < 0 ? 0 : r
    g = g > 255 ? 255 : g < 0 ? 0 : g
    b = b > 255 ? 255 : b < 0 ? 0 : b
    
    return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0')
  }

  /**
   * Lädt Tenant-Daten und setzt CSS-Variablen
   */
  const initializeBranding = async (tenantSlug?: string) => {
    await loadTenant(tenantSlug)
    setCSSVariables()
  }

  // Computed Properties
  const brandingName = computed(() => tenantName.value || DEFAULT_NAME)
  const brandingPrimaryColor = computed(() => tenantPrimaryColor.value || DEFAULT_PRIMARY_COLOR)
  const brandingSecondaryColor = computed(() => tenantSecondaryColor.value || DEFAULT_SECONDARY_COLOR)
  const brandingLogo = computed(() => getLogo('auto'))
  const brandingLogoSquare = computed(() => getLogo('square'))
  const brandingLogoWide = computed(() => getLogo('wide'))

  // Watch für Änderungen der Tenant-Farben
  watch([tenantPrimaryColor, tenantSecondaryColor], () => {
    setCSSVariables()
  }, { immediate: true })

  return {
    // State
    currentTenant,
    
    // Computed
    brandingName,
    brandingPrimaryColor,
    brandingSecondaryColor,
    brandingLogo,
    brandingLogoSquare,
    brandingLogoWide,
    
    // Methods
    getLogo,
    getPrimaryColorStyle,
    getSecondaryColorStyle,
    getPrimaryColorClasses,
    getSecondaryColorClasses,
    setCSSVariables,
    initializeBranding,
    
    // Utility
    adjustColor
  }
}
