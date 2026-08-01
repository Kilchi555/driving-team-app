import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const query = getQuery(event)
  const tenantId = (query.tenantId as string) || authUser.tenant_id
  if (!tenantId) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId required' })
  }

  if (authUser.role !== 'super_admin' && tenantId !== authUser.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('marketing_offers')
    .select('*, discounts:discount_id(id, code, discount_type, discount_value, valid_until), email_campaigns:campaign_id(id, name, status, sent_count, total_recipients)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { offers: data || [] }
})
