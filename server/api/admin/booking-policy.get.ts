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
  /**
   * Public /register/[tenant] — category selection step.
   * hidden | optional | required (default required for driving schools via UI; API default required)
   */
  registration_categories_mode: 'hidden' | 'optional' | 'required'
  /**
   * Public /register/[tenant] — Lernfahrausweis upload step.
   * hidden | optional | required
   */
  registration_lernfahrausweis_mode: 'hidden' | 'optional' | 'required'
  /**
   * Public /register/[tenant] — preferred days/times + notes (creates booking_proposal).
   * hidden | optional | required
   */
  registration_proposal_mode: 'hidden' | 'optional' | 'required'
  /**
   * Public /register/[tenant] — Account step (email/password/AGB).
   * required = full login registration (default)
   * hidden = no password; creates pending client only (lead / inquiry style)
   */
  registration_account_mode: 'hidden' | 'required'
  // ── Confirmation & Onboarding ──────────────────────────────────────────────
  confirmation_email_enabled: boolean
  confirmation_email_mode: 'always' | 'after_registration' | 'never'
  /**
   * Notify assigned staff on booking proposals / online bookings.
   * Does not affect customer emails or tenant contact_email inquiry inbox.
   */
  staff_booking_notification_enabled: boolean
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
  // ── Auto-invoice after appointment completion (default OFF) ────────────────
  /**
   * When true, completing an appointment with payment_method=invoice
   * automatically creates and emails a formal invoice.
   */
  auto_invoice_on_complete: boolean
  /**
   * Who receives the invoice PDF email.
   * - customer: student's billing email
   * - office: predefined office/admin email (for print + postal)
   * - both: customer and office
   */
  auto_invoice_recipient: 'customer' | 'office' | 'both'
  /** Predefined email for office/print workflow (required when recipient is office|both) */
  auto_invoice_office_email: string | null
  /**
   * Scheduled auto-invoice for past uninvoiced invoice-payments (default off).
   * Cron runs daily and invoices only tenants whose schedule matches today (Europe/Zurich).
   * Groups open items into one Sammelrechnung per customer.
   */
  auto_invoice_schedule: 'off' | 'daily' | 'weekly' | 'monthly'
  /** ISO weekday 1=Mon … 7=Sun — used when schedule is weekly (default Monday) */
  auto_invoice_schedule_weekday: number
  /** Day of month 1–28 — used when schedule is monthly (default 1) */
  auto_invoice_schedule_day: number
}

export type AutoInvoiceRecipient = BookingPolicy['auto_invoice_recipient']
export const VALID_AUTO_INVOICE_RECIPIENTS: AutoInvoiceRecipient[] = ['customer', 'office', 'both']

export type AutoInvoiceSchedule = BookingPolicy['auto_invoice_schedule']
export const VALID_AUTO_INVOICE_SCHEDULES: AutoInvoiceSchedule[] = ['off', 'daily', 'weekly', 'monthly']

export function normalizeAutoInvoiceSchedule(value: unknown): AutoInvoiceSchedule {
  if (VALID_AUTO_INVOICE_SCHEDULES.includes(value as AutoInvoiceSchedule)) {
    return value as AutoInvoiceSchedule
  }
  return 'off'
}

export function normalizeAutoInvoiceWeekday(value: unknown): number {
  const n = Number(value)
  if (Number.isInteger(n) && n >= 1 && n <= 7) return n
  return 1
}

export function normalizeAutoInvoiceMonthDay(value: unknown): number {
  const n = Number(value)
  if (Number.isInteger(n) && n >= 1 && n <= 28) return n
  return 1
}

export const DEFAULT_BOOKING_POLICY: BookingPolicy = {
  student_required_fields: ['first_name', 'last_name', 'phone'],
  student_optional_fields: ['email'],
  booking_required_fields: ['first_name', 'last_name', 'phone'],
  booking_optional_fields: ['email'],
  location_intake_modes: ['locations'],
  registration_required: false,
  registration_categories_mode: 'required',
  registration_lernfahrausweis_mode: 'optional',
  registration_proposal_mode: 'optional',
  registration_account_mode: 'required',
  confirmation_email_enabled: true,
  confirmation_email_mode: 'always',
  staff_booking_notification_enabled: true,
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
  auto_invoice_on_complete: false,
  auto_invoice_recipient: 'customer',
  auto_invoice_office_email: null,
  auto_invoice_schedule: 'off',
  auto_invoice_schedule_weekday: 1,
  auto_invoice_schedule_day: 1,
}

export type LocationIntakeMode = 'locations' | 'pickup_address' | 'callback'
export const VALID_LOCATION_INTAKE_MODES: LocationIntakeMode[] = ['locations', 'pickup_address', 'callback']

export type RegistrationFieldMode = 'hidden' | 'optional' | 'required'
export const VALID_REGISTRATION_FIELD_MODES: RegistrationFieldMode[] = ['hidden', 'optional', 'required']

export type RegistrationAccountMode = 'hidden' | 'required'
export const VALID_REGISTRATION_ACCOUNT_MODES: RegistrationAccountMode[] = ['hidden', 'required']

export function normalizeRegistrationFieldMode(
  value: unknown,
  fallback: RegistrationFieldMode
): RegistrationFieldMode {
  if (VALID_REGISTRATION_FIELD_MODES.includes(value as RegistrationFieldMode)) {
    return value as RegistrationFieldMode
  }
  return fallback
}

export function normalizeRegistrationAccountMode(
  value: unknown,
  fallback: RegistrationAccountMode = 'required'
): RegistrationAccountMode {
  if (VALID_REGISTRATION_ACCOUNT_MODES.includes(value as RegistrationAccountMode)) {
    return value as RegistrationAccountMode
  }
  return fallback
}

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
    registration_categories_mode: normalizeRegistrationFieldMode(
      merged.registration_categories_mode,
      DEFAULT_BOOKING_POLICY.registration_categories_mode
    ),
    registration_lernfahrausweis_mode: normalizeRegistrationFieldMode(
      merged.registration_lernfahrausweis_mode,
      DEFAULT_BOOKING_POLICY.registration_lernfahrausweis_mode
    ),
    registration_proposal_mode: normalizeRegistrationFieldMode(
      merged.registration_proposal_mode,
      DEFAULT_BOOKING_POLICY.registration_proposal_mode
    ),
    registration_account_mode: normalizeRegistrationAccountMode(
      merged.registration_account_mode,
      DEFAULT_BOOKING_POLICY.registration_account_mode
    ),
    staff_booking_notification_enabled: merged.staff_booking_notification_enabled !== false,
    auto_invoice_on_complete: merged.auto_invoice_on_complete === true,
    auto_invoice_recipient: VALID_AUTO_INVOICE_RECIPIENTS.includes(
      merged.auto_invoice_recipient as AutoInvoiceRecipient
    )
      ? (merged.auto_invoice_recipient as AutoInvoiceRecipient)
      : DEFAULT_BOOKING_POLICY.auto_invoice_recipient,
    auto_invoice_office_email:
      typeof merged.auto_invoice_office_email === 'string' && merged.auto_invoice_office_email.trim()
        ? merged.auto_invoice_office_email.trim()
        : null,
    auto_invoice_schedule: normalizeAutoInvoiceSchedule(merged.auto_invoice_schedule),
    auto_invoice_schedule_weekday: normalizeAutoInvoiceWeekday(merged.auto_invoice_schedule_weekday),
    auto_invoice_schedule_day: normalizeAutoInvoiceMonthDay(merged.auto_invoice_schedule_day),
  }

  return { success: true, policy }
})
