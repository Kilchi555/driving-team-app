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
    logger.debug('🔥 save-criteria-evaluations API called')
    
    // ✅ 1. AUTHENTIFIZIERUNG
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      logger.error('❌ No authenticated user')
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }
    
    logger.debug('✅ User authenticated:', authUser.id)

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
    
    logger.debug('📝 save-criteria-evaluations input:', { appointment_id, evaluationCount: evaluations?.length })

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
    const { lesson_note } = body
    const lessonNoteText = lesson_note ? String(lesson_note).substring(0, 2000).trim() : ''

    const notesToInsert = evaluations
      .filter((e: any) => {
        // Must have criteria_id
        if (!e.evaluation_criteria_id) return false
        // Must have either rating or notes
        const hasRating = e.rating !== null && e.rating !== undefined
        const hasNotes = e.notes && String(e.notes).trim().length > 0
        return hasRating || hasNotes
      })
      .map((e: any) => ({
        appointment_id,
        evaluation_criteria_id: e.evaluation_criteria_id,
        criteria_rating: e.rating || null,
        criteria_note: String(e.notes || '').substring(0, 5000), // Sanitize
        last_updated_by_user_id: user.id,  // ← REQUIRED: NOT NULL column
        tenant_id: tenantId
      }))

    if (notesToInsert.length === 0) {
      logger.debug('⚠️ No valid evaluations to save (all filtered out)')
      logger.debug('📊 Original evaluations:', JSON.stringify(evaluations.slice(0, 2)))
      return {
        success: true,
        data: []
      }
    }
    
    logger.debug('💾 Saving', notesToInsert.length, 'evaluations:', JSON.stringify(notesToInsert.slice(0, 1)))

    // ✅ 5. UPSERT NOTES
    // Use the column names that form the unique constraint for upsert
    const { data: savedNotes, error: upsertError } = await supabase
      .from('notes')
      .upsert(notesToInsert, {
        onConflict: 'appointment_id,evaluation_criteria_id'  // Column names for the unique constraint
      })
      .select()

    if (upsertError) {
      logger.error('❌ Error upserting notes:', upsertError)
      throw createError({
        statusCode: 500,
        message: 'Failed to save evaluations'
      })
    }

    // ✅ 5b. SAVE LESSON NOTE (staff_note for student) — delete old + insert new
    if (lessonNoteText) {
      // Delete existing lesson-level note for this appointment (no criteria)
      await supabase
        .from('notes')
        .delete()
        .eq('appointment_id', appointment_id)
        .is('evaluation_criteria_id', null)

      const { error: lessonNoteError } = await supabase
        .from('notes')
        .insert({
          appointment_id,
          staff_note: lessonNoteText,
          last_updated_by_user_id: user.id,
          tenant_id: tenantId
        })

      if (lessonNoteError) {
        logger.warn('⚠️ Error saving lesson note:', lessonNoteError)
      } else {
        logger.debug('✅ Lesson note saved for appointment:', appointment_id)
      }
    } else {
      // If lesson_note is empty, remove any existing lesson-level note
      await supabase
        .from('notes')
        .delete()
        .eq('appointment_id', appointment_id)
        .is('evaluation_criteria_id', null)
    }

    // ✅ 6. AUDIT LOGGING
    logger.debug('✅ Criteria evaluations saved:', {
      userId: user.id,
      appointmentId: appointment_id,
      evaluationCount: savedNotes?.length || 0,
      hasLessonNote: !!lessonNoteText
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
