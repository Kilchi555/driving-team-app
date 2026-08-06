import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { queueCampaignSend } from '~/server/utils/marketing-campaign-send'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { tenantId, dailyLimit, pilotLimit, startAt } = body

  if (!tenantId || !campaignId) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId and campaignId are required' })
  }

  const isPilot = typeof pilotLimit === 'number' && pilotLimit > 0

  return await queueCampaignSend({
    supabase: getSupabaseAdmin(),
    campaignId,
    tenantId,
    dailyLimit: typeof dailyLimit === 'number' ? dailyLimit : undefined,
    batchLimit: isPilot ? pilotLimit : undefined,
    fromSchedule: false,
    startAt: typeof startAt === 'string' ? startAt : undefined,
  })
})
