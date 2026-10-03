/**
 * Public single-course enrollment billing for payment_method=invoice
 * when the resolved timing is immediate.
 *
 * Registration success is independent of billing success and of email delivery.
 * The caller passes only the new registration id. Identity is loaded from that row.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import { sendTenantEmail } from '~/server/utils/email'
import { buildInvoiceEmailHtml } from '~/server/utils/invoice-email'
import { formatTenantContactPerson, generateInvoicePdf } from '~/server/utils/invoice-pdf'
import { loadTenantLogoForPdf, resolveTenantWideLogoUrl } from '~/server/utils/tenant-logo-for-pdf'
import { stampInvoiceSourceRow } from '~/server/utils/invoice-tenant-guards'
import { computeVatAmountRappen } from '~/server/utils/invoice-vat'
import { resolveCourseInvoiceTiming } from '~/server/utils/course-invoice-timing'

export type PublicCourseBillingStatus = 'skipped' | 'created' | 'sent' | 'failed'

export interface PublicCourseBillingResult {
  status: PublicCourseBillingStatus
  reason?: string
  invoiceId?: string
  emailed: boolean
  /** Invoice gross in rappen when an invoice exists. Not a delivery claim. */
  grossRappen?: number
}

export type PublicEnrollmentPaymentMethod = 'invoice' | 'cash'

type SessionPriceRow = {
  session_number: number
  allow_individual_booking?: boolean | null
  individual_price_rappen?: number | null
}

const inflight = new Map<string, Promise<PublicCourseBillingResult>>()

export function resolvePublicEnrollmentPriceRappen(input: {
  pricePerParticipantRappen: number | null
  isPartialOnly: boolean
  isPartialEnrollment: boolean
  individualSessionNumber: number | null
  partialPriceRappen: number | null
  sessions: SessionPriceRow[]
}): number {
  const isPartialOrd = !!(input.isPartialEnrollment || input.isPartialOnly)
  const sessionNumber = input.individualSessionNumber
  const isIndividualSession = isPartialOrd && typeof sessionNumber === 'number' && sessionNumber > 0

  if (isIndividualSession) {
    const target = (input.sessions || []).find(
      (session) => session.session_number === sessionNumber && session.allow_individual_booking,
    )
    const sessionPrice = target?.individual_price_rappen
    if (sessionPrice == null) return Number(input.pricePerParticipantRappen) || 0
    return Number(sessionPrice)
  }

  const partialPriceRappen = Number(input.partialPriceRappen ?? 0)
  if (isPartialOrd && !input.isPartialOnly && partialPriceRappen > 0) return partialPriceRappen
  return Number(input.pricePerParticipantRappen) || 0
}

export function courseInvoiceSnapshotAmounts(netRappen: number, vatRatePercent: number) {
  const rawRate = Number(vatRatePercent)
  const agreedVatRate = Number.isFinite(rawRate) && rawRate >= 0 ? rawRate : 0
  const agreedVatRappen = computeVatAmountRappen(netRappen, agreedVatRate)
  return {
    agreed_net_rappen: netRappen,
    agreed_vat_rate: agreedVatRate,
    agreed_vat_rappen: agreedVatRappen,
    agreed_gross_rappen: netRappen + agreedVatRappen,
    discount_rappen: 0,
    voucher_rappen: 0,
    credit_applied_rappen: 0,
    agreed_payment_method: 'invoice' as const,
  }
}

export function publicCourseEnrollmentMessage(
  paymentMethod: PublicEnrollmentPaymentMethod,
  billing: PublicCourseBillingResult | null,
): string {
  if (paymentMethod !== 'invoice') {
    return 'Anmeldung bestätigt! Bitte bringen Sie den Betrag in bar zum ersten Kurstag mit.'
  }
  if (billing?.status === 'sent') {
    return 'Anmeldung bestätigt! Die Rechnung wurde per E-Mail versendet.'
  }
  if (billing?.status === 'created') {
    return 'Anmeldung bestätigt. Die Rechnung wurde erstellt, aber nicht per E-Mail zugestellt.'
  }
  if (billing?.status === 'failed') {
    return 'Anmeldung bestätigt. Die Rechnung konnte nicht erstellt werden.'
  }
  return 'Anmeldung bestätigt. Es wurde keine Rechnung per E-Mail versendet.'
}

