/**
 * Auto-invoice helpers:
 * - on appointment complete (optional)
 * - scheduled cron for past uninvoiced invoice-payments (optional)
 *
 * Both gated by booking_policy (default OFF). Never throws to callers.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  DEFAULT_BOOKING_POLICY,
  VALID_AUTO_INVOICE_RECIPIENTS,
  normalizeAutoInvoiceMonthDay,
  normalizeAutoInvoiceSchedule,
  normalizeAutoInvoiceWeekday,
  type AutoInvoiceRecipient,
  type AutoInvoiceSchedule,
  type BookingPolicy,
} from '~/server/api/admin/booking-policy.get'
import { computeInvoiceDueDate } from '~/server/utils/invoice-due-date'
import { computeVatAmountRappen, getTenantDefaultVatRate } from '~/server/utils/invoice-vat'
import { groupProductSalesByAppointment } from '~/server/utils/invoice-product-lines'
import {
  persistAndSendInvoiceDraft,
  type InvoiceDraftPayload,
  type PersistAndSendActor,
} from '~/server/utils/invoice-persist-and-send'
import { eventTypeLabelMap, getTenantTerminology } from '~/server/utils/tenant-terminology'
import { buildInvoiceServiceLineLabel, buildInvoiceServiceDescription } from '~/server/utils/invoice-line-labels'
import { resolveStudentBillingAddress } from '~/server/utils/billing-from-company'
import { billingPersonNameParts } from '~/utils/billing-address-map'
import logger from '~/utils/logger'

const PAYMENT_SELECT = `
  id,
  user_id,
  staff_id,
  total_amount_rappen,
  lesson_price_rappen,
  admin_fee_rappen,
  products_price_rappen,
  discount_amount_rappen,
  credit_used_rappen,
  voucher_discount_rappen,
  amount_paid_rappen,
  appointment_id,
  payment_method,
  payment_status,
  invoice_id,
  appointments (
    id,
    title,
    start_time,
    duration_minutes,
    type,
    event_type_code,
    status,
    cancellation_charge_percentage,
    staff:users!staff_id (first_name)
  )
`

export function loadAutoInvoicePolicy(raw: unknown): BookingPolicy {
  const merged = { ...DEFAULT_BOOKING_POLICY, ...(raw as object || {}) } as BookingPolicy
  return {
    ...merged,
    auto_invoice_on_complete: merged.auto_invoice_on_complete === true,
    auto_invoice_recipient: VALID_AUTO_INVOICE_RECIPIENTS.includes(
      merged.auto_invoice_recipient as AutoInvoiceRecipient
    )
      ? (merged.auto_invoice_recipient as AutoInvoiceRecipient)
      : 'customer',
    auto_invoice_office_email:
      typeof merged.auto_invoice_office_email === 'string' && merged.auto_invoice_office_email.trim()
        ? merged.auto_invoice_office_email.trim()
        : null,
    auto_invoice_schedule: normalizeAutoInvoiceSchedule(merged.auto_invoice_schedule),
    auto_invoice_schedule_weekday: normalizeAutoInvoiceWeekday(merged.auto_invoice_schedule_weekday),
    auto_invoice_schedule_day: normalizeAutoInvoiceMonthDay(merged.auto_invoice_schedule_day),
  }
}

/** Current calendar parts in Europe/Zurich */
export function zurichTodayParts(now = new Date()): { isoWeekday: number; dayOfMonth: number; dateKey: string } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  })
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]))
  const weekdayMap: Record<string, number> = {
    Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7,
  }
  return {
    isoWeekday: weekdayMap[parts.weekday] || 1,
    dayOfMonth: Number(parts.day),
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
  }
}

export function scheduleMatchesToday(
  schedule: AutoInvoiceSchedule,
  weekday: number,
  monthDay: number,
  now = new Date()
): boolean {
  if (schedule === 'off') return false
  const today = zurichTodayParts(now)
  if (schedule === 'daily') return true
  if (schedule === 'weekly') return today.isoWeekday === weekday
  if (schedule === 'monthly') return today.dayOfMonth === monthDay
  return false
}

