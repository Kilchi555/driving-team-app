/**
 * GET /api/admin/system-alerts
 * Returns actionable system-generated alerts for the admin dashboard.
 */
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const role: string = authUser.role || authUser.profile?.role || ''
  const tid: string = authUser.tenant_id || authUser.profile?.tenant_id || ''

  if (!['admin', 'superadmin'].includes(role) || !tid) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const supabase = getSupabaseAdmin()

  const [
    refundsRes,
    medCertsRes,
    overdueRes,
    waitlistRes,
    rentalsRes,
    proposalsRes,
    creditsRes,
  ] = await Promise.allSettled([
    // 1. Pending refund requests from staff
    supabase
      .from('refund_requests')
      .select('id, requested_amount_rappen, created_at, requested_by:users!refund_requests_requested_by_fkey(first_name, last_name)')
      .eq('tenant_id', tid)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10),

    // 2. Medical certificates needing review
    supabase
      .from('medical_certificate_reviews')
      .select('id, student_name, medical_certificate_uploaded_at, review_status')
      .eq('tenant_id', tid)
      .in('review_status', ['pending', 'uploaded'])
      .order('medical_certificate_uploaded_at', { ascending: false, nullsLast: true })
      .limit(10),

    // 3. Overdue payments
    supabase
      .from('payments')
      .select('id, total_amount_rappen')
      .eq('tenant_id', tid)
      .eq('payment_status', 'overdue')
      .limit(100),

    // 4. Course waitlist entries waiting (correct table: course_waitlist)
    supabase
      .from('course_waitlist')
      .select('id, first_name, last_name, created_at, status')
      .eq('tenant_id', tid)
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(50),

    // 5. Pending vehicle rental bookings
    supabase
      .from('vehicle_rentals')
      .select('id, start_time, total_amount_rappen, users!vehicle_rentals_renter_user_id_fkey(first_name, last_name)')
      .eq('tenant_id', tid)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10),

    // 6. Open booking proposals (leads)
    supabase
      .from('booking_proposals')
      .select('id, first_name, last_name, category_code, created_at, status')
      .eq('tenant_id', tid)
      .in('status', ['pending', 'new', 'submitted'])
      .order('created_at', { ascending: false })
      .limit(10),

    // 7. Student credit withdrawal requests
    supabase
      .from('student_credits')
      .select('id, pending_withdrawal_rappen, user_id')
      .eq('tenant_id', tid)
      .gt('pending_withdrawal_rappen', 0)
      .limit(50),
  ])

  type Alert = {
    type: string
    label: string
    count: number
    priority: 'low' | 'medium' | 'high' | 'critical'
    link: string
    items: { id: string; text: string; date?: string }[]
  }

  const alerts: Alert[] = []

  const push = (
    condition: boolean,
    alert: Alert,
  ) => { if (condition) alerts.push(alert) }

  // 1. Refund requests
  const refunds = refundsRes.status === 'fulfilled' ? (refundsRes.value.data || []) : []
  push(refunds.length > 0, {
    type: 'refund_requests',
    label: 'Rückerstattungsanträge',
    count: refunds.length,
    priority: 'high',
    link: '/admin/refund-requests',
    items: refunds.map(r => ({
      id: r.id,
      text: `${(r as any).requested_by?.first_name ?? '?'} ${(r as any).requested_by?.last_name ?? ''} — CHF ${(r.requested_amount_rappen / 100).toFixed(2)}`,
      date: r.created_at,
    })),
  })

  // 2. Medical certificates
  const medCerts = medCertsRes.status === 'fulfilled' ? (medCertsRes.value.data || []) : []
  push(medCerts.length > 0, {
    type: 'medical_certificates',
    label: 'Arztzeugnisse zur Prüfung',
    count: medCerts.length,
    priority: 'medium',
    link: '/admin/medical-certificate-reviews',
    items: medCerts.map(r => ({
      id: r.id,
      text: r.student_name || 'Schüler',
      date: r.medical_certificate_uploaded_at,
    })),
  })

  // 3. Overdue payments
  const overdue = overdueRes.status === 'fulfilled' ? (overdueRes.value.data || []) : []
  push(overdue.length > 0, {
    type: 'overdue_payments',
    label: 'Überfällige Zahlungen',
    count: overdue.length,
    priority: overdue.length >= 5 ? 'critical' : 'high',
    link: '/admin/invoices',
    items: [],
  })

  // 4. Waitlist
  const waitlist = waitlistRes.status === 'fulfilled' ? (waitlistRes.value.data || []) : []
  push(waitlist.length > 0, {
    type: 'waitlist',
    label: 'Wartelisten-Einträge',
    count: waitlist.length,
    priority: 'low',
    link: '/admin/courses',
    items: waitlist.slice(0, 3).map(r => ({
      id: r.id,
      text: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || 'Eintrag',
      date: r.created_at,
    })),
  })

  // 5. Pending vehicle rentals
  const rentals = rentalsRes.status === 'fulfilled' ? (rentalsRes.value.data || []) : []
  push(rentals.length > 0, {
    type: 'vehicle_rentals',
    label: 'Fahrzeug-Mietanfragen',
    count: rentals.length,
    priority: 'high',
    link: '/admin/categories',
    items: rentals.map(r => ({
      id: r.id,
      text: `${(r as any).users?.first_name ?? '?'} ${(r as any).users?.last_name ?? ''} — ${new Date(r.start_time).toLocaleDateString('de-CH')}`,
      date: r.start_time,
    })),
  })

  // 6. Booking proposals / leads
  const proposals = proposalsRes.status === 'fulfilled' ? (proposalsRes.value.data || []) : []
  push(proposals.length > 0, {
    type: 'booking_proposals',
    label: 'Offene Buchungsanfragen',
    count: proposals.length,
    priority: 'medium',
    link: '/admin/booking-proposals',
    items: proposals.map(r => ({
      id: r.id,
      text: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || 'Anfrage',
      date: r.created_at,
    })),
  })

  // 7. Credit withdrawals pending
  const credits = creditsRes.status === 'fulfilled' ? (creditsRes.value.data || []) : []
  const totalWithdrawalRappen = credits.reduce((sum, c) => sum + (c.pending_withdrawal_rappen || 0), 0)
  push(credits.length > 0, {
    type: 'credit_withdrawals',
    label: 'Guthaben-Auszahlungen',
    count: credits.length,
    priority: 'high',
    link: '/admin/student-credits',
    items: [{
      id: 'total',
      text: `CHF ${(totalWithdrawalRappen / 100).toFixed(2)} ausstehend (${credits.length} Schüler)`,
    }],
  })

  // Sort by priority: critical → high → medium → low
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  alerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return { success: true, alerts, total: alerts.reduce((sum, a) => sum + a.count, 0) }
})
