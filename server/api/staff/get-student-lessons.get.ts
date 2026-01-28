import { defineEventHandler, createError, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

/**
 * Get student lessons with evaluations for admin/staff
 * Bypasses RLS by using service role
 */
export default defineEventHandler(async (event) => {
  try {
    // Authenticate user
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const query = getQuery(event)
    const studentId = query.studentId as string

    if (!studentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Student ID is required'
      })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Get user's profile (for tenant_id validation)
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (!userProfile || !userProfile.tenant_id) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied'
      })
    }

    // Load appointments for student
    const { data: appointmentsData, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select(`
        id,
        user_id,
        start_time,
        end_time,
        type,
        status,
        title,
        description,
        duration_minutes,
        event_type_code,
        staff_id,
        event_types (
          name
        )
      `)
      .eq('user_id', studentId)
      .eq('tenant_id', userProfile.tenant_id)
      .order('start_time', { ascending: false })
      .is('deleted_at', null)

    if (appointmentsError) {
      logger.error('❌ Error loading appointments:', appointmentsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to load appointments'
      })
    }

    // Load evaluations/notes for these appointments
    const appointmentIds = (appointmentsData || []).map(apt => apt.id)
    let evaluationsMap: Record<string, any[]> = {}
    let criteriaMap: Record<string, any> = {}

    if (appointmentIds.length > 0) {
      logger.debug('🔍 Loading evaluations for', appointmentIds.length, 'appointments')

      // Load notes with evaluations
      const { data: notesData, error: notesError } = await supabaseAdmin
        .from('notes')
        .select('*')
        .in('appointment_id', appointmentIds)

      if (notesError) {
        logger.error('❌ Error loading notes:', notesError)
      } else if (notesData) {
        logger.debug('📝 Loaded', notesData.length, 'notes')
        logger.debug('📝 Sample note:', notesData[0]) // DEBUG

        // Get criteria IDs
        const criteriaIds = [...new Set(notesData
          .filter(n => n.evaluation_criteria_id)
          .map(n => n.evaluation_criteria_id))]

        logger.debug('🔍 Found criteria IDs:', criteriaIds) // DEBUG

        // Load criteria details
        if (criteriaIds.length > 0) {
          const { data: criteriaData } = await supabaseAdmin
            .from('evaluation_criteria')
            .select('*')
            .in('id', criteriaIds)

          logger.debug('📋 Loaded criteria:', criteriaData?.length || 0, 'criteria') // DEBUG
          logger.debug('📋 Sample criteria:', criteriaData?.[0]) // DEBUG

          if (criteriaData) {
            criteriaData.forEach(c => {
              // Only keep essential fields to avoid JSON serialization issues
              criteriaMap[c.id] = {
                id: c.id,
                name: c.name,
                description: c.description,
                display_order: c.display_order
              }
            })
          }
        }

        // Group notes by appointment_id
        notesData.forEach(note => {
          if (!evaluationsMap[note.appointment_id]) {
            evaluationsMap[note.appointment_id] = []
          }
          evaluationsMap[note.appointment_id].push({
            ...note,
            evaluation_criteria: note.evaluation_criteria_id ? criteriaMap[note.evaluation_criteria_id] : null
          })
        })
      }
    }

    // Combine appointments with their evaluations
    const lessonsWithEvaluations = (appointmentsData || []).map(apt => ({
      ...apt,
      evaluations: evaluationsMap[apt.id] || []
    }))

    logger.debug('✅ Loaded', lessonsWithEvaluations.length, 'lessons with evaluations')

    return {
      success: true,
      data: lessonsWithEvaluations
    }
  } catch (error: any) {
    logger.error('❌ Error getting student lessons:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to get student lessons'
    })
  }
})
