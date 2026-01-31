import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import logger from '~/utils/logger'

/**
 * ✅ POST /api/staff/save-criteria-evaluations
 * 
 * Secure API to save criteria evaluations (notes)
 * 
 * Body:
 *   - appointment_id: string (UUID)
 *   - evaluations: Array<{
 *       evaluation_criteria_id: string (UUID),
 *       notes: string (optional)
 *     }>
 * 
 * Security Layers:
 *   1. Bearer Token Authentication
 *   2. Tenant Isolation
 *   3. Input Validation
 *   4. Audit Logging
 */

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
    const { appointment_id, evaluations } = body

    if (!appointment_id || typeof appointment_id !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'appointment_id is required and must be a string'
      })
    }

    if (!Array.isArray(evaluations)) {
      throw createError({
        statusCode: 400,
        message: 'evaluations must be an array'
      })
    }

    // ✅ 3. VERIFY APPOINTMENT BELONGS TO TENANT
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, tenant_id')
      .eq('id', appointment_id)
      .eq('tenant_id', tenantId)
      .single()

    if (appointmentError || !appointment) {
      logger.error('❌ Appointment not found or unauthorized:', { appointment_id, tenantId })
      throw createError({
        statusCode: 403,
        message: 'Appointment not found or unauthorized'
      })
    }

    // ✅ 4. PREPARE NOTES FOR UPSERT
    const notesToInsert = evaluations
      .filter((e: any) => e.evaluation_criteria_id && e.notes)
      .map((e: any) => ({
        appointment_id,
        evaluation_criteria_id: e.evaluation_criteria_id,
        notes: String(e.notes).substring(0, 5000), // Sanitize
        tenant_id: tenantId
      }))

    if (notesToInsert.length === 0) {
      logger.debug('⚠️ No valid evaluations to save')
      return {
        success: true,
        data: []
      }
    }

    // ✅ 5. UPSERT NOTES
    const { data: savedNotes, error: upsertError } = await supabase
      .from('notes')
      .upsert(notesToInsert, {
        onConflict: 'appointment_id,evaluation_criteria_id'
      })
      .select()

    if (upsertError) {
      logger.error('❌ Error upserting notes:', upsertError)
      throw createError({
        statusCode: 500,
        message: 'Failed to save evaluations'
      })
    }

    // ✅ 6. AUDIT LOGGING
    logger.debug('✅ Criteria evaluations saved:', {
      userId: user.id,
      appointmentId: appointment_id,
      evaluationCount: savedNotes?.length || 0
    })

    return {
      success: true,
      data: savedNotes || []
    }

  } catch (error: any) {
    logger.error('❌ Error in save-criteria-evaluations API:', error.message)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to save evaluations'
    })
  }
})
