import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const query = getQuery(event)
  const instructorId = query.instructor_id as string | undefined

  // Load cash_transactions filtered by tenant
  let txQuery = supabase
    .from('cash_transactions')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .order('created_at', { ascending: false })

  if (instructorId) {
    // Verify instructor belongs to tenant first
    const { data: staffCheck } = await supabase
      .from('users')
      .select('id')
      .eq('id', instructorId)
      .eq('tenant_id', profile.tenant_id)
      .single()
    if (!staffCheck) throw createError({ statusCode: 403, statusMessage: 'Staff not found' })
    txQuery = txQuery.eq('instructor_id', instructorId)
  }

  const { data: transactions, error: txError } = await txQuery
  if (txError) throw createError({ statusCode: 500, statusMessage: txError.message })

  if (!transactions || transactions.length === 0) {
    return { success: true, data: [] }
  }

  // Collect user and appointment IDs for enrichment
  const userIds = new Set<string>()
  const appointmentIds = new Set<string>()

  transactions.forEach(t => {
    if (t.instructor_id) userIds.add(t.instructor_id)
    if (t.student_id) userIds.add(t.student_id)
    if (t.confirmed_by) userIds.add(t.confirmed_by)
    if (t.appointment_id) appointmentIds.add(t.appointment_id)
  })

  const [{ data: users }, { data: appointments }] = await Promise.all([
    supabase
      .from('users')
      .select('id, first_name, last_name')
      .in('id', Array.from(userIds))
      .eq('tenant_id', profile.tenant_id),
    appointmentIds.size > 0
      ? supabase
          .from('appointments')
          .select('id, start_time')
          .in('id', Array.from(appointmentIds))
          .eq('tenant_id', profile.tenant_id)
      : Promise.resolve({ data: [] }),
  ])

  const usersMap = new Map((users || []).map(u => [u.id, u]))
  const appointmentsMap = new Map((appointments || []).map(a => [a.id, a]))

  const enriched = transactions.map(t => {
    const instructor = usersMap.get(t.instructor_id)
    const student = usersMap.get(t.student_id)
    const confirmedBy = t.confirmed_by ? usersMap.get(t.confirmed_by) : null
    const appointment = t.appointment_id ? appointmentsMap.get(t.appointment_id) : null
    return {
      ...t,
      instructor_name: instructor ? `${instructor.first_name} ${instructor.last_name}` : 'Unbekannt',
      student_name: student ? `${student.first_name} ${student.last_name}` : 'Unbekannt',
      appointment_start_time: appointment?.start_time || null,
      confirmed_by_name: confirmedBy ? `${confirmedBy.first_name} ${confirmedBy.last_name}` : null,
    }
  })

  return { success: true, data: enriched }
})
