import { defineEventHandler, getQuery, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import logger from '~/utils/logger'

/**
 * ✅ GET /api/staff/get-planned-topics?appointment_id=...
 *
 * Liefert die für einen Termin vorgemerkten Themen ("Fokus für diese Lektion") —
 * das sind `notes`-Zeilen mit gesetztem evaluation_criteria_id, aber
 * (noch) ohne criteria_rating. Bereits bewertete Themen werden bewusst
 * NICHT zurückgegeben — das ist die abgeschlossene Bewertung, kein Vormerk.
 */

export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    const supabase = getSupabaseAdmin()

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !user) {
      throw createError({ statusCode: 401, message: 'User not found' })
    }

    const query = getQuery(event)
    const appointmentId = query.appointment_id as string

    if (!appointmentId) {
      throw createError({ statusCode: 400, message: 'appointment_id is required' })
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, tenant_id')
      .eq('id', appointmentId)
      .eq('tenant_id', user.tenant_id)
      .single()

    if (appointmentError || !appointment) {
      throw createError({ statusCode: 403, message: 'Appointment not found or unauthorized' })
    }

    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select('evaluation_criteria_id, criteria_note')
      .eq('appointment_id', appointmentId)
      .is('criteria_rating', null)
      .not('evaluation_criteria_id', 'is', null)

    if (notesError) {
      logger.error('❌ Error loading planned topics:', notesError)
      throw createError({ statusCode: 500, message: 'Failed to load planned topics' })
    }

    const topics = (notes || []).map((n: any) => ({
      evaluation_criteria_id: n.evaluation_criteria_id,
      note: n.criteria_note || '',
    }))

    return { success: true, data: topics }
  } catch (error: any) {
    logger.error('❌ Error in get-planned-topics API:', error.message)

    if (error.statusCode) {
      throw error
    }

    throw createError({ statusCode: 500, message: error.message || 'Failed to load planned topics' })
  }
})
