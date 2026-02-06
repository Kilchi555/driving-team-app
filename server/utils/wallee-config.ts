import { getSupabase } from '~/utils/supabase'

/**
 * Get Wallee configuration for a specific tenant
 * 
 * Security Model:
 * - API_SECRET always comes from Vercel env vars (WALLEE_SECRET_KEY)
 * - Space ID and User ID can come from DB (they're not sensitive IDs)
 * - Never retrieves secrets from database
 */
export async function getWalleeConfigForTenant(tenantId?: string) {
  // ✅ API Secret ALWAYS from environment (never from DB)
  const apiSecret = process.env.WALLEE_SECRET_KEY
  if (!apiSecret) {
    throw new Error('WALLEE_SECRET_KEY environment variable is required')
  }

  // Default Wallee Space/User (from Vercel env)
  const defaultSpaceId = parseInt(process.env.WALLEE_SPACE_ID || '82592')
  const defaultUserId = parseInt(process.env.WALLEE_APPLICATION_USER_ID || '140525')

  // If no tenant ID provided, return default config
  if (!tenantId) {
    console.log('⚠️ No tenantId provided, using default Wallee config from env')
    return {
      spaceId: defaultSpaceId,
      userId: defaultUserId,
      apiSecret
    }
  }

  try {
    // Create service role client to bypass RLS
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not configured, using default Wallee config')
      return {
        spaceId: defaultSpaceId,
        userId: defaultUserId,
        apiSecret
      }
    }

    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

    // ✅ Load ONLY Space ID and User ID (not secrets!)
    console.log(`🔍 Querying tenants table for tenant ${tenantId}...`)
    const { data: tenant, error } = await serviceSupabase
      .from('tenants')
      .select('id, wallee_space_id, wallee_user_id')
      .eq('id', tenantId)
      .single()

    if (error) {
      console.error(`❌ Database query error for tenant ${tenantId}:`, error)
      return {
        spaceId: defaultSpaceId,
        userId: defaultUserId,
        apiSecret
      }
    }
    
    if (!tenant) {
      console.warn(`⚠️ Tenant ${tenantId} not found`)
      return {
        spaceId: defaultSpaceId,
        userId: defaultUserId,
        apiSecret
      }
    }

    // If tenant has custom Space/User IDs, use them
    const spaceId = tenant.wallee_space_id || defaultSpaceId
    const userId = tenant.wallee_user_id || defaultUserId

    console.log(`✅ Using Wallee config for tenant ${tenantId}:`, {
      spaceId,
      userId,
      secretSource: 'Vercel environment'
    })

    return {
      spaceId,
      userId,
      apiSecret  // ✅ Always from Vercel env
    }

  } catch (error) {
    console.error('❌ Error fetching Wallee config for tenant:', error)
    return {
      spaceId: defaultSpaceId,
      userId: defaultUserId,
      apiSecret
    }
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

