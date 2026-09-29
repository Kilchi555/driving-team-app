/**
 * Course enrollment billing helpers:
 * - always create a payments row for individual enrollments
 * - optionally create + send an individual invoice
 * - create a company collective invoice for a private Firmenkurs
 */
import { createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { allocateInvoiceNumber } from '~/server/utils/allocate-invoice-number'
import { computeInvoiceDueDate, getTenantInvoiceDueDays } from '~/server/utils/invoice-due-date'
import { getTenantDefaultVatRate, computeVatAmountRappen } from '~/server/utils/invoice-vat'
import { logger } from '~/utils/logger'

export type InvoiceAction = 'later' | 'pdf' | 'email'
type EnrollmentPaymentOption = 'cash' | 'invoice' | 'paid' | 'reserve' | 'online_link'

/**
 * Invoice header math. VAT is calculated on the net subtotal, then the
 * discount is subtracted. That matches the invoices trigger
 * `calculate_invoice_vat`: total = subtotal + vat(subtotal) - discount.
 * Discount defaults to 0, so admin enrollments keep net + VAT.
 */
export function computeCourseInvoiceTotals(
  netRappen: number,
  discountRappen = 0,
  vatRate = 0,
): {
  netRappen: number
  discountRappen: number
  vatRate: number
  vatAmountRappen: number
  totalAmountRappen: number
} {
  const net = Math.max(0, Math.round(Number(netRappen) || 0))
  const discount = Math.min(net, Math.max(0, Math.round(Number(discountRappen) || 0)))
  const vatAmountRappen = computeVatAmountRappen(net, vatRate)
  return {
    netRappen: net,
    discountRappen: discount,
    vatRate,
    vatAmountRappen,
    totalAmountRappen: net + vatAmountRappen - discount,
  }
}

async function loadTenantCourseRegistration(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  tenantId: string,
  enrollmentId: string,
) {
  const { data, error } = await supabase
    .from('course_registrations')
    .select('id, tenant_id, user_id, payment_id, invoice_id')
    .eq('id', enrollmentId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: 'Anmeldung nicht gefunden' })
  }
  return data
}

export async function createEnrollmentPayment(opts: {
  tenantId: string
  /** Null for a public enrollment. No synthetic staff user is created. */
  adminUserId?: string | null
  userId: string
  enrollmentId: string
  courseId: string
  courseName: string
  /** Net course price in rappen. Stored as lesson_price_rappen. */
  amountRappen: number
  /**
   * Amount the customer owes. Defaults to amountRappen so admin cash/invoice
   * payments stay on the course net they already stored.
   */
  payableTotalRappen?: number
  paymentOption: EnrollmentPaymentOption
}): Promise<{ paymentId: string } | null> {
  // online_link creates its own payment via process-public
  if (opts.paymentOption === 'online_link') return null

  const supabase = getSupabaseAdmin()
  const registration = await loadTenantCourseRegistration(supabase, opts.tenantId, opts.enrollmentId)
  if (registration.user_id && registration.user_id !== opts.userId) {
    throw createError({ statusCode: 409, statusMessage: 'Anmeldung gehört zu einem anderen Kunden' })
  }

  if (registration.payment_id) {
    const { data: linked } = await supabase
      .from('payments')
      .select('id')
      .eq('id', registration.payment_id)
      .eq('tenant_id', opts.tenantId)
      .eq('course_registration_id', opts.enrollmentId)
      .maybeSingle()
    if (linked) return { paymentId: linked.id }
  }

  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id')
    .eq('tenant_id', opts.tenantId)
    .eq('course_registration_id', opts.enrollmentId)
    .limit(1)
    .maybeSingle()

  if (existingPayment) {
    if (!registration.payment_id) {
      await supabase
        .from('course_registrations')
        .update({ payment_id: existingPayment.id })
        .eq('id', opts.enrollmentId)
        .eq('tenant_id', opts.tenantId)
        .is('payment_id', null)
    }
    return { paymentId: existingPayment.id }
  }

  const now = new Date().toISOString()

  let payment_method = 'invoice'
  let payment_status = 'pending'
  let paid_at: string | null = null

  switch (opts.paymentOption) {
    case 'cash':
      payment_method = 'cash_on_site'
      payment_status = 'pending'
      break
    case 'invoice':
      payment_method = 'invoice'
      payment_status = 'pending'
      break
    case 'paid':
      payment_method = 'admin'
      payment_status = 'completed'
      paid_at = now
      break
    case 'reserve':
      payment_method = 'reserved'
      payment_status = 'pending'
      break
  }

  const payableTotal = opts.payableTotalRappen ?? opts.amountRappen
  const staffId = opts.adminUserId || null

  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      tenant_id: opts.tenantId,
      user_id: opts.userId,
      staff_id: staffId,
      created_by: staffId,
      course_registration_id: opts.enrollmentId,
      total_amount_rappen: payableTotal,
      lesson_price_rappen: opts.amountRappen,
      payment_method,
      payment_status,
      paid_at,
      currency: 'CHF',
      description: `Kurs: ${opts.courseName}`,
      metadata: {
        course_id: opts.courseId,
        course_name: opts.courseName,
        course_registration_id: opts.enrollmentId,
        admin_enroll: !!opts.adminUserId,
        payment_option: opts.paymentOption,
      },
    })
    .select('id')
    .single()

  if (error || !payment) {
    logger.warn('⚠️ createEnrollmentPayment failed:', error?.message)
    throw createError({
      statusCode: 500,
      statusMessage: `Payment konnte nicht erstellt werden: ${error?.message || 'unknown'}`,
    })
  }

  const { data: claimed, error: claimError } = await supabase
    .from('course_registrations')
    .update({ payment_id: payment.id })
    .eq('id', opts.enrollmentId)
    .eq('tenant_id', opts.tenantId)
    .is('payment_id', null)
    .select('id')

  if (claimError || !claimed?.length) {
    await supabase.from('payments').delete().eq('id', payment.id).eq('tenant_id', opts.tenantId)
    const { data: winner } = await supabase
      .from('course_registrations')
      .select('payment_id')
      .eq('id', opts.enrollmentId)
      .eq('tenant_id', opts.tenantId)
      .maybeSingle()
    if (winner?.payment_id) return { paymentId: winner.payment_id }
    throw createError({
      statusCode: 500,
      statusMessage: 'Payment konnte nicht mit der Anmeldung verknüpft werden',
    })
  }

  return { paymentId: payment.id }
}

