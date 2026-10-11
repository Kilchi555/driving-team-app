/**
 * Canonical course cancellation workflow.
 *
 * All UI / API paths that cancel a course must go through `cancelCourse` /
 * `cancelCourseWithFollowUps`. Database transitions require the transactional
 * RPC `cancel_course_database_cascade` unless an explicit sequential opt-in
 * is set for verified non-production test contexts.
 *
 * External side effects (participant email) are queued AFTER database commit via
 * `outbound_messages_queue` (deduped). Provider refunds/voids are never invented here.
 *
 * Production atomic cascade remains blocked until the RPC migration is separately
 * authorized, applied, and verified. Do not treat the sequential path as atomic.
 */

import { createError } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import { generateCourseRegistrationCancellationEmail } from '~/server/utils/email-templates'
import { formatCourseSessionLine } from '~/utils/format-course-sessions'
import {
  cancelResourceBookingsForCourse,
  type CourseResourceCancelResult,
} from '~/server/utils/resource-bookings'

export const COURSE_CANCEL_EMAIL_STAGE = 'course_cancelled' as const

/** Explicit opt-in only — never enable via NODE_ENV / generic heuristics. */
export const ALLOW_SEQUENTIAL_COURSE_CANCEL_ENV = 'SIMY_ALLOW_SEQUENTIAL_COURSE_CANCEL'

const UNPAID_PAYMENT_STATUSES = new Set([
  'pending',
  'invoiced',
  'invoice',
  'open',
  'processing',
  'failed',
])

/** Local noop — already terminal without further financial mutation. */
const NOOP_PAYMENT_STATUSES = new Set(['cancelled', 'refunded'])

/**
 * Provider-committed / settled-looking statuses that must not be auto-cancelled
 * without a verified provider void/refund workflow (not implemented here).
 */
const PROVIDER_COMMITTED_PAYMENT_STATUSES = new Set([
  'completed',
  'paid',
  'authorized',
  'partially_refunded',
])

export type CourseCancelDbResult = {
  courseId: string
  tenantId: string
  alreadyCancelled: boolean
  registrationIds: string[]
  paymentIdsCancelled: string[]
  paymentIdsSkippedPaid: string[]
  invoiceIdsCancelled: string[]
  invoiceIdsSkippedPaid: string[]
  roomBookingIds: string[]
  vehicleBookingIds: string[]
  path: 'rpc' | 'sequential'
  resources: CourseResourceCancelResult
}

export type CourseCancelEmailResult = {
  requested: boolean
  queued: number
  skippedDuplicate: number
  skippedNoEmail: number
  errors: string[]
}

export type CourseCancelManualReviewItem = {
  kind: 'payment' | 'invoice'
  id: string
  reason: string
}

export type CourseCancelResult = {
  success: boolean
  /** True only when required auto cascade + email queue + resource cleanup succeeded. */
  complete: boolean
  courseId: string
  tenantId: string
  database: CourseCancelDbResult
  emails: CourseCancelEmailResult
  resources: CourseResourceCancelResult
  manualReviewRequired: CourseCancelManualReviewItem[]
  warnings: string[]
  auditId: string | null
}

export type CancelCourseInput = {
  supabase: SupabaseClient
  tenantId: string
  actorId: string
  courseId: string
  notifyParticipants?: boolean
  reason?: string | null
  /** Optional preloaded participant list from UI; server reloads if omitted. */
  participants?: Array<{ user_id?: string; email?: string; first_name?: string; last_name?: string }>
}

export function isSequentialCourseCancelAllowed(
  env: NodeJS.Dict<string | undefined> = process.env,
): boolean {
  return env[ALLOW_SEQUENTIAL_COURSE_CANCEL_ENV] === '1'
}

export function buildCourseCancelEmailDedupeKey(input: {
  tenantId: string
  courseId: string
  registrationId: string
}): string {
  return `course_cancelled:${input.tenantId}:${input.courseId}:${input.registrationId}`
}

function asUuidArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string' && v.length > 0)
}

