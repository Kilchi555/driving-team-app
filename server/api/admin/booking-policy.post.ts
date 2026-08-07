import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import type { BookingPolicy } from './booking-policy.get'
import {
  DEFAULT_BOOKING_POLICY,
  VALID_AUTO_INVOICE_RECIPIENTS,
  VALID_AUTO_INVOICE_SCHEDULES,
  VALID_REGISTRATION_FIELD_MODES,
  VALID_REGISTRATION_ACCOUNT_MODES,
  normalizeAutoInvoiceMonthDay,
  normalizeAutoInvoiceWeekday,
} from './booking-policy.get'
import {
  VALID_CUSTOMER_NOTIFICATION_CHANNELS,
  normalizeCustomerNotificationChannel,
} from '~/server/utils/customer-notification-channel'

const VALID_FIELDS = new Set([
  'first_name', 'last_name', 'phone', 'email',
  'birthdate', 'street', 'street_nr', 'zip', 'city', 'profession',
])

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const { data: dbUser } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!dbUser || !['admin', 'superadmin'].includes(dbUser.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await readBody(event)

  const validateFieldArray = (arr: unknown, name: string) => {
    if (arr === undefined) return
    if (!Array.isArray(arr)) throw createError({ statusCode: 400, statusMessage: `${name} must be an array` })
    const invalid = (arr as string[]).filter((f) => !VALID_FIELDS.has(f))
    if (invalid.length > 0) throw createError({ statusCode: 400, statusMessage: `Invalid fields in ${name}: ${invalid.join(', ')}` })
  }

  validateFieldArray(body.student_required_fields, 'student_required_fields')
  validateFieldArray(body.student_optional_fields, 'student_optional_fields')
  validateFieldArray(body.booking_required_fields, 'booking_required_fields')
  validateFieldArray(body.booking_optional_fields, 'booking_optional_fields')

  // Validate confirmation_email_mode if provided
  const validModes = ['always', 'after_registration', 'never']
  if (body.confirmation_email_mode !== undefined && !validModes.includes(body.confirmation_email_mode)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid confirmation_email_mode' })
  }

  const validLocationIntakeModes = ['locations', 'pickup_address', 'callback']
  if (body.location_intake_modes !== undefined) {
    if (!Array.isArray(body.location_intake_modes) || body.location_intake_modes.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'location_intake_modes must be a non-empty array' })
    }
    const invalid = body.location_intake_modes.filter((m: string) => !validLocationIntakeModes.includes(m))
    if (invalid.length > 0) {
      throw createError({ statusCode: 400, statusMessage: `Invalid location_intake_modes: ${invalid.join(', ')}` })
    }
  }
  // Legacy singular field — still accept and map to array
  if (body.location_intake_mode !== undefined && !validLocationIntakeModes.includes(body.location_intake_mode)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid location_intake_mode' })
  }

  if (
    body.registration_categories_mode !== undefined &&
    !VALID_REGISTRATION_FIELD_MODES.includes(body.registration_categories_mode)
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid registration_categories_mode' })
  }
  if (
    body.registration_lernfahrausweis_mode !== undefined &&
    !VALID_REGISTRATION_FIELD_MODES.includes(body.registration_lernfahrausweis_mode)
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid registration_lernfahrausweis_mode' })
  }
  if (
    body.registration_proposal_mode !== undefined &&
    !VALID_REGISTRATION_FIELD_MODES.includes(body.registration_proposal_mode)
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid registration_proposal_mode' })
  }
  if (
    body.registration_account_mode !== undefined &&
    !VALID_REGISTRATION_ACCOUNT_MODES.includes(body.registration_account_mode)
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid registration_account_mode' })
  }

  if (
    body.auto_invoice_recipient !== undefined &&
    !VALID_AUTO_INVOICE_RECIPIENTS.includes(body.auto_invoice_recipient)
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid auto_invoice_recipient' })
  }
  if (body.auto_invoice_on_complete !== undefined && typeof body.auto_invoice_on_complete !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'auto_invoice_on_complete must be a boolean' })
  }
  if (body.auto_invoice_office_email !== undefined && body.auto_invoice_office_email !== null) {
    if (typeof body.auto_invoice_office_email !== 'string') {
      throw createError({ statusCode: 400, statusMessage: 'auto_invoice_office_email must be a string or null' })
    }
    const email = body.auto_invoice_office_email.trim()
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid auto_invoice_office_email' })
    }
    body.auto_invoice_office_email = email || null
  }

  if (body.auto_invoice_schedule !== undefined) {
    if (!VALID_AUTO_INVOICE_SCHEDULES.includes(body.auto_invoice_schedule)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid auto_invoice_schedule' })
    }
  }
  if (body.auto_invoice_schedule_weekday !== undefined) {
    body.auto_invoice_schedule_weekday = normalizeAutoInvoiceWeekday(body.auto_invoice_schedule_weekday)
  }
  if (body.auto_invoice_schedule_day !== undefined) {
    body.auto_invoice_schedule_day = normalizeAutoInvoiceMonthDay(body.auto_invoice_schedule_day)
  }

  if (body.customer_notification_channel !== undefined) {
    if (!VALID_CUSTOMER_NOTIFICATION_CHANNELS.includes(body.customer_notification_channel)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid customer_notification_channel' })
    }
    body.customer_notification_channel = normalizeCustomerNotificationChannel(
      body.customer_notification_channel,
    )
  }

  const validManualDiscountPerms = ['hidden', 'allowed']
  if (
    body.staff_manual_discount_permission !== undefined &&
    !validManualDiscountPerms.includes(body.staff_manual_discount_permission)
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid staff_manual_discount_permission' })
  }

  // Load current policy and merge
  const { data: current } = await supabase
    .from('tenants')
    .select('booking_policy')
    .eq('id', dbUser.tenant_id)
    .maybeSingle()

  const currentPolicy: BookingPolicy = { ...DEFAULT_BOOKING_POLICY, ...(current?.booking_policy ?? {}) }

  const updatedPolicy: BookingPolicy = {
    ...currentPolicy,
    ...body,
  }

  // Prefer array; migrate legacy singular if array missing
  if (Array.isArray(body.location_intake_modes) && body.location_intake_modes.length > 0) {
    updatedPolicy.location_intake_modes = body.location_intake_modes
  } else if (body.location_intake_mode) {
    updatedPolicy.location_intake_modes = [body.location_intake_mode]
  }
  delete (updatedPolicy as any).location_intake_mode

  const { error } = await supabase
    .from('tenants')
    .update({ booking_policy: updatedPolicy })
    .eq('id', dbUser.tenant_id)

  if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to save booking policy' })

  return { success: true, policy: updatedPolicy }
})
