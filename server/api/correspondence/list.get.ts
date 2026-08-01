// GET /api/correspondence/list

import { getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireCorrespondenceStaff } from '~/server/utils/correspondence'

export default defineEventHandler(async (event) => {
  const staff = await requireCorrespondenceStaff(event)
  const query = getQuery(event)
  const pageNum = parseInt(String(query.page || '1')) || 1
  const limitNum = Math.min(parseInt(String(query.limit || '20')) || 20, 100)
  const from = (pageNum - 1) * limitNum
  const to = from + limitNum - 1

  const supabase = getSupabaseAdmin()
  let q = supabase
    .from('correspondence')
    .select('*', { count: 'exact' })
    .eq('tenant_id', staff.tenant_id)

  if (query.status) {
    const statuses = String(query.status).split(',').map(s => s.trim()).filter(Boolean)
    if (statuses.length) q = q.in('status', statuses)
  }
  if (query.user_id) q = q.eq('user_id', String(query.user_id))
  if (query.company_id) q = q.eq('company_id', String(query.company_id))
  if (query.q || query.search) {
    const term = String(query.q || query.search).trim()
    if (term) {
      q = q.or(
        `reference_number.ilike.%${term}%,subject.ilike.%${term}%,recipient_name.ilike.%${term}%,billing_company_name.ilike.%${term}%`
      )
    }
  }

  q = q.order('created_at', { ascending: false }).range(from, to)

  const { data, count, error } = await q
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return {
    success: true,
    data: data || [],
    total: count || 0,
    page: pageNum,
    limit: limitNum,
  }
})
