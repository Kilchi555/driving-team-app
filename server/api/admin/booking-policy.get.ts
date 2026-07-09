import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

export interface BookingPolicy {
  // ── Internal (staff creates student) ──────────────────────────────────────
  student_required_fields: string[]
  student_optional_fields: string[]
  // ── External (customer books online) ──────────────────────────────────────
  /** Fields the customer MUST fill in during the self-service booking flow. */
  booking_required_fields: string[]
  /** Fields the customer MAY fill in (shown but not mandatory). */
  booking_optional_fields: string[]
  /**
   * When false (default): customer can complete the booking by entering name/
   * phone/email without creating a password. An onboarding SMS is sent
   * afterwards so they can activate their account at their own pace.
   * When true: customer must register / log in before the booking is confirmed.
   */
  registration_required: boolean
  // ── Confirmation & Onboarding ──────────────────────────────────────────────
  confirmation_email_enabled: boolean
  confirmation_email_mode: 'always' | 'after_registration' | 'never'
  registration_reminder_enabled: boolean
  registration_reminder_days: number
  registration_reminder_email_enabled: boolean
  registration_reminder_sms_enabled: boolean
  onboarding_sms_enabled: boolean
  onboarding_email_enabled: boolean
  // ── Staff permissions ──────────────────────────────────────────────────────
  staff_refund_permission: 'hidden' | 'request' | 'allowed'
  staff_invoice_permission: 'hidden' | 'create_only' | 'create_and_send'
}

export const DEFAULT_BOOKING_POLICY: BookingPolicy = {
  student_required_fields: ['first_name', 'last_name', 'phone'],
  student_optional_fields: ['email'],
  booking_required_fields: ['first_name', 'last_name', 'phone'],
  booking_optional_fields: ['email'],
  registration_required: false,
  confirmation_email_enabled: true,
  confirmation_email_mode: 'always',
  registration_reminder_enabled: false,
  registration_reminder_days: 7,
  registration_reminder_email_enabled: true,
  registration_reminder_sms_enabled: true,
  onboarding_sms_enabled: true,
  onboarding_email_enabled: false,
  staff_refund_permission: 'hidden',
  staff_invoice_permission: 'create_and_send',
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
