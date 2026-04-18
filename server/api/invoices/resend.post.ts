// server/api/invoices/resend.post.ts
// Versendet eine bereits erstellte Rechnung erneut per E-Mail.

import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'
import { generateInvoicePdf } from '~/server/utils/invoice-pdf'

function _formatChf(rappen: number) {
  return `CHF ${(rappen / 100).toFixed(2)}`
}

function _formatAppointmentDate(dateStr?: string | null): string {
  if (!dateStr) return ''
  let timeStr = dateStr
  if (timeStr.includes(' ') && !timeStr.includes('T')) timeStr = timeStr.replace(' ', 'T')
  if (timeStr.includes('+00') && !timeStr.includes('+00:00')) timeStr = timeStr.replace('+00', '+00:00')
  if (!timeStr.includes('+') && !timeStr.includes('Z')) timeStr += '+00:00'
  const utcDate = new Date(timeStr)
  if (isNaN(utcDate.getTime())) return dateStr
  const localDateStr = utcDate.toLocaleString('sv-SE', { timeZone: 'Europe/Zurich' })
  const localDate = new Date(localDateStr)
  const dateFormatted = localDate.toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const timeFormatted = localDate.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
  return `${dateFormatted}, ${timeFormatted}`
}

function _formatDate(dateStr: string) {
  try { return new Date(dateStr).toLocaleDateString('de-CH') } catch { return dateStr }
}

