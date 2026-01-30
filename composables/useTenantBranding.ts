// composables/useTenantBranding.ts
import { ref, computed, watch, nextTick } from 'vue'
import { getSupabase } from '~/utils/supabase'

export interface TenantBrandingColors {
  primary: string
  secondary: string
  accent: string
  success: string
  warning: string
  error: string
  info: string
  background: string
  surface: string
  text: string
  textSecondary: string
}

export interface TenantBrandingTypography {
  fontFamily: string
  headingFontFamily: string
  fontSizeBase: number
}

export interface TenantBrandingLayout {
  borderRadius: number
  spacingUnit: number
}

export interface TenantBrandingLogos {
  standard?: string
  square?: string
  wide?: string
  dark?: string
  favicon?: string
}

export interface TenantBrandingSocial {
  website?: string
  facebook?: string
  instagram?: string
  linkedin?: string
  twitter?: string
}

export interface TenantBrandingMeta {
  brandName?: string
  tagline?: string
  description?: string
  metaDescription?: string
  keywords?: string[]
}

export interface TenantBrandingContact {
  email?: string
  phone?: string
  address?: string
}

export interface TenantBranding {
  id: string
  name: string
  slug: string
  colors: TenantBrandingColors
  typography: TenantBrandingTypography
  layout: TenantBrandingLayout
  logos: TenantBrandingLogos
  social: TenantBrandingSocial
  meta: TenantBrandingMeta
  contact: TenantBrandingContact
  customCss?: string
  customJs?: string
  defaultTheme: 'light' | 'dark' | 'auto'
  allowThemeSwitch: boolean
}


const currentTenantBranding = ref<TenantBranding | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

// CSS Custom Properties für dynamische Theming
const cssVariables = computed(() => {
  if (!currentTenantBranding.value) return {}
  
  const branding = currentTenantBranding.value
  return {
    // Farben
    '--color-primary': branding.colors.primary,
    '--color-secondary': branding.colors.secondary,
    '--color-accent': branding.colors.accent,
    '--color-success': branding.colors.success,
    '--color-warning': branding.colors.warning,
    '--color-error': branding.colors.error,
    '--color-info': branding.colors.info,
    '--color-background': branding.colors.background,
    '--color-surface': branding.colors.surface,
    '--color-text': branding.colors.text,
    '--color-text-secondary': branding.colors.textSecondary,
    
    // Typografie
    '--font-family': branding.typography.fontFamily,
    '--font-family-heading': branding.typography.headingFontFamily,
    '--font-size-base': `${branding.typography.fontSizeBase}px`,
    
    // Layout
    '--border-radius': `${branding.layout.borderRadius}px`,
    '--spacing-unit': `${branding.layout.spacingUnit}px`,
    '--spacing-xs': `${branding.layout.spacingUnit * 1}px`,
    '--spacing-sm': `${branding.layout.spacingUnit * 2}px`,
    '--spacing-md': `${branding.layout.spacingUnit * 4}px`,
    '--spacing-lg': `${branding.layout.spacingUnit * 6}px`,
    '--spacing-xl': `${branding.layout.spacingUnit * 8}px`,
    '--spacing-2xl': `${branding.layout.spacingUnit * 12}px`,
  }
})

