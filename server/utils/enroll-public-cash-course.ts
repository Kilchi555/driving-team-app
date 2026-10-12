/**
 * F1 — Atomic public cash_on_site course enrollment + pending payment + idempotency.
 *
 * Canonical client transport: body field `idempotencyKey` (UUID v4).
 * Same key + same server request hash → HTTP 200 idempotent replay with original IDs.
 * Same key + different hash → HTTP 409 idempotency_conflict.
 * Different key + business duplicate → HTTP 409 bereits angemeldet.
 *
 * SARI / email / CAPI stay outside the RPC.
 */
import { createError } from 'h3'
import { logger } from '~/utils/logger'
import { COURSE_CAPACITY_HTTP_MESSAGE } from '~/server/utils/course-capacity'

export const PUBLIC_CASH_IDEMPOTENCY_KEY_FIELD = 'idempotencyKey' as const

/** UUID v4 (RFC 4122 variant). */
const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuidV4(value: unknown): value is string {
  return typeof value === 'string' && UUID_V4_RE.test(value)
}

export const PUBLIC_CASH_ENROLLMENT_STATUSES = [
  'enrolled',
  'idempotent_replay',
  'idempotency_conflict',
  'capacity_exceeded',
  'tenant_mismatch',
  'course_not_found',
  'payment_conflict',
  'session_conflict',
  'invalid_args',
  'rpc_error',
] as const

export type PublicCashEnrollmentStatus = (typeof PUBLIC_CASH_ENROLLMENT_STATUSES)[number]

export type PublicCashEnrollmentResult = {
  status: PublicCashEnrollmentStatus
  registrationId?: string
  paymentId?: string
  error?: string
}

export type PublicCashEnrollmentPayload = {
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
  custom_sessions?: unknown
  is_partial_enrollment?: boolean
  partial_start_session?: number | null
  individual_session_number?: number | null
  vehicle_id?: string | null
  sari_synced?: boolean
  notes?: string | null
}

export function isSuccessfulPublicCashEnrollment(status: PublicCashEnrollmentStatus): boolean {
  return status === 'enrolled' || status === 'idempotent_replay'
}

function parsePublicCashRpcResult(
  data: unknown,
  error: { message?: string } | null,
): PublicCashEnrollmentResult {
  if (error) {
    logger.error('❌ enroll_public_cash_course_with_pending_payment RPC failed:', error.message)
    return { status: 'rpc_error', error: error.message }
  }
  const row = (typeof data === 'string'
    ? (() => {
        try {
          return JSON.parse(data)
        } catch {
          return { status: data }
        }
      })()
    : data) as {
    status?: string
    registration_id?: string
    payment_id?: string
  } | null
  const status = String(row?.status || '') as PublicCashEnrollmentStatus
  if (!(PUBLIC_CASH_ENROLLMENT_STATUSES as readonly string[]).includes(status)) {
    return { status: 'rpc_error', error: `unexpected RPC status: ${status}` }
  }
  return {
    status,
    registrationId: row?.registration_id,
    paymentId: row?.payment_id,
  }
}

type PublicCashEnrollRpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message?: string } | null }>
}

export async function enrollPublicCashCourseWithPendingPayment(opts: {
  supabase: PublicCashEnrollRpcClient
  userId: string
  tenantId: string
  courseId: string
  courseName: string
  amountRappen: number
  idempotencyKey: string
  registration: PublicCashEnrollmentPayload
}): Promise<PublicCashEnrollmentResult> {
  const {
    supabase,
    userId,
    tenantId,
    courseId,
    courseName,
    amountRappen,
    idempotencyKey,
    registration,
  } = opts

  if (!isUuidV4(idempotencyKey)) {
    return { status: 'invalid_args', error: 'idempotency_key_invalid' }
  }
  if (
    !userId
    || !tenantId
    || !courseId
    || !Number.isInteger(amountRappen)
    || amountRappen < 0
  ) {
    return { status: 'invalid_args' }
  }

  const { data, error } = await supabase.rpc('enroll_public_cash_course_with_pending_payment', {
    p_user_id: userId,
    p_tenant_id: tenantId,
    p_course_id: courseId,
    p_amount_rappen: amountRappen,
    p_course_name: courseName || 'Kurs',
    p_idempotency_key: idempotencyKey,
    p_registration: registration,
  })

  return parsePublicCashRpcResult(data, error)
}

/**
 * enrolled / idempotent_replay → success with both IDs.
 * idempotency_conflict → 409 with stable code.
 * payment_conflict (business duplicate, different key) → 409 bereits angemeldet.
 */
export function throwIfPublicCashEnrollmentFailed(result: PublicCashEnrollmentResult): asserts result is PublicCashEnrollmentResult & {
  status: 'enrolled' | 'idempotent_replay'
  registrationId: string
  paymentId: string
} {
  if (
    (result.status === 'enrolled' || result.status === 'idempotent_replay')
    && result.registrationId
    && result.paymentId
  ) {
    return
  }
  if (result.status === 'idempotency_conflict') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Diese Anfrage steht im Konflikt mit einer früheren Anmeldung.',
      data: { code: 'idempotency_conflict' },
    })
  }
  if (result.status === 'payment_conflict' || result.status === 'session_conflict') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Sie sind bereits für diesen Kurs angemeldet.',
    })
  }
  if (result.status === 'capacity_exceeded') {
    throw createError({ statusCode: 409, statusMessage: COURSE_CAPACITY_HTTP_MESSAGE })
  }
  if (result.status === 'tenant_mismatch') {
    throw createError({ statusCode: 403, statusMessage: 'Tenant-Zuordnung ungültig' })
  }
  if (result.status === 'course_not_found') {
    throw createError({ statusCode: 404, statusMessage: 'Kurs nicht gefunden' })
  }
  if (result.status === 'invalid_args') {
    throw createError({
      statusCode: 400,
      statusMessage: result.error === 'idempotency_key_invalid'
        ? 'Ungültiger Idempotency-Key'
        : 'Ungültige Anmeldedaten',
      data: result.error === 'idempotency_key_invalid'
        ? { code: 'idempotency_key_invalid' }
        : undefined,
    })
  }
  throw createError({
    statusCode: 500,
    statusMessage: 'Anmeldung konnte nicht erstellt werden. Bitte versuchen Sie es später erneut.',
  })
}
