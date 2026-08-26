/**
 * Quittung after an online (Wallee) payment — not a Rechnung.
 * Never blocks the webhook: callers must treat failure as non-fatal.
 */

import { splitGrossVat } from '~/utils/vat'
import { getTenantDefaultVatRate } from '~/server/utils/invoice-vat'
import { generateInvoicePdf, formatTenantContactPerson } from '~/server/utils/invoice-pdf'
import { loadTenantLogoForPdf, resolveTenantWideLogoUrl } from '~/server/utils/tenant-logo-for-pdf'
import { buildInvoiceEmailHtml } from '~/server/utils/invoice-email'
import { sendEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'

export type ReceiptSkipCode =
  | 'NOT_COMPLETED'
  | 'ALREADY_SENT'
  | 'NO_AMOUNT'
  | 'NO_EMAIL'
  | 'NO_TENANT'

export type ReceiptAssessment =
  | { ok: true }
  | { ok: false; code: ReceiptSkipCode; message: string }

export function receiptNumberForPayment(paymentId: string): string {
  const compact = String(paymentId || '').replace(/-/g, '').slice(0, 10).toUpperCase()
  return compact ? `Q-${compact}` : 'Q-UNBEKANNT'
}

export function assessOnlinePaymentReceipt(payment: {
  payment_status?: string | null
  total_amount_rappen?: number | null
  metadata?: Record<string, unknown> | null
  customerEmail?: string | null
}): ReceiptAssessment {
  if (payment.payment_status !== 'completed') {
    return {
      ok: false,
      code: 'NOT_COMPLETED',
      message: `Quittung nicht gesendet: Zahlung ist ${payment.payment_status || 'unbekannt'}, nicht completed.`,
    }
  }
  if (payment.metadata?.receipt_sent_at) {
    return {
      ok: false,
      code: 'ALREADY_SENT',
      message: `Quittung bereits gesendet am ${String(payment.metadata.receipt_sent_at)}.`,
    }
  }
  const amount = Math.round(Number(payment.total_amount_rappen) || 0)
  if (amount <= 0) {
    return {
      ok: false,
      code: 'NO_AMOUNT',
      message: 'Quittung nicht gesendet: Betrag ist 0.',
    }
  }
  const email = String(payment.customerEmail || '').trim()
  if (!email || !email.includes('@')) {
    return {
      ok: false,
      code: 'NO_EMAIL',
      message: 'Quittung nicht gesendet: keine Kunden-E-Mail auf der Zahlung.',
    }
  }
  return { ok: true }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
    } catch { /* ignore */ }
    return {}
  }
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {}
}

