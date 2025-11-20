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
    console.log('🎨 loadTenantBranding called with slug:', tenantSlug)
    isLoading.value = true
    error.value = null
    
    try {
      if (!tenantSlug) {
        console.error('❌ loadTenantBranding: No slug provided')
        throw new Error('Tenant slug is required')
      }
      
      console.log('🔍 loadTenantBranding: Starting client query for slug:', tenantSlug)

      const { data, error: queryError } = await supabase
        .from('tenants')
        .select(`
          id, name, slug,
          contact_email, contact_phone, address,
          primary_color, secondary_color, accent_color,
          success_color, warning_color, error_color, info_color,
          background_color, surface_color, text_color, text_secondary_color,
          font_family, heading_font_family, font_size_base,
          border_radius, spacing_unit,
          logo_url, logo_square_url, logo_wide_url, logo_dark_url, favicon_url,
          website_url, social_facebook, social_instagram, social_linkedin, social_twitter,
          brand_name, brand_tagline, brand_description, meta_description, meta_keywords,
          custom_css, custom_js, default_theme, allow_theme_switch
        `)
        .eq('is_active', true)
        .eq('slug', tenantSlug)
        .maybeSingle()

      if (!data || queryError) {
        console.warn('⚠️ Tenant not found for slug (client query):', tenantSlug, 'Error:', queryError?.message, '→ trying server API fallback')
        // Fallback to server API (bypasses RLS)
        try {
          console.log('📡 Calling /api/tenants/by-slug with slug:', tenantSlug)
          const serverResp: any = await $fetch(`/api/tenants/by-slug?slug=${tenantSlug}`)
          console.log('✅ Server API response:', serverResp)
          if (serverResp?.success && serverResp.data) {
            console.log('✅ Processing tenant data from server API:', serverResp.data.name)
            await processTenantData(serverResp.data)
            return
          } else {
            console.warn('⚠️ Server API returned invalid response:', serverResp)
          }
        } catch (e: any) {
          console.error('❌ Server API fallback failed:', e.message, e)
        }
        currentTenantBranding.value = null
        error.value = 'Tenant nicht gefunden'
        await applyBrandingStyles()
        return
      }

      await processTenantData(data)

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
      const { data, error: queryError } = await supabase
        .from('tenants')
        .select(`
          id, name, slug,
          contact_email, contact_phone, address,
          primary_color, secondary_color, accent_color,
          success_color, warning_color, error_color, info_color,
          background_color, surface_color, text_color, text_secondary_color,
          font_family, heading_font_family, font_size_base,
          border_radius, spacing_unit,
          logo_url, logo_square_url, logo_wide_url, logo_dark_url, favicon_url,
          website_url, social_facebook, social_instagram, social_linkedin, social_twitter,
          brand_name, brand_tagline, brand_description, meta_description, meta_keywords,
          custom_css, custom_js, default_theme, allow_theme_switch
        `)
        .eq('is_active', true)
        .eq('id', tenantId)
        .maybeSingle()

      console.log('🔍 Raw query result:', { data, queryError })

      if (queryError) throw queryError
      if (!data) {
        console.warn('⚠️ Tenant not found for id:', tenantId)
        error.value = 'Tenant nicht gefunden'
        return
      }

      await processTenantData(data)

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load tenant branding'
      console.error('Error loading tenant branding by ID:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Tenant-Daten verarbeiten (gemeinsame Logik)
  const processTenantData = async (data: any) => {
    console.log('🔍 Processing tenant data from DB:', data)
    console.log('🎨 Raw DB colors:', {
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
    console.log('🔄 updateTenantBranding called with:', { tenantId, updates })
    
    // Debug: Check current user and auth state
    const { data: { user } } = await supabase.auth.getUser()
    console.log('👤 Current user for update:', user)
    console.log('🔑 User metadata:', user?.user_metadata)
    console.log('🏢 User tenant_id:', user?.user_metadata?.tenant_id)
    
    isLoading.value = true
    error.value = null

    try {
      const updateData: any = {}

      if (updates.colors) {
        console.log('🎨 Updating colors:', updates.colors)
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

      console.log('📝 Final updateData to be saved:', updateData)

      // Try update with current client first
      let updateResult, updateError
      
      const updateResponse = await supabase
        .from('tenants')
        .update(updateData)
        .eq('id', tenantId)
        .select()
        
      updateResult = updateResponse.data
      updateError = updateResponse.error
      
      // If no rows updated, try with service role (for admin updates)
      if (!updateError && (!updateResult || updateResult.length === 0)) {
        console.log('🔄 Retrying update with service role...')
        
        try {
          const response = await $fetch('/api/tenants/update-branding', {
            method: 'POST',
            body: {
              tenantId,
              updateData
            }
          })
          
          console.log('🚀 Service role update response:', response)
          updateResult = [response]
          updateError = null
        } catch (serviceError) {
          console.error('❌ Service role update failed:', serviceError)
        }
      }

      console.log('📊 Update result:', { updateResult, updateError })

      if (updateError) {
        console.error('❌ Database update failed:', updateError)
        throw updateError
      }

      if (!updateResult || updateResult.length === 0) {
        console.error('❌ No rows were updated - possible RLS policy issue')
        throw new Error('Update failed - no rows affected. Check RLS policies.')
      }

      console.log('✅ Database update successful, reloading branding...')
      // Branding neu laden
      await loadTenantBrandingById(tenantId)

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update tenant branding'
      console.error('Error updating tenant branding:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Logo für bestimmten Kontext abrufen
  const getLogo = (context: 'header' | 'favicon' | 'square' | 'dark' = 'header') => {
    if (!currentTenantBranding.value) return null

    const logos = currentTenantBranding.value.logos

    switch (context) {
      case 'header':
        return logos.wide || logos.standard
      case 'favicon':
        return logos.favicon || logos.square || logos.standard
      case 'square':
        return logos.square || logos.standard
      case 'dark':
        return logos.dark || logos.wide || logos.standard
      default:
        return logos.standard
    }
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
      console.log('🎨 primaryColor computed:', color, 'from branding:', currentTenantBranding.value?.name)
      return color
    }),
    secondaryColor: computed(() => {
      const color = currentTenantBranding.value?.colors?.secondary || '#64748B'
      console.log('🎨 secondaryColor computed:', color, 'from branding:', currentTenantBranding.value?.name)
      return color
    }),
    accentColor: computed(() => currentTenantBranding.value?.colors?.accent || '#3B82F6'),
  }
}
