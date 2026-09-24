import { getAuthenticatedUser } from '~/server/utils/auth'
import { claimWebsiteProspect } from '~/server/utils/website-lifecycle'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthenticated' })
  }

  const supabase = getSupabaseAdmin()
  const { data: user } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()

  const tenantId = user?.tenant_id || authUser.tenant_id || authUser.profile?.tenant_id
  if (!tenantId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthenticated' })
  }

  const body = (await readBody(event)) || {}
  const result = await claimWebsiteProspect({
    supabase,
    token: body.token ?? body.claim_token,
    actorTenantId: tenantId,
  })

  if (!result.ok) {
    const status =
      result.reason === 'foreign_tenant' || result.reason === 'already_claimed' ? 403 : 400
    throw createError({
      statusCode: status,
      statusMessage: 'Claim nicht möglich',
      data: { code: 'website_claim_denied', reason: result.reason },
    })
  }

  const { recordWebsiteLifecycleEvent } = await import('~/server/utils/website-lifecycle-audit')
  await recordWebsiteLifecycleEvent({
    supabase,
    event: 'website_claimed',
    websiteId: result.websiteId,
    tenantId: result.tenantId,
    metadata: { prospect_id: result.prospectId, idempotent: result.idempotent },
  }).catch(() => undefined)

  return {
    success: true,
    claimed: true,
    idempotent: result.idempotent,
    prospect_id: result.prospectId,
    tenant_id: result.tenantId,
    website_id: result.websiteId,
  }
})