export async function sendOnlinePaymentReceipt(opts: {
  supabase: { from: (table: string) => any }
  paymentId: string
}): Promise<{ sent: boolean; code?: ReceiptSkipCode | 'SENT' | 'SEND_FAILED'; message: string }> {
  const supabase = opts.supabase
  const { data: payment, error: payErr } = await supabase
    .from('payments')
    .select('id, tenant_id, user_id, payment_status, total_amount_rappen, description, paid_at, metadata, appointment_id')
    .eq('id', opts.paymentId)
    .maybeSingle()

  if (payErr || !payment) {
    const message = `Quittung nicht gesendet: Zahlung ${opts.paymentId} nicht gefunden (${payErr?.message || 'missing'}).`
    logger.warn('⚠️', message)
    return { sent: false, code: 'SEND_FAILED', message }
  }

  if (!payment.tenant_id) {
    const message = `Quittung nicht gesendet: Zahlung ${payment.id} hat keinen Tenant.`
    logger.warn('⚠️', message)
    return { sent: false, code: 'NO_TENANT', message }
  }

  let customerEmail = ''
  let customerName = 'Kunde'
  let billingStreet = ''
  let billingZip = ''
  let billingCity = ''

  if (payment.user_id) {
    const { data: user } = await supabase
      .from('users')
      .select('email, first_name, last_name, street, street_nr, zip, city')
      .eq('id', payment.user_id)
      .maybeSingle()
    customerEmail = String(user?.email || '').trim()
    customerName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Kunde'
    billingStreet = [user?.street, user?.street_nr].filter(Boolean).join(' ')
    billingZip = user?.zip || ''
    billingCity = user?.city || ''
  }

  const meta = asRecord(payment.metadata)
  if (!customerEmail) {
    customerEmail = String(meta.email || meta.customer_email || '').trim()
  }
  if (customerName === 'Kunde' && (meta.customer_name || meta.name)) {
    customerName = String(meta.customer_name || meta.name)
  }

  const assessment = assessOnlinePaymentReceipt({
    payment_status: payment.payment_status,
    total_amount_rappen: payment.total_amount_rappen,
    metadata: meta,
    customerEmail,
  })
  if (!assessment.ok) {
    logger.info(`ℹ️ ${assessment.message}`, { paymentId: payment.id, code: assessment.code })
    if (assessment.code === 'NO_EMAIL' || assessment.code === 'NO_TENANT') {
      try {
        await supabase
          .from('payments')
          .update({
            metadata: { ...meta, receipt_error: assessment.message.slice(0, 400) },
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment.id)
      } catch { /* ignore */ }
    }
    return { sent: false, code: assessment.code, message: assessment.message }
  }

  try {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name, legal_company_name, contact_email, contact_person_first_name, contact_person_last_name, primary_color, secondary_color, logo_wide_url, logo_url, logo_square_url, invoice_street, invoice_street_nr, invoice_zip, invoice_city, invoice_footer_text, invoice_window_side, from_email, resend_domain_verified, uid_number, default_vat_rate')
      .eq('id', payment.tenant_id)
      .maybeSingle()

    if (!tenant) {
      const message = `Quittung nicht gesendet: Tenant ${payment.tenant_id} nicht gefunden.`
      logger.warn('⚠️', message)
      return { sent: false, code: 'NO_TENANT', message }
    }

    const gross = Math.round(Number(payment.total_amount_rappen) || 0)
    const storedRate = Number(meta.vat_rate)
    const vatRate = Number.isFinite(storedRate)
      ? storedRate
      : await getTenantDefaultVatRate(supabase, payment.tenant_id)
    const storedVat = Number(meta.vat_amount_rappen)
    const split = Number.isFinite(storedVat) && storedVat >= 0
      ? { net: gross - storedVat, vat: storedVat, gross, rate: vatRate }
      : splitGrossVat(gross, vatRate)

    const paidAt = (payment.paid_at || new Date().toISOString()).slice(0, 10)
    const receiptNumber = receiptNumberForPayment(payment.id)
    const productName = String(payment.description || 'Onlinezahlung').slice(0, 200)
    const uidLine = tenant.uid_number ? `UID ${tenant.uid_number}` : ''
    const footerParts = [tenant.invoice_footer_text, uidLine].filter(Boolean)
    const logo = await loadTenantLogoForPdf(resolveTenantWideLogoUrl(tenant))
    const tenantStreet = [tenant.invoice_street, tenant.invoice_street_nr].filter(Boolean).join(' ')
    const legalName = tenant.legal_company_name || tenant.name

    const items = [{
      product_name: productName,
      quantity: 1,
      unit_price_rappen: split.gross,
      total_price_rappen: split.gross,
    }]

    const pdfBuffer = await generateInvoicePdf({
      documentTitle: 'QUITTUNG',
      invoiceNumber: receiptNumber,
      invoiceDate: paidAt,
      dueDate: paidAt,
      dateLabel: 'Quittungsdatum',
      dueLabel: 'Bezahlt am',
      tenantName: legalName,
      tenantStreet,
      tenantZip: tenant.invoice_zip || '',
      tenantCity: tenant.invoice_city || '',
      tenantEmail: tenant.contact_email,
      tenantContactPerson: formatTenantContactPerson(tenant),
      tenantLogoBase64: logo?.base64 || null,
      tenantLogoFormat: logo?.format,
      customerName,
      billingStreet,
      billingZip,
      billingCity,
      billingEmail: customerEmail,
      items,
      subtotalRappen: split.net,
      vatRate: split.rate,
      vatAmountRappen: split.vat,
      totalRappen: split.gross,
      primaryColor: tenant.primary_color || '#1E40AF',
      secondaryColor: tenant.secondary_color || '#64748B',
      windowSide: tenant.invoice_window_side === 'right' ? 'right' : 'left',
      introText: 'Wir bestätigen den Eingang Ihrer Onlinezahlung.',
      paymentBlockTitle: 'Zahlungsbestätigung',
      paymentTerms: 'Diese Quittung bestätigt den Zahlungseingang. Es ist kein weiterer Betrag offen.',
      footerText: footerParts.join('\n') || null,
    })

    const html = buildInvoiceEmailHtml({
      customerName,
      invoiceNumber: receiptNumber,
      invoiceDate: paidAt,
      dueDate: paidAt,
      dateLabel: 'Quittungsdatum',
      dueLabel: 'Bezahlt am',
      documentTitle: 'QUITTUNG',
      items,
      subtotalRappen: split.net,
      vatRappen: split.vat,
      vatRate: split.rate,
      totalRappen: split.gross,
      tenantName: legalName,
      staffName: formatTenantContactPerson(tenant) || legalName,
      primaryColor: tenant.primary_color,
      introText: 'anbei die Quittung für Ihre Onlinezahlung. Der Betrag ist bereits bezahlt.',
      paymentTerms: 'Diese Quittung bestätigt den Zahlungseingang. Es ist kein weiterer Betrag offen.',
      footerText: footerParts.join('\n') || null,
    })

    const { messageId } = await sendEmail({
      to: customerEmail,
      subject: `Quittung ${receiptNumber} – ${legalName}`,
      html,
      fromName: tenant.name,
      fromEmail: tenant.from_email ?? null,
      domainVerified: !!tenant.resend_domain_verified,
      attachments: [{
        filename: `Quittung_${receiptNumber}.pdf`,
        content: pdfBuffer,
      }],
    })

    const nextMeta = {
      ...meta,
      receipt_sent_at: new Date().toISOString(),
      receipt_number: receiptNumber,
      receipt_email_id: messageId,
      receipt_error: null,
      vat_rate: split.rate,
      vat_amount_rappen: split.vat,
    }
    await supabase
      .from('payments')
      .update({ metadata: nextMeta, updated_at: new Date().toISOString() })
      .eq('id', payment.id)

    logger.info('✅ Quittung gesendet', {
      paymentId: payment.id,
      receiptNumber,
      to: customerEmail,
      messageId,
    })
    return { sent: true, code: 'SENT', message: `Quittung ${receiptNumber} an ${customerEmail} gesendet.` }
  } catch (err: any) {
    const message = `Quittung fehlgeschlagen für Zahlung ${payment.id}: ${err?.message || err}`
    logger.warn('⚠️', message)
    try {
      await supabase
        .from('payments')
        .update({
          metadata: {
            ...meta,
            receipt_error: String(err?.message || err).slice(0, 400),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id)
    } catch {
      // ignore stamp failure
    }
    return { sent: false, code: 'SEND_FAILED', message }
  }
}

export async function sendOnlinePaymentReceiptsSafe(
  supabase: { from: (table: string) => any },
  paymentIds: string[],
): Promise<void> {
  for (const paymentId of paymentIds) {
    try {
      const result = await sendOnlinePaymentReceipt({ supabase, paymentId })
      if (!result.sent && result.code !== 'ALREADY_SENT') {
        logger.warn('⚠️ Quittung:', result.message)
      }
    } catch (err: any) {
      logger.warn('⚠️ Quittung (unerwartet):', err?.message || err)
    }
  }
}
