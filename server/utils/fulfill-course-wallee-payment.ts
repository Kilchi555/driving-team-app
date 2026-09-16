/**
 * Atomic Wallee course fulfillment (P0-19).
 *
 * Webhook FULFILL and recover-pending-wallee-payments cron must both call
 * `fulfillCourseWalleePayment`. Completing a course payment outside this RPC
 * is forbidden: it can commit payment_status=completed without a seat.
 * Webhook, recovery cron, payments/process.post (already-captured Wallee
 * retry), Wallee status-sync, and wallee/create-transaction (if a course
 * payment UUID is posted) must all use this path for course payments.
 *
 * Optional-payment / cash / invoice / admin / credit paths do not use this.
 * Credit enroll uses enroll_course_with_credit.
 */
import { logger } from '~/utils/logger'
import { findExistingUserByContact } from '~/server/utils/user-matching'
import { normalizePhoneNumber } from '~/server/utils/sms'
import { upsertMarketingLeadSafe, categoriesFromCourse } from '~/server/utils/upsert-marketing-lead'
import { sha256Hex } from '~/server/utils/meta-capi'
import { escapeLikePattern } from '~/server/utils/sql-helpers'
import {
  capturedAmountChfFromWalleeTx,
  shouldRejectWalleeCaptureMismatch,
} from '~/server/utils/wallee-remaining-amount'

export const COURSE_FULFILLMENT_STATUSES = [
  'fulfilled',
  'already_fulfilled',
  'capacity_exceeded',
  'tenant_mismatch',
  'course_not_found',
  'payment_not_found',
  'not_course_payment',
  'session_conflict',
  'payment_conflict',
  'amount_mismatch',
  'invalid_args',
  'rpc_error',
] as const

export type CourseFulfillmentStatus = (typeof COURSE_FULFILLMENT_STATUSES)[number]

export type CourseFulfillmentResult = {
  status: CourseFulfillmentStatus
  registrationId?: string
  error?: string
}

export type CoursePaymentLike = {
  id: string
  tenant_id: string
  user_id?: string | null
  appointment_id?: string | null
  payment_status?: string | null
  total_amount_rappen?: number | null
  credit_used_rappen?: number | null
  metadata?: Record<string, any> | null
}

export function paymentHasCourseId(payment: { metadata?: Record<string, any> | null } | null | undefined): boolean {
  const id = payment?.metadata?.course_id
  return typeof id === 'string' && id.trim().length > 0
}

export function shouldAtomicallyFulfillCoursePayment(
  payment: { metadata?: Record<string, any> | null } | null | undefined,
  mappedStatus: string,
): boolean {
  return mappedStatus === 'completed' && paymentHasCourseId(payment)
}

/**
 * payments/process.post retry of an already-captured Wallee transaction.
 * Fail-closed on missing/NaN capture (stricter than webhook #224, which allows
 * non-finite capture through). Course payments must never use the generic
 * completeCapturedWalleePayment shortcut.
 */
export type ProcessPostCourseCaptureDecision =
  | 'not_course'
  | 'invalid_capture'
  | 'amount_mismatch'
  | 'fulfill'

export function decideProcessPostCourseCapture(
  payment: {
    metadata?: Record<string, any> | null
    total_amount_rappen?: number | null
    credit_used_rappen?: number | null
  } | null | undefined,
  capturedChf: number,
): ProcessPostCourseCaptureDecision {
  if (!paymentHasCourseId(payment)) return 'not_course'
  if (!Number.isFinite(capturedChf)) return 'invalid_capture'
  if (shouldRejectWalleeCaptureMismatch(capturedChf, payment)) return 'amount_mismatch'
  return 'fulfill'
}

export type CourseCapturedWalleeAttempt = {
  kind: ProcessPostCourseCaptureDecision | 'fulfillment'
  captureDecision: ProcessPostCourseCaptureDecision
  capturedChf: number
  result?: CourseFulfillmentResult
}

/**
 * Shared captured-Wallee → course RPC path. Capture comes from a live Wallee
 * transaction object, never from a client payload. remaining=0 cannot match
 * a finite capture (#224 expectedChf > 0); that is amount_mismatch, not a
 * generic complete.
 */
