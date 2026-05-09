import { defineEventHandler, createError, getQuery } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

/**
 * Get exam appointments + exam_results for a student.
 * Bypasses RLS via service role — mirrors get-student-lessons.get.ts.
 */
export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const query = getQuery(event)
    const studentId = query.studentId as string

    if (!studentId) {
      throw createError({ statusCode: 400, statusMessage: 'Student ID is required' })
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // Validate caller belongs to a tenant
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (!userProfile?.tenant_id) {
      throw createError({ statusCode: 403, statusMessage: 'Access denied' })
    }

    // 1. All exam appointments for this student
    const { data: examAppointments, error: aptError } = await supabaseAdmin
      .from('appointments')
      .select(`
        id,
        user_id,
        staff_id,
        start_time,
        type,
        status,
        title,
        event_type_code,
        event_types ( name )
      `)
      .eq('user_id', studentId)
      .eq('tenant_id', userProfile.tenant_id)
      .eq('event_type_code', 'exam')
      .is('deleted_at', null)
      .order('start_time', { ascending: false })

    if (aptError) {
      logger.error('❌ Error loading exam appointments:', aptError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to load exam appointments' })
    }

    const appointmentIds = (examAppointments || []).map(a => a.id)

    // 2. Instructor names
    const staffIds = [...new Set((examAppointments || []).map(a => a.staff_id).filter(Boolean))]
    let instructorsMap: Record<string, any> = {}

    if (staffIds.length > 0) {
      const { data: instructorsData } = await supabaseAdmin
        .from('users')
        .select('id, first_name')
        .in('id', staffIds)

      if (instructorsData) {
        instructorsData.forEach(i => { instructorsMap[i.id] = i })
      }
    }

    // Enrich appointments with instructor
    const appointmentsMap = new Map(
      (examAppointments || []).map(apt => [
        apt.id,
        { ...apt, instructor: apt.staff_id ? instructorsMap[apt.staff_id] : null }
      ])
    )

    // 3. Exam results for those appointments
    let examResultsData: any[] = []

    if (appointmentIds.length > 0) {
      const { data: resultsData, error: resultsError } = await supabaseAdmin
        .from('exam_results')
        .select('*')
        .in('appointment_id', appointmentIds)
        .order('exam_date', { ascending: false })

      if (resultsError) {
        logger.error('❌ Error loading exam results:', resultsError)
      } else {
        examResultsData = resultsData || []
      }
    }

    // 4. Build combined list
    const appointmentIdsWithResult = new Set(examResultsData.map(r => r.appointment_id))
    const now = new Date()

    const completedResults = examResultsData.map(result => ({
      ...result,
      appointments: appointmentsMap.get(result.appointment_id) || null,
      isPlanned: false,
      isUnrated: false,
    }))

    const plannedExams = (examAppointments || [])
      .filter(apt =>
        !appointmentIdsWithResult.has(apt.id) &&
        apt.status !== 'cancelled'
      )
      .map(apt => ({
        id: `planned-${apt.id}`,
        appointment_id: apt.id,
        exam_date: apt.start_time,
        passed: null,
        examiner_behavior_rating: null,
        examiner_behavior_notes: null,
        appointments: appointmentsMap.get(apt.id) || null,
        isPlanned: new Date(apt.start_time) >= now,
        isUnrated: new Date(apt.start_time) < now,
      }))

    const combined = [...plannedExams, ...completedResults]
      .sort((a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime())

    logger.debug('✅ Loaded', combined.length, 'exam entries for student:', studentId)

    return { success: true, data: combined }

  } catch (error: any) {
    logger.error('❌ Error getting student exams:', error)
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, statusMessage: error.message || 'Failed to get student exams' })
  }
})
