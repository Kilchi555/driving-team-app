import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const query = getQuery(event)
  const status = String(query.status || '').trim()
  const supabase = getSupabaseAdmin()

  let q = supabase
    .from('website_prospects')
    .select(
      'id, name, business_type, existing_url, hostname, city, status, opportunity_score, seo_score, speed_score, freshness_score, preview_url, email, created_at, updated_at',
    )
    .order('opportunity_score', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(100)

  if (status && status !== 'all') q = q.eq('status', status)

  const { data, error } = await q
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true, prospects: data || [] }
})
