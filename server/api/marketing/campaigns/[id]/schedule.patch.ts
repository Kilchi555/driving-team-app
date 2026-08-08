import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { computeNextRunAt, type ScheduleFrequency } from '~/server/utils/campaign-schedule'
import { requireAdminProfile } from '~/server/utils/auth'

/**
 * PATCH /api/marketing/campaigns/:id/schedule
 * Enable, update, or pause a recurring campaign schedule.
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'staff', 'super_admin', 'tenant_admin'])
  const campaignId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const {
    tenantId,
    enabled,
    frequency,
    dayOfWeek,
    hour,
    batchSize,
    repeatMode,
    repeatIntervalDays,
  } = body as {
    tenantId?: string
    enabled?: boolean
    frequency?: ScheduleFrequency
    dayOfWeek?: number | null
    hour?: number
    batchSize?: number
    repeatMode?: 'once' | 'repeat'
    repeatIntervalDays?: number
  }

  const effectiveTenantId =
    profile.role === 'super_admin' && tenantId ? tenantId : profile.tenant_id

  if (!campaignId || !effectiveTenantId) {
    throw createError({ statusCode: 400, statusMessage: 'campaign id and tenantId are required' })
  }
  if (profile.role !== 'super_admin' && tenantId && tenantId !== profile.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden – tenant mismatch' })
  }

  const supabase = getSupabaseAdmin()

  const { data: campaign, error } = await supabase
    .from('email_campaigns')
    .select('id, status, schedule_enabled, schedule_frequency, schedule_day_of_week, schedule_hour, schedule_batch_size, schedule_repeat_mode, schedule_repeat_interval_days')
    .eq('id', campaignId)
    .eq('tenant_id', effectiveTenantId)
    .single()

  if (error || !campaign) {
    throw createError({ statusCode: 404, statusMessage: 'Campaign not found' })
  }

  const nextEnabled = typeof enabled === 'boolean' ? enabled : campaign.schedule_enabled
  const nextFrequency: ScheduleFrequency = (frequency || campaign.schedule_frequency || 'weekly') as ScheduleFrequency
  const nextDow = nextFrequency === 'weekly'
    ? (typeof dayOfWeek === 'number' ? dayOfWeek : (campaign.schedule_day_of_week ?? 1))
    : null
  const nextHour = typeof hour === 'number' ? hour : (campaign.schedule_hour ?? 9)
  const nextBatch = typeof batchSize === 'number' && batchSize > 0
    ? Math.min(2000, batchSize)
    : (campaign.schedule_batch_size ?? 500)
  const nextRepeatMode = repeatMode === 'repeat' || repeatMode === 'once'
    ? repeatMode
    : ((campaign as any).schedule_repeat_mode === 'repeat' ? 'repeat' : 'once')
  const nextInterval = typeof repeatIntervalDays === 'number' && repeatIntervalDays > 0
    ? Math.min(365, Math.max(1, Math.round(repeatIntervalDays)))
    : ((campaign as any).schedule_repeat_interval_days ?? 30)

  if (nextFrequency === 'weekly' && (nextDow == null || nextDow < 1 || nextDow > 7)) {
    throw createError({ statusCode: 400, statusMessage: 'dayOfWeek must be 1–7 for weekly schedules' })
  }
  if (nextHour < 0 || nextHour > 23) {
    throw createError({ statusCode: 400, statusMessage: 'hour must be 0–23' })
  }

  const patch: Record<string, any> = {
    schedule_enabled: nextEnabled,
    schedule_frequency: nextFrequency,
    schedule_day_of_week: nextDow,
    schedule_hour: nextHour,
    schedule_batch_size: nextBatch,
    schedule_repeat_mode: nextRepeatMode,
    schedule_repeat_interval_days: nextInterval,
  }

  if (nextEnabled) {
    patch.next_run_at = computeNextRunAt({
      frequency: nextFrequency,
      dayOfWeek: nextDow,
      hour: nextHour,
    }).toISOString()
    if (['draft', 'pilot', 'sent'].includes(campaign.status)) {
      patch.status = 'recurring'
    }
  } else {
    patch.next_run_at = null
    if (campaign.status === 'recurring') {
      patch.status = 'pilot'
    }
  }

  const { data: updated, error: updateErr } = await supabase
    .from('email_campaigns')
    .update(patch)
    .eq('id', campaignId)
    .eq('tenant_id', effectiveTenantId)
    .select()
    .single()

  if (updateErr) throw createError({ statusCode: 500, statusMessage: updateErr.message })

  return { success: true, campaign: updated }
})
