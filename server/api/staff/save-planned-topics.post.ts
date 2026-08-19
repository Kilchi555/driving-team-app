import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import logger from '~/utils/logger'

/**
 * ✅ POST /api/staff/save-planned-topics
 *
 * Speichert vorgemerkte Themen ("Fokus für diese Lektion") für einen Termin —
 * ohne Bewertung. Nutzt dieselbe `notes`-Tabelle wie die Kriterien-Bewertung
 * (Spalte criteria_rating bleibt NULL), damit beim späteren Bewerten
 * (save-criteria-evaluations) exakt dieselbe Zeile ergänzt wird, statt ein
 * Duplikat zu erzeugen.
 *
 * WICHTIG: Setzt weder appointment.status auf 'completed' noch triggert
 * die Rechnungsstellung — im Gegensatz zu save-criteria-evaluations, das
 * den Abschluss einer Lektion markiert.
 *
 * Body:
 *   - appointment_id: string (UUID)
 *   - topics: Array<{ evaluation_criteria_id: string, note?: string }>
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

    const tenantId = user.tenant_id

    const body = await readBody(event)
    const { appointment_id, topics } = body

    if (!appointment_id || typeof appointment_id !== 'string') {
      throw createError({ statusCode: 400, message: 'appointment_id is required and must be a string' })
    }

    if (!Array.isArray(topics)) {
      throw createError({ statusCode: 400, message: 'topics must be an array' })
    }

    // Verify the appointment belongs to this tenant
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, tenant_id')
      .eq('id', appointment_id)
      .eq('tenant_id', tenantId)
      .single()

    if (appointmentError || !appointment) {
      throw createError({ statusCode: 403, message: 'Appointment not found or unauthorized' })
    }

    // Existing notes for this appointment (any criteria) — used to safely remove
    // topics that were unselected, without ever touching already-rated ones.
    const { data: existingNotes, error: existingError } = await supabase
      .from('notes')
      .select('evaluation_criteria_id, criteria_rating')
      .eq('appointment_id', appointment_id)
      .not('evaluation_criteria_id', 'is', null)

    if (existingError) {
      logger.error('❌ Error loading existing notes:', existingError)
      throw createError({ statusCode: 500, message: 'Failed to load existing topics' })
    }

    const validTopics = topics.filter((t: any) => t && typeof t.evaluation_criteria_id === 'string')
    const newIds = new Set(validTopics.map((t: any) => t.evaluation_criteria_id))

    // Only ever remove rows that are still unrated ("planned") — never delete a
    // real evaluation just because the EventModal picker was re-saved without it.
    const idsToRemove = (existingNotes || [])
      .filter((n: any) => n.criteria_rating == null && !newIds.has(n.evaluation_criteria_id))
      .map((n: any) => n.evaluation_criteria_id)

    if (idsToRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from('notes')
        .delete()
        .eq('appointment_id', appointment_id)
        .in('evaluation_criteria_id', idsToRemove)
        .is('criteria_rating', null)

      if (deleteError) {
        logger.error('❌ Error removing unselected planned topics:', deleteError)
      }
    }

    if (validTopics.length === 0) {
      return { success: true, data: [] }
    }

    // Deliberately omit criteria_rating from the upsert payload: on conflict this
    // leaves an existing rating untouched, and on insert it defaults to NULL.
    const notesToUpsert = validTopics.map((t: any) => ({
      appointment_id,
      evaluation_criteria_id: t.evaluation_criteria_id,
      criteria_note: String(t.note || '').substring(0, 5000),
      last_updated_by_user_id: user.id,
      tenant_id: tenantId,
    }))

    const { data: savedNotes, error: upsertError } = await supabase
      .from('notes')
      .upsert(notesToUpsert, { onConflict: 'appointment_id,evaluation_criteria_id' })
      .select()

    if (upsertError) {
      logger.error('❌ Error upserting planned topics:', upsertError)
      throw createError({ statusCode: 500, message: 'Failed to save planned topics' })
    }

    logger.debug('✅ Planned topics saved:', { appointment_id, count: savedNotes?.length || 0 })

    return { success: true, data: savedNotes || [] }
  } catch (error: any) {
    logger.error('❌ Error in save-planned-topics API:', error.message)

    if (error.statusCode) {
      throw error
    }

    throw createError({ statusCode: 500, message: error.message || 'Failed to save planned topics' })
  }
})
