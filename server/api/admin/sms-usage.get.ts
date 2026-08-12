import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getTenantSmsQuotaSnapshot, estimateSmsCostChf } from '~/server/utils/sms-quota'
import { previewAppointmentSms } from '~/server/utils/sms-templates'
import { SMS_OVERAGE_CHF_PER_SEGMENT } from '~/utils/planFeatures'
import { DEFAULT_BOOKING_POLICY } from '~/server/api/admin/booking-policy.get'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const { data: dbUser } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!dbUser || !['admin', 'superadmin', 'staff'].includes(dbUser.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const snapshot = await getTenantSmsQuotaSnapshot(supabase, dbUser.tenant_id)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('booking_policy')
    .eq('id', dbUser.tenant_id)
    .single()

  const policy = { ...DEFAULT_BOOKING_POLICY, ...(tenant?.booking_policy || {}) }
  const { isSmsOverageWaived } = await import('~/server/utils/sms-quota')
  const length = policy.sms_message_length === 'long' ? 'long' : 'short'
  const shortPreview = previewAppointmentSms('short', 'confirmation')
  const longPreview = previewAppointmentSms('long', 'confirmation')

  return {
    success: true,
    usage: snapshot,
    overageRateChf: SMS_OVERAGE_CHF_PER_SEGMENT,
    policy: {
      confirmation_sms_enabled: policy.confirmation_sms_enabled !== false,
      reminder_sms_enabled: policy.reminder_sms_enabled !== false,
      sms_message_length: length,
      sms_hard_stop_on_quota: policy.sms_hard_stop_on_quota === true,
      sms_overage_waived: isSmsOverageWaived(policy),
      sms_overage_waived_until: policy.sms_overage_waived_until || null,
    },
    previews: {
      short: {
        ...shortPreview,
        costChf: estimateSmsCostChf(shortPreview.segments),
      },
      long: {
        ...longPreview,
        costChf: estimateSmsCostChf(longPreview.segments),
      },
    },
  }
})