function mapRpcResult(
  raw: Record<string, unknown>,
  path: 'rpc' | 'sequential',
  resources: CourseResourceCancelResult,
): CourseCancelDbResult {
  return {
    courseId: String(raw.course_id || raw.courseId),
    tenantId: String(raw.tenant_id || raw.tenantId),
    alreadyCancelled: Boolean(raw.already_cancelled ?? raw.alreadyCancelled),
    registrationIds: asUuidArray(raw.registration_ids ?? raw.registrationIds),
    paymentIdsCancelled: asUuidArray(raw.payment_ids_cancelled ?? raw.paymentIdsCancelled),
    paymentIdsSkippedPaid: asUuidArray(raw.payment_ids_skipped_paid ?? raw.paymentIdsSkippedPaid),
    invoiceIdsCancelled: asUuidArray(raw.invoice_ids_cancelled ?? raw.invoiceIdsCancelled),
    invoiceIdsSkippedPaid: asUuidArray(raw.invoice_ids_skipped_paid ?? raw.invoiceIdsSkippedPaid),
    roomBookingIds: resources.roomBookingIds.length
      ? resources.roomBookingIds
      : asUuidArray(raw.room_booking_ids ?? raw.roomBookingIds),
    vehicleBookingIds: resources.vehicleBookingIds.length
      ? resources.vehicleBookingIds
      : asUuidArray(raw.vehicle_booking_ids ?? raw.vehicleBookingIds),
    path,
    resources,
  }
}

export function classifyPaymentForCourseCancel(payment: {
  payment_status?: string | null
  paid_at?: string | null
  amount_paid_rappen?: number | null
}): 'cancel' | 'skip_paid' | 'noop' {
  const status = String(payment.payment_status || '').toLowerCase()
  if (NOOP_PAYMENT_STATUSES.has(status)) return 'noop'
  if (
    PROVIDER_COMMITTED_PAYMENT_STATUSES.has(status)
    || payment.paid_at
    || (payment.amount_paid_rappen != null && payment.amount_paid_rappen > 0)
  ) {
    return 'skip_paid'
  }
  if (UNPAID_PAYMENT_STATUSES.has(status) || !status) return 'cancel'
  // Unknown statuses: never invent local cancel / refund / void
  if (
    status.includes('paid')
    || status.includes('complete')
    || status.includes('authoriz')
    || status.includes('refund')
  ) {
    return 'skip_paid'
  }
  return 'skip_paid'
}

export function classifyInvoiceForCourseCancel(invoice: {
  status?: string | null
  payment_status?: string | null
  paid_at?: string | null
  paid_amount_rappen?: number | null
}): 'cancel' | 'skip_paid' | 'noop' {
  const status = String(invoice.status || '').toLowerCase()
  const payStatus = String(invoice.payment_status || '').toLowerCase()
  if (status === 'cancelled') return 'noop'
  if (
    payStatus === 'paid'
    || payStatus === 'completed'
    || payStatus === 'authorized'
    || payStatus === 'partially_refunded'
    || invoice.paid_at
    || (invoice.paid_amount_rappen != null && invoice.paid_amount_rappen > 0)
  ) {
    return 'skip_paid'
  }
  return 'cancel'
}

function isUniqueViolation(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  const code = String(error.code || '')
  const message = String(error.message || '')
  return code === '23505' || /duplicate key|unique constraint/i.test(message)
}

