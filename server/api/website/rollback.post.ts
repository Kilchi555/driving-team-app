import { getAuthenticatedUser } from '~/server/utils/auth'
import { recordWebsiteLifecycleEvent } from '~/server/utils/website-lifecycle-audit'
import { rollbackWebsiteRevision } from '~/server/utils/website-revision'
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

  const body = (await readBody(event)) || {}
  const requestedWebsiteId = typeof body.website_id === 'string' ? body.website_id : null
  const targetRevisionId = typeof body.revision_id === 'string' ? body.revision_id : ''
  if (!targetRevisionId) {
    throw createError({ statusCode: 400, statusMessage: 'revision_id required' })
  }

  const { data: website } = await supabase
    .from('website_tenants')
    .select('id, tenant_id')
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!website) {
    throw createError({ statusCode: 404, statusMessage: 'Website not found' })
  }
  if (requestedWebsiteId && requestedWebsiteId !== website.id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'website_id gehört nicht zu diesem Tenant',
      data: { code: 'website_revision_foreign_website' },
    })
  }

  const result = await rollbackWebsiteRevision({
    supabase,
    tenantId,
    websiteId: website.id,
    targetRevisionId,
    actorId: authUser.id,
  })

  await recordWebsiteLifecycleEvent({
    supabase,
    event: 'rollback',
    websiteId: website.id,
    tenantId,
    revisionId: result.revision?.id || null,
    actorId: authUser.id,
    metadata: {
      source_revision_id: targetRevisionId,
      version_number: result.revision?.version_number || null,
    },
  }).catch(() => undefined)

  return {
    success: true,
    revision: result.revision,
    skipped: result.skipped,
    idempotent: result.idempotent,
  }
})
