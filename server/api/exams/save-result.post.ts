import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import logger from '~/utils/logger'

/**
 * ✅ POST /api/exams/save-result
 * 
 * Secure API to save exam result and mark appointment as completed
 * 
 * Body:
 *   - appointment_id: string (UUID)
 *   - passed: boolean
 *   - examiner_id: string (UUID, optional)
 *   - examiner_behavior_rating: number (1-6, optional)
 *   - examiner_behavior_notes: string (optional)
 *   - exam_date: string (ISO datetime)
 * 
 * Security Layers:
 *   1. Bearer Token Authentication
 *   2. Tenant Isolation
 *   3. Input Validation
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
    const {
      appointment_id,
      passed,
      examiner_id,
      examiner_behavior_rating,
      examiner_behavior_notes,
      exam_date
    } = body

    if (!appointment_id || typeof appointment_id !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'appointment_id is required and must be a string'
      })
    }

    if (typeof passed !== 'boolean') {
      throw createError({
        statusCode: 400,
        message: 'passed must be a boolean'
      })
    }

    if (examiner_behavior_rating !== null && examiner_behavior_rating !== undefined) {
      if (typeof examiner_behavior_rating !== 'number' || examiner_behavior_rating < 1 || examiner_behavior_rating > 6) {
        throw createError({
          statusCode: 400,
          message: 'examiner_behavior_rating must be a number between 1 and 6'
        })
      }
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

    // ✅ 4. SAVE EXAM RESULT
    const examData = {
      appointment_id,
      examiner_id: examiner_id || null,
      passed,
      examiner_behavior_rating: examiner_behavior_rating || null,
      examiner_behavior_notes: examiner_behavior_notes || null,
      exam_date,
      tenant_id: tenantId
    }

    const { data: examResult, error: insertError } = await supabase
      .from('exam_results')
      .insert(examData)
      .select()
      .single()

    if (insertError) {
      logger.error('❌ Error inserting exam result:', insertError)
      throw createError({
        statusCode: 500,
        message: 'Failed to save exam result'
      })
    }

    // ✅ 5. MARK APPOINTMENT AS COMPLETED
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ status: 'completed' })
      .eq('id', appointment_id)
      .eq('tenant_id', tenantId)

    if (updateError) {
      logger.error('❌ Error updating appointment:', updateError)
      throw createError({
        statusCode: 500,
        message: 'Failed to update appointment'
      })
    }

    logger.debug('✅ Exam result saved and appointment marked as completed:', {
      userId: user.id,
      appointmentId: appointment_id,
      examResultId: examResult.id
    })

    return {
      success: true,
      data: examResult
    }

  } catch (error: any) {
    logger.error('❌ Error in save-exam-result API:', error.message)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to save exam result'
    })
  }
})
