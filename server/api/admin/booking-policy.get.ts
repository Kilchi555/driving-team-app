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
   * How the customer can provide a meeting point on inquiry / booking intake.
   * Multiple modes can be enabled; the customer picks one when more than one is set.
   * - locations: choose a standard meeting point
   * - pickup_address: enter preferred home pickup address
   * - callback: request a phone callback
   */
  location_intake_modes: Array<'locations' | 'pickup_address' | 'callback'>
  /** @deprecated use location_intake_modes — kept for backward compatibility when reading old policies */
  location_intake_mode?: 'locations' | 'pickup_address' | 'callback'
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
  /** SMS confirmation when customer has phone but no email (default true) */
  confirmation_sms_enabled: boolean
  /** SMS reminder when customer has phone but no email (default true) */
  reminder_sms_enabled: boolean
  /** short = ~1 segment, long = ~2 segments with link/extra text */
  sms_message_length: 'short' | 'long'
  /** When true, stop billable SMS once included segments are used */
  sms_hard_stop_on_quota: boolean
  // ── Staff permissions ──────────────────────────────────────────────────────
  staff_refund_permission: 'hidden' | 'request' | 'allowed'
  staff_invoice_permission: 'hidden' | 'create_only' | 'create_and_send'
}

export const DEFAULT_BOOKING_POLICY: BookingPolicy = {
  student_required_fields: ['first_name', 'last_name', 'phone'],
  student_optional_fields: ['email'],
  booking_required_fields: ['first_name', 'last_name', 'phone'],
  booking_optional_fields: ['email'],
  location_intake_modes: ['locations'],
  registration_required: false,
  confirmation_email_enabled: true,
  confirmation_email_mode: 'always',
  registration_reminder_enabled: false,
  registration_reminder_days: 7,
  registration_reminder_email_enabled: true,
  registration_reminder_sms_enabled: true,
  onboarding_sms_enabled: true,
  onboarding_email_enabled: false,
  confirmation_sms_enabled: true,
  reminder_sms_enabled: true,
  sms_message_length: 'short',
  sms_hard_stop_on_quota: false,
  staff_refund_permission: 'hidden',
  staff_invoice_permission: 'create_and_send',
}

export type LocationIntakeMode = 'locations' | 'pickup_address' | 'callback'
export const VALID_LOCATION_INTAKE_MODES: LocationIntakeMode[] = ['locations', 'pickup_address', 'callback']

/** Normalize legacy singular location_intake_mode + new location_intake_modes array. */
export function normalizeLocationIntakeModes(policy: Partial<BookingPolicy> | Record<string, any> | null | undefined): LocationIntakeMode[] {
  const raw = policy || {}
  const fromArray = Array.isArray(raw.location_intake_modes)
    ? (raw.location_intake_modes as string[]).filter((m): m is LocationIntakeMode =>
        VALID_LOCATION_INTAKE_MODES.includes(m as LocationIntakeMode)
      )
    : []
  if (fromArray.length > 0) return fromArray

  if (VALID_LOCATION_INTAKE_MODES.includes(raw.location_intake_mode as LocationIntakeMode)) {
    return [raw.location_intake_mode as LocationIntakeMode]
  }

  return [...DEFAULT_BOOKING_POLICY.location_intake_modes]
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

  const merged = {
    ...DEFAULT_BOOKING_POLICY,
    ...(tenant?.booking_policy ?? {}),
  }
  const policy: BookingPolicy = {
    ...merged,
    location_intake_modes: normalizeLocationIntakeModes(merged),
  }

  return { success: true, policy }
})