export function toPublicBillingResponse(result: PublicCourseBillingResult) {
  return {
    status: result.status,
    ...(result.reason ? { reason: result.reason } : {}),
    ...(result.invoiceId ? { invoiceId: result.invoiceId } : {}),
    emailed: result.status === 'sent',
  }
}

export function runPublicCourseInvoiceBilling(opts: {
  supabase: SupabaseClient
  registrationId: string
}): Promise<PublicCourseBillingResult> {
  const key = opts.registrationId
  const pending = inflight.get(key)
  if (pending) return pending

  const run = runPublicCourseInvoiceBillingInner(opts).finally(() => {
    if (inflight.get(key) === run) inflight.delete(key)
  })
  inflight.set(key, run)
  return run
}

async function runPublicCourseInvoiceBillingInner(opts: {
  supabase: SupabaseClient
  registrationId: string
}): Promise<PublicCourseBillingResult> {
  const registrationId = opts.registrationId
  try {
    if (!registrationId) return fail('billing_error', { registrationId })

    const loaded = await loadRegistration(opts.supabase, registrationId)
    if (loaded.error || !loaded.row) return fail('billing_error', { registrationId, detail: loaded.error })

    let registration = loaded.row
    const tenantId = String(registration.tenant_id || '')
    if (!tenantId) return fail('billing_error', { registrationId, detail: 'missing_tenant' })

    const course = await loadCourse(opts.supabase, registration.course_id, tenantId)
    if (course.error || !course.row) return fail('billing_error', { registrationId, tenantId, detail: course.error || 'course_not_found' })

    const categoryMode = await loadCategoryMode(opts.supabase, course.row.course_category_id, tenantId)
    if (categoryMode.error) return fail('billing_error', { registrationId, tenantId, detail: categoryMode.error })

    const tenant = await loadTenant(opts.supabase, tenantId)
    if (tenant.error || !tenant.row) return fail('billing_error', { registrationId, tenantId, detail: tenant.error || 'tenant_not_found' })

    const timing = resolveCourseInvoiceTiming({
      categoryMode: categoryMode.mode,
      tenantMode: tenant.row.default_invoice_timing_mode,
    })
    if (timing === 'off') return skipped('timing_off')
    if (timing !== 'immediate') return skipped('unsupported_timing')

    if (course.row.billing_mode === 'company_collective') return skipped('company_collective')

    if (!registration.user_id) return skipped('user_unassigned')

    if (registration.payment_method !== 'invoice') {
      return fail('billing_error', { registrationId, tenantId, detail: 'payment_method_not_invoice' })
    }

    const user = await loadUser(opts.supabase, registration.user_id, tenantId)
    if (user.error || !user.row) {
      return fail('conflict', { registrationId, tenantId, detail: user.error || 'user_not_in_tenant' })
    }

    const sessions = await loadSessions(opts.supabase, course.row.id, tenantId)
    if (sessions.error) return fail('billing_error', { registrationId, tenantId, detail: sessions.error })

    const category = await loadCategoryPrice(opts.supabase, course.row.course_category_id, tenantId)
    if (category.error) return fail('billing_error', { registrationId, tenantId, detail: category.error })

    const net = resolvePublicEnrollmentPriceRappen({
      pricePerParticipantRappen: numberOrNull(course.row.price_per_participant_rappen),
      isPartialOnly: !!course.row.is_partial_only,
      isPartialEnrollment: !!registration.is_partial_enrollment,
      individualSessionNumber: numberOrNull(registration.individual_session_number),
      partialPriceRappen: numberOrNull(category.partialPriceRappen),
      sessions: sessions.rows,
    })
    if (!Number.isFinite(net) || net < 0) {
      return fail('billing_error', { registrationId, tenantId, detail: 'invalid_price' })
    }

    const amounts = courseInvoiceSnapshotAmounts(net, Number(tenant.row.default_vat_rate))
    const snap = await ensureSnapshot(opts.supabase, registration, tenantId, amounts)
    if (snap.error) return fail(snap.reason || 'billing_error', { registrationId, tenantId, detail: snap.error })
    registration = snap.registration

    const existingPayments = await loadPayments(opts.supabase, registrationId)
    if (existingPayments.error) return fail('billing_error', { registrationId, tenantId, detail: existingPayments.error })
    if (existingPayments.rows.some((row) => row.tenant_id !== tenantId)) {
      return fail('conflict', { registrationId, tenantId, detail: 'cross_tenant_payment' })
    }
    const tenantPayments = existingPayments.rows.filter((row) => row.tenant_id === tenantId)
    if (tenantPayments.length > 1) {
      return fail('conflict', { registrationId, tenantId, detail: 'multiple_payments' })
    }

    const existingPayment = tenantPayments[0] || null
    if (existingPayment?.invoice_id && registration.invoice_id && existingPayment.invoice_id !== registration.invoice_id) {
      return fail('conflict', { registrationId, tenantId, detail: 'invoice_payment_mismatch' })
    }
    if (existingPayment && !existingPayment.invoice_id) {
      return fail('conflict', { registrationId, tenantId, detail: 'payment_without_invoice' })
    }
    if (
      existingPayment
      && (
        Number(existingPayment.total_amount_rappen) !== amounts.agreed_gross_rappen
        || Number(existingPayment.lesson_price_rappen) !== amounts.agreed_gross_rappen
      )
    ) {
      return fail('conflict', { registrationId, tenantId, detail: 'payment_amount_mismatch' })
    }

    const issued = await issueInvoice(opts.supabase, tenantId, registrationId)
    if (issued.error || !issued.invoiceId) {
      return fail(issued.reason || 'billing_error', { registrationId, tenantId, detail: issued.error })
    }

    if (registration.invoice_id && registration.invoice_id !== issued.invoiceId) {
      return invoiceCreated(issued.invoiceId, 'invoice_id_mismatch', amounts.agreed_gross_rappen)
    }
    if (existingPayment?.invoice_id && existingPayment.invoice_id !== issued.invoiceId) {
      return invoiceCreated(issued.invoiceId, 'payment_invoice_mismatch', amounts.agreed_gross_rappen)
    }

    if (!registration.invoice_id) {
      const stamped = await stampInvoiceSourceRow({
        supabase: opts.supabase,
        table: 'course_registrations',
        sourceId: registrationId,
        tenantId,
        invoiceId: issued.invoiceId,
      })
      if (stamped.error) return invoiceCreated(issued.invoiceId, 'billing_error', amounts.agreed_gross_rappen)
      const refreshed = await loadRegistration(opts.supabase, registrationId)
      if (refreshed.error || !refreshed.row) return invoiceCreated(issued.invoiceId, 'billing_error', amounts.agreed_gross_rappen)
      if (refreshed.row.invoice_id !== issued.invoiceId) {
        return invoiceCreated(issued.invoiceId, 'stamp_mismatch', amounts.agreed_gross_rappen)
      }
      registration = refreshed.row
    }

    const payment = await ensurePayment(opts.supabase, {
      registration,
      tenantId,
      invoiceId: issued.invoiceId,
      grossRappen: amounts.agreed_gross_rappen,
      courseId: course.row.id,
      courseName: course.row.name || 'Kurs',
      existingPayment,
    })
    if (payment.error || !payment.paymentId) {
      return invoiceCreated(issued.invoiceId, payment.reason || 'conflict', amounts.agreed_gross_rappen)
    }

    const linked = await linkPaymentId(opts.supabase, registration, tenantId, payment.paymentId)
    if (linked.error) return invoiceCreated(issued.invoiceId, linked.reason || 'conflict', amounts.agreed_gross_rappen)

    const invoice = await loadInvoice(opts.supabase, issued.invoiceId, tenantId)
    if (invoice.error || !invoice.row) return invoiceCreated(issued.invoiceId, 'billing_error', amounts.agreed_gross_rappen)

    if (invoice.row.status === 'sent' || invoice.row.sent_at) {
      return {
        status: 'sent',
        invoiceId: issued.invoiceId,
        emailed: true,
        grossRappen: numberOrZero(invoice.row.total_amount_rappen),
      }
    }

    if (!payment.maySend) {
      return invoiceCreated(issued.invoiceId, 'concurrent_payment', numberOrZero(invoice.row.total_amount_rappen))
    }

    const recipient = firstEmail(registration.email) || firstEmail(user.row.email)
    if (!recipient) {
      return {
        status: 'created',
        reason: 'missing_email',
        invoiceId: issued.invoiceId,
        emailed: false,
        grossRappen: numberOrZero(invoice.row.total_amount_rappen),
      }
    }

    const mailed = await sendSnapshotInvoiceEmail({
      supabase: opts.supabase,
      tenant: tenant.row,
      invoice: invoice.row,
      recipient,
      customerName: studentName(registration),
    })
    if (!mailed.ok) {
      logger.error('public course invoice email failed', {
        registrationId,
        tenantId,
        invoiceId: issued.invoiceId,
        detail: mailed.error,
      })
      return {
        status: 'created',
        reason: 'mail_failed',
        invoiceId: issued.invoiceId,
        emailed: false,
        grossRappen: numberOrZero(invoice.row.total_amount_rappen),
      }
    }

    const marked = await markInvoiceSent(opts.supabase, issued.invoiceId, tenantId)
    if (marked !== 'sent') {
      return invoiceCreated(issued.invoiceId, 'sent_status_unconfirmed', numberOrZero(invoice.row.total_amount_rappen))
    }
    return {
      status: 'sent',
      invoiceId: issued.invoiceId,
      emailed: true,
      grossRappen: numberOrZero(invoice.row.total_amount_rappen),
    }
  } catch (error: any) {
    return fail('billing_error', { registrationId, detail: error?.message || 'unexpected' })
  }
}

