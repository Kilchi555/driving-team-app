import { getAuthenticatedUser } from '~/server/utils/auth'
import { isMissingWebsiteRelation } from '~/server/utils/website-lifecycle-audit'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const { data: user } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_user_id', authUser.id)
    .single()

  const tenantId = user?.tenant_id || authUser.tenant_id || authUser.profile?.tenant_id
  if (!tenantId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const queryWebsiteId = String(getQuery(event).website_id || '')
  const { data: website } = await supabase
    .from('website_tenants')
    .select('id')
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!website) {
    throw createError({ statusCode: 404, statusMessage: 'Website not found' })
  }
  if (queryWebsiteId && queryWebsiteId !== website.id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'website_id gehört nicht zu diesem Tenant',
      data: { code: 'website_revision_foreign_website' },
    })
  }

  const { data, error } = await supabase
    .from('website_revisions')
    .select('id, website_id, tenant_id, version_number, status, source_revision_id, created_at, created_by, published_at, published_by')
    .eq('website_id', website.id)
    .eq('tenant_id', tenantId)
    .order('version_number', { ascending: false })

  if (error && isMissingWebsiteRelation(error)) {
    return { revisions: [], unprovisioned: true }
  }
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { revisions: data || [], unprovisioned: false }
})
