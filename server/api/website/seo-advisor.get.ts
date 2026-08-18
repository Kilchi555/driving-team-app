import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { readSeoAdvisorQuota } from '~/server/utils/website-seo-advisor-quota'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const { data: user } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!user?.tenant_id || !['admin', 'tenant_admin'].includes(String(user.role || ''))) {
    throw createError({ statusCode: 403, statusMessage: 'Nur Admins' })
  }

  const { data: website } = await supabase
    .from('website_tenants')
    .select('seo_advisor_usage')
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  const quota = readSeoAdvisorQuota(website?.seo_advisor_usage)
  return {
    remaining: quota.remaining,
    limit: quota.limit,
    used: quota.count,
    resets_on: quota.resets_on,
    last: quota.last,
  }
})
