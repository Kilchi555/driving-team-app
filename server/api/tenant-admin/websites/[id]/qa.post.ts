import { applyWebsiteQaDecision } from '~/server/utils/website-lifecycle'
import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { unpublishWebsiteForTenant } from '~/server/utils/website-billing'

export default defineEventHandler(async (event) => {
  const auth = await requireSuperAdmin(event)
  const tenantId = getRouterParam(event, 'id')
  if (!tenantId) throw createError({ statusCode: 400, statusMessage: 'tenant id required' })

  const body = (await readBody(event)) || {}
  const decision = String(body.decision || '')
  if (decision !== 'approved' && decision !== 'rejected' && decision !== 'disabled') {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige QA-Entscheidung' })
  }

  const supabase = getSupabaseAdmin()
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, website_only, website_status')
    .eq('id', tenantId)
    .maybeSingle()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!tenant) throw createError({ statusCode: 404, statusMessage: 'Tenant nicht gefunden' })

  const patch = applyWebsiteQaDecision({
    decision,
    actorId: auth.id,
  })

  const { data: updated, error: updateError } = await supabase
    .from('tenants')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', tenantId)
    .select('id, website_status, website_approved_at, website_approved_by')
    .single()
  if (updateError) throw createError({ statusCode: 500, statusMessage: updateError.message })

  if (decision === 'disabled' || (decision === 'rejected' && tenant.website_status === 'live')) {
    await unpublishWebsiteForTenant(supabase, tenantId)
    if (decision === 'rejected') {
      await supabase
        .from('tenants')
        .update({ website_status: 'pending_review', updated_at: new Date().toISOString() })
        .eq('id', tenantId)
    }
  }

  const { data: latest } = await supabase
    .from('tenants')
    .select('id, website_status, website_approved_at, website_approved_by')
    .eq('id', tenantId)
    .maybeSingle()

  return {
    success: true,
    tenant: latest || updated,
    decision,
  }
})
