/**
 * GET /api/admin/rental-bookings
 * Returns all vehicle rentals for the tenant, with optional filters.
 */
import { defineEventHandler, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const role: string = authUser.role || authUser.profile?.role || ''
  const tenantId: string = authUser.tenant_id || authUser.profile?.tenant_id || ''

  if (!['admin', 'staff', 'superadmin'].includes(role) || !tenantId) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const supabase = getSupabaseAdmin()
  const dbUser = { tenant_id: tenantId, role }

  const query = getQuery(event) as {
    partner_id?: string
    status?: string
    payment_status?: string
    month?: string // YYYY-MM
  }

  let q = supabase
    .from('vehicle_rentals')
    .select(`
      id, start_time, end_time, duration_hours,
      hourly_rate_rappen, total_amount_rappen,
      status, payment_status, payment_method,
      partner_notes, admin_notes, notes, created_at, confirmed_at, renter_user_id,
      vehicles ( id, name, marke, modell ),
      users!vehicle_rentals_renter_user_id_fkey ( id, first_name, last_name, email, rental_payment_method )
    `)
    .eq('tenant_id', dbUser.tenant_id)
    .order('start_time', { ascending: false })

  if (query.partner_id) q = q.eq('renter_user_id', query.partner_id)
  if (query.status) q = q.eq('status', query.status)
  if (query.payment_status) q = q.eq('payment_status', query.payment_status)
  if (query.month) {
    const [year, month] = query.month.split('-').map(Number)
    const from = new Date(year, month - 1, 1).toISOString()
    const to = new Date(year, month, 1).toISOString()
    q = q.gte('start_time', from).lt('start_time', to)
  }

  const { data, error } = await q

  if (error) {
    console.error('rental-bookings GET error:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load rentals' })
  }

  const rentals = (data || []).map((r: any) => {
    const renter = (r as any).users
    const renterName = renter ? `${renter.first_name ?? ''} ${renter.last_name ?? ''}`.trim() : '—'
    return {
    id: r.id,
    vehicle: r.vehicles
      ? `${r.vehicles.marke ?? ''} ${r.vehicles.modell ?? ''}`.trim() || r.vehicles.name || 'Unbekannt'
      : 'Unbekannt',
    license_plate: null,
    partner_name: renterName || '—',
    partner_company: null,
    partner_email: renter?.email ?? null,
    partner_id: r.renter_user_id,
    renter_user_id: r.renter_user_id,
    start_time: r.start_time,
    end_time: r.end_time,
    duration_hours: r.duration_hours,
    hourly_rate_chf: (r.hourly_rate_rappen / 100).toFixed(2),
    total_chf: ((r.total_amount_rappen ?? 0) / 100).toFixed(2),
    status: r.status,
    payment_status: r.payment_status,
    payment_method: r.payment_method,
    partner_notes: r.partner_notes,
    admin_notes: r.admin_notes,
    created_at: r.created_at,
    confirmed_at: r.confirmed_at,
  }
  })

  // Monthly summary for invoicing view
  const totalRappen = rentals
    .filter(r => r.status === 'confirmed')
    .reduce((sum, r) => sum + parseFloat(r.total_chf) * 100, 0)

  return {
    success: true,
    rentals,
    summary: {
      total_rentals: rentals.length,
      confirmed: rentals.filter(r => r.status === 'confirmed').length,
      pending: rentals.filter(r => r.status === 'pending').length,
      unpaid_rappen: rentals
        .filter(r => r.status === 'confirmed' && r.payment_status === 'unpaid')
        .reduce((sum, r) => sum + parseFloat(r.total_chf) * 100, 0),
      total_rappen: totalRappen,
    },
  }
})
