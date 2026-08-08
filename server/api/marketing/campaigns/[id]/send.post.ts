import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { queueCampaignSend } from '~/server/utils/marketing-campaign-send'
import { requireAdminProfile } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'staff', 'super_admin', 'tenant_admin'])

  const campaignId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { tenantId, dailyLimit, pilotLimit, startAt } = body

  if (!campaignId) {
    throw createError({ statusCode: 400, statusMessage: 'campaignId is required' })
  }

  const effectiveTenantId = profile.role === 'super_admin' && tenantId
    ? tenantId
    : profile.tenant_id

  if (!effectiveTenantId) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId is required' })
  }

  // Verify campaign belongs to tenant before queueing
  const supabase = getSupabaseAdmin()
  const { data: campaign, error: campaignError } = await supabase
    .from('email_campaigns')
    .select('id, tenant_id')
    .eq('id', campaignId)
    .eq('tenant_id', effectiveTenantId)
    .maybeSingle()

  if (campaignError || !campaign) {
    throw createError({ statusCode: 404, statusMessage: 'Campaign not found' })
  }

  const isPilot = typeof pilotLimit === 'number' && pilotLimit > 0

  return await queueCampaignSend({
    supabase,
    campaignId,
    tenantId: effectiveTenantId,
    dailyLimit: typeof dailyLimit === 'number' ? dailyLimit : undefined,
    batchLimit: isPilot ? pilotLimit : undefined,
    fromSchedule: false,
    startAt: typeof startAt === 'string' ? startAt : undefined,
  })
})
