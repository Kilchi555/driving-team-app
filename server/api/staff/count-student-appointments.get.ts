import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'

/**
 * ✅ GET /api/staff/count-student-appointments
 * 
 * Secure API to count active appointments for a student in a category
 * Used for calculating admin fees based on appointment count
 * 
 * Query Params:
 *   - student_id (required): Student user ID
 *   - category_code (required): Category code (e.g., 'B', 'A1')
 * 
 * Security Layers:
 *   1. Bearer Token Authentication
 *   2. Tenant Isolation
 */

export default defineEventHandler(async (event) => {
  try {
    // ✅ LAYER 1: AUTHENTICATION
    const authUser = await getAuthUserFromRequest(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Authentication required'
      })
    }

    // ✅ LAYER 2: Get user profile and tenant
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role, is_active')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userProfile) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User profile not found'
      })
    }

    const tenantId = userProfile.tenant_id

    // ✅ LAYER 3: INPUT VALIDATION
    const query = getQuery(event)
    const studentId = query.student_id as string | undefined
    const categoryCode = query.category_code as string | undefined

    if (!studentId || !categoryCode) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Student ID and category code are required'
      })
    }

    // Validate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(studentId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid student ID format'
      })
    }

    // ✅ LAYER 4: DATABASE QUERY with Tenant Isolation
    const { data: appointments, error } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('user_id', studentId)
      .eq('type', categoryCode)
      .eq('tenant_id', tenantId)
      .neq('status', 'cancelled')
      .neq('status', 'deleted')

    if (error) {
      logger.error('❌ Error counting appointments:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to count appointments'
      })
    }

    const count = appointments?.length || 0

    // ✅ LAYER 5: AUDIT LOGGING
    logger.debug('✅ Student appointments counted:', {
      userId: userProfile.id,
      tenantId,
      studentId,
      categoryCode,
      count
    })

    return {
      success: true,
      data: { count }
    }

  } catch (error: any) {
    logger.error('❌ Staff count-student-appointments API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to count appointments'
    })
  }
})

