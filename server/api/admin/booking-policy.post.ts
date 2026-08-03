import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import type { BookingPolicy } from './booking-policy.get'
import { DEFAULT_BOOKING_POLICY } from './booking-policy.get'

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
