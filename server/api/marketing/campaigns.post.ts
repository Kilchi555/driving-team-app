import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { computeNextRunAt, type ScheduleFrequency } from '~/server/utils/campaign-schedule'
import { requireAdminProfile } from '~/server/utils/auth'

interface VariantInput {
  templateId: string
  label: 'a' | 'b' | 'c' | 'd' | 'e'
  splitPct: number
  subjectOverride?: string
}

interface ScheduleInput {
  enabled?: boolean
  frequency?: ScheduleFrequency
  dayOfWeek?: number
  hour?: number
  batchSize?: number
  repeatMode?: 'once' | 'repeat'
  repeatIntervalDays?: number
}

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'staff', 'super_admin', 'tenant_admin'])

  const body = await readBody(event)
  const { tenantId, createdBy, name, subject_override, segment_filter = {}, variants, schedule } = body as {
    tenantId?: string
    createdBy?: string
    name?: string
    subject_override?: string
    segment_filter?: Record<string, any>
    variants?: VariantInput[]
    schedule?: ScheduleInput
  }

  const effectiveTenantId =
    profile.role === 'super_admin' && tenantId ? tenantId : profile.tenant_id

  if (!effectiveTenantId || !name) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId and name are required' })
  }

  if (
    profile.role !== 'super_admin' &&
    tenantId &&
    tenantId !== profile.tenant_id
  ) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden – tenant mismatch' })
  }

  const variantList: VariantInput[] = Array.isArray(variants) && variants.length > 0
    ? variants
    : null as any

  if (!variantList) {
    throw createError({ statusCode: 400, statusMessage: 'variants array with at least one entry is required' })
  }

  const totalPct = variantList.reduce((sum, v) => sum + (v.splitPct ?? 0), 0)
  if (totalPct !== 100) {
    throw createError({ statusCode: 400, statusMessage: `Variant split percentages must sum to 100 (got ${totalPct})` })
  }

  const supabase = getSupabaseAdmin()
  const primaryTemplateId = variantList.find(v => v.label === 'a')?.templateId ?? variantList[0].templateId

  const scheduleEnabled = !!schedule?.enabled
  const frequency: ScheduleFrequency = schedule?.frequency || 'weekly'
  const dayOfWeek = frequency === 'weekly' ? (schedule?.dayOfWeek ?? 1) : null
  const hour = typeof schedule?.hour === 'number' ? schedule.hour : 9
  const batchSize = typeof schedule?.batchSize === 'number' && schedule.batchSize > 0
    ? Math.min(2000, schedule.batchSize)
    : 500
  const repeatMode = schedule?.repeatMode === 'repeat' ? 'repeat' : 'once'
  const repeatIntervalDays = typeof schedule?.repeatIntervalDays === 'number' && schedule.repeatIntervalDays > 0
    ? Math.min(365, Math.max(1, Math.round(schedule.repeatIntervalDays)))
    : 30

  const insertRow: Record<string, any> = {
    tenant_id: effectiveTenantId,
    created_by: createdBy || profile.id || null,
    name,
    template_id: primaryTemplateId,
    subject_override: subject_override || null,
    segment_filter,
    status: scheduleEnabled ? 'recurring' : 'draft',
    schedule_repeat_mode: repeatMode,
    schedule_repeat_interval_days: repeatIntervalDays,
  }

  if (scheduleEnabled) {
    insertRow.schedule_enabled = true
    insertRow.schedule_frequency = frequency
    insertRow.schedule_day_of_week = dayOfWeek
    insertRow.schedule_hour = hour
    insertRow.schedule_batch_size = batchSize
    insertRow.next_run_at = computeNextRunAt({ frequency, dayOfWeek, hour }).toISOString()
  }

  const { data: campaign, error: campErr } = await supabase
    .from('email_campaigns')
    .insert(insertRow)
    .select()
    .single()

  if (campErr || !campaign) throw createError({ statusCode: 500, statusMessage: campErr?.message ?? 'Failed to create campaign' })

  const { error: varErr } = await supabase
    .from('email_campaign_variants')
    .insert(variantList.map(v => ({
      campaign_id: campaign.id,
      template_id: v.templateId,
      label: v.label,
      split_pct: v.splitPct,
      subject_override: v.subjectOverride || null,
    })))

  if (varErr) throw createError({ statusCode: 500, statusMessage: varErr.message })

  return { campaign }
})