function skipped(reason: string): PublicCourseBillingResult {
  return { status: 'skipped', reason, emailed: false }
}

function invoiceCreated(invoiceId: string, reason: string, grossRappen: number): PublicCourseBillingResult {
  return { status: 'created', reason, invoiceId, emailed: false, grossRappen }
}

function fail(reason: string, context: Record<string, unknown>): PublicCourseBillingResult {
  logger.error('public course invoice billing failed', { reason, ...context })
  return { status: 'failed', reason, emailed: false }
}

async function loadRegistration(supabase: SupabaseClient, registrationId: string) {
  const { data, error } = await supabase
    .from('course_registrations')
    .select(`
      id, tenant_id, user_id, course_id, email, first_name, last_name,
      payment_method, payment_status, status, invoice_id, payment_id,
      is_partial_enrollment, individual_session_number,
      agreed_net_rappen, agreed_vat_rate, agreed_vat_rappen, agreed_gross_rappen,
      discount_rappen, voucher_rappen, credit_applied_rappen,
      agreed_payment_method, price_snapshot_at
    `)
    .eq('id', registrationId)
    .maybeSingle()
  if (error) return { row: null as any, error: error.message }
  return { row: data as any, error: null as string | null }
}

async function loadCourse(supabase: SupabaseClient, courseId: unknown, tenantId: string) {
  if (!courseId) return { row: null, error: 'course_not_found' }
  const { data, error } = await supabase
    .from('courses')
    .select('id, tenant_id, name, billing_mode, price_per_participant_rappen, is_partial_only, course_category_id')
    .eq('id', courseId as string)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (error) return { row: null, error: error.message }
  if (!data || (data as any).tenant_id !== tenantId) return { row: null, error: 'course_not_found' }
  return { row: data as any, error: null as string | null }
}

