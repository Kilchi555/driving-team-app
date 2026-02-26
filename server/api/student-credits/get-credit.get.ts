import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { user_id } = query

    if (!user_id) {
      throw new Error('Missing required parameter: user_id')
    }

    const supabaseAdmin = getSupabaseAdmin()

    const authUser = await getAuthUserFromRequest(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Authentication required'
      })
    }

    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (profileError || !userProfile) {
      logger.warn('⚠️ Current user profile not found:', { userId: authUser.id, error: profileError })
      return {
        success: true,
        data: null
      }
    }
    
    const isAdmin = ['admin', 'tenant_admin', 'super_admin'].includes(userProfile.role)
    const isOwnCredit = userProfile.id === user_id
    const isStaff = userProfile.role === 'staff'
    
    logger.debug('🔐 Student credit access check:', {
      currentUserId: userProfile.id,
      requestedUserId: user_id,
      userRole: userProfile.role,
      isOwnCredit,
      isAdmin,
      isStaff
    })
    
    if (!isOwnCredit && !isAdmin && !isStaff) {
      throw new Error('Unauthorized to access this student credit')
    }
    
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

    logger.debug('✅ Student credit loaded:', credit?.id || 'none', 'balance:', credit?.balance_rappen)

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
