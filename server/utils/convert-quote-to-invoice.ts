import type { SupabaseClient } from '@supabase/supabase-js'
import { allocateInvoiceNumber } from '~/server/utils/allocate-invoice-number'
import { computeInvoiceDueDate, getTenantInvoiceDueDays } from '~/server/utils/invoice-due-date'
import {
  canAcceptQuote,
  resolveInvoiceDocumentTexts,
  resolveQuoteDocumentTexts,
  swapDocumentBodyTexts,
  todayZurichIso,
} from '~/server/utils/invoice-quote'

export async function convertQuoteToInvoice(opts: {
  supabase: SupabaseClient
  tenantId: string
  invoiceId: string
  allowDraft?: boolean
}): Promise<{ invoice: any }> {
  const { supabase, tenantId, invoiceId, allowDraft } = opts

  const { data: quote, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!quote) throw new Error('Offerte nicht gefunden')

  const gate = canAcceptQuote(quote, { allowDraft })
  if (!gate.ok) throw new Error(gate.reason)

  const invoiceDate = todayZurichIso()
  const dueDays = await getTenantInvoiceDueDays(supabase, tenantId)
  const dueDate = computeInvoiceDueDate(invoiceDate, dueDays)
  const invoiceNumber = await allocateInvoiceNumber(supabase, tenantId)
  const now = new Date().toISOString()

  const { data: tenantTexts } = await supabase
    .from('tenants')
    .select('invoice_intro_text, invoice_payment_terms, invoice_footer_text, quote_intro_text, quote_terms_text, quote_footer_text')
    .eq('id', tenantId)
    .maybeSingle()

  const swapped = swapDocumentBodyTexts(
    quote,
    resolveQuoteDocumentTexts(tenantTexts),
    resolveInvoiceDocumentTexts(tenantTexts),
  )

  const { data: invoice, error: updateError } = await supabase
    .from('invoices')
    .update({
      document_kind: 'invoice',
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      due_date: dueDate,
      accepted_at: now,
      status: 'pdf_created',
      payment_status: 'pending',
      notes: swapped.notes || null,
      payment_terms: swapped.payment_terms || null,
      footer_text: swapped.footer_text || null,
      updated_at: now,
    })
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .eq('document_kind', 'quote')
    .select()
    .maybeSingle()

  if (updateError) throw new Error(updateError.message)
  if (!invoice) throw new Error('Offerte konnte nicht umgewandelt werden')

  return { invoice }
}