export async function tryFulfillCourseFromCapturedWalleeTx(opts: {
  supabase: any
  payment: CoursePaymentLike
  walleeTx: {
    completedAmount?: unknown
    authorizationAmount?: unknown
    authorizationAmountIncludingTax?: unknown
  } | null | undefined
}): Promise<CourseCapturedWalleeAttempt> {
  const capturedChf = capturedAmountChfFromWalleeTx(opts.walleeTx)
  const captureDecision = decideProcessPostCourseCapture(opts.payment, capturedChf)
  if (captureDecision !== 'fulfill') {
    return { kind: captureDecision, captureDecision, capturedChf }
  }
  const result = await fulfillCourseWalleePayment({
    supabase: opts.supabase,
    payment: opts.payment,
    capturedAmountChf: capturedChf,
  })
  return { kind: 'fulfillment', captureDecision, capturedChf, result }
}

export function isCourseCapturedWalleeFulfilled(attempt: CourseCapturedWalleeAttempt): boolean {
  return attempt.kind === 'fulfillment'
    && !!attempt.result
    && isSuccessfulCourseFulfillment(attempt.result.status)
}

export function courseCapturedWalleeHttpError(attempt: CourseCapturedWalleeAttempt): {
  statusCode: number
  statusMessage: string
} | null {
  if (attempt.kind === 'not_course') return null
  if (attempt.kind === 'invalid_capture') {
    return {
      statusCode: 503,
      statusMessage: 'Zahlungsbetrag konnte bei Wallee nicht geprüft werden. Bitte versuche es in wenigen Sekunden erneut.',
    }
  }
  if (attempt.kind === 'amount_mismatch') {
    return {
      statusCode: 409,
      statusMessage: 'Der erfasste Wallee-Betrag stimmt nicht mit dem offenen Restbetrag überein. Die Zahlung wurde nicht abgeschlossen.',
    }
  }
  if (attempt.kind === 'fulfillment' && attempt.result && !isSuccessfulCourseFulfillment(attempt.result.status)) {
    const retryable = isRetryableCourseFulfillment(attempt.result.status)
    return {
      statusCode: retryable ? 503 : 409,
      statusMessage: retryable
        ? 'Kursanmeldung konnte noch nicht abgeschlossen werden. Bitte versuche es in wenigen Sekunden erneut.'
        : 'Die Kursanmeldung konnte nicht abgeschlossen werden.',
    }
  }
  return null
}

export function isRetryableCourseFulfillment(status: CourseFulfillmentStatus): boolean {
  return status === 'capacity_exceeded' || status === 'rpc_error'
}

export function isSuccessfulCourseFulfillment(status: CourseFulfillmentStatus): boolean {
  return status === 'fulfilled' || status === 'already_fulfilled'
}

function jsonUuid(value: unknown): string | null {
  if (value == null || value === '') return null
  const s = String(value).trim()
  return s.length ? s : null
}

