import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const tenantId = query.tenantId as string
  const batchId = query.batchId as string
  const limit = parseInt((query.limit as string) ?? '50')
  const offset = parseInt((query.offset as string) ?? '0')
  const search = (query.search as string | undefined)?.trim() || undefined

  if (!tenantId || !batchId) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId and batchId are required' })
  }

  const supabaseAdmin = getSupabaseAdmin()

  let q = supabaseAdmin
    .from('imported_records')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .eq('batch_id', batchId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (search) {
    q = q.ilike('raw_json::text', `%${search}%`)
  }

  const { data, error, count } = await q

  if (error) {
    console.error('Error fetching records:', error)
    throw createError({ statusCode: 500, statusMessage: `Failed to fetch records: ${error.message}` })
  }

  return {
    success: true,
    records: data ?? [],
    total: count ?? 0
  }
})
