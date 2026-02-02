import { defineEventHandler, getQuery, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // Get query parameters FIRST
    const query = getQuery(event)
    const { user_id } = query

    if (!user_id) {
      throw new Error('Missing required parameter: user_id')
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Get auth token from headers
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header')
    }

    const token = authHeader.replace('Bearer ', '')

    // Get current user
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !authUser) {
      throw new Error('Unauthorized')
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role')
      .eq('id', authUser.id)
      .single()

    if (profileError || !userProfile) {
      logger.warn('⚠️ Current user profile not found:', { userId: authUser.id, error: profileError })
      // If user profile doesn't exist in users table, they might be in process of being created
      // Return empty credit for now
      return {
        success: true,
        data: null
      }
    }
    
    // Verify access: can only access own credits or if admin
    const isAdmin = ['admin', 'tenant_admin', 'super_admin'].includes(userProfile.role)
    const isOwnCredit = authUser.id === user_id
    const isStaff = userProfile.role === 'staff'
    
    logger.debug('🔐 Student credit access check:', {
      currentUserId: authUser.id,
      requestedUserId: user_id,
      userRole: userProfile.role,
      isOwnCredit,
      isAdmin,
      isStaff
    })
    
    // Access rules:
    // 1. User can access their own credits
    // 2. Admin can access any credits
    // 3. Staff can access their students' credits (same tenant)
    if (!isOwnCredit && !isAdmin && !isStaff) {
      throw new Error('Unauthorized to access this student credit')
    }
    
    // If staff: Verify student is in same tenant
    if (isStaff && !isOwnCredit) {
      const { data: studentProfile } = await supabaseAdmin
        .from('users')
        .select('tenant_id')
        .eq('id', user_id)
        .single()
      
      if (!studentProfile || studentProfile.tenant_id !== userProfile.tenant_id) {
        logger.warn('❌ Student not in staff tenant:', {
          studentTenant: studentProfile?.tenant_id,
          staffTenant: userProfile.tenant_id
        })
        throw new Error('Student not in your tenant')
      }
    }

    // Fetch student credit with tenant isolation
    const { data: credit, error } = await supabaseAdmin
      .from('student_credits')
      .select('*')
      .eq('user_id', user_id)
      .eq('tenant_id', userProfile.tenant_id)
      .maybeSingle()

    if (error) {
      logger.error('❌ Error fetching student credit:', error)
      throw new Error(error.message)
    }

    logger.debug('✅ Student credit loaded:', credit?.id || 'none')

    return {
      success: true,
      data: credit
    }
  } catch (error: any) {
    logger.error('❌ Error in get-credit:', error)
    throw createError({
      statusCode: error.statusCode || 400,
      statusMessage: error.message || 'Failed to fetch student credit'
    })
  }
})
