import { defineEventHandler, createError, getQuery } from 'h3'
import { createClient } from '@supabase/supabase-js'
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

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

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

        // Get unique criteria IDs from notes that have evaluations
        const criteriaIds = [...new Set(notesData
          .filter(n => n.evaluation_criteria_id && n.criteria_rating)
          .map(n => n.evaluation_criteria_id))]

        logger.debug('🔍 Found', criteriaIds.length, 'unique criteria IDs with ratings')

        // Load criteria details if any exist
        let criteriaMap: Record<string, any> = {}
        if (criteriaIds.length > 0) {
          const { data: criteriaData, error: criteriaError } = await supabaseAdmin
            .from('evaluation_criteria')
            .select('id, name, description, display_order')
            .in('id', criteriaIds)

          if (criteriaError) {
            logger.error('❌ Error loading criteria:', criteriaError)
          } else if (criteriaData) {
            logger.debug('📋 Loaded', criteriaData.length, 'criteria')
            criteriaData.forEach(c => {
              criteriaMap[c.id] = c
            })
          }
        }

        // Group notes by appointment_id and attach criteria
        notesData.forEach(note => {
          // Only include notes that have both evaluation_criteria_id and criteria_rating
          if (note.evaluation_criteria_id && note.criteria_rating) {
            if (!evaluationsMap[note.appointment_id]) {
              evaluationsMap[note.appointment_id] = []
            }
            evaluationsMap[note.appointment_id].push({
              ...note,
              // Attach criteria details
              evaluation_criteria: criteriaMap[note.evaluation_criteria_id] || null
            })
          }
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