function missingEmailAlertHtml(opts: {
  tenantName: string
  studentName: string
  invoiceNumber: string
  contextLabel: string
  totalRappen: number
}): string {
  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Rechnung ohne Kunden-E-Mail</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<div style="max-width:540px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
  <div style="background:#92400e;padding:24px 32px;">
    <h1 style="color:white;margin:0;font-size:18px;font-weight:700;">Rechnung erstellt – keine Kunden-E-Mail</h1>
    <p style="color:#fde68a;margin:4px 0 0;font-size:13px;">${opts.tenantName}</p>
  </div>
  <div style="padding:28px 32px;">
    <p style="color:#475569;margin:0 0 16px;">
      Rechnung <strong>${opts.invoiceNumber}</strong> wurde erstellt und als verrechnet markiert,
      konnte aber nicht an den Kunden gesendet werden — es fehlt eine E-Mail-Adresse.
    </p>
    <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;overflow:hidden;margin-bottom:16px;">
      <tr><td style="padding:10px 14px;color:#64748b;font-size:13px;border-bottom:1px solid #e2e8f0;">Kunde</td><td style="padding:10px 14px;font-weight:600;color:#1e293b;border-bottom:1px solid #e2e8f0;">${opts.studentName}</td></tr>
      <tr><td style="padding:10px 14px;color:#64748b;font-size:13px;border-bottom:1px solid #e2e8f0;">Betrag</td><td style="padding:10px 14px;font-weight:700;color:#1e293b;border-bottom:1px solid #e2e8f0;">CHF ${(opts.totalRappen / 100).toFixed(2)}</td></tr>
      <tr><td style="padding:10px 14px;color:#64748b;font-size:13px;">Kontext</td><td style="padding:10px 14px;color:#1e293b;font-size:12px;">${opts.contextLabel}</td></tr>
    </table>
    <p style="color:#94a3b8;font-size:12px;margin:0;">Bitte E-Mail ergänzen und Rechnung manuell nachsenden.</p>
  </div>
</div></body></html>`
}

async function buildDraftForPayments(opts: {
  supabase: SupabaseClient
  tenantId: string
  actor: PersistAndSendActor
  payments: any[]
  student: any
  savedBilling: any
  tenant: any
}): Promise<InvoiceDraftPayload | null> {
  const { supabase, tenantId, actor, payments, student, savedBilling, tenant } = opts
  if (!payments.length) return null

  const getGrossAmount = (p: any) =>
    (p.total_amount_rappen || 0) +
    (p.discount_amount_rappen || 0) +
    (p.voucher_discount_rappen || 0)

  const subtotal = payments.reduce((sum, p) => sum + getGrossAmount(p), 0)
  const totalDiscounts = payments.reduce(
    (sum, p) => sum + (p.discount_amount_rappen || 0) + (p.voucher_discount_rappen || 0),
    0
  )
  const totalCredits = payments.reduce((sum, p) => sum + (p.credit_used_rappen || 0), 0)
  const totalAlreadyPaid = payments.reduce((sum, p) => sum + Math.max(0, p.amount_paid_rappen || 0), 0)
  const vatRatePercent = Number.isFinite(Number(tenant?.default_vat_rate))
    ? Number(tenant.default_vat_rate)
    : await getTenantDefaultVatRate(supabase, tenantId)
  const netAfterDiscounts = subtotal - totalDiscounts - totalCredits - totalAlreadyPaid
  const vatAmount = computeVatAmountRappen(Math.max(0, netAfterDiscounts), vatRatePercent)
  const total = netAfterDiscounts + vatAmount

  const today = new Date()
  const invoiceDate = today.toISOString().split('T')[0]
  const dueDate = computeInvoiceDueDate(invoiceDate, tenant?.invoice_due_days)

  const aptIdsWithProducts = payments
    .filter((p) => (p.products_price_rappen || 0) > 0 && p.appointment_id)
    .map((p) => p.appointment_id)
  let productsByApt: Record<string, { name: string; price_rappen: number; product_id?: string | null; quantity?: number }[]> = {}
  if (aptIdsWithProducts.length > 0) {
    const { data: productSales } = await supabase
      .from('product_sales')
      .select('appointment_id, product_id, quantity, total_price_rappen, products(id, name)')
      .in('appointment_id', aptIdsWithProducts)
    if (productSales) {
      productsByApt = groupProductSalesByAppointment(productSales as any[])
    }
  }

  const terms = await getTenantTerminology(supabase, tenantId)
  const eventTypeMap = eventTypeLabelMap(terms)
  const appointmentFallback = terms.appointment || 'Termin'

  let sortOrder = 0
  const items = payments.flatMap((p) => {
    const apt = p.appointments as any
    const label = apt?.event_type_code ? (eventTypeMap[apt.event_type_code] || apt.event_type_code) : null
    const staffFirstName = apt?.staff?.first_name || null
    const serviceName = buildInvoiceServiceLineLabel({
      eventLabel: label,
      title: apt?.title,
      fallback: appointmentFallback,
      staffFirstName,
      appointmentStatus: apt?.status,
      cancellationChargePercentage: apt?.cancellation_charge_percentage,
    })
    const serviceDescription = buildInvoiceServiceDescription({
      categoryType: apt?.type,
      appointmentStatus: apt?.status,
    })

    const products = (p.appointment_id && productsByApt[p.appointment_id]) || []
    const productsTotal = products.reduce((sum, pd) => sum + (pd.price_rappen || 0), 0)
      || (p.products_price_rappen || 0)
    const serviceGross = Math.max(0, getGrossAmount(p) - productsTotal)

    const serviceItem = {
      payment_id: p.id,
      appointment_id: p.appointment_id,
      product_id: null as string | null,
      product_name: serviceName,
      product_description: serviceDescription,
      appointment_title: apt?.title || null,
      appointment_date: apt?.start_time || null,
      appointment_duration_minutes: apt?.duration_minutes || null,
      quantity: 1,
      unit_price_rappen: serviceGross,
      total_price_rappen: serviceGross,
      vat_rate: vatRatePercent,
      vat_amount_rappen: computeVatAmountRappen(serviceGross, vatRatePercent),
      sort_order: sortOrder++,
      credit_used_rappen: p.credit_used_rappen || 0,
      amount_paid_rappen: Math.max(0, p.amount_paid_rappen || 0),
    }

    const productItems = products.map((pd) => {
      const price = pd.price_rappen || 0
      const qty = pd.quantity || 1
      return {
        payment_id: p.id,
        appointment_id: p.appointment_id,
        product_id: pd.product_id || null,
        product_name: pd.name || 'Produkt',
        product_description: null as string | null,
        appointment_title: null as string | null,
        appointment_date: null as string | null,
        appointment_duration_minutes: null as number | null,
        quantity: qty,
        unit_price_rappen: price,
        total_price_rappen: price * qty,
        vat_rate: vatRatePercent,
        vat_amount_rappen: computeVatAmountRappen(price * qty, vatRatePercent),
        sort_order: sortOrder++,
      }
    })

    if (productItems.length === 0 && (p.products_price_rappen || 0) > 0) {
      const price = p.products_price_rappen || 0
      productItems.push({
        payment_id: p.id,
        appointment_id: p.appointment_id,
        product_id: null,
        product_name: 'Material / Produkte',
        product_description: null,
        appointment_title: null,
        appointment_date: null,
        appointment_duration_minutes: null,
        quantity: 1,
        unit_price_rappen: price,
        total_price_rappen: price,
        vat_rate: vatRatePercent,
        vat_amount_rappen: computeVatAmountRappen(price, vatRatePercent),
        sort_order: sortOrder++,
      })
    }

    return [serviceItem, ...productItems]
  })

  if (!items.length || total <= 0) return null

  const billingPerson = billingPersonNameParts(
    savedBilling?.contact_person,
    { first_name: student.first_name, last_name: student.last_name }
  )

  return {
    invoice_date: invoiceDate,
    due_date: dueDate,
    billing_type: savedBilling?.company_name ? 'company' : 'individual',
    billing_email: savedBilling?.email || student.email || null,
    billing_first_name: billingPerson.first_name,
    billing_last_name: billingPerson.last_name,
    billing_company_name: savedBilling?.company_name || '',
    billing_street: savedBilling?.street || student.street || '',
    billing_street_nr: savedBilling?.street_number || student.street_nr || '',
    billing_zip: savedBilling?.zip || student.zip || '',
    billing_city: savedBilling?.city || student.city || '',
    billing_country: savedBilling?.country || 'CH',
    subtotal_rappen: subtotal,
    vat_rate: vatRatePercent,
    vat_amount_rappen: vatAmount,
    discount_amount_rappen: totalDiscounts + totalCredits + totalAlreadyPaid,
    total_amount_rappen: total,
    user_id: student.id,
    staff_id: actor.id,
    tenant_id: tenantId,
    items,
    payment_ids: payments.map((p) => p.id),
    student: {
      id: student.id,
      name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
      email: student.email,
    },
    creditor_name: tenant?.name || '',
    creditor_street: tenant?.invoice_street || '',
    creditor_street_nr: tenant?.invoice_street_nr || '',
    creditor_zip: tenant?.invoice_zip || '',
    creditor_city: tenant?.invoice_city || '',
    qr_iban: tenant?.qr_iban || null,
    notes: tenant?.invoice_intro_text || null,
    payment_terms: tenant?.invoice_payment_terms || null,
    footer_text: tenant?.invoice_footer_text || null,
  }
}

async function notifyAdminMissingCustomerEmail(opts: {
  supabase: SupabaseClient
  tenantId: string
  fallbackEmail: string | null
  tenantName: string
  studentName: string
  invoiceNumber: string
  contextLabel: string
  totalRappen: number
}): Promise<void> {
  const { sendEmail } = await import('~/server/utils/email')
  const { data: tenant } = await opts.supabase
    .from('tenants')
    .select('from_email, resend_domain_verified, name, contact_email')
    .eq('id', opts.tenantId)
    .maybeSingle()

  const to = tenant?.contact_email || opts.fallbackEmail
  if (!to) return

  await sendEmail({
    to,
    subject: `⚠️ Rechnung ${opts.invoiceNumber} – keine Kunden-E-Mail`,
    html: missingEmailAlertHtml({
      tenantName: opts.tenantName || tenant?.name || '',
      studentName: opts.studentName,
      invoiceNumber: opts.invoiceNumber,
      contextLabel: opts.contextLabel,
      totalRappen: opts.totalRappen,
    }),
    fromName: tenant?.name || opts.tenantName,
    fromEmail: tenant?.from_email ?? null,
    domainVerified: !!tenant?.resend_domain_verified,
  })
}

type TenantInvoiceRow = {
  booking_policy?: unknown
  name?: string | null
  contact_email?: string | null
  qr_iban?: string | null
  invoice_street?: string | null
  invoice_street_nr?: string | null
  invoice_zip?: string | null
  invoice_city?: string | null
  invoice_intro_text?: string | null
  invoice_payment_terms?: string | null
  invoice_footer_text?: string | null
  invoice_due_days?: number | null
  default_vat_rate?: number | null
}

/**
 * Create + send one invoice for a student's open invoice payments.
 */
export async function createAndSendAutoInvoiceForPayments(opts: {
  supabase: SupabaseClient
  tenantId: string
  actor: PersistAndSendActor
  payments: any[]
  policy: BookingPolicy
  tenantRow: TenantInvoiceRow
  contextLabel: string
}): Promise<{ invoice_number: string; emailed_to: string[] } | null> {
  const { supabase, tenantId, actor, payments, policy, tenantRow, contextLabel } = opts
  if (!payments.length) return null

  const userId = payments[0].user_id
  if (!userId) return null

  const { data: student } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, street, street_nr, zip, city, phone, company_id, default_company_billing_address_id')
    .eq('id', userId)
    .maybeSingle()

  if (!student) {
    logger.warn('⚠️ Auto-invoice: student not found', { userId })
    return null
  }

  const savedBilling = await resolveStudentBillingAddress(supabase, student)

  const draft = await buildDraftForPayments({
    supabase,
    tenantId,
    actor,
    payments,
    student,
    savedBilling,
    tenant: tenantRow,
  })
  if (!draft) return null

  const recipientMode = policy.auto_invoice_recipient
  const officeEmail = policy.auto_invoice_office_email
  const customerEmail = (draft.billing_email || '').trim()
  const emailTo: string[] = []
  let missingCustomerEmail = false

  if (recipientMode === 'customer' || recipientMode === 'both') {
    if (customerEmail) emailTo.push(customerEmail)
    else missingCustomerEmail = true
  }
  if (recipientMode === 'office' || recipientMode === 'both') {
    if (officeEmail) emailTo.push(officeEmail)
    else if (tenantRow.contact_email) emailTo.push(tenantRow.contact_email)
  }

  const uniqueTo = [...new Set(emailTo.filter(Boolean))]
  const needsAdminMissingEmailAlert =
    missingCustomerEmail && (recipientMode === 'customer' || recipientMode === 'both')

  const result = await persistAndSendInvoiceDraft({
    supabase,
    tenantId,
    actor,
    draft,
    sendEmailFlag: true,
    emailTo: uniqueTo.length ? uniqueTo : undefined,
    skipAdminNotify: true,
  })

  if (needsAdminMissingEmailAlert) {
    await notifyAdminMissingCustomerEmail({
      supabase,
      tenantId,
      fallbackEmail: actor.email || null,
      tenantName: tenantRow.name || '',
      studentName: draft.student?.name || 'Kunde',
      invoiceNumber: result.invoice_number,
      contextLabel,
      totalRappen: draft.total_amount_rappen,
    }).catch((e: any) =>
      logger.warn('⚠️ Auto-invoice missing-email alert failed:', e?.message)
    )
  }

  return { invoice_number: result.invoice_number, emailed_to: result.emailed_to }
}

/**
 * Fire-and-forget after appointments are marked completed.
 */
export async function triggerAutoInvoiceOnComplete(opts: {
  supabase: SupabaseClient
  tenantId: string
  appointmentIds: string[]
  actor: PersistAndSendActor
}): Promise<void> {
  const { supabase, tenantId, appointmentIds, actor } = opts
  if (!appointmentIds.length) return

  try {
    const { data: tenantRow } = await supabase
      .from('tenants')
      .select('booking_policy, name, contact_email, qr_iban, invoice_street, invoice_street_nr, invoice_zip, invoice_city, invoice_intro_text, invoice_payment_terms, invoice_footer_text, invoice_due_days, default_vat_rate')
      .eq('id', tenantId)
      .maybeSingle()

    const policy = loadAutoInvoicePolicy(tenantRow?.booking_policy)
    if (!policy.auto_invoice_on_complete) return

    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(PAYMENT_SELECT)
      .eq('tenant_id', tenantId)
      .in('appointment_id', appointmentIds)
      .eq('payment_method', 'invoice')
      .in('payment_status', ['pending', 'open'])
      .is('invoice_id', null)

    if (paymentsError) {
      logger.error('❌ Auto-invoice: payments query failed', { error: paymentsError.message })
      return
    }
    if (!payments?.length) return

    for (const payment of payments) {
      try {
        const result = await createAndSendAutoInvoiceForPayments({
          supabase,
          tenantId,
          actor,
          payments: [payment],
          policy,
          tenantRow: tenantRow || {},
          contextLabel: `Termin ${payment.appointment_id}`,
        })
        if (result) {
          logger.debug('✅ Auto-invoice (on complete)', {
            invoiceNumber: result.invoice_number,
            appointmentId: payment.appointment_id,
            emailedTo: result.emailed_to,
          })
        }
      } catch (err: any) {
        logger.error('❌ Auto-invoice failed for payment', {
          paymentId: payment.id,
          error: err?.message,
        })
      }
    }
  } catch (err: any) {
    logger.error('❌ Auto-invoice hook error:', err?.message)
  }
}

async function resolveSystemActor(
  supabase: SupabaseClient,
  tenantId: string,
  payments: any[]
): Promise<PersistAndSendActor | null> {
  const staffId = payments.find((p) => p.staff_id)?.staff_id
  if (staffId) {
    const { data } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .eq('id', staffId)
      .maybeSingle()
    if (data) return data
  }

  const { data: admin } = await supabase
    .from('users')
    .select('id, first_name, last_name, email')
    .eq('tenant_id', tenantId)
    .eq('role', 'admin')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return admin
}

/**
 * Cron entry: invoice past open invoice-payments for tenants whose schedule matches today.
 */
export async function runScheduledAutoInvoices(opts: {
  supabase: SupabaseClient
  now?: Date
  testTenantId?: string | null
}): Promise<{
  tenantsProcessed: number
  invoicesCreated: number
  errors: number
}> {
  const { supabase, now = new Date(), testTenantId = null } = opts
  let tenantsProcessed = 0
  let invoicesCreated = 0
  let errors = 0

  let tenantQuery = supabase
    .from('tenants')
    .select('id, booking_policy, name, contact_email, qr_iban, invoice_street, invoice_street_nr, invoice_zip, invoice_city, invoice_intro_text, invoice_payment_terms, invoice_footer_text, invoice_due_days, default_vat_rate')
    .eq('is_active', true)

  if (testTenantId) {
    tenantQuery = tenantQuery.eq('id', testTenantId)
  }

  const { data: tenants, error: tenantsError } = await tenantQuery
  if (tenantsError) {
    logger.error('❌ Scheduled auto-invoice: tenants query failed', tenantsError.message)
    throw tenantsError
  }

  for (const tenant of tenants || []) {
    try {
      const policy = loadAutoInvoicePolicy(tenant.booking_policy)
      if (
        !scheduleMatchesToday(
          policy.auto_invoice_schedule,
          policy.auto_invoice_schedule_weekday,
          policy.auto_invoice_schedule_day,
          now
        )
      ) {
        continue
      }

      tenantsProcessed++

      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select(PAYMENT_SELECT)
        .eq('tenant_id', tenant.id)
        .eq('payment_method', 'invoice')
        .in('payment_status', ['pending', 'open'])
        .is('invoice_id', null)

      if (paymentsError) {
        logger.error('❌ Scheduled auto-invoice payments failed', {
          tenantId: tenant.id,
          error: paymentsError.message,
        })
        errors++
        continue
      }

      const eligible = (payments || []).filter((p: any) => {
        const apt = p.appointments
        if (!apt?.start_time) return false
        if (apt.status === 'cancelled') return false
        return new Date(apt.start_time).getTime() < now.getTime()
      })

      if (!eligible.length) continue

      // Group by student → Sammelrechnung
      const byUser = new Map<string, any[]>()
      for (const p of eligible) {
        if (!p.user_id) continue
        const list = byUser.get(p.user_id) || []
        list.push(p)
        byUser.set(p.user_id, list)
      }

      for (const [, userPayments] of byUser) {
        try {
          const actor = await resolveSystemActor(supabase, tenant.id, userPayments)
          if (!actor) {
            logger.warn('⚠️ Scheduled auto-invoice: no actor for tenant', { tenantId: tenant.id })
            errors++
            continue
          }

          const result = await createAndSendAutoInvoiceForPayments({
            supabase,
            tenantId: tenant.id,
            actor,
            payments: userPayments,
            policy,
            tenantRow: tenant,
            contextLabel: `Zeitplan (${policy.auto_invoice_schedule}), ${userPayments.length} Termin(e)`,
          })

          if (result) {
            invoicesCreated++
            logger.debug('✅ Scheduled auto-invoice', {
              tenantId: tenant.id,
              invoiceNumber: result.invoice_number,
              paymentCount: userPayments.length,
            })
          }
        } catch (err: any) {
          errors++
          logger.error('❌ Scheduled auto-invoice student failed', {
            tenantId: tenant.id,
            error: err?.message,
          })
        }
      }
    } catch (err: any) {
      errors++
      logger.error('❌ Scheduled auto-invoice tenant failed', {
        tenantId: tenant.id,
        error: err?.message,
      })
    }
  }

  return { tenantsProcessed, invoicesCreated, errors }
}