export async function emailConvertedInvoice(opts: {
  supabase: SupabaseClient
  invoice: any
}): Promise<void> {
  const { supabase, invoice } = opts
  const to = invoice.billing_email
  if (!to) return

  const [{ data: tenant }, { data: items }] = await Promise.all([
    supabase
      .from('tenants')
      .select('name, legal_company_name, contact_email, contact_person_first_name, contact_person_last_name, primary_color, secondary_color, qr_iban, invoice_street, invoice_street_nr, invoice_zip, invoice_city, logo_wide_url, invoice_intro_text, invoice_payment_terms, invoice_footer_text, invoice_window_side, from_email, resend_domain_verified')
      .eq('id', invoice.tenant_id)
      .maybeSingle(),
    supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice.id)
      .order('sort_order', { ascending: true }),
  ])

  const { sendEmail } = await import('~/server/utils/email')
  const { generateInvoicePdf, formatTenantContactPerson } = await import('~/server/utils/invoice-pdf')
  const { buildInvoiceEmailHtml } = await import('~/server/utils/invoice-email')
  const { loadTenantLogoForPdf, resolveTenantWideLogoUrl } = await import('~/server/utils/tenant-logo-for-pdf')
  const { quoteDocumentLabels } = await import('~/server/utils/invoice-quote')
  const { invoicePersonNames, invoiceQrDebtorName } = await import('~/server/utils/invoice-billing-snapshot')

  const labels = quoteDocumentLabels(false)
  const tenantName = tenant?.legal_company_name || tenant?.name || ''
  const { customerName } = invoicePersonNames(invoice)
  const lineItems = (items || []).map((i: any) => ({
    product_name: i.product_name,
    product_description: i.product_description,
    quantity: i.quantity,
    unit_price_rappen: i.unit_price_rappen,
    total_price_rappen: i.total_price_rappen,
  }))

  let qrCodeDataUrl: string | null = null
  const qrIban = tenant?.qr_iban || null
  if (qrIban) {
    try {
      const { generateSwissQRBase64, generateReference } = await import('~/server/utils/swiss-qr')
      const { ref } = generateReference(invoice.invoice_number, qrIban)
      qrCodeDataUrl = await generateSwissQRBase64({
        qr_iban: qrIban,
        creditor_name: tenantName,
        creditor_street: tenant?.invoice_street?.trim() || '',
        creditor_street_nr: tenant?.invoice_street_nr?.trim() || '',
        creditor_zip: tenant?.invoice_zip || '',
        creditor_city: tenant?.invoice_city || '',
        debtor_name: invoiceQrDebtorName(invoice),
        debtor_street: invoice.billing_street || '',
        debtor_street_nr: invoice.billing_street_number || '',
        debtor_zip: invoice.billing_zip || '',
        debtor_city: invoice.billing_city || '',
        amount_rappen: invoice.total_amount_rappen,
        reference: ref,
        additional_info: `Rechnung ${invoice.invoice_number}`,
      })
    } catch { /* QR optional */ }
  }

  const logo = await loadTenantLogoForPdf(resolveTenantWideLogoUrl(tenant as any))
  const tenantStreet = [tenant?.invoice_street?.trim(), tenant?.invoice_street_nr?.trim()].filter(Boolean).join(' ')
  const pdfBuffer = await generateInvoicePdf({
    invoiceNumber: invoice.invoice_number,
    invoiceDate: invoice.invoice_date,
    dueDate: invoice.due_date,
    documentTitle: labels.documentTitle,
    dateLabel: labels.dateLabel,
    dueLabel: labels.dueLabel,
    paymentBlockTitle: labels.paymentBlockTitle,
    tenantName,
    tenantStreet,
    tenantZip: tenant?.invoice_zip || '',
    tenantCity: tenant?.invoice_city || '',
    tenantEmail: tenant?.contact_email || '',
    tenantContactPerson: formatTenantContactPerson(tenant as any),
    tenantLogoBase64: logo?.base64 || null,
    tenantLogoFormat: logo?.format,
    customerName,
    billingCompanyName: invoice.billing_company_name || '',
    billingStreet: invoice.billing_street || '',
    billingZip: invoice.billing_zip || '',
    billingCity: invoice.billing_city || '',
    items: lineItems,
    subtotalRappen: invoice.subtotal_rappen,
    discountRappen: invoice.discount_amount_rappen || 0,
    vatRate: Number(invoice.vat_rate) || 0,
    vatAmountRappen: invoice.vat_amount_rappen || 0,
    totalRappen: invoice.total_amount_rappen,
    qrCodeDataUrl,
    qrIban,
    windowSide: tenant?.invoice_window_side === 'right' ? 'right' : 'left',
    introText: invoice.notes || tenant?.invoice_intro_text || null,
    paymentTerms: invoice.payment_terms || tenant?.invoice_payment_terms || null,
    footerText: invoice.footer_text || tenant?.invoice_footer_text || null,
  })

  const html = buildInvoiceEmailHtml({
    customerName,
    invoiceNumber: invoice.invoice_number,
    invoiceDate: invoice.invoice_date,
    dueDate: invoice.due_date,
    items: lineItems,
    subtotalRappen: invoice.subtotal_rappen,
    discountRappen: invoice.discount_amount_rappen || 0,
    vatRate: Number(invoice.vat_rate) || 0,
    vatRappen: invoice.vat_amount_rappen || 0,
    totalRappen: invoice.total_amount_rappen,
    tenantName,
    staffName: tenantName,
    primaryColor: tenant?.primary_color || null,
    qrCodeDataUrl,
    qrIban,
    introText: `Ihre Offerte ${invoice.quote_number || ''} wurde angenommen. Anbei die Rechnung.`,
    paymentTerms: invoice.payment_terms || tenant?.invoice_payment_terms || null,
    footerText: invoice.footer_text || tenant?.invoice_footer_text || null,
  })

  await sendEmail({
    to,
    subject: `Rechnung ${invoice.invoice_number} – ${tenantName}`,
    html,
    fromName: tenantName,
    fromEmail: tenant?.from_email ?? null,
    domainVerified: !!tenant?.resend_domain_verified,
    attachments: [{ filename: `Rechnung_${invoice.invoice_number}.pdf`, content: pdfBuffer }],
  })

  await supabase
    .from('invoices')
    .update({ sent_at: new Date().toISOString(), status: 'sent' })
    .eq('id', invoice.id)
}
