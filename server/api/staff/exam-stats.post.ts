import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  requireTenantStaff,
  loadStaffInTenant,
  assertSelfOrTenantAdmin,
} from '~/server/utils/require-tenant-auth'

export default defineEventHandler(async (event) => {
  const actor = await requireTenantStaff(event)
  const body = await readBody(event)
  const staffId = body?.staff_id

  if (!staffId || typeof staffId !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'staff_id is required',
    })
  }

  const supabase = getSupabaseAdmin()
  const staff = await loadStaffInTenant(supabase, staffId, actor.tenant_id, {
    allowInactive: true,
  })
  assertSelfOrTenantAdmin(actor, staff.id)

  try {
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id, title, type, start_time, user_id')
      .eq('staff_id', staff.id)
      .eq('tenant_id', actor.tenant_id)
      .not('status', 'is', null)

    if (appointmentsError) throw appointmentsError

    if (!appointments || appointments.length === 0) {
      return { success: true, data: { appointments: [], exam_results: [], students: [] } }
    }

    const appointmentIds = appointments.map((apt: { id: string }) => apt.id)
    const CHUNK_SIZE = 100
    let exam_results: any[] = []
    for (let i = 0; i < appointmentIds.length; i += CHUNK_SIZE) {
      const chunk = appointmentIds.slice(i, i + CHUNK_SIZE)
      const { data, error: examError } = await supabase
        .from('exam_results')
        .select('id, exam_date, passed, examiner_behavior_rating, examiner_behavior_notes, appointment_id, examiner_id')
        .in('appointment_id', chunk)
        .order('exam_date', { ascending: false })
      if (examError) throw examError
      if (data) exam_results = exam_results.concat(data)
    }

    const studentIds = [...new Set(appointments.map((apt: any) => apt.user_id).filter(Boolean))]
    let students: any[] = []

    if (studentIds.length > 0) {
      for (let i = 0; i < studentIds.length; i += CHUNK_SIZE) {
        const chunk = studentIds.slice(i, i + CHUNK_SIZE)
        const { data: studentsData, error: studentsError } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', chunk)
          .eq('tenant_id', actor.tenant_id)
        if (studentsError) throw studentsError
        if (studentsData) students = students.concat(studentsData)
      }
    }

    const examinerIds = [...new Set(exam_results.map((exam: any) => exam.examiner_id).filter(Boolean))]
    let examiners: any[] = []

    if (examinerIds.length > 0) {
      for (let i = 0; i < examinerIds.length; i += CHUNK_SIZE) {
        const chunk = examinerIds.slice(i, i + CHUNK_SIZE)
        const { data: examinersData, error: examinersError } = await supabase
          .from('examiners')
          .select('id, first_name, last_name')
          .in('id', chunk)
        if (examinersError) throw examinersError
        if (examinersData) examiners = examiners.concat(examinersData)
      }
    }

    return {
      success: true,
      data: {
        appointments,
        exam_results,
        students,
        examiners,
      },
    }
  } catch (err: any) {
    if (err?.statusCode) throw err
    console.error('❌ Exam stats API error:', err)
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to load exam statistics',
    })
  }
})
