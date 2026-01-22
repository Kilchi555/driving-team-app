import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'

/**
 * ✅ GET /api/staff/get-last-student-appointment
 * 
 * Secure API to get the last appointment for a student
 * Used for pre-filling category selection based on previous appointments
 * 
 * Query Params:
 *   - student_id (required): Student user ID
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

    if (!studentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Student ID is required'
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
    const { data: appointment, error } = await supabaseAdmin
      .from('appointments')
      .select('id, type, event_type_code, start_time, title')
      .eq('user_id', studentId)
      .eq('tenant_id', tenantId)
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      logger.error('❌ Error fetching last appointment:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch last appointment'
      })
    }

    // ✅ LAYER 5: AUDIT LOGGING
    logger.debug('✅ Last student appointment fetched:', {
      userId: userProfile.id,
      tenantId,
      studentId,
      appointmentId: appointment?.id || null
    })

    return {
      success: true,
      data: appointment // Can be null if no appointments found
    }

  } catch (error: any) {
    logger.error('❌ Staff get-last-student-appointment API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch last appointment'
    })
  }
})

