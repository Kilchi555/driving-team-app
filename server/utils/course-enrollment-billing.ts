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

export async function createEnrollmentPayment(opts: {
  tenantId: string
  adminUserId: string
  userId: string
  enrollmentId: string
  courseId: string
  courseName: string
  amountRappen: number
  paymentOption: EnrollmentPaymentOption
}): Promise<{ paymentId: string } | null> {
  // online_link creates its own payment via process-public
  if (opts.paymentOption === 'online_link') return null

  const supabase = getSupabaseAdmin()
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

  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      tenant_id: opts.tenantId,
      user_id: opts.userId,
      staff_id: opts.adminUserId,
      created_by: opts.adminUserId,
      course_registration_id: opts.enrollmentId,
      total_amount_rappen: opts.amountRappen,
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
        admin_enroll: true,
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

  await supabase
    .from('course_registrations')
    .update({ payment_id: payment.id })
    .eq('id', opts.enrollmentId)

  return { paymentId: payment.id }
}

export async function createIndividualCourseInvoice(opts: {
  tenantId: string
  adminUserId: string
  userId: string
  enrollmentId: string
  paymentId: string
  courseName: string
  amountRappen: number
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
}): Promise<{ invoiceId: string; invoiceNumber: string }> {
  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()
  const invoiceDate = now.slice(0, 10)
  const dueDays = await getTenantInvoiceDueDays(supabase, opts.tenantId)
  const dueDate = computeInvoiceDueDate(invoiceDate, dueDays)
  const vatRate = await getTenantDefaultVatRate(supabase, opts.tenantId)
  const vatAmount = computeVatAmountRappen(opts.amountRappen, vatRate)
  const total = opts.amountRappen + vatAmount

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, legal_company_name, contact_email, primary_color, logo_wide_url, invoice_street, invoice_street_nr, invoice_zip, invoice_city, invoice_intro_text, invoice_payment_terms, invoice_footer_text, qr_iban, invoice_window_side')
    .eq('id', opts.tenantId)
    .single()

  const invoiceNumber = await allocateInvoiceNumber(supabase, opts.tenantId)
  const studentName = `${opts.participant.first_name || ''} ${opts.participant.last_name || ''}`.trim() || 'Teilnehmer'
  const billingStreet = [opts.participant.street, opts.participant.street_nr].filter(Boolean).join(' ')

  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .insert({
      tenant_id: opts.tenantId,
      user_id: opts.userId,
      staff_id: opts.adminUserId,
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
      subtotal_rappen: opts.amountRappen,
      vat_rate: vatRate,
      vat_amount_rappen: vatAmount,
      discount_amount_rappen: 0,
      total_amount_rappen: total,
      status: opts.sendEmail ? 'sent' : 'draft',
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
      statusMessage: `Rechnung konnte nicht erstellt werden: ${invErr?.message || 'unknown'}`,
    })
  }

  await supabase.from('invoice_items').insert({
    invoice_id: invoice.id,
    tenant_id: opts.tenantId,
    payment_id: opts.paymentId,
    product_name: opts.courseName,
    product_description: `Kursanmeldung ${studentName}`,
    quantity: 1,
    unit_price_rappen: opts.amountRappen,
    total_price_rappen: opts.amountRappen,
    vat_rate: vatRate,
    vat_amount_rappen: vatAmount,
    sort_order: 0,
  })

  await supabase
    .from('payments')
    .update({
      invoice_id: invoice.id,
      payment_status: 'invoiced',
      payment_method: 'invoice',
      updated_at: now,
    })
    .eq('id', opts.paymentId)

  await supabase
    .from('course_registrations')
    .update({ invoice_id: invoice.id })
    .eq('id', opts.enrollmentId)

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
          unit_price_rappen: opts.amountRappen,
          total_price_rappen: opts.amountRappen,
        }],
        subtotalRappen: opts.amountRappen,
        totalRappen: total,
        staffName: 'Fahrschule',
      })
    } catch (mailErr: any) {
      logger.warn('⚠️ Course invoice email failed (invoice created):', mailErr?.message)
    }
  }

  return { invoiceId: invoice.id, invoiceNumber }
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
    .select('id, name, legal_company_name, contact_email, primary_color, logo_wide_url, invoice_street, invoice_street_nr, invoice_zip, invoice_city, invoice_intro_text, invoice_payment_terms, invoice_footer_text, qr_iban, invoice_window_side')
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
        staffName: 'Fahrschule',
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
  const { generateInvoicePdf } = await import('~/server/utils/invoice-pdf')
  const { loadTenantLogoForPdf } = await import('~/server/utils/tenant-logo-for-pdf')

  const html = buildInvoiceEmailHtml({
    customerName: opts.studentName,
    invoiceNumber: opts.invoiceNumber,
    invoiceDate: opts.invoiceDate,
    dueDate: opts.dueDate,
    items: opts.items,
    subtotalRappen: opts.subtotalRappen,
    discountRappen: 0,
    totalRappen: opts.totalRappen,
    tenantName: opts.tenant?.name || 'Fahrschule',
    staffName: opts.staffName,
    primaryColor: opts.tenant?.primary_color || null,
    introText: opts.tenant?.invoice_intro_text || null,
    paymentTerms: opts.tenant?.invoice_payment_terms || null,
    footerText: opts.tenant?.invoice_footer_text || null,
  })

  let attachments: { filename: string; content: Buffer }[] = []
  try {
    const logo = await loadTenantLogoForPdf(opts.tenant?.logo_wide_url)
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
      tenantName: opts.tenant?.legal_company_name || opts.tenant?.name || 'Fahrschule',
      tenantStreet: [opts.tenant?.invoice_street, opts.tenant?.invoice_street_nr].filter(Boolean).join(' '),
      tenantZip: opts.tenant?.invoice_zip || '',
      tenantCity: opts.tenant?.invoice_city || '',
      tenantEmail: opts.tenant?.contact_email || undefined,
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
    subject: `Rechnung ${opts.invoiceNumber} – ${opts.tenant?.name || 'Fahrschule'}`,
    html,
    attachments,
  })
}
