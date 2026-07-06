import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

export interface BookingPolicy {
  student_required_fields: string[]
  confirmation_email_enabled: boolean
  confirmation_email_mode: 'always' | 'after_registration' | 'never'
  registration_required: boolean
  registration_reminder_enabled: boolean
  registration_reminder_days: number
  registration_reminder_email_enabled: boolean
  registration_reminder_sms_enabled: boolean
  onboarding_sms_enabled: boolean
  staff_refund_permission: 'hidden' | 'request' | 'allowed'
}

export const DEFAULT_BOOKING_POLICY: BookingPolicy = {
  student_required_fields: ['first_name', 'last_name', 'phone'],
  confirmation_email_enabled: true,
  confirmation_email_mode: 'always',
  registration_required: false,
  registration_reminder_enabled: false,
  registration_reminder_days: 7,
  registration_reminder_email_enabled: true,
  registration_reminder_sms_enabled: true,
  onboarding_sms_enabled: true,
  staff_refund_permission: 'hidden',
}

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

  const { data: tenant } = await supabase
    .from('tenants')
    .select('booking_policy')
    .eq('id', dbUser.tenant_id)
    .maybeSingle()

  const policy: BookingPolicy = {
    ...DEFAULT_BOOKING_POLICY,
    ...(tenant?.booking_policy ?? {}),
  }

  return { success: true, policy }
})