function jsonInt(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function buildCourseFulfillmentPayload(
  payment: CoursePaymentLike,
  userId?: string | null,
  capturedAmountChf?: number | null,
): Record<string, unknown> {
  const meta = payment.metadata || {}
  const payload: Record<string, unknown> = {
    course_id: meta.course_id,
    tenant_id: payment.tenant_id,
    user_id: userId || payment.user_id || null,
    payment_id: payment.id,
    first_name: meta.firstname || meta.first_name || '',
    last_name: meta.lastname || meta.last_name || '',
    email: meta.email || null,
    phone: meta.phone || null,
    sari_faberid: meta.sari_faberid || null,
    street: meta.street || null,
    street_nr: meta.street_nr || null,
    zip: meta.zip || null,
    city: meta.city || null,
    birthdate: meta.birthdate || meta.sari_birthdate || null,
    license_number: meta.license_number || null,
    custom_sessions: meta.custom_sessions || null,
    is_partial_enrollment: meta.is_partial_enrollment === true
      || String(meta.is_partial_enrollment || '') === 'true',
    partial_start_session: jsonInt(meta.partial_start_session),
    individual_session_number: jsonInt(meta.individual_session_number),
    vehicle_id: jsonUuid(meta.vehicle_id),
    discount_applied_rappen: jsonInt(meta.discount_amount_rappen) ?? 0,
  }
  if (capturedAmountChf != null && Number.isFinite(capturedAmountChf)) {
    payload.captured_amount_chf = capturedAmountChf
  }
  return payload
}

export async function ensureGuestUserForCoursePayment(
  supabase: any,
  payment: CoursePaymentLike,
  tenantId: string,
): Promise<string | undefined> {
  if (payment.user_id) {
    const { data: owned } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('id', payment.user_id)
      .maybeSingle()
    if (owned?.id && owned.tenant_id === tenantId) return owned.id
    logger.warn('⚠️ Ignoring payment.user_id with tenant mismatch during course fulfillment', {
      paymentId: payment.id,
      userId: payment.user_id,
      tenantId,
    })
  }
  const email = payment.metadata?.email
  if (!email) return undefined

  const existingUser = await findExistingUserByContact(supabase, {
    email,
    phone: payment.metadata?.phone,
    tenantId,
  })
  if (existingUser) return existingUser.id

  const { data: newUser, error: createUserError } = await supabase
    .from('users')
    .insert({
      first_name: payment.metadata?.firstname || 'Guest',
      last_name: payment.metadata?.lastname || 'User',
      email: String(email).trim().toLowerCase(),
      phone: normalizePhoneNumber(payment.metadata?.phone || '') || payment.metadata?.phone,
      tenant_id: tenantId,
      role: 'client',
      is_active: true,
      auth_user_id: null,
      ...(payment.metadata?.referral_code ? { referred_by_code: payment.metadata.referral_code } : {}),
      onboarding_token: crypto.randomUUID ? crypto.randomUUID() : `token-${Date.now()}`,
      onboarding_token_expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      onboarding_status: 'pending',
    })
    .select('id')
    .single()

  if (newUser?.id) {
    const userId = newUser.id as string
    const refCode = payment.metadata?.referral_code
    if (refCode) {
      const { data: affCode } = await supabase
        .from('affiliate_codes')
        .select('id, user_id')
        .eq('code', refCode)
        .eq('is_active', true)
        .maybeSingle()
      if (affCode && affCode.user_id !== userId) {
        const { error: refInsertError } = await supabase
          .from('affiliate_referrals')
          .insert({
            tenant_id: tenantId,
            affiliate_code_id: affCode.id,
            affiliate_user_id: affCode.user_id,
            referred_user_id: userId,
            status: 'pending',
          })
        if (refInsertError) {
          logger.error('❌ Failed to create affiliate_referrals row for guest user:', refInsertError.message)
        }
      }
    }
    return userId
  }

  if (createUserError?.code === '23505') {
    const fallbackUser = await findExistingUserByContact(supabase, {
      email,
      phone: payment.metadata?.phone,
      tenantId,
    })
    if (fallbackUser) return fallbackUser.id
  } else if (createUserError) {
    logger.error('❌ Failed to create guest user for course fulfillment:', createUserError.message)
  }
  return undefined
}

function parseRpcResult(data: unknown, error: { message?: string } | null): CourseFulfillmentResult {
  if (error) {
    logger.error('❌ fulfill_course_wallee_payment RPC failed:', error.message)
    return { status: 'rpc_error', error: error.message }
  }
  const row = (typeof data === 'string' ? (() => {
    try { return JSON.parse(data) } catch { return { status: data } }
  })() : data) as { status?: string, registration_id?: string } | null
  const status = String(row?.status || '') as CourseFulfillmentStatus
  if (!(COURSE_FULFILLMENT_STATUSES as readonly string[]).includes(status)) {
    return { status: 'rpc_error', error: `unexpected RPC status: ${status}` }
  }
  return {
    status,
    registrationId: row?.registration_id,
  }
}

export async function fulfillCourseWalleePayment(opts: {
  supabase: any
  payment: CoursePaymentLike
  capturedAmountChf?: number | null
}): Promise<CourseFulfillmentResult> {
  const { supabase, payment, capturedAmountChf } = opts
  if (!payment?.id) return { status: 'invalid_args' }
  if (!paymentHasCourseId(payment)) return { status: 'not_course_payment' }

  const userId = await ensureGuestUserForCoursePayment(supabase, payment, payment.tenant_id)
  const payload = buildCourseFulfillmentPayload(payment, userId, capturedAmountChf)

  const { data, error } = await supabase.rpc('fulfill_course_wallee_payment', {
    p_payment_id: payment.id,
    p_registration: payload,
  })

  const result = parseRpcResult(data, error)
  if (isSuccessfulCourseFulfillment(result.status) && result.registrationId) {
    payment.user_id = userId || payment.user_id
    ;(payment as any).course_registration_id = result.registrationId
    payment.payment_status = 'completed'
  }
  return result
}

/**
 * Downstream of the durable DB commit only. Must not run inside the RPC.
 */
export async function runPostCommitCourseFulfillmentSideEffects(opts: {
  supabase: any
  payment: CoursePaymentLike
  registrationId: string
}): Promise<void> {
  const { supabase, payment, registrationId } = opts
  const meta = payment.metadata || {}
  const tenantId = payment.tenant_id
  const courseId = meta.course_id
  const vehicleId = jsonUuid(meta.vehicle_id)

  if (meta.email && tenantId) {
    upsertMarketingLeadSafe({
      tenantId,
      email: meta.email,
      firstName: meta.firstname || meta.first_name,
      lastName: meta.lastname || meta.last_name,
      phone: meta.phone,
      categories: categoriesFromCourse({ name: meta.course_name }),
      tags: ['client', 'course'],
      source: 'course_enroll',
      sourceLabel: 'Kursanmeldung (Wallee)',
    })
  }

  if (vehicleId && courseId && tenantId) {
    try {
      const { data: sessions } = await supabase
        .from('course_sessions')
        .select('id, start_time, end_time')
        .eq('course_id', courseId)
      if (sessions?.length) {
        const vBookings = sessions.map((s: any) => ({
          vehicle_id: vehicleId,
          tenant_id: tenantId,
          course_id: courseId,
          course_session_id: s.id,
          start_time: s.start_time,
          end_time: s.end_time,
          purpose: 'course',
          status: 'confirmed',
          booked_by: payment.user_id || null,
        }))
        const { error: vErr } = await supabase.from('vehicle_bookings').insert(vBookings)
        if (vErr) logger.warn('⚠️ vehicle_bookings insert failed (fulfillment, non-fatal):', vErr.message)
      }
    } catch (vE: any) {
      logger.warn('⚠️ vehicle_bookings creation failed (fulfillment, non-fatal):', vE.message)
    }
  }

  try {
    const { resolveMarketingAttribution } = await import('~/server/utils/resolve-marketing-attribution')
    const { reportBindingCourseConversionSafely } = await import('~/server/utils/binding-booking-conversion')
    const attrRow = await resolveMarketingAttribution(
      supabase,
      meta.marketing_session_id,
      {
        gclid: meta.gclid ?? null,
        gbraid: meta.gbraid ?? null,
        wbraid: meta.wbraid ?? null,
        fbclid: meta.fbclid ?? null,
        fbc: meta.fbc ?? null,
        fbp: meta.fbp ?? null,
      },
    )
    const hashedEmail = meta.email ? await sha256Hex(String(meta.email).trim().toLowerCase()) : null
    const normalizedRegPhone = String(meta.phone ?? '').replace(/\s+/g, '').replace(/^00/, '+')
    const hashedPhone = normalizedRegPhone.startsWith('+') ? await sha256Hex(normalizedRegPhone) : null
    const valueChf = (payment.total_amount_rappen || 0) / 100
    await reportBindingCourseConversionSafely({
      supabase,
      registrationId,
      userId: payment.user_id || null,
      tenantId: tenantId ?? null,
      status: 'confirmed',
      gclid: attrRow?.gclid ?? null,
      gbraid: attrRow?.gbraid ?? null,
      wbraid: attrRow?.wbraid ?? null,
      fbclid: attrRow?.fbclid ?? null,
      fbc: attrRow?.fbc ?? null,
      fbp: attrRow?.fbp ?? null,
      conversionValueChf: valueChf,
      hashedEmail,
      hashedPhone,
    })
  } catch (capiErr: any) {
    logger.warn('⚠️ Binding course conversion failed (fulfillment, non-critical):', capiErr?.message ?? capiErr)
  }

  try {
    const discountCode = meta.discount_code
    if (discountCode && tenantId && !meta.discount_usage_claimed) {
      const escapedDiscountCode = escapeLikePattern(discountCode)
      const { data: disc } = await supabase
        .from('discounts')
        .select('id, usage_count')
        .ilike('code', escapedDiscountCode)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (disc) {
        await supabase.from('discounts').update({ usage_count: (disc.usage_count ?? 0) + 1 }).eq('id', disc.id)
      } else {
        const { data: vc } = await supabase
          .from('voucher_codes')
          .select('id, current_redemptions')
          .ilike('code', escapedDiscountCode)
          .eq('tenant_id', tenantId)
          .maybeSingle()
        if (vc) {
          await supabase.from('voucher_codes').update({ current_redemptions: (vc.current_redemptions ?? 0) + 1 }).eq('id', vc.id)
        }
      }
    }
  } catch (e: any) {
    logger.warn('⚠️ Discount usage increment failed (fulfillment, non-critical):', e.message)
  }
}

export async function sendCourseFulfillmentConfirmation(registrationId: string, totalAmountRappen?: number | null): Promise<void> {
  const { internalSecretHeaders } = await import('~/server/utils/require-staff-or-internal')
  await $fetch('/api/emails/send-course-enrollment-confirmation', {
    method: 'POST',
    headers: internalSecretHeaders(),
    body: {
      courseRegistrationId: registrationId,
      paymentMethod: 'wallee',
      totalAmount: (totalAmountRappen || 0) / 100,
    },
  })
}