/** Exported for unit tests — sequential cascade without RPC. Not production-safe. */
export async function cancelCourseDatabaseSequential(
  supabase: SupabaseClient,
  tenantId: string,
  courseId: string,
  actorId: string,
): Promise<CourseCancelDbResult> {
  const now = new Date().toISOString()

  const { data: course, error: courseLoadError } = await supabase
    .from('courses')
    .select('id, tenant_id, status')
    .eq('id', courseId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (courseLoadError) {
    throw createError({ statusCode: 500, statusMessage: courseLoadError.message })
  }
  if (!course) {
    throw createError({ statusCode: 404, statusMessage: 'Kurs nicht gefunden.' })
  }

  const alreadyCancelled = course.status === 'cancelled'

  if (!alreadyCancelled) {
    const { error: courseUpdateError } = await supabase
      .from('courses')
      .update({
        status: 'cancelled',
        is_active: false,
        cancelled_at: now,
        cancelled_by: actorId,
        status_changed_at: now,
        status_changed_by: actorId,
        updated_at: now,
      })
      .eq('id', courseId)
      .eq('tenant_id', tenantId)

    if (courseUpdateError) {
      throw createError({ statusCode: 500, statusMessage: courseUpdateError.message })
    }
  }

  const { data: regsToCancel, error: regLoadError } = await supabase
    .from('course_registrations')
    .select('id, payment_id, invoice_id, status, email, first_name, last_name, user_id')
    .eq('course_id', courseId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .neq('status', 'cancelled')

  if (regLoadError) {
    throw createError({ statusCode: 500, statusMessage: regLoadError.message })
  }

  const registrationIds = (regsToCancel || []).map((r) => r.id)
  if (registrationIds.length > 0) {
    const { error: regUpdateError } = await supabase
      .from('course_registrations')
      .update({ status: 'cancelled', updated_at: now })
      .in('id', registrationIds)
      .eq('tenant_id', tenantId)

    if (regUpdateError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Anmeldungen konnten nicht storniert werden: ${regUpdateError.message}`,
      })
    }
  }

  const { data: allRegs, error: allRegsError } = await supabase
    .from('course_registrations')
    .select('id, payment_id, invoice_id')
    .eq('course_id', courseId)
    .eq('tenant_id', tenantId)

  if (allRegsError) {
    throw createError({ statusCode: 500, statusMessage: allRegsError.message })
  }

  const allRegIds = (allRegs || []).map((r) => r.id)
  const paymentIdsFromRegs = (allRegs || []).map((r) => r.payment_id).filter(Boolean) as string[]
  const invoiceIdsFromRegs = (allRegs || []).map((r) => r.invoice_id).filter(Boolean) as string[]

  const paymentIdsCancelled: string[] = []
  const paymentIdsSkippedPaid: string[] = []
  const invoiceIdsCancelled: string[] = []
  const invoiceIdsSkippedPaid: string[] = []

  if (allRegIds.length > 0 || paymentIdsFromRegs.length > 0) {
    const paymentsById = new Map<string, {
      id: string
      payment_status?: string | null
      paid_at?: string | null
      amount_paid_rappen?: number | null
      invoice_id?: string | null
      course_registration_id?: string | null
    }>()

    if (allRegIds.length > 0) {
      const { data: byReg, error: byRegError } = await supabase
        .from('payments')
        .select('id, payment_status, paid_at, amount_paid_rappen, invoice_id, course_registration_id')
        .eq('tenant_id', tenantId)
        .in('course_registration_id', allRegIds)
      if (byRegError) {
        throw createError({ statusCode: 500, statusMessage: byRegError.message })
      }
      for (const p of byReg || []) paymentsById.set(p.id, p)
    }

    if (paymentIdsFromRegs.length > 0) {
      const { data: byId, error: byIdError } = await supabase
        .from('payments')
        .select('id, payment_status, paid_at, amount_paid_rappen, invoice_id, course_registration_id')
        .eq('tenant_id', tenantId)
        .in('id', paymentIdsFromRegs)
      if (byIdError) {
        throw createError({ statusCode: 500, statusMessage: byIdError.message })
      }
      for (const p of byId || []) paymentsById.set(p.id, p)
    }

    const toCancel: string[] = []
    for (const payment of paymentsById.values()) {
      const action = classifyPaymentForCourseCancel(payment)
      if (action === 'cancel') toCancel.push(payment.id)
      else if (action === 'skip_paid') paymentIdsSkippedPaid.push(payment.id)
      if (payment.invoice_id) invoiceIdsFromRegs.push(payment.invoice_id)
    }

    if (toCancel.length > 0) {
      const { error: payUpdateError } = await supabase
        .from('payments')
        .update({
          payment_status: 'cancelled',
          updated_at: now,
          updated_by: actorId,
        })
        .in('id', toCancel)
        .eq('tenant_id', tenantId)

      if (payUpdateError) {
        throw createError({
          statusCode: 500,
          statusMessage: `Zahlungen konnten nicht storniert werden: ${payUpdateError.message}`,
        })
      }
      paymentIdsCancelled.push(...toCancel)
    }
  }

  const { data: bindings } = await supabase
    .from('course_invoice_bindings')
    .select('invoice_id, registration_id')
    .in('registration_id', allRegIds.length > 0 ? allRegIds : ['00000000-0000-0000-0000-000000000000'])

  for (const b of bindings || []) {
    if (b.invoice_id) invoiceIdsFromRegs.push(b.invoice_id)
  }

  const uniqueInvoiceIds = [...new Set(invoiceIdsFromRegs)]
  if (uniqueInvoiceIds.length > 0) {
    const { data: invoices, error: invError } = await supabase
      .from('invoices')
      .select('id, status, payment_status, paid_at, paid_amount_rappen, notes')
      .in('id', uniqueInvoiceIds)
      .eq('tenant_id', tenantId)

    if (invError) {
      throw createError({ statusCode: 500, statusMessage: invError.message })
    }

    const stamp = new Date().toLocaleString('de-CH', { timeZone: 'Europe/Zurich' })
    for (const invoice of invoices || []) {
      const action = classifyInvoiceForCourseCancel(invoice)
      if (action === 'skip_paid') {
        invoiceIdsSkippedPaid.push(invoice.id)
        continue
      }
      if (action === 'noop') continue

      const noteLine = `Storniert wegen Kursabsage am ${stamp}`
      const notes = invoice.notes && String(invoice.notes).trim()
        ? `${invoice.notes}\n${noteLine}`
        : noteLine

      const { error: invUpdateError } = await supabase
        .from('invoices')
        .update({
          status: 'cancelled',
          updated_at: now,
          notes,
        })
        .eq('id', invoice.id)
        .eq('tenant_id', tenantId)
        .neq('status', 'cancelled')

      if (invUpdateError) {
        throw createError({
          statusCode: 500,
          statusMessage: `Rechnung konnte nicht storniert werden: ${invUpdateError.message}`,
        })
      }
      invoiceIdsCancelled.push(invoice.id)
    }
  }

  const resources = await cancelResourceBookingsForCourse(supabase, courseId, tenantId)

  return {
    courseId,
    tenantId,
    alreadyCancelled,
    registrationIds,
    paymentIdsCancelled,
    paymentIdsSkippedPaid,
    invoiceIdsCancelled,
    invoiceIdsSkippedPaid,
    roomBookingIds: resources.roomBookingIds,
    vehicleBookingIds: resources.vehicleBookingIds,
    path: 'sequential',
    resources,
  }
}

export async function cancelCourseDatabase(
  supabase: SupabaseClient,
  tenantId: string,
  courseId: string,
  actorId: string,
): Promise<CourseCancelDbResult> {
  const { data, error } = await supabase.rpc('cancel_course_database_cascade', {
    p_tenant_id: tenantId,
    p_course_id: courseId,
    p_actor_id: actorId,
  })

  if (!error && data && typeof data === 'object') {
    // RPC cancels room/vehicle inside the transaction; re-read is unnecessary for IDs
    // but we still run structured resource helper only when RPC omitted them — prefer RPC IDs.
    const resources: CourseResourceCancelResult = {
      ok: true,
      roomBookingIds: asUuidArray((data as Record<string, unknown>).room_booking_ids),
      vehicleBookingIds: asUuidArray((data as Record<string, unknown>).vehicle_booking_ids),
      errors: [],
    }
    return mapRpcResult(data as Record<string, unknown>, 'rpc', resources)
  }

  const message = String(error?.message || '')
  const missingFn =
    error?.code === 'PGRST202'
    || /cancel_course_database_cascade/i.test(message)
    || /function .* does not exist/i.test(message)
    || /Could not find the function/i.test(message)

  if (error && !missingFn) {
    if (/course_not_found_or_wrong_tenant/i.test(message)) {
      throw createError({ statusCode: 404, statusMessage: 'Kurs nicht gefunden.' })
    }
    // Fail closed — never discard RPC atomicity by falling back after a real DB error.
    logger.error('❌ cancel_course_database_cascade RPC failed (no sequential fallback):', message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Kursabsage fehlgeschlagen (Datenbank-Kaskade). Bitte erneut versuchen.',
    })
  }

  if (missingFn) {
    if (!isSequentialCourseCancelAllowed()) {
      logger.error(
        '❌ cancel_course_database_cascade RPC missing — sequential production cancel blocked. '
        + `Set ${ALLOW_SEQUENTIAL_COURSE_CANCEL_ENV}=1 only for verified non-production test contexts.`,
      )
      throw createError({
        statusCode: 503,
        statusMessage:
          'Kursabsage vorübergehend nicht verfügbar (atomare DB-Kaskade fehlt). '
          + 'Bitte später erneut versuchen oder Support kontaktieren.',
      })
    }
    logger.warn(
      `⚠️ cancel_course_database_cascade RPC missing — sequential path allowed via ${ALLOW_SEQUENTIAL_COURSE_CANCEL_ENV}=1 (non-atomic)`,
    )
    return cancelCourseDatabaseSequential(supabase, tenantId, courseId, actorId)
  }

  throw createError({
    statusCode: 500,
    statusMessage: 'Kursabsage fehlgeschlagen (unerwartete DB-Antwort).',
  })
}

async function queueCourseCancellationEmails(opts: {
  supabase: SupabaseClient
  tenantId: string
  courseId: string
  courseName: string
  courseDescription?: string | null
  reason?: string | null
  notifyParticipants: boolean
  sessions: Array<{ start_time: string; end_time?: string | null; session_number?: number | null }>
  tenant: {
    name?: string | null
    contact_email?: string | null
    primary_color?: string | null
    logo_wide_url?: string | null
    logo_url?: string | null
    logo_square_url?: string | null
  } | null
}): Promise<CourseCancelEmailResult> {
  const result: CourseCancelEmailResult = {
    requested: opts.notifyParticipants,
    queued: 0,
    skippedDuplicate: 0,
    skippedNoEmail: 0,
    errors: [],
  }

  if (!opts.notifyParticipants) return result

  const { data: regs, error } = await opts.supabase
    .from('course_registrations')
    .select('id, email, first_name, last_name, user_id, status')
    .eq('course_id', opts.courseId)
    .eq('tenant_id', opts.tenantId)
    .eq('status', 'cancelled')
    .is('deleted_at', null)

  if (error) {
    result.errors.push(error.message)
    return result
  }

  const sessionLines = [...(opts.sessions || [])]
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .map((s, idx) => formatCourseSessionLine({
      start_time: s.start_time,
      end_time: s.end_time,
      session_number: s.session_number ?? idx + 1,
    }, idx))

  const logoUrl = opts.tenant?.logo_wide_url || opts.tenant?.logo_url || opts.tenant?.logo_square_url || null
  const now = new Date().toISOString()

  for (const reg of regs || []) {
    if (!reg.email) {
      result.skippedNoEmail++
      continue
    }

    const dedupeKey = buildCourseCancelEmailDedupeKey({
      tenantId: opts.tenantId,
      courseId: opts.courseId,
      registrationId: reg.id,
    })

    // Soft check (fast path); uniqueness index is the concurrency backstop.
    const { data: existing } = await opts.supabase
      .from('outbound_messages_queue')
      .select('id, status')
      .eq('tenant_id', opts.tenantId)
      .eq('channel', 'email')
      .eq('dedupe_key', dedupeKey)
      .in('status', ['pending', 'sending', 'sent'])
      .limit(1)

    if (existing && existing.length > 0) {
      result.skippedDuplicate++
      continue
    }

    // Legacy rows without dedupe_key (pre-migration)
    const { data: legacyExisting } = await opts.supabase
      .from('outbound_messages_queue')
      .select('id, status')
      .eq('tenant_id', opts.tenantId)
      .eq('channel', 'email')
      .contains('context_data', {
        stage: COURSE_CANCEL_EMAIL_STAGE,
        course_id: opts.courseId,
        registration_id: reg.id,
      })
      .in('status', ['pending', 'sending', 'sent'])
      .limit(1)

    if (legacyExisting && legacyExisting.length > 0) {
      result.skippedDuplicate++
      continue
    }

    const { subject, html } = generateCourseRegistrationCancellationEmail({
      firstName: reg.first_name || 'Teilnehmer',
      lastName: reg.last_name || '',
      courseName: opts.courseName,
      sessionLines,
      location: opts.courseDescription || undefined,
      tenantName: opts.tenant?.name || 'Simy',
      tenantEmail: opts.tenant?.contact_email || undefined,
      reason: opts.reason || undefined,
      primaryColor: opts.tenant?.primary_color || '#dc2626',
      logoUrl,
    })

    const { error: insertError } = await opts.supabase.from('outbound_messages_queue').insert({
      tenant_id: opts.tenantId,
      channel: 'email',
      recipient_email: reg.email,
      subject,
      body: html,
      status: 'pending',
      send_at: now,
      dedupe_key: dedupeKey,
      context_data: {
        stage: COURSE_CANCEL_EMAIL_STAGE,
        course_id: opts.courseId,
        course_name: opts.courseName,
        registration_id: reg.id,
        user_id: reg.user_id,
        reason: opts.reason || null,
        dedupe_key: dedupeKey,
      },
    })

    if (insertError) {
      if (isUniqueViolation(insertError)) {
        result.skippedDuplicate++
        continue
      }
      result.errors.push(`${reg.id}: ${insertError.message}`)
      continue
    }
    result.queued++
  }

  return result
}

async function writeCancelAudit(
  supabase: SupabaseClient,
  input: {
    tenantId: string
    actorId: string
    courseId: string
    database: CourseCancelDbResult
    emails: CourseCancelEmailResult
    complete: boolean
    warnings: string[]
    manualReviewRequired: CourseCancelManualReviewItem[]
  },
): Promise<string | null> {
  const { data, error } = await supabase
    .from('audit_logs')
    .insert({
      user_id: input.actorId,
      tenant_id: input.tenantId,
      action: 'course.cancel',
      resource_type: 'course',
      resource_id: input.courseId,
      status: input.complete ? 'success' : 'partial',
      details: {
        database: input.database,
        emails: input.emails,
        warnings: input.warnings,
        manualReviewRequired: input.manualReviewRequired,
      },
    })
    .select('id')
    .maybeSingle()

  if (error) {
    logger.warn('⚠️ Could not write course.cancel audit_logs row:', error.message)
    return null
  }
  return data?.id || null
}

function paymentManualReviewReason(statusHint?: string | null): string {
  const status = String(statusHint || '').toLowerCase()
  if (status === 'authorized') {
    return 'Zahlung autorisiert (Provider) — keine automatische Stornierung/Void; manuelle Prüfung erforderlich'
  }
  if (status === 'partially_refunded') {
    return 'Teilweise erstattet — keine automatische Mutation; manuelle Prüfung erforderlich'
  }
  return 'Bereits bezahlte/settled Zahlung — keine automatische Rückerstattung'
}

/**
 * Canonical DB + email + resource entry point (no SARI/staff).
 * Throws for auth/not-found/hard DB failures. After DB cascade succeeds,
 * email/resource failures are returned as incomplete — not silent success.
 */
export async function cancelCourse(input: CancelCourseInput): Promise<CourseCancelResult> {
  const {
    supabase,
    tenantId,
    actorId,
    courseId,
    notifyParticipants = true,
    reason = null,
  } = input

  if (!courseId) throw createError({ statusCode: 400, statusMessage: 'Missing courseId' })
  if (!tenantId || !actorId) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select(`
      id, name, description, tenant_id, status, sari_managed,
      course_sessions!course_sessions_course_id_fkey(id, start_time, end_time, session_number, staff_id),
      tenants!inner(id, name, slug, contact_email, from_email, resend_domain_verified, primary_color, logo_wide_url, logo_url, logo_square_url, sari_enabled, sari_environment)
    `)
    .eq('id', courseId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (courseError) {
    throw createError({ statusCode: 500, statusMessage: courseError.message })
  }
  if (!course) {
    throw createError({ statusCode: 404, statusMessage: 'Kurs nicht gefunden.' })
  }

  const database = await cancelCourseDatabase(supabase, tenantId, courseId, actorId)

  const warnings: string[] = []
  const manualReviewRequired: CourseCancelManualReviewItem[] = []

  for (const id of database.paymentIdsSkippedPaid) {
    manualReviewRequired.push({
      kind: 'payment',
      id,
      reason: paymentManualReviewReason(null),
    })
  }
  for (const id of database.invoiceIdsSkippedPaid) {
    manualReviewRequired.push({
      kind: 'invoice',
      id,
      reason: 'Bereits bezahlte/settled Rechnung — keine automatische Stornierung/Rückerstattung',
    })
  }

  if (!database.resources.ok) {
    for (const err of database.resources.errors) {
      warnings.push(`Ressourcen: ${err}`)
    }
  }

  type TenantEmailBits = {
    name?: string | null
    contact_email?: string | null
    primary_color?: string | null
    logo_wide_url?: string | null
    logo_url?: string | null
    logo_square_url?: string | null
  }
  type CourseSessionBits = {
    start_time: string
    end_time?: string | null
    session_number?: number | null
  }
  const courseRow = course as {
    name: string
    description?: string | null
    tenants?: TenantEmailBits | null
    course_sessions?: CourseSessionBits[] | null
  }
  const tenant = courseRow.tenants || null
  const sessions = courseRow.course_sessions || []

  const emails = await queueCourseCancellationEmails({
    supabase,
    tenantId,
    courseId,
    courseName: course.name,
    courseDescription: course.description,
    reason,
    notifyParticipants,
    sessions,
    tenant,
  })

  if (emails.errors.length > 0) {
    warnings.push(`E-Mail-Warteschlange: ${emails.errors.length} Fehler`)
  }

  // Manual review is expected for paid/authorized skips — does not alone fail complete.
  // Required auto work: DB cascade returned + resources ok + email enqueue without errors.
  const complete = database.resources.ok && emails.errors.length === 0

  const auditId = await writeCancelAudit(supabase, {
    tenantId,
    actorId,
    courseId,
    database,
    emails,
    complete,
    warnings,
    manualReviewRequired,
  })

  return {
    success: true,
    complete,
    courseId,
    tenantId,
    database,
    emails,
    resources: database.resources,
    manualReviewRequired,
    warnings,
    auditId,
  }
}
