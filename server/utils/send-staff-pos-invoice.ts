/**
 * Email an invoice that staff_pos_sale already inserted.
 * sent_at is set only after sendEmail resolves.
 * Reuses the existing PDF and mail builders. Does not create an invoice.
 */
import { sendEmail } from '~/server/utils/email'
import { generateInvoicePdf, formatTenantContactPerson } from '~/server/utils/invoice-pdf'
import { loadTenantLogoForPdf, resolveTenantWideLogoUrl } from '~/server/utils/tenant-logo-for-pdf'
import { buildInvoiceEmailHtml } from '~/server/utils/invoice-email'
import { getTenantTerminology } from '~/server/utils/tenant-terminology'
import { invoiceQrDebtorName, pdfBillingFields } from '~/server/utils/invoice-billing-snapshot'

export interface StaffPosInvoiceSender {
  id: string
  first_name?: string | null
  last_name?: string | null
  email?: string | null
}

export async function sendStaffPosInvoice(opts: {
  supabase: any
  tenantId: string
  invoiceId: string
  actor: StaffPosInvoiceSender
}): Promise<{ sent: boolean; alreadySent?: boolean; reason?: string }> {
  const { supabase, tenantId, invoiceId, actor } = opts

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error || !invoice) return { sent: false, reason: 'invoice_missing' }
  if (invoice.sent_at || invoice.status === 'sent') {
    return { sent: true, alreadySent: true }
  }

  const billingEmail = String(invoice.billing_email || '').trim()
  if (!billingEmail) return { sent: false, reason: 'missing_email' }

  const { data: items } = await supabase
    .from('invoice_items')
    .select('product_name, product_description, quantity, unit_price_rappen, total_price_rappen, vat_rate, vat_amount_rappen')
    .eq('invoice_id', invoiceId)
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, legal_company_name, contact_email, contact_person_first_name, contact_person_last_name, primary_color, secondary_color, qr_iban, invoice_street, invoice_street_nr, invoice_zip, invoice_city, logo_wide_url, invoice_intro_text, invoice_payment_terms, invoice_footer_text, invoice_window_side, from_email, resend_domain_verified')
    .eq('id', tenantId)
    .single()

  if (!tenant) return { sent: false, reason: 'tenant_missing' }

  const terms = await getTenantTerminology(supabase, tenantId)
  const staffName = `${actor.first_name || ''} ${actor.last_name || ''}`.trim() || 'Team'
  const customerName = invoice.billing_contact_person || 'Kunde'
  const pdfAddr = pdfBillingFields(invoice)

  let qrCodeDataUrl: string | null = null
  let scorRef: string | null = null
  if (tenant.qr_iban) {
    try {
      const { generateSwissQRBase64, generateReference } = await import('~/server/utils/swiss-qr')
      const { ref } = generateReference(invoice.invoice_number, tenant.qr_iban)
      scorRef = ref
      qrCodeDataUrl = await generateSwissQRBase64({
        qr_iban: tenant.qr_iban,
        creditor_name: tenant.legal_company_name || tenant.name || '',
        creditor_street: tenant.invoice_street || '',
        creditor_street_nr: tenant.invoice_street_nr || '',
        creditor_zip: tenant.invoice_zip || '',
        creditor_city: tenant.invoice_city || '',
        debtor_name: invoiceQrDebtorName(invoice, null, customerName),
        debtor_street: invoice.billing_street || '',
        debtor_street_nr: invoice.billing_street_number || '',
        debtor_zip: invoice.billing_zip || '',
        debtor_city: invoice.billing_city || '',
        amount_rappen: invoice.total_amount_rappen,
        reference: ref,
        additional_info: `Rechnung ${invoice.invoice_number}`,
      })
    } catch {
      qrCodeDataUrl = null
    }
  }

  const mailItems = (items || []).map((item: any) => ({
    product_name: item.product_name,
    product_description: item.product_description,
    quantity: item.quantity,
    unit_price_rappen: item.unit_price_rappen,
    total_price_rappen: item.total_price_rappen,
  }))

  const html = buildInvoiceEmailHtml({
    customerName,
    invoiceNumber: invoice.invoice_number,
    invoiceDate: invoice.invoice_date,
    dueDate: invoice.due_date,
    items: mailItems,
    subtotalRappen: invoice.subtotal_rappen || invoice.total_amount_rappen,
    discountRappen: invoice.discount_amount_rappen || 0,
    totalRappen: invoice.total_amount_rappen,
    tenantName: tenant.name,
    staffName,
    primaryColor: tenant.primary_color || null,
    qrCodeDataUrl,
    qrIban: tenant.qr_iban || null,
    creditorName: tenant.legal_company_name || tenant.name,
    scorRef,
    introText: invoice.notes || tenant.invoice_intro_text || null,
    paymentTerms: invoice.payment_terms || tenant.invoice_payment_terms || null,
    footerText: invoice.footer_text || tenant.invoice_footer_text || null,
    appointmentLabel: terms.appointment || 'Termin',
  })

  let attachments: any[] = []
  try {
    const logo = await loadTenantLogoForPdf(resolveTenantWideLogoUrl(tenant))
    const legalName = tenant.legal_company_name || tenant.name
    const pdfBuffer = await generateInvoicePdf({
      invoiceNumber: invoice.invoice_number,
      invoiceDate: invoice.invoice_date,
      dueDate: invoice.due_date,
      tenantName: legalName,
      tenantStreet: [tenant.invoice_street, tenant.invoice_street_nr].filter(Boolean).join(' '),
      tenantZip: tenant.invoice_zip || '',
      tenantCity: tenant.invoice_city || '',
      tenantEmail: tenant.contact_email,
      tenantContactPerson: formatTenantContactPerson(tenant),
      tenantLogoBase64: logo?.base64 || null,
      tenantLogoFormat: logo?.format,
      customerName,
      billingCompanyName: invoice.billing_company_name || '',
      billingStreet: pdfAddr.billingStreet,
      billingZip: pdfAddr.billingZip,
      billingCity: pdfAddr.billingCity,
      billingEmail,
      items: mailItems,
      subtotalRappen: invoice.subtotal_rappen || invoice.total_amount_rappen,
      discountRappen: invoice.discount_amount_rappen || 0,
      vatRate: Number(invoice.vat_rate) || 0,
      vatAmountRappen: invoice.vat_amount_rappen || 0,
      totalRappen: invoice.total_amount_rappen,
      qrCodeDataUrl,
      qrIban: tenant.qr_iban || null,
      scorRef,
      creditorName: tenant.legal_company_name || legalName,
      primaryColor: tenant.primary_color || '#1E40AF',
      secondaryColor: tenant.secondary_color || '#64748B',
      windowSide: tenant.invoice_window_side === 'right' ? 'right' : 'left',
      introText: invoice.notes || tenant.invoice_intro_text || null,
      paymentTerms: invoice.payment_terms || tenant.invoice_payment_terms || null,
      footerText: invoice.footer_text || tenant.invoice_footer_text || null,
      appointmentLabel: terms.appointment || 'Termin',
    })
    attachments = [{
      filename: `Rechnung_${invoice.invoice_number}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }]
  } catch {
    attachments = []
  }

  await sendEmail({
    to: billingEmail,
    subject: `Rechnung ${invoice.invoice_number} – ${tenant.name}`,
    html,
    fromName: tenant.name,
    fromEmail: tenant.from_email ?? null,
    domainVerified: !!tenant.resend_domain_verified,
    attachments,
  })

  const sentAt = new Date().toISOString()
  const { data: marked, error: markError } = await supabase
    .from('invoices')
    .update({ sent_at: sentAt, status: 'sent' })
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .is('sent_at', null)
    .select('id')
    .maybeSingle()

  if (markError || !marked) {
    const { data: again } = await supabase
      .from('invoices')
      .select('sent_at')
      .eq('id', invoiceId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (!again?.sent_at) return { sent: false, reason: 'sent_status_unconfirmed' }
  }

  return { sent: true }
}
