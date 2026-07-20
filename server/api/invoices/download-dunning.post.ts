// server/api/invoices/download-dunning.post.ts
// Erzeugt das PDF-Mahnschreiben zur letzten (oder einer bestimmten) Mahnung
// und liefert es als Base64-Data-URL zum Download im Admin-UI.

import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getStageDef, daysOverdue } from '~/server/utils/invoice-dunning'

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()
  const body = await readBody(event)
  const invoiceId = body?.invoiceId as string
  const logId = body?.logId as string | undefined

  if (!invoiceId) {
    throw createError({ statusCode: 400, statusMessage: 'invoiceId erforderlich' })
  }

  const { data: invoice, error: invErr } = await supabase
    .from('invoices_with_details')
    .select('*')
    .eq('id', invoiceId)
    .single()

  if (invErr || !invoice || invoice.tenant_id !== profile.tenant_id) {
    throw createError({ statusCode: 404, statusMessage: 'Rechnung nicht gefunden' })
  }

  let logQuery = supabase
    .from('invoice_dunning_log')
    .select('*')
    .eq('invoice_id', invoiceId)
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(1)

  if (logId) {
    logQuery = supabase
      .from('invoice_dunning_log')
      .select('*')
      .eq('id', logId)
      .eq('invoice_id', invoiceId)
      .limit(1)
  }

  const { data: logs, error: logErr } = await logQuery
  if (logErr) throw createError({ statusCode: 500, statusMessage: logErr.message })
  const log = logs?.[0]
  if (!log) {
    throw createError({ statusCode: 404, statusMessage: 'Keine versendete Mahnung gefunden' })
  }

  const stageDef = getStageDef(log.stage) || { stage: log.stage, label: `Mahnstufe ${log.stage}`, key: 'reminder', shortLabel: 'Mahnung' }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, legal_company_name, contact_email, primary_color, qr_iban, invoice_street, invoice_street_nr, invoice_zip, invoice_city')
    .eq('id', profile.tenant_id)
    .single()

  const tenantName = tenant?.name || ''
  const tenantStreet = [tenant?.invoice_street, tenant?.invoice_street_nr].filter(Boolean).join(' ').trim()
  const outstanding = log.outstanding_amount_rappen || 0
  const fee = log.fee_rappen || 0
  const interest = log.interest_rappen || 0
  const totalDue = outstanding + fee + interest

  // QR neu erzeugen (best effort) für aktuellen Gesamtbetrag
  let qrCodeDataUrl: string | null = null
  let scorRef: string | null = null
  if (tenant?.qr_iban) {
    try {
      const { generateSwissQRBase64, generateReference } = await import('~/server/utils/swiss-qr')
      const { ref } = generateReference(invoice.invoice_number, tenant.qr_iban)
      scorRef = ref
      const customerName = invoice.billing_contact_person ||
        `${invoice.customer_first_name || ''} ${invoice.customer_last_name || ''}`.trim() || 'Kunde'
      qrCodeDataUrl = await generateSwissQRBase64({
        qr_iban: tenant.qr_iban,
        creditor_name: tenant.legal_company_name || tenantName,
        creditor_street: tenant.invoice_street?.trim() || '',
        creditor_street_nr: tenant.invoice_street_nr?.trim() || '',
        creditor_zip: tenant.invoice_zip || '',
        creditor_city: tenant.invoice_city || '',
        debtor_name: customerName,
        debtor_street: invoice.billing_street || '',
        debtor_street_nr: invoice.billing_street_number || '',
        debtor_zip: invoice.billing_zip || '',
        debtor_city: invoice.billing_city || '',
        amount_rappen: totalDue,
        reference: ref,
        additional_info: `${stageDef.label} Rechnung ${invoice.invoice_number}`,
      })
    } catch { /* QR optional */ }
  }

  const bodyText = (log as any).body_text
    || htmlToPlainText(log.body_html || '')
    || `${stageDef.label} zur Rechnung ${invoice.invoice_number}.`

  const customerName = invoice.billing_contact_person ||
    `${invoice.customer_first_name || ''} ${invoice.customer_last_name || ''}`.trim() || 'Kunde'

  const pdfBuffer = await generateDunningPdf({
    stage: log.stage,
    stageLabel: stageDef.label,
    invoiceNumber: invoice.invoice_number,
    invoiceDate: invoice.invoice_date,
    originalDueDate: invoice.due_date,
    newDueDate: log.new_due_date || invoice.dunning_due_date || invoice.due_date,
    overdueDays: Math.max(0, daysOverdue(invoice.due_date, new Date(log.sent_at))),
    bodyText,
    outstandingRappen: outstanding,
    feeRappen: fee,
    interestRappen: interest,
    totalDueRappen: totalDue,
    tenantName: tenant?.legal_company_name || tenantName,
    tenantStreet: tenantStreet || undefined,
    tenantZip: tenant?.invoice_zip || undefined,
    tenantCity: tenant?.invoice_city || undefined,
    tenantEmail: tenant?.contact_email || undefined,
    customerName,
    billingCompanyName: invoice.billing_company_name || undefined,
    billingStreet: [invoice.billing_street, invoice.billing_street_number].filter(Boolean).join(' ').trim() || undefined,
    billingZip: invoice.billing_zip || undefined,
    billingCity: invoice.billing_city || undefined,
    qrCodeDataUrl,
    qrIban: tenant?.qr_iban || null,
    scorRef,
    creditorName: tenant?.legal_company_name || tenantName,
    primaryColor: tenant?.primary_color || undefined,
  })

  const filename = dunningPdfFilename(stageDef.label, invoice.invoice_number)
  return {
    success: true,
    filename,
    pdfUrl: `data:application/pdf;base64,${pdfBuffer.toString('base64')}`,
  }
})
