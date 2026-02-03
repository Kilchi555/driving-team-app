import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import logger from '~/utils/logger'

/**
 * ✅ POST /api/examiners/create
 * 
 * Secure API to create a new examiner for the current tenant
 * 
 * Security Layers:
 *   1. Bearer Token Authentication
 *   2. Role-based Authorization (staff, admin, tenant_admin)
 *   3. Tenant Isolation
 *   4. Server-side validation
 */

interface CreateExaminerRequest {
  first_name: string
  last_name: string
}

export default defineEventHandler(async (event) => {
  try {
    // ✅ 1. AUTHENTIFIZIERUNG
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    // ✅ 2. AUTHORIZATION - Check user role and tenant
    const supabase = getSupabaseAdmin()

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !user) {
      throw createError({ statusCode: 401, message: 'User not found' })
    }

    // Only staff, admin, and tenant_admin can create examiners
    if (!['staff', 'admin', 'tenant_admin'].includes(user.role)) {
      throw createError({
        statusCode: 403,
        message: 'You do not have permission to create examiners'
      })
    }

    // ✅ 3. VALIDATE REQUEST BODY
    const body = await readBody<CreateExaminerRequest>(event)

    if (!body.last_name || !body.last_name.trim()) {
      throw createError({
        statusCode: 400,
        message: 'Last name is required'
      })
    }

    // ✅ 4. CREATE EXAMINER
    const { data: newExaminer, error: dbError } = await supabase
      .from('examiners')
      .insert({
        first_name: body.first_name?.trim() || '',
        last_name: body.last_name.trim(),
        is_active: true,
        tenant_id: user.tenant_id
      })
      .select()
      .single()

    if (dbError) {
      logger.error('❌ Error creating examiner:', dbError)
      throw createError({
        statusCode: 500,
        message: 'Failed to create examiner'
      })
    }

    logger.debug('✅ Examiner created:', {
      examinerId: newExaminer.id,
      tenantId: user.tenant_id,
      userId: user.id
    })

    return {
      success: true,
      data: newExaminer
    }

  } catch (error: any) {
    logger.error('❌ Error in create-examiner API:', error.message)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to create examiner'
    })
  }
})
