// server/api/addresses/get-by-user.get.ts
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getHeader } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { user_id } = query
    
    if (!user_id) {
      throw new Error('user_id is required')
    }
    
    logger.debug('🏢 Getting billing address for user:', user_id)
    
    const supabaseAdmin = getSupabaseAdmin()
    const authorization = getHeader(event, 'authorization')
    const token = authorization?.replace('Bearer ', '')
    
    if (!token) {
      throw new Error('No authorization token')
    }
    
    // Get current user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Unauthorized')
    }
    
    // Get user's tenant_id
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('tenant_id')
      .eq('id', user_id)
      .single()
    
    if (!userData?.tenant_id) {
      throw new Error('User tenant not found')
    }
    
    // Verify user has access to this user (same tenant or is admin)
    const { data: currentUserData } = await supabaseAdmin
      .from('users')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single()
    
    const isAdmin = ['admin', 'tenant_admin', 'super_admin'].includes(currentUserData?.role)
    
    logger.debug('🔐 Access control check:', {
      currentUserId: user.id,
      currentUserTenant: currentUserData?.tenant_id,
      currentUserRole: currentUserData?.role,
      targetUserId: user_id,
      targetUserTenant: userData?.tenant_id,
      isAdmin,
      sameTenantt: currentUserData?.tenant_id === userData?.tenant_id
    })
    
    if (currentUserData?.tenant_id !== userData.tenant_id && !isAdmin) {
      logger.warn('❌ Access denied - tenant mismatch:', {
        currentUserTenant: currentUserData?.tenant_id,
        targetUserTenant: userData?.tenant_id
      })
      throw new Error('Unauthorized to access this user')
    }
    
    // Get billing addresses
    const { data: addresses, error } = await supabaseAdmin
      .from('company_billing_addresses')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (error) {
      logger.error('❌ Error fetching billing addresses:', error)
      throw new Error(error.message)
    }
    
    const address = addresses && addresses.length > 0 ? addresses[0] : null
    
    logger.debug('✅ Billing address loaded:', address?.id || 'none')
    
    return {
      success: true,
      data: address
    }
    
  } catch (error: any) {
    logger.error('❌ Error in get-by-user:', error)
    throw createError({
      statusCode: 400,
      statusMessage: error.message || 'Failed to get billing address'
    })
  }
})
