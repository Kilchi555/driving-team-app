import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/utils/supabase'
import { escapeLikePattern } from '~/server/utils/sql-helpers'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)

  const query = getQuery(event)
  const batchId = query.batchId as string
  const limit = Math.min(parseInt((query.limit as string) ?? '50'), 500)
  const offset = parseInt((query.offset as string) ?? '0')
  const search = (query.search as string | undefined)?.trim() || undefined

  if (!batchId) {
    throw createError({ statusCode: 400, statusMessage: 'batchId is required' })
  }

  const supabaseAdmin = getSupabaseAdmin()

  let q = supabaseAdmin
    .from('imported_records')
    .select('*', { count: 'exact' })
    .eq('tenant_id', profile.tenant_id)
    .eq('batch_id', batchId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (search) {
    q = q.ilike('raw_json::text', `%${escapeLikePattern(search)}%`)
  }

  const { data, error, count } = await q

  if (error) {
    console.error('Error fetching records:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch records' })
  }

  return {
    success: true,
    records: data ?? [],
    total: count ?? 0
  }
})