export async function createIndividualCourseInvoice(opts: {
  tenantId: string
  /** Null for a public enrollment. No synthetic staff user is created. */
  adminUserId?: string | null
  userId: string
  enrollmentId: string
  paymentId: string
  courseName: string
  /** Net course price in rappen, before discount and VAT. */
  amountRappen: number
  /** Server-validated discount. Ignored when omitted (admin path stays 0). */
  discountRappen?: number
  participant: {
    first_name?: string | null
    last_name?: string | null
    email?: string | null
    street?: string | null
    street_nr?: string | null
    zip?: string | null
    city?: string | null
  }
  sendEmail: boolean
}): Promise<{ invoiceId: string; invoiceNumber: string; totalAmountRappen: number; created: boolean }> {
  const supabase = getSupabaseAdmin()
  const registration = await loadTenantCourseRegistration(supabase, opts.tenantId, opts.enrollmentId)
  if (registration.user_id && registration.user_id !== opts.userId) {
    throw createError({ statusCode: 409, statusMessage: 'Anmeldung gehört zu einem anderen Kunden' })
  }

  const returnExisting = async (invoiceId: string) => {
    const { data: existing } = await supabase
      .from('invoices')
      .select('id, invoice_number, total_amount_rappen')
      .eq('id', invoiceId)
      .eq('tenant_id', opts.tenantId)
      .maybeSingle()
    if (!existing) {
      throw createError({ statusCode: 500, statusMessage: 'Bestehende Rechnung konnte nicht geladen werden' })
    }
    if (!registration.invoice_id) {
      await supabase
        .from('course_registrations')
        .update({ invoice_id: existing.id })
        .eq('id', opts.enrollmentId)
        .eq('tenant_id', opts.tenantId)
        .is('invoice_id', null)
    }
    return {
      invoiceId: existing.id as string,
      invoiceNumber: existing.invoice_number as string,
      totalAmountRappen: Number(existing.total_amount_rappen) || 0,
      created: false,
    }
  }

  if (registration.invoice_id) return returnExisting(registration.invoice_id)

  const { data: payment } = await supabase
    .from('payments')
    .select('id, invoice_id')
    .eq('id', opts.paymentId)
    .eq('tenant_id', opts.tenantId)
    .eq('course_registration_id', opts.enrollmentId)
    .maybeSingle()

  if (!payment) {
    throw createError({ statusCode: 404, statusMessage: 'Zahlung für diese Anmeldung nicht gefunden' })
  }
  if (payment.invoice_id) return returnExisting(payment.invoice_id)

  const now = new Date().toISOString()
  const invoiceDate = now.slice(0, 10)
  const dueDays = await getTenantInvoiceDueDays(supabase, opts.tenantId)
  const dueDate = computeInvoiceDueDate(invoiceDate, dueDays)
  const vatRate = await getTenantDefaultVatRate(supabase, opts.tenantId)
  const totals = computeCourseInvoiceTotals(opts.amountRappen, opts.discountRappen ?? 0, vatRate)

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, legal_company_name, contact_email, contact_person_first_name, contact_person_last_name, primary_color, logo_wide_url, invoice_street, invoice_street_nr, invoice_zip, invoice_city, invoice_intro_text, invoice_payment_terms, invoice_footer_text, qr_iban, invoice_window_side')
    .eq('id', opts.tenantId)
    .single()

  const invoiceNumber = await allocateInvoiceNumber(supabase, opts.tenantId)
  const studentName = `${opts.participant.first_name || ''} ${opts.participant.last_name || ''}`.trim() || 'Teilnehmer'
  const billingStreet = [opts.participant.street, opts.participant.street_nr].filter(Boolean).join(' ')
  const staffId = opts.adminUserId || null

  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .insert({
      tenant_id: opts.tenantId,
      user_id: opts.userId,
      staff_id: staffId,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      due_date: dueDate,
      billing_type: 'individual',
      billing_contact_person: studentName,
      billing_email: opts.participant.email || null,
      billing_street: billingStreet || null,
      billing_zip: opts.participant.zip || null,
      billing_city: opts.participant.city || null,
      billing_country: 'CH',
      subtotal_rappen: totals.netRappen,
      vat_rate: totals.vatRate,
      vat_amount_rappen: totals.vatAmountRappen,
      discount_amount_rappen: totals.discountRappen,
      total_amount_rappen: totals.totalAmountRappen,
      status: opts.sendEmail ? 'sent' : 'draft',
      payment_status: 'pending',
      paid_amount_rappen: 0,
      sent_at: opts.sendEmail ? now : null,
      notes: (tenant as any)?.invoice_intro_text || null,
      payment_terms: (tenant as any)?.invoice_payment_terms || null,
      footer_text: (tenant as any)?.invoice_footer_text || null,
    })
    .select('id, invoice_number, total_amount_rappen')
    .single()

  if (invErr || !invoice) {
    throw createError({
      statusCode: 500,
      statusMessage: `Rechnung konnte nicht erstellt werden: ${invErr?.message || 'unknown'}`,
    })
  }

  const discardInvoice = async () => {
    await supabase.from('invoice_items').delete().eq('invoice_id', invoice.id).eq('tenant_id', opts.tenantId)
    await supabase.from('invoices').delete().eq('id', invoice.id).eq('tenant_id', opts.tenantId)
  }

  const { error: itemError } = await supabase.from('invoice_items').insert({
    invoice_id: invoice.id,
    tenant_id: opts.tenantId,
    payment_id: opts.paymentId,
    product_name: opts.courseName,
    product_description: `Kursanmeldung ${studentName}`,
    quantity: 1,
    unit_price_rappen: totals.netRappen,
    total_price_rappen: totals.netRappen,
    vat_rate: totals.vatRate,
    vat_amount_rappen: totals.vatAmountRappen,
    sort_order: 0,
  })

  if (itemError) {
    await discardInvoice()
    throw createError({
      statusCode: 500,
      statusMessage: `Rechnungsposition konnte nicht erstellt werden: ${itemError.message}`,
    })
  }

  const { error: paymentLinkError } = await supabase
    .from('payments')
    .update({
      invoice_id: invoice.id,
      payment_status: 'invoiced',
      payment_method: 'invoice',
      updated_at: now,
    })
    .eq('id', opts.paymentId)
    .eq('tenant_id', opts.tenantId)
    .eq('course_registration_id', opts.enrollmentId)

  if (paymentLinkError) {
    await discardInvoice()
    throw createError({
      statusCode: 500,
      statusMessage: `Zahlung konnte nicht mit der Rechnung verknüpft werden: ${paymentLinkError.message}`,
    })
  }

  const { data: claimed, error: claimError } = await supabase
    .from('course_registrations')
    .update({ invoice_id: invoice.id })
    .eq('id', opts.enrollmentId)
    .eq('tenant_id', opts.tenantId)
    .is('invoice_id', null)
    .select('id')

  if (claimError || !claimed?.length) {
    await discardInvoice()
    const { data: winner } = await supabase
      .from('course_registrations')
      .select('invoice_id')
      .eq('id', opts.enrollmentId)
      .eq('tenant_id', opts.tenantId)
      .maybeSingle()
    if (winner?.invoice_id) return returnExisting(winner.invoice_id)
    throw createError({
      statusCode: 500,
      statusMessage: 'Rechnung konnte nicht mit der Anmeldung verknüpft werden',
    })
  }

  const storedTotal = Number(invoice.total_amount_rappen)
  const totalAmountRappen = Number.isFinite(storedTotal) ? storedTotal : totals.totalAmountRappen

  if (opts.sendEmail && opts.participant.email) {
    try {
      await sendCourseInvoiceEmail({
        tenant: tenant as any,
        invoiceId: invoice.id,
        invoiceNumber,
        invoiceDate,
        dueDate,
        studentName,
        studentEmail: opts.participant.email,
        billingStreet,
        billingZip: opts.participant.zip || '',
        billingCity: opts.participant.city || '',
        items: [{
          product_name: opts.courseName,
          product_description: `Kursanmeldung ${studentName}`,
          quantity: 1,
          unit_price_rappen: totals.netRappen,
          total_price_rappen: totals.netRappen,
        }],
        subtotalRappen: totals.netRappen,
        totalRappen: totalAmountRappen,
        staffName: tenant?.name || 'Unternehmen',
      })
    } catch (mailErr: any) {
      logger.warn('⚠️ Course invoice email failed (invoice created):', mailErr?.message)
    }
  }

  return {
    invoiceId: invoice.id,
    invoiceNumber,
    totalAmountRappen,
    created: true,
  }
}