async function loadCategoryMode(
  supabase: SupabaseClient,
  categoryId: unknown,
  tenantId: string,
): Promise<{ mode: string; error: string | null }> {
  if (!categoryId) return { mode: 'inherit', error: null }
  const { data, error } = await supabase
    .from('course_categories')
    .select('id, tenant_id, invoice_timing_mode')
    .eq('id', categoryId as string)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (error) return { mode: 'inherit', error: error.message }
  if (!data || (data as any).tenant_id !== tenantId) {
    return { mode: 'inherit', error: 'category_not_in_tenant' }
  }
  return { mode: (data as any).invoice_timing_mode || 'inherit', error: null }
}

async function loadCategoryPrice(supabase: SupabaseClient, categoryId: unknown, tenantId: string) {
  if (!categoryId) return { partialPriceRappen: null as number | null, error: null as string | null }
  const { data, error } = await supabase
    .from('course_categories')
    .select('id, partial_price_rappen, tenant_id')
    .eq('id', categoryId as string)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (error) return { partialPriceRappen: null, error: error.message }
  return { partialPriceRappen: (data as any)?.partial_price_rappen ?? null, error: null }
}

async function loadTenant(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from('tenants')
    .select(`
      id, name, legal_company_name, contact_email,
      contact_person_first_name, contact_person_last_name,
      primary_color, secondary_color, logo_wide_url, logo_url, logo_square_url,
      invoice_street, invoice_street_nr, invoice_zip, invoice_city,
      invoice_intro_text, invoice_payment_terms, invoice_footer_text,
      invoice_window_side, default_vat_rate, default_invoice_timing_mode
    `)
    .eq('id', tenantId)
    .maybeSingle()
  if (error) return { row: null, error: error.message }
  return { row: data as any, error: null as string | null }
}

