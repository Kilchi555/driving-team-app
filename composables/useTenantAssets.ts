// composables/useTenantAssets.ts
// Manages loading and handling tenant assets (logos, favicons, etc.)

import { useAsyncData } from '#app'
import { logger } from '~/utils/logger'

export interface TenantAsset {
  id: string
  tenant_id: string
  asset_type: 'logo' | 'logo_square' | 'logo_wide' | 'favicon' | 'icon' | 'banner'
  url: string
  format: string
  mime_type: string
  file_size_bytes?: number
}

interface TenantAssetUrls {
  logo: string | null
  logoSquare: string | null
  logoWide: string | null
  favicon: string | null
}

/**
 * Composable to load and manage tenant assets
 * Automatically handles Base64 data URLs and storage URLs
 */
export function useTenantAssets(tenantId?: string) {
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabase?.url || 'https://unyjaetebnaexaflpyoc.supabase.co'
  
  /**
   * Converts relative storage paths to full public URLs
   */
  function toPublicUrl(path: string): string {
    if (!path) return ''
    
    // Already a full URL
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path
    }
    
    // Base64 data URL - return as is
    if (path.startsWith('data:')) {
      return path
    }
    
    // Relative storage path - construct full URL
    if (path.startsWith('/storage/v1/object/public/')) {
      return `${supabaseUrl}${path}`
    }
    
    return path
  }
  
  /**
   * Detect MIME type from file extension or URL
   */
  function detectMimeType(url: string): string {
    if (url.includes('.svg')) return 'image/svg+xml'
    if (url.includes('.webp')) return 'image/webp'
    if (url.includes('.jpg') || url.includes('.jpeg')) return 'image/jpeg'
    if (url.includes('.gif')) return 'image/gif'
    return 'image/png' // default
  }
  
  /**
   * Load tenant assets from the API or database
   */
  async function loadAssets(id: string): Promise<TenantAssetUrls> {
    try {
      logger.debug('Loading tenant assets for:', id)
      
      // Query the vw_tenant_logos view or tenant_assets table
      const { data, error } = await $fetch('/api/tenant/assets', {
        query: { tenantId: id }
      })
      
      if (error) {
        logger.warn('Error loading tenant assets:', error)
        return {
          logo: null,
          logoSquare: null,
          logoWide: null,
          favicon: null
        }
      }
      
      return {
        logo: toPublicUrl(data?.logo_url),
        logoSquare: toPublicUrl(data?.logo_square_url),
        logoWide: toPublicUrl(data?.logo_wide_url),
        favicon: toPublicUrl(data?.favicon_url)
      }
    } catch (err) {
      logger.error('Failed to load tenant assets:', err)
      return {
        logo: null,
        logoSquare: null,
        logoWide: null,
        favicon: null
      }
    }
  }
  
  /**
   * Get the primary logo URL (prefers square, then wide, then generic)
   */
  function getPrimaryLogo(assets: TenantAssetUrls): string | null {
    return assets.logoSquare || assets.logoWide || assets.logo
  }
  
  /**
   * Get logo by type
   */
  function getLogo(assets: TenantAssetUrls, type: 'square' | 'wide' | 'primary' = 'primary'): string | null {
    switch (type) {
      case 'square':
        return assets.logoSquare
      case 'wide':
        return assets.logoWide
      default:
        return getPrimaryLogo(assets)
    }
  }
  
  /**
   * Use async data with automatic refetching
   */
  const { data: assets, pending, error, refresh } = useAsyncData(
    `tenant-assets-${tenantId}`,
    () => tenantId ? loadAssets(tenantId) : Promise.resolve({
      logo: null,
      logoSquare: null,
      logoWide: null,
      favicon: null
    }),
    {
      watch: [tenantId],
      transform: (data) => ({
        ...data,
        primary: getPrimaryLogo(data)
      })
    }
  )
  
  return {
    assets: computed(() => assets.value),
    pending,
    error,
    refresh,
    toPublicUrl,
    detectMimeType,
    getPrimaryLogo,
    getLogo
  }
}
