/**
 * GET /api/admin/discount-usage
 * Chronological overview of applied discounts (discount_sales) for the tenant.
 * Supports search, filters, sort and pagination.
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

const SORT_FIELDS = new Set(['created_at', 'discount_amount_rappen', 'discount_reason', 'status'])
const SORT_DIRS = new Set(['asc', 'desc'])

function parseDateBoundary(value: unknown, endOfDay = false): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    d.setHours(23, 59, 59, 999)
  }
  return d.toISOString()
}

function displayName(u?: { first_name?: string | null; last_name?: string | null } | null) {
  if (!u) return ''
  return `${u.first_name || ''} ${u.last_name || ''}`.trim()
}

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'staff', 'superadmin', 'super_admin'])
  const supabase = getSupabaseAdmin()
  const query = getQuery(event)

  const search = typeof query.search === 'string' ? query.search.trim() : ''
  const discountType = typeof query.discount_type === 'string' ? query.discount_type.trim() : ''
  const status = typeof query.status === 'string' ? query.status.trim() : ''
  const kind = typeof query.kind === 'string' ? query.kind.trim() : '' // all | manual | code
  const dateFrom = parseDateBoundary(query.date_from)
  const dateTo = parseDateBoundary(query.date_to, true)

  const sortBy = SORT_FIELDS.has(String(query.sort_by || ''))
    ? String(query.sort_by)
    : 'created_at'
  const sortDir = SORT_DIRS.has(String(query.sort_dir || '').toLowerCase())
    ? String(query.sort_dir).toLowerCase()
    : 'desc'

  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.page_size) || 50))

  // Optional: resolve search against customer/staff names → user ids
  let matchingUserIds: string[] | null = null
  if (search) {
    const { data: matchedUsers } = await supabase
      .from('users')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
      )
      .limit(200)

    matchingUserIds = (matchedUsers || []).map((u) => u.id)
  }

  let dbQuery = supabase
    .from('discount_sales')
    .select(
      'id, created_at, discount_amount_rappen, discount_type, discount_reason, status, payment_method, appointment_id, user_id, staff_id',
      { count: 'exact' }
    )
    .eq('tenant_id', profile.tenant_id)
    .gt('discount_amount_rappen', 0)

  if (discountType) dbQuery = dbQuery.eq('discount_type', discountType)
  if (status) dbQuery = dbQuery.eq('status', status)
  if (dateFrom) dbQuery = dbQuery.gte('created_at', dateFrom)
  if (dateTo) dbQuery = dbQuery.lte('created_at', dateTo)
  if (kind === 'code') dbQuery = dbQuery.ilike('discount_reason', 'Code:%')
  else if (kind === 'manual') dbQuery = dbQuery.not('discount_reason', 'ilike', 'Code:%')

  if (search) {
    const orParts = [`discount_reason.ilike.%${search}%`]
    if (matchingUserIds && matchingUserIds.length > 0) {
      orParts.push(`user_id.in.(${matchingUserIds.join(',')})`)
      orParts.push(`staff_id.in.(${matchingUserIds.join(',')})`)
    }
    dbQuery = dbQuery.or(orParts.join(','))
  }

  // Fetch a wider window when we need client-side enrichment is not needed —
  // sort + paginate in DB.
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  dbQuery = dbQuery.order(sortBy, { ascending: sortDir === 'asc', nullsFirst: false })
  dbQuery = dbQuery.range(from, to)

  const { data: rows, error, count } = await dbQuery
  if (error) {
    logger.error('discount-usage query failed:', error)
    throw createError({ statusCode: 500, statusMessage: 'Verwendete Rabatte konnten nicht geladen werden' })
  }

  const list = rows || []
  const userIds = [...new Set(list.flatMap((r) => [r.user_id, r.staff_id].filter(Boolean)))] as string[]
  const appointmentIds = [...new Set(list.map((r) => r.appointment_id).filter(Boolean))] as string[]

  const [{ data: users }, { data: appointments }] = await Promise.all([
    userIds.length
      ? supabase.from('users').select('id, first_name, last_name, email').in('id', userIds)
      : Promise.resolve({ data: [] as any[] }),
    appointmentIds.length
      ? supabase.from('appointments').select('id, start_time, title, type').in('id', appointmentIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const userMap = new Map((users || []).map((u) => [u.id, u]))
  const apptMap = new Map((appointments || []).map((a) => [a.id, a]))

  const items = list.map((r) => {
    const customer = r.user_id ? userMap.get(r.user_id) || null : null
    const staff = r.staff_id ? userMap.get(r.staff_id) || null : null
    const appointment = r.appointment_id ? apptMap.get(r.appointment_id) || null : null
    const reason = r.discount_reason || ''
    const isCode = /^Code:/i.test(reason)
    return {
      id: r.id,
      created_at: r.created_at,
      discount_amount_rappen: r.discount_amount_rappen || 0,
      discount_type: r.discount_type || 'fixed',
      discount_reason: reason,
      status: r.status || null,
      payment_method: r.payment_method || null,
      appointment_id: r.appointment_id,
      kind: isCode ? 'code' : 'manual',
      customer: customer
        ? {
            id: customer.id,
            name: displayName(customer) || customer.email || '—',
            email: customer.email || null,
          }
        : null,
      staff: staff
        ? {
            id: staff.id,
            name: displayName(staff) || '—',
          }
        : null,
      appointment: appointment
        ? {
            id: appointment.id,
            start_time: appointment.start_time,
            title: appointment.title,
            type: appointment.type,
          }
        : null,
    }
  })

  // Lightweight totals for filtered set (cap at 5000 rows for sum)
  let totalsQuery = supabase
    .from('discount_sales')
    .select('discount_amount_rappen')
    .eq('tenant_id', profile.tenant_id)
    .gt('discount_amount_rappen', 0)
    .limit(5000)

  if (discountType) totalsQuery = totalsQuery.eq('discount_type', discountType)
  if (status) totalsQuery = totalsQuery.eq('status', status)
  if (dateFrom) totalsQuery = totalsQuery.gte('created_at', dateFrom)
  if (dateTo) totalsQuery = totalsQuery.lte('created_at', dateTo)
  if (kind === 'code') totalsQuery = totalsQuery.ilike('discount_reason', 'Code:%')
  else if (kind === 'manual') totalsQuery = totalsQuery.not('discount_reason', 'ilike', 'Code:%')
  if (search) {
    const orParts = [`discount_reason.ilike.%${search}%`]
    if (matchingUserIds && matchingUserIds.length > 0) {
      orParts.push(`user_id.in.(${matchingUserIds.join(',')})`)
      orParts.push(`staff_id.in.(${matchingUserIds.join(',')})`)
    }
    totalsQuery = totalsQuery.or(orParts.join(','))
  }

  const { data: sumRows } = await totalsQuery
  const totalAmountRappen = (sumRows || []).reduce(
    (sum, r) => sum + (r.discount_amount_rappen || 0),
    0
  )

  return {
    success: true,
    items,
    total: count ?? items.length,
    page,
    page_size: pageSize,
    total_amount_rappen: totalAmountRappen,
    sort_by: sortBy,
    sort_dir: sortDir,
  }
})
