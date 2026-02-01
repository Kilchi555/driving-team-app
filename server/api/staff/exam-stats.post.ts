// server/api/staff/exam-stats.post.ts
// Staff exam statistics endpoint

import { defineEventHandler, readBody, createError } from 'h3'
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = readBody(event)
  const { staff_id, tenant_id } = await body

  const supabase = serverSupabaseClient(event)

  try {
    // Get all appointments for this staff
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id, title, type, start_time, user_id')
      .eq('staff_id', staff_id)
      .not('status', 'is', null)

    if (appointmentsError) throw appointmentsError

    if (!appointments || appointments.length === 0) {
      return { success: true, data: { appointments: [], exam_results: [], students: [] } }
    }

    // Get exam results
    const appointmentIds = appointments.map((apt: any) => apt.id)
    const { data: exam_results, error: examError } = await supabase
      .from('exam_results')
      .select('id, exam_date, passed, examiner_behavior_rating, examiner_behavior_notes, appointment_id, examiner_id')
      .in('appointment_id', appointmentIds)
      .order('exam_date', { ascending: false })

    if (examError) throw examError

    // Get student names
    const studentIds = [...new Set(appointments.map((apt: any) => apt.user_id).filter(Boolean))]
    let students: any[] = []

    if (studentIds.length > 0) {
      const { data: studentsData, error: studentsError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', studentIds)

      if (studentsError) throw studentsError
      students = studentsData || []
    }

    return {
      success: true,
      data: {
        appointments,
        exam_results,
        students
      }
    }
  } catch (err: any) {
    console.error('❌ Exam stats API error:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to load exam statistics'
    })
  }
})
