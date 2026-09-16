/**
 * Atomic credit course enrollment (C5 / C4-01).
 *
 * Seat + wallet + giftcard + discount counter + credit_transactions commit
 * in one PostgreSQL function. Callers must not compensate with increment_balance
 * or cancel-after-refund. SARI / email / CAPI stay outside the RPC.
 */
import { createError } from 'h3'
import { logger } from '~/utils/logger'
import { COURSE_CAPACITY_HTTP_MESSAGE } from '~/server/utils/course-capacity'

export const CREDIT_ENROLLMENT_STATUSES = [
  'enrolled',
  'already_enrolled',
  'capacity_exceeded',
  'insufficient_credit',
  'giftcard_unavailable',
  'discount_unavailable',
  'tenant_mismatch',
  'course_not_found',
  'payment_conflict',
  'session_conflict',
  'invalid_args',
  'rpc_error',
] as const

export type CreditEnrollmentStatus = (typeof CREDIT_ENROLLMENT_STATUSES)[number]

export type CreditEnrollmentResult = {
  status: CreditEnrollmentStatus
  registrationId?: string
  balanceRappen?: number
  error?: string
}

export type CreditEnrollmentPayload = {
  course_id: string
  tenant_id: string
  user_id: string
  first_name?: string
  last_name?: string
  email?: string | null
  phone?: string | null
  sari_faberid?: string | null
  street?: string | null
  street_nr?: string | null
  zip?: string | null
  city?: string | null
  birthdate?: string | null
  license_number?: string | null
  discount_applied_rappen?: number
  discount_code?: string | null
  discount_source?: 'gift_card' | 'discount' | null
  custom_sessions?: unknown
  is_partial_enrollment?: boolean
  partial_start_session?: number | null
  individual_session_number?: number | null
  vehicle_id?: string | null
  sari_synced?: boolean
  ledger_notes?: string
}

export function isSuccessfulCreditEnrollment(status: CreditEnrollmentStatus): boolean {
  return status === 'enrolled' || status === 'already_enrolled'
}

function parseCreditRpcResult(data: unknown, error: { message?: string } | null): CreditEnrollmentResult {
  if (error) {
    logger.error('❌ enroll_course_with_credit RPC failed:', error.message)
    return { status: 'rpc_error', error: error.message }
  }
  const row = (typeof data === 'string' ? (() => {
    try { return JSON.parse(data) } catch { return { status: data } }
  })() : data) as {
    status?: string
    registration_id?: string
    balance_rappen?: number
  } | null
  const status = String(row?.status || '') as CreditEnrollmentStatus
  if (!(CREDIT_ENROLLMENT_STATUSES as readonly string[]).includes(status)) {
    return { status: 'rpc_error', error: `unexpected RPC status: ${status}` }
  }
  return {
    status,
    registrationId: row?.registration_id,
    balanceRappen: row?.balance_rappen,
  }
}

export async function enrollCourseWithCredit(opts: {
  supabase: any
  userId: string
  tenantId: string
  courseId: string
  amountRappen: number
  registration: CreditEnrollmentPayload
}): Promise<CreditEnrollmentResult> {
  const { supabase, userId, tenantId, courseId, amountRappen, registration } = opts
  if (!userId || !tenantId || !courseId || !Number.isInteger(amountRappen) || amountRappen <= 0) {
    return { status: 'invalid_args' }
  }

  const { data, error } = await supabase.rpc('enroll_course_with_credit', {
    p_user_id: userId,
    p_tenant_id: tenantId,
    p_course_id: courseId,
    p_amount_rappen: amountRappen,
    p_registration: registration,
  })

  return parseCreditRpcResult(data, error)
}

export function throwIfCreditEnrollmentFailed(result: CreditEnrollmentResult): void {
  if (isSuccessfulCreditEnrollment(result.status)) return
  if (result.status === 'capacity_exceeded') {
    throw createError({ statusCode: 409, statusMessage: COURSE_CAPACITY_HTTP_MESSAGE })
  }
  if (result.status === 'insufficient_credit') {
    throw createError({ statusCode: 400, statusMessage: 'Kein verfügbares Guthaben' })
  }
  if (result.status === 'giftcard_unavailable') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Dieser Gutschein wird gerade in einer anderen Zahlung verwendet oder ist bereits eingelöst.',
    })
  }
  if (result.status === 'discount_unavailable') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Dieser Rabattcode ist nicht mehr verfügbar.',
    })
  }
  if (result.status === 'payment_conflict' || result.status === 'session_conflict') {
    throw createError({ statusCode: 409, statusMessage: 'Sie sind bereits für diesen Kurs angemeldet.' })
  }
  if (result.status === 'tenant_mismatch') {
    throw createError({ statusCode: 403, statusMessage: 'Tenant-Zuordnung ungültig' })
  }
  if (result.status === 'course_not_found') {
    throw createError({ statusCode: 404, statusMessage: 'Kurs nicht gefunden' })
  }
  throw createError({
    statusCode: 500,
    statusMessage: 'Kursanmeldung konnte nicht erstellt werden',
  })
}
