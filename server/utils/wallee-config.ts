import { getSupabase } from '~/utils/supabase'

/**
 * Get Wallee configuration for a specific tenant
 * Each tenant can have its own Space ID for Wallee sub-accounts
 */
export async function getWalleeConfigForTenant(tenantId?: string) {
  // Default: Use environment variables (for backwards compatibility and default space)
  const defaultConfig = {
    spaceId: parseInt(process.env.WALLEE_SPACE_ID || '82592'),
    userId: parseInt(process.env.WALLEE_APPLICATION_USER_ID || '140525'),
    apiSecret: process.env.WALLEE_SECRET_KEY || (() => { throw new Error('WALLEE_SECRET_KEY is required') })()
  }

  // If no tenant ID provided, return default
  if (!tenantId) {
    console.log('ℹ️ No tenantId provided, using default Wallee config from env')
    return defaultConfig
  }

  try {
    // Create service role client to bypass RLS
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not configured, using default Wallee config')
      return defaultConfig
    }

    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Fetch Wallee config for this tenant
    console.log(`🔍 Querying tenants table for tenant ${tenantId}...`)
    const { data: tenant, error } = await serviceSupabase
      .from('tenants')
      .select('id, wallee_space_id, wallee_user_id, wallee_secret_key')
      .eq('id', tenantId)
      .single()

    if (error) {
      console.error(`❌ Database query error for tenant ${tenantId}:`, error)
      return defaultConfig
    }
    
    if (!tenant) {
      console.warn(`⚠️ Tenant ${tenantId} not found`)
      return defaultConfig
    }

    console.log(`🔍 Tenant data fetched:`, {
      id: tenant.id,
      hasSpaceId: !!tenant.wallee_space_id,
      hasUserId: !!tenant.wallee_user_id,
      hasSecretKey: !!tenant.wallee_secret_key
    })

    // If tenant has custom Wallee config, use it
    if (tenant.wallee_space_id && tenant.wallee_user_id && tenant.wallee_secret_key) {
      console.log(`✅ Using tenant-specific Wallee config for tenant ${tenantId}:`, {
        spaceId: tenant.wallee_space_id,
        userId: tenant.wallee_user_id
      })
      return {
        spaceId: tenant.wallee_space_id,
        userId: tenant.wallee_user_id,
        apiSecret: tenant.wallee_secret_key
      }
    }

    // Otherwise fall back to default
    console.warn(`⚠️ Tenant ${tenantId} has incomplete Wallee config, using default:`, {
      spaceId: !!tenant.wallee_space_id,
      userId: !!tenant.wallee_user_id,
      secretKey: !!tenant.wallee_secret_key
    })
    return defaultConfig

  } catch (error) {
    console.error('❌ Error fetching Wallee config for tenant:', error)
    return defaultConfig
  }
}

/**
 * Get SDK config object for Wallee
 */
export function getWalleeSDKConfig(spaceId: number, userId: number, apiSecret: string) {
  return {
    space_id: spaceId,
    user_id: userId,
    api_secret: apiSecret
  }
}