export const useTenantBranding = () => {
  const supabase = getSupabase()

  // Tenant-Branding laden (by slug)
  const loadTenantBranding = async (tenantSlug?: string) => {
    logger.debug('🎨 loadTenantBranding called with slug:', tenantSlug)
    isLoading.value = true
    error.value = null
    
    try {
      if (!tenantSlug) {
        console.error('❌ loadTenantBranding: No slug provided')
        throw new Error('Tenant slug is required')
      }
      
      logger.debug('🔍 loadTenantBranding: Calling secure API for slug:', tenantSlug)

      // ✅ SECURE API CALL - No direct DB access
      try {
        const response: any = await $fetch('/api/tenants/branding', {
          method: 'GET',
          query: { slug: tenantSlug }
        })

        if (response?.success && response.data) {
          logger.debug('✅ Tenant branding loaded from secure API:', response.data.name)
          await processTenantData(response.data)
          return
        } else {
          console.warn('⚠️ API returned invalid response:', response)
          currentTenantBranding.value = null
          error.value = 'Tenant nicht gefunden'
          await applyBrandingStyles()
          return
        }
      } catch (apiError: any) {
        console.error('❌ Secure API failed:', apiError.message, apiError)
        currentTenantBranding.value = null
        error.value = 'Tenant nicht gefunden'
        await applyBrandingStyles()
      }

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load tenant branding'
      console.error('Error loading tenant branding:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Tenant-Branding laden (by ID)
  const loadTenantBrandingById = async (tenantId: string) => {
    isLoading.value = true
    error.value = null
    
    try {
      logger.debug('🔍 loadTenantBrandingById: Calling secure API for ID:', tenantId)

      // ✅ SECURE API CALL - No direct DB access
      const response: any = await $fetch('/api/tenants/branding', {
        method: 'GET',
        query: { id: tenantId }
      })

      if (!response?.success || !response.data) {
        console.warn('⚠️ Tenant not found for id:', tenantId)
        error.value = 'Tenant nicht gefunden'
        return
      }

      await processTenantData(response.data)

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load tenant branding'
      console.error('Error loading tenant branding by ID:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Tenant-Daten verarbeiten (gemeinsame Logik)
  const processTenantData = async (data: any) => {
    logger.debug('🔍 Processing tenant data from DB:', data)
    logger.debug('🎨 Raw DB colors:', {
      primary_color: data.primary_color,
      secondary_color: data.secondary_color,
      accent_color: data.accent_color
    })
    
    // Daten in TenantBranding-Format konvertieren
    currentTenantBranding.value = {
        id: data.id,
        name: data.name,
        slug: data.slug,
        colors: {
          primary: data.primary_color || '#1E40AF',
          secondary: data.secondary_color || '#64748B',
          accent: data.accent_color || '#3B82F6',
          success: data.success_color || '#10B981',
          warning: data.warning_color || '#F59E0B',
          error: data.error_color || '#EF4444',
          info: data.info_color || '#06B6D4',
          background: data.background_color || '#FFFFFF',
          surface: data.surface_color || '#F8FAFC',
          text: data.text_color || '#1F2937',
          textSecondary: data.text_secondary_color || '#6B7280',
        },
        typography: {
          fontFamily: data.font_family || 'Inter, system-ui, sans-serif',
          headingFontFamily: data.heading_font_family || 'Inter, system-ui, sans-serif',
          fontSizeBase: data.font_size_base || 16,
        },
        layout: {
          borderRadius: data.border_radius || 8,
          spacingUnit: data.spacing_unit || 4,
        },
        logos: {
          standard: data.logo_url,
          square: data.logo_square_url,
          wide: data.logo_wide_url,
          dark: data.logo_dark_url,
          favicon: data.favicon_url,
        },
        social: {
          website: data.website_url,
          facebook: data.social_facebook,
          instagram: data.social_instagram,
          linkedin: data.social_linkedin,
          twitter: data.social_twitter,
        },
        meta: {
          brandName: data.brand_name,
          tagline: data.brand_tagline,
          description: data.brand_description,
          metaDescription: data.meta_description,
          keywords: data.meta_keywords,
        },
        contact: {
          email: data.contact_email,
          phone: data.contact_phone,
          address: data.address,
        },
        customCss: data.custom_css,
        customJs: data.custom_js,
        defaultTheme: data.default_theme || 'light',
        allowThemeSwitch: data.allow_theme_switch ?? true,
      }

    // CSS-Variablen anwenden
    await applyBrandingStyles()
  }


  // CSS-Variablen im DOM anwenden
  const applyBrandingStyles = async () => {
    if (!process.client || !currentTenantBranding.value) return

    await nextTick()

    const root = document.documentElement
    const variables = cssVariables.value

    // CSS Custom Properties setzen
    Object.entries(variables).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })

    // Custom CSS einfügen
    if (currentTenantBranding.value.customCss) {
      let customStyleElement = document.getElementById('tenant-custom-styles')
      
      if (!customStyleElement) {
        customStyleElement = document.createElement('style')
        customStyleElement.id = 'tenant-custom-styles'
        document.head.appendChild(customStyleElement)
      }
      
      customStyleElement.textContent = currentTenantBranding.value.customCss
    }

    // Favicon setzen
    if (currentTenantBranding.value.logos.favicon) {
      let faviconElement = document.querySelector('link[rel="icon"]') as HTMLLinkElement
      
      if (!faviconElement) {
        faviconElement = document.createElement('link')
        faviconElement.rel = 'icon'
        document.head.appendChild(faviconElement)
      }
      
      faviconElement.href = currentTenantBranding.value.logos.favicon
    }
  }


  // Tenant-Branding aktualisieren
  const updateTenantBranding = async (tenantId: string, updates: Partial<TenantBranding>) => {
    logger.debug('🔄 updateTenantBranding called with:', { tenantId, updates })
    
    // Debug: Check current user and auth state
    const { data: { user } } = await supabase.auth.getUser()
    logger.debug('👤 Current user for update:', user)
    logger.debug('🔑 User metadata:', user?.user_metadata)
    logger.debug('🏢 User tenant_id:', user?.user_metadata?.tenant_id)
    
    isLoading.value = true
    error.value = null

    try {
      const updateData: any = {}

      if (updates.colors) {
        logger.debug('🎨 Updating colors:', updates.colors)
        updateData.primary_color = updates.colors.primary
        updateData.secondary_color = updates.colors.secondary
        updateData.accent_color = updates.colors.accent
        updateData.success_color = updates.colors.success
        updateData.warning_color = updates.colors.warning
        updateData.error_color = updates.colors.error
        updateData.info_color = updates.colors.info
        updateData.background_color = updates.colors.background
        updateData.surface_color = updates.colors.surface
        updateData.text_color = updates.colors.text
        updateData.text_secondary_color = updates.colors.textSecondary
      }

      if (updates.typography) {
        updateData.font_family = updates.typography.fontFamily
        updateData.heading_font_family = updates.typography.headingFontFamily
        updateData.font_size_base = updates.typography.fontSizeBase
      }

      if (updates.layout) {
        updateData.border_radius = updates.layout.borderRadius
        updateData.spacing_unit = updates.layout.spacingUnit
      }

      if (updates.logos) {
        updateData.logo_url = updates.logos.standard
        updateData.logo_square_url = updates.logos.square
        updateData.logo_wide_url = updates.logos.wide
        updateData.logo_dark_url = updates.logos.dark
        updateData.favicon_url = updates.logos.favicon
      }

      if (updates.social) {
        updateData.website_url = updates.social.website
        updateData.social_facebook = updates.social.facebook
        updateData.social_instagram = updates.social.instagram
        updateData.social_linkedin = updates.social.linkedin
        updateData.social_twitter = updates.social.twitter
      }

      if (updates.meta) {
        updateData.brand_name = updates.meta.brandName
        updateData.brand_tagline = updates.meta.tagline
        updateData.brand_description = updates.meta.description
        updateData.meta_description = updates.meta.metaDescription
        updateData.meta_keywords = updates.meta.keywords
      }

      if (updates.contact) {
        updateData.contact_email = updates.contact.email
        updateData.contact_phone = updates.contact.phone
        updateData.address = updates.contact.address
      }

      if (updates.customCss !== undefined) {
        updateData.custom_css = updates.customCss
      }

      if (updates.customJs !== undefined) {
        updateData.custom_js = updates.customJs
      }

      if (updates.defaultTheme) {
        updateData.default_theme = updates.defaultTheme
      }

      if (updates.allowThemeSwitch !== undefined) {
        updateData.allow_theme_switch = updates.allowThemeSwitch
      }

      updateData.updated_at = new Date().toISOString()

      logger.debug('📝 Final updateData to be saved:', updateData)

      // ✅ SECURE API CALL - Use new secure branding update API
      const authHeader = await getAuthHeader()
      if (!authHeader) {
        throw new Error('Authentication required for branding updates')
      }

      try {
        const response: any = await $fetch('/api/tenants/branding', {
          method: 'POST',
          headers: {
            Authorization: authHeader
          },
          body: {
            tenantId,
            updateData
          }
        })
        
        logger.debug('🚀 Secure API update response:', response)
        
        if (!response?.success || !response.data) {
          throw new Error('Update failed - no data returned')
        }

        logger.debug('✅ Database update successful via secure API, reloading branding...')
        // Branding neu laden
        await loadTenantBrandingById(tenantId)

      } catch (apiError: any) {
        console.error('❌ Secure API update failed:', apiError)
        throw new Error(apiError.data?.statusMessage || apiError.message || 'Update failed')
      }

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update tenant branding'
      console.error('Error updating tenant branding:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Logo für bestimmten Kontext abrufen
  const getLogo = (context: 'header' | 'favicon' | 'square' | 'dark' = 'header') => {
    if (!currentTenantBranding.value) {
      logger.debug('⚠️ Logo requested before branding loaded, returning null')
      return null
    }

    const logos = currentTenantBranding.value.logos
    
    let logoUrl: string | undefined = undefined
    switch (context) {
      case 'header':
        logoUrl = logos.wide || logos.standard
        break
      case 'favicon':
        logoUrl = logos.favicon || logos.square || logos.standard
        break
      case 'square':
        logoUrl = logos.square || logos.standard
        break
      case 'dark':
        logoUrl = logos.dark || logos.wide || logos.standard
        break
      default:
        logoUrl = logos.standard
    }
    
    logger.debug(`🖼️ getLogo('${context}') called:`, {
      logos,
      selectedUrl: logoUrl
    })
    
    return logoUrl
  }

  // Branding explizit neu laden (für manuelle Aktualisierung)
  const refreshBranding = async () => {
    const tenant = currentTenantBranding.value
    if (tenant) {
      await loadTenantBrandingById(tenant.id)
    }
  }

  // Automatische Branding-Anwendung bei Änderungen
  watch(currentTenantBranding, () => {
    if (process.client) {
      applyBrandingStyles()
    }
  }, { deep: true })

  return {
    // State
    currentTenantBranding: readonly(currentTenantBranding),
    isLoading: readonly(isLoading),
    error: readonly(error),
    cssVariables: readonly(cssVariables),

    // Actions
    loadTenantBranding,
    loadTenantBrandingById,
    updateTenantBranding,
    refreshBranding,
    applyBrandingStyles,
    getLogo,

    // Computed helpers
    brandName: computed(() => 
      currentTenantBranding.value?.meta?.brandName || 
      currentTenantBranding.value?.name || 
      'Driving Team'
    ),
    primaryColor: computed(() => {
      const color = currentTenantBranding.value?.colors?.primary || '#1E40AF'
      logger.debug('🎨 primaryColor computed:', color, 'from branding:', currentTenantBranding.value?.name)
      return color
    }),
    secondaryColor: computed(() => {
      const color = currentTenantBranding.value?.colors?.secondary || '#64748B'
      logger.debug('🎨 secondaryColor computed:', color, 'from branding:', currentTenantBranding.value?.name)
      return color
    }),
    accentColor: computed(() => currentTenantBranding.value?.colors?.accent || '#3B82F6'),
  }
}
