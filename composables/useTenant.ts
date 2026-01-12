// composables/useTenant.ts
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

interface Tenant {
  id: string
  name: string
  slug: string
  domain?: string
  logo_url?: string
  logo_square_url?: string
  logo_wide_url?: string
  primary_color?: string
  secondary_color?: string
  business_type?: string
  contact_email?: string
  contact_phone?: string
  address?: string
  timezone: string
  currency: string
  language: string
  is_active: boolean
  wallee_space_id?: number
  wallee_user_id?: number
  wallee_secret_key?: string
}

const currentTenant = ref<Tenant | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

export const useTenant = () => {
  
  /**
   * Detektiert Tenant basierend auf URL-Parameter, Subdomain oder Domain
   */
  const detectTenantFromUrl = () => {
    if (process.server) return null
    
    const url = new URL(window.location.href)
    
    // 1. URL Parameter (?tenant=slug)
    const tenantParam = url.searchParams.get('tenant')
    if (tenantParam) {
      logger.debug('🏢 Tenant detected from URL parameter:', tenantParam)
      return tenantParam
    }
    
    // 2. Subdomain (subdomain.domain.com)
    const hostname = url.hostname
    const parts = hostname.split('.')
    if (parts.length >= 3 && parts[0] !== 'www') {
      const subdomain = parts[0]
      logger.debug('🏢 Tenant detected from subdomain:', subdomain)
      return subdomain
    }
    
    // 3. Custom Domain (stored in tenants.domain)
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      logger.debug('🏢 Potential custom domain detected:', hostname)
      return hostname
    }
    
    logger.debug('🏢 No tenant detected from URL, using default')
    return null
  }
  
  /**
   * Lädt Tenant-Daten basierend auf Slug oder Domain
   */
  const loadTenant = async (identifier?: string) => {
    if (!identifier) {
      identifier = detectTenantFromUrl()
    }
    
    if (!identifier) {
      // Kein Fallback - Tenant muss explizit angegeben werden
      logger.debug('🏢 No tenant identifier provided, cannot load tenant')
      throw new Error('Kein Tenant-Identifier angegeben')
    }
    
    isLoading.value = true
    error.value = null
    
    try {
      logger.debug('🏢 Loading tenant via secure API:', identifier)
      
      // Load via secure API (no direct DB query)
      // For domain lookups, we'll use slug as fallback since our API doesn't support domain yet
      const response: any = await $fetch('/api/tenants/branding', {
        params: { slug: identifier }
      })
      
      if (!response?.success || !response.data) {
        console.error('🏢 Tenant not found via API')
        throw new Error(`Tenant '${identifier}' nicht gefunden`)
      }
      
      const data = response.data
      currentTenant.value = data
      logger.debug('🏢 Loaded tenant via API:', data.name, `(${data.slug})`)
      return data
      
    } catch (err: any) {
      console.error('❌ Error loading tenant:', err)
      error.value = err.message
      return null
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * Setzt einen neuen Tenant (für Tenant-Switcher)
   */
  const setTenant = (tenant: Tenant) => {
    currentTenant.value = tenant
    logger.debug('🏢 Tenant set to:', tenant.name)
  }
  
  /**
   * Holt alle verfügbaren Tenants
   * @deprecated Use a secure API endpoint instead (not yet implemented)
   * TODO: Create /api/tenants/list.get.ts for this functionality
   */
  const getAllTenants = async () => {
    console.warn('⚠️ getAllTenants() uses direct DB query - migrate to secure API')
    try {
      const supabase = getSupabase()
      const { data, error: fetchError } = await supabase
        .from('tenants')
        .select('id, name, slug, domain, business_type, is_active')
        .eq('is_active', true)
        .order('name')
      
      if (fetchError) throw fetchError
      return data || []
    } catch (err: any) {
      console.error('❌ Error loading tenants:', err)
      return []
    }
  }
  
  /**
   * Generiert Tenant-spezifische URL
   */
  const getTenantUrl = (path: string = '', tenant?: Tenant) => {
    const activeTenant = tenant || currentTenant.value
    if (!activeTenant) return path
    
    if (process.server) return path
    
    const url = new URL(window.location.origin)
    
    // Wenn Custom Domain vorhanden, nutze diese
    if (activeTenant.domain) {
      url.hostname = activeTenant.domain
      url.pathname = path
      return url.toString()
    }
    
    // Sonst nutze URL Parameter
    url.pathname = path
    url.searchParams.set('tenant', activeTenant.slug)
    return url.toString()
  }
  
  /**
   * Holt das beste verfügbare Logo für einen bestimmten Verwendungszweck
   */
  const getBestLogo = (usage: 'square' | 'wide' = 'wide'): string | null => {
    if (!currentTenant.value) return null
    
    const tenant = currentTenant.value
    
    switch (usage) {
      case 'square':
        return tenant.logo_square_url || tenant.logo_wide_url || tenant.logo_url || null
      case 'wide':
      default:
        return tenant.logo_wide_url || tenant.logo_url || tenant.logo_square_url || null
    }
  }

  // Computed Properties
  const tenantName = computed(() => currentTenant.value?.name || 'Driving Team')
  const tenantSlug = computed(() => currentTenant.value?.slug || 'driving-team')
  const tenantId = computed(() => currentTenant.value?.id || null)
  const tenantLogo = computed(() => getBestLogo('wide')) // Hauptlogo ist jetzt das breite Logo
  const tenantLogoSquare = computed(() => getBestLogo('square'))
  const tenantLogoWide = computed(() => getBestLogo('wide'))
  const tenantPrimaryColor = computed(() => currentTenant.value?.primary_color || '#3B82F6')
  const tenantSecondaryColor = computed(() => currentTenant.value?.secondary_color || '#10B981')
  const tenantBusinessType = computed(() => currentTenant.value?.business_type || 'driving_school')
  
  return {
    // State
    currentTenant: readonly(currentTenant),
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // Computed
    tenantName,
    tenantSlug,
    tenantId,
    tenantLogo,
    tenantLogoSquare,
    tenantLogoWide,
    tenantPrimaryColor,
    tenantSecondaryColor,
    tenantBusinessType,
    
    // Methods
    detectTenantFromUrl,
    loadTenant,
    setTenant,
    getAllTenants,
    getTenantUrl,
    getBestLogo
  }
}
