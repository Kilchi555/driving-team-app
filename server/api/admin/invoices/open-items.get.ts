/**
 * GET /api/admin/invoices/open-items
 *
 * Returns all uninvoiced billable items for a user (or a company):
 *   - Unpaid course registrations (payment_method = 'invoice' or 'cash_on_site')
 *   - Room bookings (external, no invoice_id)
 *   - Vehicle bookings (external/manual, no invoice_id)
 *   - Unpaid driving lesson payments (payment_method = 'invoice')
 *
 * Query params:
 *   user_id       — filter by specific user
 *   company_id    — filter by all users of a company
 *
 * Secured: admin / staff only.
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'staff', 'super_admin', 'superadmin'])
  const supabase = getSupabaseAdmin()
  const { user_id, company_id } = getQuery(event) as any

  if (!user_id && !company_id) throw createError({ statusCode: 400, statusMessage: 'user_id or company_id required' })

  // Resolve user IDs (and names for company context)
  let userIds: string[] = []
  const userNameMap: Record<string, string> = {}

  if (user_id) {
    userIds = [user_id]
  } else if (company_id) {
    const { data: companyUsers } = await supabase
      .from('users').select('id, first_name, last_name').eq('company_id', company_id).eq('tenant_id', profile.tenant_id)
    userIds = (companyUsers || []).map((u: any) => u.id)
    for (const u of (companyUsers || [])) {
      userNameMap[u.id] = `${u.first_name || ''} ${u.last_name || ''}`.trim()
    }
    if (userIds.length === 0) return { success: true, items: [] }
  }

  const tenantId = profile.tenant_id
  const items: any[] = []

  // ── 1. Unpaid payments (driving lessons) — any payment method, not yet invoiced ─
  const { data: lessonPayments } = await supabase
    .from('payments')
    .select(`
      id, total_amount_rappen, created_at, payment_method, payment_status, user_id, appointment_id,
      description, metadata, course_registration_id,
      appointments(
        title, start_time, duration_minutes, type,
        staff:staff_id(first_name, last_name)
      )
    `)
    .in('user_id', userIds)
    .eq('tenant_id', tenantId)
    .in('payment_status', ['pending', 'open', 'processing', 'failed'])
    .is('invoice_id', null)
    .gt('total_amount_rappen', 0)

  // ── 2. Uninvoiced course registrations — any payment method, not yet invoiced ──
  const { data: courseRegs } = await supabase
    .from('course_registrations')
    .select('id, user_id, amount_paid_rappen, payment_status, payment_method, payment_id, course_id, custom_sessions, is_partial_enrollment, partial_start_session, individual_session_number, courses(name, price_per_participant_rappen, course_start_date, category)')
    .in('user_id', userIds)
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelled')
    .not('payment_status', 'eq', 'paid')
    .is('invoice_id', null)

  // Batch-load the actual session dates for all courses involved, so partial /
  // individual-session enrollments show the real session date(s) instead of a
  // generic course start date or (worse) the payment's creation timestamp.
  const courseIdsNeedingSessions = new Set<string>()
  for (const p of (lessonPayments || [])) {
    const meta = ((p as any).metadata || {}) as Record<string, any>
    if (!(p as any).appointments && meta.course_id) courseIdsNeedingSessions.add(meta.course_id)
  }
  for (const r of (courseRegs || [])) {
    if (r.course_id) courseIdsNeedingSessions.add(r.course_id)
  }

  const sessionsByCourse = new Map<string, { session_number: number; start_time: string; end_time: string | null }[]>()
  const courseNameById = new Map<string, string>()
  if (courseIdsNeedingSessions.size > 0) {
    const courseIdList = Array.from(courseIdsNeedingSessions)
    const [{ data: sessions }, { data: courseRows }] = await Promise.all([
      supabase
        .from('course_sessions')
        .select('course_id, session_number, start_time, end_time')
        .in('course_id', courseIdList)
        .eq('is_active', true)
        .order('session_number', { ascending: true }),
      supabase
        .from('courses')
        .select('id, name')
        .in('id', courseIdList),
    ])

    for (const s of (sessions || [])) {
      const list = sessionsByCourse.get(s.course_id) || []
      list.push({
        session_number: s.session_number,
        start_time: s.start_time,
        end_time: s.end_time || null,
      })
      sessionsByCourse.set(s.course_id, list)
    }
    for (const c of (courseRows || [])) {
      if (c?.id && c?.name) courseNameById.set(c.id, c.name)
    }
  }

  // Resolve which sessions apply to a given enrollment (full / partial / single session)
  const resolveSessions = (courseId: string | null | undefined, opts: {
    individualSessionNumber?: number | null
    partialStartPosition?: number | null
    customSessions?: Record<string, any> | null
  }): { session_number: number; start_time: string; end_time: string | null }[] => {
    const sessions = (courseId && sessionsByCourse.get(courseId)) || []
    if (sessions.length === 0) return []

    let relevant = sessions
    if (opts.individualSessionNumber) {
      relevant = sessions.filter(s => s.session_number === opts.individualSessionNumber)
    } else if (opts.partialStartPosition != null) {
      relevant = sessions.filter(s => s.session_number >= opts.partialStartPosition!)
    }
    // Drop sessions that were swapped out to a different course
    if (opts.customSessions && typeof opts.customSessions === 'object') {
      relevant = relevant.filter(s => !opts.customSessions![String(s.session_number)])
    }
    return relevant
  }

  // Course names conventionally bake in the date of session 1 (e.g. "Kurs XY - 08.08.2026"),
  // which is misleading for partial/individual-session enrollments where the actual date
  // shown below is a later session. Strip that suffix and replace it with a "Teil X" hint
  // that matches the resolved session date instead.
  const stripBakedInDate = (name: string) => name.replace(/\s*-\s*\d{2}\.\d{2}\.\d{4}$/, '')

  const buildCourseLabel = (baseName: string | null | undefined, opts: {
    individualSessionNumber?: number | null
    partialStartPosition?: number | null
  }): string | null => {
    if (!baseName) return null
    const clean = stripBakedInDate(baseName)
    if (opts.individualSessionNumber) return `${clean} (Teil ${opts.individualSessionNumber})`
    if (opts.partialStartPosition != null) return `${clean} (ab Teil ${opts.partialStartPosition})`
    return clean
  }

  for (const p of (lessonPayments || [])) {
    const apt = (p as any).appointments
    const staff = apt?.staff
    const staffName = staff ? `${staff.first_name || ''} ${staff.last_name || ''}`.trim() : null
    // Payments without an appointment (e.g. course registrations paid via the public
    // checkout) don't carry a title from the appointments join — fall back to the
    // course info stored on the payment itself instead of a generic "Fahrstunde".
    const meta = ((p as any).metadata || {}) as Record<string, any>
    const isCoursePayment = !apt && !!(meta.course_name || meta.course_id || p.course_registration_id)
    const coursePartialStart = meta.is_partial_enrollment ? meta.partial_start_position : null
    const sessions = isCoursePayment
      ? resolveSessions(meta.course_id, {
          individualSessionNumber: meta.individual_session_number,
          partialStartPosition: coursePartialStart,
          customSessions: meta.custom_sessions,
        })
      : []
    const sessionDates = sessions.map(s => s.start_time)
    const resolvedCourseName =
      meta.course_name ||
      (meta.course_id ? courseNameById.get(meta.course_id) : null) ||
      null
    const fallbackDescription =
      p.description && !/^Course:\s*Unknown$/i.test(p.description) ? p.description : null
    items.push({
      type: isCoursePayment ? 'course' : 'lesson',
      source_id: p.id,
      source_table: 'payments',
      appointment_id: p.appointment_id || null,
      label: apt?.title
        || buildCourseLabel(resolvedCourseName, { individualSessionNumber: meta.individual_session_number, partialStartPosition: coursePartialStart })
        || fallbackDescription
        || 'Fahrstunde',
      appointment_type: apt?.type || null,
      date: apt?.start_time || sessionDates[0] || meta.course_start_date || p.created_at,
      session_dates: sessionDates.length > 1 ? sessionDates : undefined,
      sessions: sessions.length > 0 ? sessions : undefined,
      duration_minutes: apt?.duration_minutes || null,
      staff_name: staffName,
      amount_rappen: p.total_amount_rappen || 0,
      unit: isCoursePayment ? 'Kurs' : 'Lektion',
      payment_method: p.payment_method,
      status: p.payment_status,
      user_id: p.user_id,
      user_name: userNameMap[p.user_id] || null,
    })
  }

  // Avoid double-counting: if a payment already covers a registration, skip the reg row
  const coveredRegIds = new Set(
    (lessonPayments || [])
      .map((p: any) => p.course_registration_id)
      .filter(Boolean)
  )

  for (const r of (courseRegs || [])) {
    if (coveredRegIds.has(r.id) || (r as any).payment_id) continue
    const course = (r as any).courses
    const regPartialStart = r.is_partial_enrollment ? r.partial_start_session : null
    const sessions = resolveSessions(r.course_id, {
      individualSessionNumber: r.individual_session_number,
      partialStartPosition: regPartialStart,
      customSessions: r.custom_sessions as any,
    })
    const sessionDates = sessions.map(s => s.start_time)
    items.push({
      type: 'course',
      source_id: r.id,
      source_table: 'course_registrations',
      label: buildCourseLabel(course?.name, { individualSessionNumber: r.individual_session_number, partialStartPosition: regPartialStart }) || 'Kursanmeldung',
      appointment_type: course?.category || null,
      date: sessionDates[0] || course?.course_start_date || null,
      session_dates: sessionDates.length > 1 ? sessionDates : undefined,
      sessions: sessions.length > 0 ? sessions : undefined,
      amount_rappen: course?.price_per_participant_rappen || r.amount_paid_rappen || 0,
      unit: 'Kurs',
      user_id: r.user_id,
      user_name: userNameMap[r.user_id] || null,
    })
  }

  // ── 3. Uninvoiced room bookings (billing_pending) ────────────────────────────
  const { data: roomBookings } = await supabase
    .from('room_bookings')
    .select('id, start_time, end_time, room_cost_rappen, rooms(name), external_contact_name, purpose, booked_by')
    .eq('tenant_id', tenantId)
    .in('booked_by', userIds)
    .eq('billing_pending', true)
    .neq('status', 'cancelled')
    .is('invoice_id', null)
    .gt('room_cost_rappen', 0)

  for (const r of (roomBookings || [])) {
    const room = (r as any).rooms
    items.push({
      type: 'room',
      source_id: r.id,
      source_table: 'room_bookings',
      label: `Raum: ${room?.name || ''}`,
      date: r.start_time,
      amount_rappen: r.room_cost_rappen || 0,
      unit: 'Reservierung',
      user_id: r.booked_by,
      user_name: userNameMap[r.booked_by] || null,
    })
  }

  // ── 4. Uninvoiced vehicle bookings (billing_pending) ─────────────────────────
  const { data: vehicleBookings } = await supabase
    .from('vehicle_bookings')
    .select('id, start_time, end_time, cost_rappen, vehicles(name, marke, modell), purpose, booked_by')
    .eq('tenant_id', tenantId)
    .in('booked_by', userIds)
    .eq('billing_pending', true)
    .neq('status', 'cancelled')
    .is('invoice_id', null)
    .gt('cost_rappen', 0)

  for (const v of (vehicleBookings || [])) {
    const vehicle = (v as any).vehicles
    const vName = vehicle?.name || `${vehicle?.marke ?? ''} ${vehicle?.modell ?? ''}`.trim() || 'Fahrzeug'
    items.push({
      type: 'vehicle',
      source_id: v.id,
      source_table: 'vehicle_bookings',
      label: `Fahrzeug: ${vName}`,
      date: v.start_time,
      amount_rappen: v.cost_rappen || 0,
      unit: 'Reservierung',
      user_id: v.booked_by,
      user_name: userNameMap[v.booked_by] || null,
    })
  }

  // Sort by date
  items.sort((a, b) => (a.date || '').localeCompare(b.date || ''))

  return { success: true, items, total_rappen: items.reduce((s, i) => s + i.amount_rappen, 0) }
})