export async function createCompanyCourseInvoice(opts: {
  tenantId: string
  adminUserId: string
  courseId: string
  sendEmail: boolean
}): Promise<{ invoiceId: string; invoiceNumber: string; participantCount: number; totalRappen: number }> {
  const supabase = getSupabaseAdmin()

  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .select('id, name, tenant_id, company_id, billing_mode, price_per_participant_rappen')
    .eq('id', opts.courseId)
    .eq('tenant_id', opts.tenantId)
    .single()

  if (courseErr || !course) throw createError({ statusCode: 404, statusMessage: 'Kurs nicht gefunden' })
  if (course.billing_mode !== 'company_collective') {
    throw createError({ statusCode: 400, statusMessage: 'Kurs ist kein Firmenkurs (billing_mode ≠ company_collective)' })
  }
  if (!course.company_id) {
    throw createError({ statusCode: 400, statusMessage: 'Kein Firmenkunde am Kurs hinterlegt' })
  }

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', course.company_id)
    .eq('tenant_id', opts.tenantId)
    .single()

  if (!company) throw createError({ statusCode: 404, statusMessage: 'Firma nicht gefunden' })

  const { data: regs } = await supabase
    .from('course_registrations')
    .select('id, user_id, first_name, last_name, email, amount_paid_rappen, payment_status, invoice_id')
    .eq('course_id', opts.courseId)
    .eq('tenant_id', opts.tenantId)
    .neq('status', 'cancelled')
    .is('deleted_at', null)
    .is('invoice_id', null)

  const openRegs = (regs || []).filter((r: any) => r.payment_status !== 'paid')
  if (openRegs.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Keine offenen Teilnehmer zum Verrechnen' })
  }

  const now = new Date().toISOString()
  const invoiceDate = now.slice(0, 10)
  const dueDays = await getTenantInvoiceDueDays(supabase, opts.tenantId)
  const dueDate = computeInvoiceDueDate(invoiceDate, dueDays)
  const vatRate = await getTenantDefaultVatRate(supabase, opts.tenantId)

  const items = openRegs.map((r: any, i: number) => {
    const unit = r.amount_paid_rappen && r.amount_paid_rappen > 0
      ? r.amount_paid_rappen
      : (course.price_per_participant_rappen || 0)
    const name = `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Teilnehmer'
    return {
      registrationId: r.id,
      userId: r.user_id,
      product_name: course.name,
      product_description: `Teilnehmer: ${name}`,
      quantity: 1,
      unit_price_rappen: unit,
      total_price_rappen: unit,
      vat_rate: vatRate,
      vat_amount_rappen: computeVatAmountRappen(unit, vatRate),
      sort_order: i,
      _open_item_id: r.id,
    }
  })

  const subtotal = items.reduce((s, it) => s + it.total_price_rappen, 0)
  const vatAmount = items.reduce((s, it) => s + it.vat_amount_rappen, 0)
  const total = subtotal + vatAmount

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, legal_company_name, contact_email, contact_person_first_name, contact_person_last_name, primary_color, logo_wide_url, invoice_street, invoice_street_nr, invoice_zip, invoice_city, invoice_intro_text, invoice_payment_terms, invoice_footer_text, qr_iban, invoice_window_side')
    .eq('id', opts.tenantId)
    .single()

  const invoiceNumber = await allocateInvoiceNumber(supabase, opts.tenantId)
  const billingStreet = [company.street, company.street_nr].filter(Boolean).join(' ')

  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .insert({
      tenant_id: opts.tenantId,
      user_id: null,
      company_id: company.id,
      staff_id: opts.adminUserId,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      due_date: dueDate,
      billing_type: 'company',
      billing_company_name: company.name,
      billing_contact_person: company.contact_person || null,
      billing_email: company.email || null,
      billing_street: billingStreet || null,
      billing_zip: company.zip || null,
      billing_city: company.city || null,
      billing_country: company.country || 'CH',
      subtotal_rappen: subtotal,
      vat_rate: vatRate,
      vat_amount_rappen: vatAmount,
      discount_amount_rappen: 0,
      total_amount_rappen: total,
      status: opts.sendEmail ? 'sent' : 'pdf_created',
      payment_status: 'pending',
      paid_amount_rappen: 0,
      sent_at: opts.sendEmail ? now : null,
      notes: (tenant as any)?.invoice_intro_text || null,
      payment_terms: (tenant as any)?.invoice_payment_terms || null,
      footer_text: (tenant as any)?.invoice_footer_text || null,
    })
    .select('id, invoice_number')
    .single()

  if (invErr || !invoice) {
    throw createError({
      statusCode: 500,
      statusMessage: `Firmenrechnung fehlgeschlagen: ${invErr?.message || 'unknown'}`,
    })
  }

  await supabase.from('invoice_items').insert(
    items.map(({ registrationId: _r, userId: _u, _open_item_id, ...rest }) => ({
      ...rest,
      invoice_id: invoice.id,
      tenant_id: opts.tenantId,
    }))
  )

  // Stamp registrations + create/link pending company payments for tracking
  for (const item of items) {
    await supabase
      .from('course_registrations')
      .update({
        invoice_id: invoice.id,
        payment_status: 'invoiced',
        payment_method: 'company',
      })
      .eq('id', item.registrationId)

    const { data: payment } = await supabase
      .from('payments')
      .insert({
        tenant_id: opts.tenantId,
        user_id: item.userId,
        staff_id: opts.adminUserId,
        created_by: opts.adminUserId,
        course_registration_id: item.registrationId,
        invoice_id: invoice.id,
        total_amount_rappen: item.total_price_rappen,
        lesson_price_rappen: item.total_price_rappen,
        payment_method: 'invoice',
        payment_status: 'invoiced',
        currency: 'CHF',
        description: `Firmenkurs: ${course.name} — ${item.product_description}`,
        metadata: {
          course_id: course.id,
          course_name: course.name,
          company_id: company.id,
          company_invoice: true,
        },
      })
      .select('id')
      .single()

    if (payment) {
      await supabase
        .from('course_registrations')
        .update({ payment_id: payment.id })
        .eq('id', item.registrationId)

      await supabase
        .from('invoice_items')
        .update({ payment_id: payment.id })
        .eq('invoice_id', invoice.id)
        .eq('sort_order', item.sort_order)
    }
  }

  if (opts.sendEmail && company.email) {
    try {
      await sendCourseInvoiceEmail({
        tenant: tenant as any,
        invoiceId: invoice.id,
        invoiceNumber,
        invoiceDate,
        dueDate,
        studentName: company.name,
        studentEmail: company.email,
        billingStreet,
        billingZip: company.zip || '',
        billingCity: company.city || '',
        items: items.map((it) => ({
          product_name: it.product_name,
          product_description: it.product_description,
          quantity: it.quantity,
          unit_price_rappen: it.unit_price_rappen,
          total_price_rappen: it.total_price_rappen,
        })),
        subtotalRappen: subtotal,
        totalRappen: total,
        staffName: tenant?.name || 'Unternehmen',
      })
    } catch (mailErr: any) {
      logger.warn('⚠️ Company invoice email failed (invoice created):', mailErr?.message)
    }
  }

  return {
    invoiceId: invoice.id,
    invoiceNumber,
    participantCount: openRegs.length,
    totalRappen: total,
  }
}

async function sendCourseInvoiceEmail(opts: {
  tenant: any
  invoiceId: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  studentName: string
  studentEmail: string
  billingStreet: string
  billingZip: string
  billingCity: string
  items: Array<{
    product_name: string
    product_description?: string
    quantity: number
    unit_price_rappen: number
    total_price_rappen: number
  }>
  subtotalRappen: number
  totalRappen: number
  staffName: string
}) {
  const { sendTenantEmail } = await import('~/server/utils/email')
  const { buildInvoiceEmailHtml } = await import('~/server/utils/invoice-email')
  const { generateInvoicePdf, formatTenantContactPerson } = await import('~/server/utils/invoice-pdf')
  const { loadTenantLogoForPdf, resolveTenantWideLogoUrl } = await import('~/server/utils/tenant-logo-for-pdf')

  const html = buildInvoiceEmailHtml({
    customerName: opts.studentName,
    invoiceNumber: opts.invoiceNumber,
    invoiceDate: opts.invoiceDate,
    dueDate: opts.dueDate,
    items: opts.items,
    subtotalRappen: opts.subtotalRappen,
    discountRappen: 0,
    totalRappen: opts.totalRappen,
    tenantName: opts.tenant?.name || 'Unternehmen',
    staffName: opts.staffName,
    primaryColor: opts.tenant?.primary_color || null,
    introText: opts.tenant?.invoice_intro_text || null,
    paymentTerms: opts.tenant?.invoice_payment_terms || null,
    footerText: opts.tenant?.invoice_footer_text || null,
  })

  let attachments: { filename: string; content: Buffer }[] = []
  try {
    const logo = await loadTenantLogoForPdf(resolveTenantWideLogoUrl(opts.tenant))
    const pdfBuffer = await generateInvoicePdf({
      invoiceNumber: opts.invoiceNumber,
      invoiceDate: opts.invoiceDate,
      dueDate: opts.dueDate,
      customerName: opts.studentName,
      billingStreet: opts.billingStreet,
      billingZip: opts.billingZip,
      billingCity: opts.billingCity,
      billingEmail: opts.studentEmail,
      items: opts.items,
      subtotalRappen: opts.subtotalRappen,
      vatRate: 0,
      vatAmountRappen: 0,
      discountRappen: 0,
      totalRappen: opts.totalRappen,
      tenantName: opts.tenant?.legal_company_name || opts.tenant?.name || 'Unternehmen',
      tenantStreet: [opts.tenant?.invoice_street, opts.tenant?.invoice_street_nr].filter(Boolean).join(' '),
      tenantZip: opts.tenant?.invoice_zip || '',
      tenantCity: opts.tenant?.invoice_city || '',
      tenantEmail: opts.tenant?.contact_email || undefined,
      tenantContactPerson: formatTenantContactPerson(opts.tenant) || undefined,
      tenantLogoBase64: logo?.base64 || null,
      tenantLogoFormat: logo?.format,
      introText: opts.tenant?.invoice_intro_text || null,
      paymentTerms: opts.tenant?.invoice_payment_terms || null,
      footerText: opts.tenant?.invoice_footer_text || null,
      primaryColor: opts.tenant?.primary_color || '#1E40AF',
      windowSide: opts.tenant?.invoice_window_side === 'right' ? 'right' : 'left',
    })
    attachments = [{
      filename: `Rechnung_${opts.invoiceNumber}.pdf`,
      content: Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer as any),
    }]
  } catch (pdfErr: any) {
    logger.warn('⚠️ Invoice PDF attach failed:', pdfErr?.message)
  }

  await sendTenantEmail(opts.tenant?.id, {
    to: opts.studentEmail,
    subject: `Rechnung ${opts.invoiceNumber} – ${opts.tenant?.name || 'Unternehmen'}`,
    html,
    attachments,
  })
}
