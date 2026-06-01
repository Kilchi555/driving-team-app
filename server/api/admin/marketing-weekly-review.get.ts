import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

// Returns the latest weekly marketing review for the current tenant
export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  if (!user || !['admin', 'super_admin'].includes(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }

  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('marketing_weekly_reviews')
    .select('*')
    .eq('tenant_id', user.tenant_id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null
  return data
})
