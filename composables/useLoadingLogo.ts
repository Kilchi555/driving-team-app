// composables/useLoadingLogo.ts
// Globales Loading-Logo-System mit Tenant-Logo-Cache

import { ref, computed, watch } from 'vue'

interface CachedLogo {
  url: string
  timestamp: number
  tenantId: string
}

export const useLoadingLogo = () => {
  
  // State
  const currentLogo = ref<string | null>(null)
  const isLoadingLogo = ref(false)
  const logoError = ref<string | null>(null)
  const logoCache = ref<Map<string, CachedLogo>>(new Map())
  
  // Cache duration: 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000
  
  // No fallback logo - let the component handle missing logos
  const fallbackLogo = null
  
  // Check if cached logo is still valid
  const isCacheValid = (cached: CachedLogo): boolean => {
    return (Date.now() - cached.timestamp) < CACHE_DURATION
  }
  
  // Get tenant logo from cache or database (synchronous when cached)
  const getTenantLogo = async (tenantId?: string): Promise<string | null> => {
    if (!tenantId) {
      logger.debug('🖼️ No tenant ID provided, no logo available')
      return null
    }
    
    // Check cache first - return immediately if valid
    const cached = logoCache.value.get(tenantId)
    if (cached && isCacheValid(cached)) {
      logger.debug('✅ Using cached logo for tenant:', tenantId)
      return cached.url
    }
    
    try {
      isLoadingLogo.value = true
      logoError.value = null
      
      logger.debug('🔄 Loading tenant logo via secure API for:', tenantId)
      
      // Load via secure API (no direct DB query)
      const response: any = await $fetch('/api/tenants/branding', {
        params: { id: tenantId }
      })
      
      if (!response?.success || !response.data) {
        console.error('❌ Error loading tenant logo from API')
        return null
      }
      
      const data = response.data
      
      // Prefer square logo, then wide, then standard
      const logoUrl = data.logo_square_url || data.logo_wide_url || data.logo_url || null
      
      // Cache the result
      logoCache.value.set(tenantId, {
        url: logoUrl,
        timestamp: Date.now(),
        tenantId
      })
      
      logger.debug('✅ Tenant logo loaded via API and cached:', data.name, logoUrl)
      
      // Preload the image to avoid flash
      if (process.client && logoUrl) {
        preloadLogo(logoUrl)
      }
      
      return logoUrl
      
    } catch (err) {
      console.error('❌ Unexpected error loading tenant logo:', err)
      logoError.value = err instanceof Error ? err.message : 'Failed to load logo'
      return null
    } finally {
      isLoadingLogo.value = false
    }
  }

  // Get tenant logo by slug (with fallback to server API)
  const getTenantLogoBySlug = async (tenantSlug?: string): Promise<string | null> => {
    if (!tenantSlug) {
      logger.debug('🖼️ No tenant slug provided, no logo available')
      return null
    }
    
    try {
      isLoadingLogo.value = true
      logoError.value = null
      
      logger.debug('🔄 Loading tenant logo by slug via secure API:', tenantSlug)
      
      // Load via secure API (no direct DB query)
      const response: any = await $fetch('/api/tenants/branding', {
        params: { slug: tenantSlug }
      })
      
      if (!response?.success || !response.data) {
        console.warn('⚠️ Tenant not found for slug:', tenantSlug)
        return null
      }
      
      const data = response.data
      
      // Prefer square logo, then wide, then standard
      const logoUrl = data.logo_square_url || data.logo_wide_url || data.logo_url || null
      
      // Cache the result using the tenant ID
      if (data.id) {
        logoCache.value.set(data.id, {
          url: logoUrl,
          timestamp: Date.now(),
          tenantId: data.id
        })
      }
      
      logger.debug('✅ Tenant logo loaded via API and cached:', data.name, logoUrl)
      
      // Preload the image to avoid flash
      if (process.client && logoUrl) {
        preloadLogo(logoUrl)
      }
      
      return logoUrl
      
    } catch (err) {
      console.error('❌ Unexpected error loading tenant logo by slug:', err)
      logoError.value = err instanceof Error ? err.message : 'Failed to load logo'
      return null
    } finally {
      isLoadingLogo.value = false
    }
  }
  
  // Load logo for current user's tenant
  const loadCurrentTenantLogo = async (): Promise<string | null> => {
    try {
      // Get current user's tenant_id via secure API
      const authStore = useAuthStore()
      const tenantId = authStore.user?.tenant_id
      
      if (!tenantId) {
        logger.debug('🖼️ No tenant_id found for user, no logo available')
        return null
      }
      
      const logoUrl = await getTenantLogo(tenantId)
      currentLogo.value = logoUrl
      return logoUrl
      
    } catch (err) {
      console.error('❌ Error loading current tenant logo:', err)
      return null
    }
  }
  
  // Preload logo for faster loading
  const preloadLogo = (logoUrl: string) => {
    if (!process.client) return
    
    const img = new Image()
    img.onload = () => {
      logger.debug('✅ Logo preloaded:', logoUrl)
    }
    img.onerror = () => {
      console.warn('⚠️ Failed to preload logo:', logoUrl)
    }
    img.src = logoUrl
  }
  
  // Clear cache (useful for testing or after logo updates)
  const clearLogoCache = () => {
    logoCache.value.clear()
    logger.debug('🗑️ Logo cache cleared')
  }
  
  // Clear expired cache entries
  const clearExpiredCache = () => {
    const now = Date.now()
    for (const [tenantId, cached] of logoCache.value.entries()) {
      if (!isCacheValid(cached)) {
        logoCache.value.delete(tenantId)
        logger.debug('🗑️ Expired logo cache removed for tenant:', tenantId)
      }
    }
  }
  
  // Auto-cleanup expired cache every 5 minutes
  if (process.client) {
    setInterval(clearExpiredCache, 5 * 60 * 1000)
  }
  
  // Computed
  const effectiveLogo = computed(() => currentLogo.value)
  const hasCustomLogo = computed(() => !!currentLogo.value)
  const cacheSize = computed(() => logoCache.value.size)
  
  return {
    // State
    currentLogo: readonly(currentLogo),
    isLoadingLogo: readonly(isLoadingLogo),
    logoError: readonly(logoError),
    logoCache: readonly(logoCache),
    
    // Computed
    effectiveLogo,
    hasCustomLogo,
    cacheSize,
    
    // Methods
    getTenantLogo,
    getTenantLogoBySlug,
    loadCurrentTenantLogo,
    preloadLogo,
    clearLogoCache,
    clearExpiredCache
  }
}
