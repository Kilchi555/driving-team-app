import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import logger from '~/utils/logger'

/**
 * ✅ POST /api/staff/batch-update-appointment-status
 * 
 * Secure API to batch update appointment statuses
 * 
 * Body:
 *   - appointment_ids: Array<string> (UUIDs)
 *   - status: string (one of: pending, scheduled, in_progress, completed, overdue, cancelled, evaluated)
 * 
 * Security Layers:
 *   1. Bearer Token Authentication
 *   2. Tenant Isolation
 *   3. Input Validation
 *   4. Status whitelist validation
 *   5. Audit Logging
 *   6. Rate limiting consideration
 */

const ALLOWED_STATUSES = ['pending', 'scheduled', 'in_progress', 'completed', 'overdue', 'cancelled', 'evaluated']
const MAX_BATCH_SIZE = 100

export default defineEventHandler(async (event) => {
  try {
    // ✅ 1. AUTHENTIFIZIERUNG
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    const supabase = getSupabaseAdmin()

    // Get user from users table to get tenant_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !user) {
      throw createError({ statusCode: 401, message: 'User not found' })
    }

    const tenantId = user.tenant_id

    // ✅ 2. INPUT VALIDATION
    const body = await readBody(event)
    const { appointment_ids, status } = body

    if (!Array.isArray(appointment_ids) || appointment_ids.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'appointment_ids must be a non-empty array'
      })
    }

    if (appointment_ids.length > MAX_BATCH_SIZE) {
      throw createError({
        statusCode: 400,
        message: `Maximum ${MAX_BATCH_SIZE} appointments per batch`
      })
    }

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      throw createError({
        statusCode: 400,
        message: `status must be one of: ${ALLOWED_STATUSES.join(', ')}`
      })
    }

    // ✅ 3. VERIFY ALL APPOINTMENTS BELONG TO TENANT
    const { data: appointments, error: checkError } = await supabase
      .from('appointments')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('id', appointment_ids)

    if (checkError) {
      logger.error('❌ Error checking appointments:', checkError)
      throw createError({
        statusCode: 500,
        message: 'Failed to verify appointments'
      })
    }

    if (!appointments || appointments.length !== appointment_ids.length) {
      logger.error('❌ Some appointments not found or unauthorized:', {
        requested: appointment_ids.length,
        found: appointments?.length || 0
      })
      throw createError({
        statusCode: 403,
        message: 'Some appointments not found or unauthorized'
      })
    }

    // ✅ 4. UPDATE APPOINTMENTS
    const { data: updated, error: updateError } = await supabase
      .from('appointments')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .in('id', appointment_ids)
      .select()

    if (updateError) {
      logger.error('❌ Error updating appointments:', updateError)
      throw createError({
        statusCode: 500,
        message: 'Failed to update appointments'
      })
    }

    // ✅ 5. AUDIT LOGGING
    logger.debug('✅ Batch appointment status updated:', {
      userId: user.id,
      tenantId,
      count: updated?.length || 0,
      newStatus: status
    })

    return {
      success: true,
      data: updated || [],
      message: `Updated ${updated?.length || 0} appointments to status: ${status}`
    }

  } catch (error: any) {
    logger.error('❌ Error in batch-update-appointment-status API:', error.message)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to update appointments'
    })
  }
})
