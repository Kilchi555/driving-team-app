import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const {
    tenantId,
    status,
    category,
    search,
    page = '1',
    limit = '50',
  } = query as Record<string, string>

  if (!tenantId) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId is required' })
  }

  const supabase = getSupabaseAdmin()
  const pageNum = Math.max(1, parseInt(page))
  const pageSize = Math.min(200, Math.max(1, parseInt(limit)))
  const offset = (pageNum - 1) * pageSize

  let q = supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (status && status !== 'all') {
    if (status === 'not_unsubscribed') q = q.neq('status', 'unsubscribed')
    else q = q.eq('status', status)
  }
  if (category) q = q.contains('categories', [category])
  if (search) {
    q = q.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
  }

  const { data, error, count } = await q

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { leads: data ?? [], total: count ?? 0, page: pageNum, limit: pageSize }
})
