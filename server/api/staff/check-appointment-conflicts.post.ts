import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'

/**
 * ✅ POST /api/staff/check-appointment-conflicts
 * 
 * Secure API to check for appointment time conflicts
 * 
 * Body:
 *   - start_time (required): ISO datetime string
 *   - end_time (required): ISO datetime string
 *   - staff_id (required): Staff member ID
 *   - exclude_appointment_id (optional): Appointment ID to exclude (for edit mode)
 * 
 * Returns:
 *   - has_conflict: boolean
 *   - conflicts: array of conflicting appointments
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

    if (!userProfile.is_active) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User account is inactive'
      })
    }

    const tenantId = userProfile.tenant_id

    // ✅ LAYER 3: INPUT VALIDATION
    const body = await readBody(event)
    const startTime = body.start_time
    const endTime = body.end_time
    const staffId = body.staff_id
    const excludeAppointmentId = body.exclude_appointment_id || null

    if (!startTime || !endTime || !staffId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'start_time, end_time, and staff_id are required'
      })
    }

    // Validate datetime format (ISO 8601)
    const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
    if (!dateRegex.test(startTime) || !dateRegex.test(endTime)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid datetime format. Use ISO 8601 format'
      })
    }

    // Validate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(staffId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid staff ID format'
      })
    }

    if (excludeAppointmentId && !uuidRegex.test(excludeAppointmentId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid exclude appointment ID format'
      })
    }

    // ✅ LAYER 4: Check for conflicts
    // Find appointments that overlap with the given time range
    let query = supabaseAdmin
      .from('appointments')
      .select('id, start_time, end_time, title, user_id, users(first_name, last_name)')
      .eq('tenant_id', tenantId)
      .eq('staff_id', staffId)
      .is('deleted_at', null)
      .neq('status', 'cancelled')
      // Check for overlap: (start < end_time AND end > start_time)
      .lt('start_time', endTime)
      .gt('end_time', startTime)

    // Exclude current appointment if editing
    if (excludeAppointmentId) {
      query = query.neq('id', excludeAppointmentId)
    }

    const { data: conflicts, error } = await query

    if (error) {
      logger.error('❌ Error checking conflicts:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to check appointment conflicts'
      })
    }

    const hasConflict = conflicts && conflicts.length > 0

    // ✅ LAYER 5: AUDIT LOGGING
    logger.debug('✅ Conflict check completed:', {
      userId: userProfile.id,
      tenantId: tenantId,
      staffId: staffId,
      hasConflict,
      conflictCount: conflicts?.length || 0
    })

    return {
      success: true,
      has_conflict: hasConflict,
      conflicts: conflicts || [],
      checked_range: {
        start: startTime,
        end: endTime
      }
    }

  } catch (error: any) {
    logger.error('❌ Staff check-appointment-conflicts API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to check appointment conflicts'
    })
  }
})