function buildResendEmail(data: {
  customerName: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  items: { product_name: string; appointment_date?: string | null; appointment_start_time?: string | null; quantity: number; unit_price_rappen: number; total_price_rappen: number }[]
  totalRappen: number
  tenantName: string
  staffName: string
  primaryColor?: string | null
  qrCodeDataUrl?: string | null
  qrIban?: string | null
  creditorName?: string
  scorRef?: string | null
}): string {
  const brandColor = data.primaryColor || '#1E40AF'

  const rows = data.items.map(item => {
    const dateStr = item.appointment_start_time || item.appointment_date
    return `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;">
        <strong style="color:#1e293b;font-size:14px;">${item.product_name}</strong>
        ${dateStr ? `<br><span style="color:#94a3b8;font-size:12px;">${_formatAppointmentDate(dateStr)}</span>` : ''}
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:center;color:#94a3b8;font-size:13px;">${item.quantity}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:right;color:#64748b;font-size:13px;">${_formatChf(item.unit_price_rappen)}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#1e293b;font-size:13px;">${_formatChf(item.total_price_rappen)}</td>
    </tr>`
  }).join('')

  const qrSection = data.qrCodeDataUrl && data.qrIban ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;background:#f8fafc;border-radius:12px;padding:24px;">
      <tr>
        <td>
          <p style="font-size:12px;font-weight:700;color:#64748b;letter-spacing:0.05em;margin:0 0 12px 0;">EINZAHLUNGSSCHEIN (QR-RECHNUNG)</p>
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-right:24px;vertical-align:top;">
                <img src="${data.qrCodeDataUrl}" width="140" height="140" style="display:block;" alt="QR-Code" />
              </td>
              <td style="vertical-align:top;">
                <p style="font-size:12px;color:#64748b;margin:0 0 4px 0;">Zahlbar an</p>
                <p style="font-size:13px;font-weight:700;color:#1e293b;margin:0 0 8px 0;">${data.creditorName || data.tenantName}<br>${data.qrIban.replace(/(.{4})/g, '$1 ').trim()}</p>
                ${data.scorRef ? `<p style="font-size:12px;color:#64748b;margin:0 0 4px 0;">Referenz</p><p style="font-size:13px;font-weight:700;color:#1e293b;margin:0 0 8px 0;font-family:monospace;">${data.scorRef}</p>` : ''}
                <p style="font-size:12px;color:#64748b;margin:0 0 4px 0;">Betrag</p>
                <p style="font-size:15px;font-weight:800;color:#1e293b;margin:0;">${_formatChf(data.totalRappen)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>` : ''

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rechnung ${data.invoiceNumber}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <tr><td style="background:${brandColor};border-radius:16px 16px 0 0;padding:36px 40px;">
        <p style="margin:0 0 8px 0;font-size:12px;font-weight:600;color:rgba(255,255,255,0.7);letter-spacing:0.1em;text-transform:uppercase;">Erinnerung – Rechnung</p>
        <p style="margin:0;font-size:28px;font-weight:800;color:#ffffff;">${data.invoiceNumber}</p>
        <p style="margin:8px 0 0 0;font-size:16px;color:rgba(255,255,255,0.85);">${_formatChf(data.totalRappen)}</p>
      </td></tr>
      <tr><td style="background:#ffffff;padding:40px;">
        <p style="font-size:16px;color:#334155;margin:0 0 24px 0;">Guten Tag ${data.customerName},</p>
        <p style="font-size:14px;color:#64748b;margin:0 0 24px 0;">
          Anbei senden wir Ihnen Ihre Rechnung nochmals zur Information. Bitte begleichen Sie den Betrag bis zum <strong style="color:#1e293b;">${_formatDate(data.dueDate)}</strong>.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px;">
          <tr style="background:#f8fafc;">
            <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:0.05em;">LEISTUNG</th>
            <th style="padding:10px 16px;text-align:center;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:0.05em;">ANZ.</th>
            <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:0.05em;">PREIS</th>
            <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:0.05em;">TOTAL</th>
          </tr>
          ${rows}
          <tr style="background:#f8fafc;">
            <td colspan="3" style="padding:14px 16px;font-weight:700;color:#1e293b;font-size:15px;">Gesamtbetrag</td>
            <td style="padding:14px 16px;text-align:right;font-weight:800;color:${brandColor};font-size:16px;">${_formatChf(data.totalRappen)}</td>
          </tr>
        </table>
        ${qrSection}
        <p style="font-size:13px;color:#94a3b8;margin:24px 0 0 0;">Freundliche Grüsse,<br><strong style="color:#475569;">${data.staffName}</strong><br>${data.tenantName}</p>
      </td></tr>
      <tr><td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
        <p style="font-size:11px;color:#94a3b8;margin:0;">Rechnungsdatum: ${_formatDate(data.invoiceDate)} · Fällig: ${_formatDate(data.dueDate)}</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

export default defineEventHandler(async (event) => {
  try {
    const { invoiceId } = await readBody(event)
    if (!invoiceId) throw createError({ statusCode: 400, statusMessage: 'invoiceId required' })

    const authUser = await getAuthenticatedUser(event)
    if (!authUser?.id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

    const supabase = getSupabaseAdmin()

    // Rechnung + Details laden
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices_with_details')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) throw createError({ statusCode: 404, statusMessage: 'Invoice not found' })

    // Sicherstellen dass nur Rechnungen des eigenen Tenants versendet werden
    const { data: staffUser } = await supabase
      .from('users')
      .select('tenant_id, first_name, last_name, email')
      .eq('id', authUser.id)
      .single()

    if (!staffUser || staffUser.tenant_id !== invoice.tenant_id) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    // Tenant-Daten laden
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, legal_company_name, contact_email, primary_color, secondary_color, qr_iban, invoice_street, invoice_street_nr, invoice_zip, invoice_city, logo_square_url')
      .eq('id', invoice.tenant_id)
      .single()

    // Rechnungspositionen + Appointment-Daten laden
    const { data: rawItems } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('sort_order', { ascending: true })

    const appointmentIds = (rawItems || []).map((i: any) => i.appointment_id).filter(Boolean)
    const appointmentMap: Record<string, any> = {}
    if (appointmentIds.length > 0) {
      const { data: apts } = await supabase
        .from('appointments')
        .select('id, start_time, event_type_code, type')
        .in('id', appointmentIds)
      if (apts) for (const apt of apts) appointmentMap[apt.id] = apt
    }

    const eventTypeMap: Record<string, string> = {
      lesson: 'Fahrstunde', exam: 'Prüfung', theory: 'Theorieunterricht', vku: 'VKU', haltbar: 'Haltbarkeitsprüfung',
    }

    const items = (rawItems || []).map((item: any) => {
      const apt = item.appointment_id ? appointmentMap[item.appointment_id] : null
      const eventLabel = apt?.event_type_code ? (eventTypeMap[apt.event_type_code] || apt.event_type_code) : null
      return {
        ...item,
        product_name: eventLabel || item.product_name,
        appointment_start_time: apt?.start_time || null,
      }
    })

    const tenantName = (tenant as any)?.name || ''
    const staffName = `${staffUser.first_name || ''} ${staffUser.last_name || ''}`.trim()
    const customerName = invoice.billing_contact_person ||
      `${(invoice as any).customer_first_name || ''} ${(invoice as any).customer_last_name || ''}`.trim() ||
      'Kunde'
    const billingEmail = invoice.billing_email
    if (!billingEmail) throw createError({ statusCode: 422, statusMessage: 'Keine E-Mail-Adresse für Rechnung hinterlegt' })

    // QR-Code generieren
    let qrCodeDataUrl: string | null = null
    let scorRef: string | null = invoice.payment_reference || null
    const qrIban = (tenant as any)?.qr_iban || null
    if (qrIban) {
      try {
        const { generateSwissQRBase64, generateReference } = await import('~/server/utils/swiss-qr')
        const { ref: paymentRef } = generateReference(invoice.invoice_number, qrIban)
        scorRef = paymentRef
        qrCodeDataUrl = await generateSwissQRBase64({
          qr_iban: qrIban,
          creditor_name: (tenant as any)?.legal_company_name || tenantName,
          creditor_street: (tenant as any)?.invoice_street?.trim() || '',
          creditor_street_nr: (tenant as any)?.invoice_street_nr?.trim() || '',
          creditor_zip: (tenant as any)?.invoice_zip || '',
          creditor_city: (tenant as any)?.invoice_city || '',
          debtor_name: customerName,
          debtor_street: invoice.billing_street || '',
          debtor_zip: invoice.billing_zip || '',
          debtor_city: invoice.billing_city || '',
          amount_rappen: invoice.total_amount_rappen,
          reference: paymentRef,
          additional_info: `Rechnung ${invoice.invoice_number}`,
        })
      } catch { /* QR optional */ }
    }

    // E-Mail HTML generieren
    const html = buildResendEmail({
      customerName,
      invoiceNumber: invoice.invoice_number,
      invoiceDate: invoice.invoice_date,
      dueDate: invoice.due_date,
      items,
      totalRappen: invoice.total_amount_rappen,
      tenantName,
      staffName,
      primaryColor: (tenant as any)?.primary_color || null,
      qrCodeDataUrl,
      qrIban,
      creditorName: (tenant as any)?.legal_company_name || tenantName,
      scorRef,
    })

    // PDF als Anhang generieren
    let pdfAttachments: any[] = []
    try {
      const logoDataUrl: string | null = (tenant as any)?.logo_square_url || null
      let tenantLogoBase64: string | null = null
      let tenantLogoFormat: 'png' | 'jpeg' = 'png'
      if (logoDataUrl?.startsWith('data:image/')) {
        const match = logoDataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/)
        if (match) {
          tenantLogoFormat = match[1] === 'jpg' ? 'jpeg' : match[1] as 'png' | 'jpeg'
          tenantLogoBase64 = match[2]
        }
      }
      const tenantStreet = [(tenant as any)?.invoice_street?.trim(), (tenant as any)?.invoice_street_nr?.trim()].filter(Boolean).join(' ')
      const pdfBuffer = await generateInvoicePdf({
        invoiceNumber: invoice.invoice_number,
        invoiceDate: invoice.invoice_date,
        dueDate: invoice.due_date,
        tenantName: (tenant as any)?.legal_company_name || tenantName,
        tenantStreet,
        tenantZip: (tenant as any)?.invoice_zip || '',
        tenantCity: (tenant as any)?.invoice_city || '',
        tenantEmail: (tenant as any)?.contact_email || '',
        tenantLogoBase64,
        tenantLogoFormat,
        customerName,
        billingStreet: invoice.billing_street || '',
        billingZip: invoice.billing_zip || '',
        billingCity: invoice.billing_city || '',
        billingEmail,
        items: items.map((i: any) => ({
          product_name: i.product_name,
          appointment_date: i.appointment_start_time || i.appointment_date,
          quantity: i.quantity,
          unit_price_rappen: i.unit_price_rappen,
          total_price_rappen: i.total_price_rappen,
        })),
        subtotalRappen: invoice.subtotal_rappen || invoice.total_amount_rappen,
        totalRappen: invoice.total_amount_rappen,
        qrCodeDataUrl,
        qrIban,
        creditorName: (tenant as any)?.legal_company_name || tenantName,
        primaryColor: (tenant as any)?.primary_color || '#1E40AF',
        secondaryColor: (tenant as any)?.secondary_color || '#64748B',
      })
      pdfAttachments = [{ filename: `Rechnung_${invoice.invoice_number}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
    } catch (pdfErr: any) {
      console.warn('⚠️ PDF-Generierung fehlgeschlagen (non-fatal):', pdfErr.message)
    }

    // E-Mail versenden
    await sendEmail({
      to: billingEmail,
      subject: `Rechnung ${invoice.invoice_number} – ${tenantName}`,
      html,
      senderName: tenantName,
      attachments: pdfAttachments,
    })

    // sent_at aktualisieren
    await supabase
      .from('invoices')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', invoiceId)

    console.log(`✅ Rechnung ${invoice.invoice_number} erneut versendet an ${billingEmail}`)
    return { success: true, invoiceNumber: invoice.invoice_number, sentTo: billingEmail }

  } catch (error: any) {
    console.error('❌ Resend error:', error)
    return { success: false, error: error.message || 'Fehler beim Versenden' }
  }
})
