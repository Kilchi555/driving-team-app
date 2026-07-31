/**
 * Cron: process recurring marketing campaigns that are due this hour (Europe/Zurich).
 * Runs hourly — checks schedule_day_of_week + schedule_hour and last_run_at.
 */
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { isScheduleDueNow } from '~/server/utils/campaign-schedule'
import { queueCampaignSend } from '~/server/utils/marketing-campaign-send'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const now = new Date()

  const { data: campaigns, error } = await supabase
    .from('email_campaigns')
    .select('id, tenant_id, name, schedule_enabled, schedule_frequency, schedule_day_of_week, schedule_hour, schedule_batch_size, last_run_at, status')
    .eq('schedule_enabled', true)

  if (error) {
    console.error('[ScheduledCampaigns] load error:', error)
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const due = (campaigns || []).filter(c => isScheduleDueNow(c, now))
  const results: any[] = []

  for (const campaign of due) {
    try {
      console.log(`[ScheduledCampaigns] Running "${campaign.name}" (${campaign.id})`)
      const result = await queueCampaignSend({
        supabase,
        campaignId: campaign.id,
        tenantId: campaign.tenant_id,
        batchLimit: campaign.schedule_batch_size || 500,
        dailyLimit: Math.min(500, campaign.schedule_batch_size || 500),
        fromSchedule: true,
      })
      results.push({
        campaignId: campaign.id,
        name: campaign.name,
        ...result,
      })
    } catch (err: any) {
      console.error(`[ScheduledCampaigns] Failed ${campaign.id}:`, err?.message || err)
      results.push({
        campaignId: campaign.id,
        name: campaign.name,
        success: false,
        error: err?.message || String(err),
      })
    }
  }

  return {
    success: true,
    checked: campaigns?.length ?? 0,
    due: due.length,
    results,
  }
})
