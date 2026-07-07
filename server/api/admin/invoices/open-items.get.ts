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
    .select('id, total_amount_rappen, created_at, payment_method, payment_status, appointment_id, appointments(title, start_time, duration_minutes)')
    .in('user_id', userIds)
    .eq('tenant_id', tenantId)
    .in('payment_status', ['pending', 'open', 'processing', 'failed'])
    .is('invoice_id', null)
    .gt('total_amount_rappen', 0)

  for (const p of (lessonPayments || [])) {
    const apt = (p as any).appointments
    items.push({
      type: 'lesson',
      source_id: p.id,
      source_table: 'payments',
      appointment_id: p.appointment_id || null,
      label: apt?.title || 'Fahrstunde',
      date: apt?.start_time || p.created_at,
      duration_minutes: apt?.duration_minutes,
      amount_rappen: p.total_amount_rappen || 0,
      unit: 'Lektion',
      payment_method: p.payment_method,
      status: p.payment_status,
      user_id: p.user_id,
      user_name: userNameMap[p.user_id] || null,
    })
  }

  // ── 2. Uninvoiced course registrations — any payment method, not yet invoiced ──
  const { data: courseRegs } = await supabase
    .from('course_registrations')
    .select('id, amount_paid_rappen, payment_status, payment_method, course_id, courses(name, price_per_participant_rappen)')
    .in('user_id', userIds)
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelled')
    .not('payment_status', 'eq', 'paid')
    .is('invoice_id', null)

  for (const r of (courseRegs || [])) {
    const course = (r as any).courses
    items.push({
      type: 'course',
      source_id: r.id,
      source_table: 'course_registrations',
      label: course?.name || 'Kursanmeldung',
      date: null,
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
