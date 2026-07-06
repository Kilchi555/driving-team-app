/**
 * GET /api/staff/get-team-members
 * 
 * Get all active staff members for the current user's tenant
 * Used by StaffSelector component
 * 
 * @requires Authentication
 * @returns {Array<Staff>} List of staff members with id, first_name, last_name, email, role, is_active
 */

import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  try {
    // ✅ 1. AUTHENTICATION — use shared auth utility (same as all other endpoints)
    const authUser = await getAuthenticatedUser(event)
    if (!authUser?.id) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    const supabase = getSupabaseAdmin()

    // ✅ 2. GET USER'S TENANT
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', authUser.id)
      .maybeSingle()

    if (profileError || !userProfile?.tenant_id) {
      throw createError({ statusCode: 403, message: 'User has no tenant assigned' })
    }

    const tenantId = userProfile.tenant_id

    // ✅ 4. QUERY PARAMS (optional)
    const query = getQuery(event)
    const excludeUserId = query.excludeUserId as string | undefined

    // ✅ 5. GET STAFF MEMBERS
    let staffQuery = supabase
      .from('users')
      .select('id, first_name, last_name, email, role, is_active')
      .eq('role', 'staff')
      .eq('is_active', true)
      .eq('tenant_id', tenantId)
      .order('first_name')

    // Exclude specific user if provided
    if (excludeUserId) {
      staffQuery = staffQuery.neq('id', excludeUserId)
    }

    const { data: staff, error: staffError } = await staffQuery

    if (staffError) {
      console.error('❌ Error loading staff:', staffError)
      throw createError({
        statusCode: 500,
        message: 'Failed to load staff members'
      })
    }

    // ✅ 6. RETURN STAFF LIST
    return {
      staff: staff || [],
      count: staff?.length || 0
    }

  } catch (err: any) {
    console.error('❌ Error in get-team-members API:', err)
    
    // Return error response
    if (err.statusCode) {
      throw err
    }
    
    throw createError({
      statusCode: 500,
      message: err.message || 'Internal server error'
    })
  }
})