async function loadUser(supabase: SupabaseClient, userId: string, tenantId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, tenant_id')
    .eq('id', userId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (error) return { row: null, error: error.message }
  if (!data || (data as any).tenant_id !== tenantId) return { row: null, error: 'user_not_in_tenant' }
  return { row: data as any, error: null as string | null }
}

async function loadSessions(supabase: SupabaseClient, courseId: string, tenantId: string) {
  const { data, error } = await supabase
    .from('course_sessions')
    .select('session_number, allow_individual_booking, individual_price_rappen, tenant_id, course_id')
    .eq('course_id', courseId)
    .eq('tenant_id', tenantId)
  if (error) return { rows: [] as SessionPriceRow[], error: error.message }
  const rows = (Array.isArray(data) ? data : []) as SessionPriceRow[]
  return { rows, error: null as string | null }
}

async function loadPayments(supabase: SupabaseClient, registrationId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('id, tenant_id, invoice_id, course_registration_id, user_id, total_amount_rappen, lesson_price_rappen, payment_method, payment_status')
    .eq('course_registration_id', registrationId)
  if (error) return { rows: [] as any[], error: error.message }
  return { rows: (Array.isArray(data) ? data : []) as any[], error: null as string | null }
}

async function loadInvoice(supabase: SupabaseClient, invoiceId: string, tenantId: string) {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      id, tenant_id, invoice_number, invoice_date, due_date, status, sent_at,
      subtotal_rappen, vat_rate, vat_amount_rappen, discount_amount_rappen, total_amount_rappen,
      billing_contact_person, billing_email, billing_street, billing_zip, billing_city, billing_company_name,
      notes, payment_terms, footer_text
    `)
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (error) return { row: null, error: error.message }
  if (!data || (data as any).tenant_id !== tenantId) return { row: null, error: 'invoice_not_found' }
  return { row: data as any, error: null as string | null }
}

function snapshotMatches(row: any, amounts: ReturnType<typeof courseInvoiceSnapshotAmounts>) {
  return Number(row.agreed_net_rappen) === amounts.agreed_net_rappen
    && Number(row.agreed_vat_rate) === amounts.agreed_vat_rate
    && Number(row.agreed_vat_rappen) === amounts.agreed_vat_rappen
    && Number(row.agreed_gross_rappen) === amounts.agreed_gross_rappen
    && Number(row.discount_rappen) === 0
    && Number(row.voucher_rappen) === 0
    && Number(row.credit_applied_rappen) === 0
    && row.agreed_payment_method === 'invoice'
    && row.price_snapshot_at != null
}

async function ensureSnapshot(
  supabase: SupabaseClient,
  registration: any,
  tenantId: string,
  amounts: ReturnType<typeof courseInvoiceSnapshotAmounts>,
) {
  if (registration.price_snapshot_at) {
    if (!snapshotMatches(registration, amounts)) {
      return { registration, error: 'snapshot_mismatch', reason: 'conflict' as const }
    }
    return { registration, error: null as string | null, reason: null as string | null }
  }

  const patch = {
    ...amounts,
    price_snapshot_at: new Date().toISOString(),
  }
  const { data, error } = await supabase
    .from('course_registrations')
    .update(patch)
    .eq('id', registration.id)
    .eq('tenant_id', tenantId)
    .is('price_snapshot_at', null)
    .select('id')
  if (error) return { registration, error: error.message, reason: 'billing_error' as const }

  const wrote = Array.isArray(data) ? data.length > 0 : !!data
  const refreshed = await loadRegistration(supabase, registration.id)
  if (refreshed.error || !refreshed.row) {
    return { registration, error: refreshed.error || 'registration_missing', reason: 'billing_error' as const }
  }
  if (!snapshotMatches(refreshed.row, amounts)) {
    return { registration: refreshed.row, error: wrote ? 'snapshot_not_visible' : 'snapshot_mismatch', reason: 'conflict' as const }
  }
  return { registration: refreshed.row, error: null as string | null, reason: null as string | null }
}

async function issueInvoice(supabase: SupabaseClient, tenantId: string, registrationId: string) {
  const { data, error } = await supabase.rpc('issue_course_invoice', {
    p_tenant_id: tenantId,
    p_registration_ids: [registrationId],
    p_actor_user_id: null,
  })
  if (error) {
    const message = error.message || 'issue_course_invoice_failed'
    const reason = /binding_conflict|invoice_id_mismatch|unique_violation/i.test(message) ? 'conflict' : 'billing_error'
    return { invoiceId: null as string | null, error: message, reason }
  }
  const row = Array.isArray(data) ? data[0] : data
  const invoiceId = row?.invoice_id ? String(row.invoice_id) : null
  if (!invoiceId) return { invoiceId: null, error: 'invoice_missing', reason: 'billing_error' as const }
  return { invoiceId, error: null as string | null, reason: null as string | null }
}

async function ensurePayment(
  supabase: SupabaseClient,
  input: {
    registration: any
    tenantId: string
    invoiceId: string
    grossRappen: number
    courseId: string
    courseName: string
    existingPayment: any | null
  },
) {
  if (input.existingPayment) {
    const reused = matchingPayment(input.existingPayment, input.invoiceId, input.grossRappen)
    if (reused.error) return { paymentId: null as string | null, maySend: false, error: reused.error, reason: 'conflict' as const }
    return { paymentId: String(input.existingPayment.id), maySend: true, error: null as string | null, reason: null as string | null }
  }

  const { error } = await supabase.from('payments').insert({
    tenant_id: input.tenantId,
    user_id: input.registration.user_id,
    course_registration_id: input.registration.id,
    invoice_id: input.invoiceId,
    payment_method: 'invoice',
    payment_status: 'invoiced',
    total_amount_rappen: input.grossRappen,
    lesson_price_rappen: input.grossRappen,
    currency: 'CHF',
    description: `Kurs: ${input.courseName}`,
    metadata: {
      course_id: input.courseId,
      course_registration_id: input.registration.id,
      public_course_invoice: true,
    },
  })
  if (isUniqueViolation(error)) {
    const raced = await reuseRacedPayment(supabase, input)
    return raced
  }
  if (error) return { paymentId: null, maySend: false, error: error.message, reason: 'billing_error' as const }

  const confirmed = await reuseRacedPayment(supabase, input)
  if (confirmed.error || !confirmed.paymentId) return confirmed
  return { ...confirmed, maySend: true }
}

function matchingPayment(payment: any, invoiceId: string, grossRappen: number) {
  if (payment.invoice_id !== invoiceId) return { error: 'existing_payment_other_invoice' }
  if (
    Number(payment.total_amount_rappen) !== grossRappen
    || Number(payment.lesson_price_rappen) !== grossRappen
  ) {
    return { error: 'payment_amount_mismatch' }
  }
  return { error: null as string | null }
}

function isUniqueViolation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === '23505') return true
  const message = error.message || ''
  return message.includes('payments_public_course_invoice_registration_uidx')
}

async function reuseRacedPayment(
  supabase: SupabaseClient,
  input: {
    registration: any
    tenantId: string
    invoiceId: string
    grossRappen: number
  },
) {
  const after = await loadPayments(supabase, input.registration.id)
  if (after.error) return { paymentId: null as string | null, maySend: false, error: after.error, reason: 'billing_error' as const }
  if (after.rows.some((row) => row.tenant_id !== input.tenantId)) {
    return { paymentId: null, maySend: false, error: 'cross_tenant_payment', reason: 'conflict' as const }
  }
  const own = after.rows.filter((row) => row.tenant_id === input.tenantId)
  if (own.length !== 1) {
    return { paymentId: null, maySend: false, error: 'payment_race', reason: 'conflict' as const }
  }
  const matched = matchingPayment(own[0], input.invoiceId, input.grossRappen)
  if (matched.error) return { paymentId: null, maySend: false, error: matched.error, reason: 'conflict' as const }
  return { paymentId: String(own[0].id), maySend: false, error: null as string | null, reason: null as string | null }
}

async function linkPaymentId(
  supabase: SupabaseClient,
  registration: any,
  tenantId: string,
  paymentId: string,
) {
  if (registration.payment_id) {
    if (registration.payment_id !== paymentId) {
      return { error: 'payment_id_mismatch', reason: 'conflict' as const }
    }
    return { error: null as string | null, reason: null as string | null }
  }

  const { error } = await supabase
    .from('course_registrations')
    .update({ payment_id: paymentId })
    .eq('id', registration.id)
    .eq('tenant_id', tenantId)
    .is('payment_id', null)
  if (error) return { error: error.message, reason: 'billing_error' as const }

  const refreshed = await loadRegistration(supabase, registration.id)
  if (refreshed.error || !refreshed.row) return { error: refreshed.error || 'registration_missing', reason: 'billing_error' as const }
  if (refreshed.row.payment_id !== paymentId) {
    return { error: 'payment_id_not_linked', reason: 'conflict' as const }
  }
  return { error: null, reason: null }
}

async function markInvoiceSent(supabase: SupabaseClient, invoiceId: string, tenantId: string): Promise<'sent' | 'draft'> {
  const sentAt = new Date().toISOString()
  const { data, error } = await supabase
    .from('invoices')
    .update({ status: 'sent', sent_at: sentAt })
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .eq('status', 'draft')
    .select('id')

  const marked = !error && (Array.isArray(data) ? data.length > 0 : !!data)
  if (marked) return 'sent'

  const current = await loadInvoice(supabase, invoiceId, tenantId)
  if (current.row?.status === 'sent' && current.row?.sent_at) return 'sent'
  logger.error('public course invoice sent status write failed', {
    invoiceId,
    tenantId,
    detail: error?.message || 'not_marked',
  })
  return 'draft'
}

async function sendSnapshotInvoiceEmail(opts: {
  supabase: SupabaseClient
  tenant: any
  invoice: any
  recipient: string
  customerName: string
}) {
  const { data: items, error } = await opts.supabase
    .from('invoice_items')
    .select('product_name, product_description, quantity, unit_price_rappen, total_price_rappen')
    .eq('invoice_id', opts.invoice.id)
    .eq('tenant_id', opts.tenant.id)
  if (error) return { ok: false, error: error.message }

  const mailItems = (Array.isArray(items) ? items : []).map((item: any) => ({
    product_name: item.product_name,
    product_description: item.product_description,
    quantity: item.quantity,
    unit_price_rappen: item.unit_price_rappen,
    total_price_rappen: item.total_price_rappen,
  }))
  const vatRate = Number(opts.invoice.vat_rate) || 0
  const vatAmountRappen = Number(opts.invoice.vat_amount_rappen) || 0
  const subtotalRappen = Number(opts.invoice.subtotal_rappen) || 0
  const totalRappen = Number(opts.invoice.total_amount_rappen) || 0

  const html = buildInvoiceEmailHtml({
    customerName: opts.customerName,
    invoiceNumber: opts.invoice.invoice_number,
    invoiceDate: opts.invoice.invoice_date,
    dueDate: opts.invoice.due_date,
    items: mailItems,
    subtotalRappen,
    discountRappen: Number(opts.invoice.discount_amount_rappen) || 0,
    vatRappen: vatAmountRappen,
    vatRate,
    totalRappen,
    tenantName: opts.tenant.name || 'Unternehmen',
    staffName: opts.tenant.name || 'Unternehmen',
    primaryColor: opts.tenant.primary_color || null,
    introText: opts.invoice.notes || opts.tenant.invoice_intro_text || null,
    paymentTerms: opts.invoice.payment_terms || opts.tenant.invoice_payment_terms || null,
    footerText: opts.invoice.footer_text || opts.tenant.invoice_footer_text || null,
  })

  let attachments: { filename: string; content: Buffer }[] = []
  try {
    const logo = await loadTenantLogoForPdf(resolveTenantWideLogoUrl(opts.tenant))
    const pdfBuffer = await generateInvoicePdf({
      invoiceNumber: opts.invoice.invoice_number,
      invoiceDate: opts.invoice.invoice_date,
      dueDate: opts.invoice.due_date,
      tenantName: opts.tenant.legal_company_name || opts.tenant.name || 'Unternehmen',
      tenantStreet: [opts.tenant.invoice_street, opts.tenant.invoice_street_nr].filter(Boolean).join(' '),
      tenantZip: opts.tenant.invoice_zip || '',
      tenantCity: opts.tenant.invoice_city || '',
      tenantEmail: opts.tenant.contact_email || undefined,
      tenantContactPerson: formatTenantContactPerson(opts.tenant) || undefined,
      tenantLogoBase64: logo?.base64 || null,
      tenantLogoFormat: logo?.format,
      customerName: opts.customerName,
      billingStreet: opts.invoice.billing_street || '',
      billingZip: opts.invoice.billing_zip || '',
      billingCity: opts.invoice.billing_city || '',
      billingEmail: opts.recipient,
      items: mailItems,
      subtotalRappen,
      discountRappen: Number(opts.invoice.discount_amount_rappen) || 0,
      vatRate,
      vatAmountRappen,
      totalRappen,
      primaryColor: opts.tenant.primary_color || '#1E40AF',
      secondaryColor: opts.tenant.secondary_color || '#64748B',
      windowSide: opts.tenant.invoice_window_side === 'right' ? 'right' : 'left',
      introText: opts.invoice.notes || opts.tenant.invoice_intro_text || null,
      paymentTerms: opts.invoice.payment_terms || opts.tenant.invoice_payment_terms || null,
      footerText: opts.invoice.footer_text || opts.tenant.invoice_footer_text || null,
    })
    attachments = [{
      filename: `Rechnung_${opts.invoice.invoice_number}.pdf`,
      content: Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer as any),
    }]
  } catch (pdfError: any) {
    logger.warn('public course invoice pdf attach failed', pdfError?.message || pdfError)
    attachments = []
  }

  try {
    await sendTenantEmail(opts.tenant.id, {
      to: opts.recipient,
      subject: `Rechnung ${opts.invoice.invoice_number} – ${opts.tenant.name || 'Unternehmen'}`,
      html,
      attachments,
    })
    return { ok: true as const, error: null as string | null }
  } catch (mailError: any) {
    return { ok: false as const, error: mailError?.message || 'mail_failed' }
  }
}

function numberOrNull(value: unknown): number | null {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function numberOrZero(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function firstEmail(value: unknown): string {
  const email = String(value || '').trim()
  return email.includes('@') ? email : ''
}

function studentName(registration: any): string {
  const name = `${registration.first_name || ''} ${registration.last_name || ''}`.trim()
  return name || 'Teilnehmer'
}
