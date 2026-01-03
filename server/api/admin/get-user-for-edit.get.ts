/**
 * Admin API: Get User for Editing
 * Allows staff/admin to fetch user data for editing
 * 
 * Security:
 * ✅ Layer 1: Authentication (JWT)
 * ✅ Layer 4: Authorization (admin/staff role)
 * ✅ Layer 4: Ownership (must be same tenant)
 * ✅ Layer 7: Error Handling
 */

import { getSupabaseAdmin } from '~/utils/supabase'
import { getClientIP } from '~/server/utils/ip-utils'
import { logAudit } from '~/server/utils/audit'

export default defineEventHandler(async (event) => {
  try {
    // Layer 1: Authentication
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader) {
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw createError({ statusCode: 500, statusMessage: 'Configuration error' })
    }

    // Create Supabase client with user's token to verify auth
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUser = createClient(supabaseUrl, process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || '')
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token)
    
    if (authError || !user) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
    }

    // Get query parameter
    const userId = getQuery(event).user_id as string
    if (!userId) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'Missing required query parameter: user_id' 
      })
    }

    // Use admin client to bypass RLS
    const supabase = getSupabaseAdmin()

    // Get requesting user's profile (to check role and tenant)
    const { data: requestingUser, error: reqUserError } = await supabase
      .from('users')
      .select('id, role, tenant_id, auth_user_id')
      .eq('auth_user_id', user.id)
      .single()

    if (reqUserError || !requestingUser) {
      throw createError({ statusCode: 403, statusMessage: 'User profile not found' })
    }

    // Layer 4: Authorization - Only admin/staff
    if (!['admin', 'staff', 'super_admin'].includes(requestingUser.role)) {
      throw createError({ statusCode: 403, statusMessage: 'Insufficient permissions' })
    }

    // Layer 4: Ownership - User must be in same tenant
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, birthdate, faberid, tenant_id, preferred_payment_method, role')
      .eq('id', userId)
      .eq('tenant_id', requestingUser.tenant_id)
      .single()

    if (targetError || !targetUser) {
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }

    // Audit logging
    await logAudit({
      user_id: requestingUser.id,
      action: 'admin_load_user_for_edit',
      resource_type: 'user',
      resource_id: userId,
      status: 'success',
      ip_address: getClientIP(event),
    })

    return {
      success: true,
      user: targetUser
    }

  } catch (error: any) {
    console.error('Error fetching user for edit:', error)
    
    if (error.statusCode && error.statusMessage) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch user'
    })
  }
})

