// server/api/invoices/send-draft.post.ts
// Speichert und verschickt einen Rechnungsentwurf.
// 1. Rechnung + Items in DB schreiben
// 2. payments.invoice_id + payment_status = 'invoiced' setzen
// 3. E-Mail an Schüler (via Resend)
// 4. E-Mail-Benachrichtigung an Admin
// 5. Accounto-Sync (best-effort, non-blocking)

import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'
import { generateInvoicePdf } from '~/server/utils/invoice-pdf'

// ── Inline E-Mail Templates ────────────────────────────────────────────────

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

function generateInvoiceEmail(data: {
  customerName: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  items: { product_name: string; appointment_date?: string | null; quantity: number; unit_price_rappen: number; total_price_rappen: number }[]
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
  const brandColorLight = brandColor + '15'

  const rows = data.items.map(item => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;">
        <strong style="color:#1e293b;font-size:14px;">${item.product_name}</strong>
        ${item.appointment_date ? `<br><span style="color:#94a3b8;font-size:12px;">${_formatAppointmentDate(item.appointment_date)}</span>` : ''}
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:center;color:#94a3b8;font-size:13px;">${item.quantity}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:right;color:#64748b;font-size:13px;">${_formatChf(item.unit_price_rappen)}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#1e293b;font-size:13px;">${_formatChf(item.total_price_rappen)}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rechnung ${data.invoiceNumber}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <!-- Header -->
      <tr><td style="background:${brandColor};border-radius:16px 16px 0 0;padding:36px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <p style="margin:0 0 4px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.65);">RECHNUNG</p>
              <p style="margin:0;font-size:26px;font-weight:800;color:white;font-family:monospace;">${data.invoiceNumber}</p>
            </td>
            <td align="right">
              <p style="margin:0 0 2px;font-size:12px;color:rgba(255,255,255,0.65);">Gesamtbetrag</p>
              <p style="margin:0;font-size:28px;font-weight:800;color:white;">${_formatChf(data.totalRappen)}</p>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Meta info band -->
      <tr><td style="background:#1e293b;padding:14px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:rgba(255,255,255,0.5);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Rechnungsdatum</td>
            <td style="color:rgba(255,255,255,0.5);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;text-align:center;">Fällig bis</td>
            <td style="color:rgba(255,255,255,0.5);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;text-align:right;">Aussteller</td>
          </tr>
          <tr>
            <td style="color:white;font-size:14px;font-weight:600;padding-top:3px;">${_formatDate(data.invoiceDate)}</td>
            <td style="color:#f87171;font-size:14px;font-weight:700;padding-top:3px;text-align:center;">${_formatDate(data.dueDate)}</td>
            <td style="color:white;font-size:14px;font-weight:600;padding-top:3px;text-align:right;">${data.tenantName}</td>
          </tr>
        </table>
      </td></tr>

      <!-- Body -->
      <tr><td style="background:white;padding:32px 40px;">

        <p style="margin:0 0 6px;color:#64748b;font-size:15px;">Hallo <strong style="color:#1e293b;">${data.customerName}</strong>,</p>
        <p style="margin:0 0 28px;color:#64748b;font-size:14px;line-height:1.6;">anbei erhalten Sie Ihre Rechnung für die absolvierten Fahrstunden. Bitte überweisen Sie den Betrag fristgerecht.</p>

        <!-- Items table -->
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;">Position</th>
              <th style="padding:10px 16px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;width:50px;">Anz.</th>
              <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;width:100px;">Einzelpreis</th>
              <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;width:100px;">Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr style="background:${brandColor};">
              <td colspan="3" style="padding:16px;text-align:right;font-weight:700;font-size:14px;color:rgba(255,255,255,0.85);">Gesamtbetrag CHF</td>
              <td style="padding:16px;text-align:right;font-weight:900;font-size:20px;color:white;">${_formatChf(data.totalRappen).replace('CHF ', '')}</td>
            </tr>
          </tfoot>
        </table>

        <!-- Payment hint -->
        <div style="margin:24px 0 0;background:${brandColorLight};border-left:4px solid ${brandColor};border-radius:0 8px 8px 0;padding:16px 20px;">
          <p style="margin:0 0 4px;font-weight:700;font-size:13px;color:#1e293b;">Zahlungsinformationen</p>
          <p style="margin:0;font-size:13px;color:#475569;line-height:1.5;">
            Bitte überweise den Betrag bis zum <strong>${_formatDate(data.dueDate)}</strong> unter Angabe der Rechnungsnummer <strong style="font-family:monospace;">${data.invoiceNumber}</strong>.
          </p>
        </div>

        ${data.qrCodeDataUrl ? `
        <!-- QR-Rechnung -->
        <div style="margin-top:28px;padding-top:24px;border-top:2px dashed #e2e8f0;">
          <p style="margin:0 0 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;">Swiss QR-Rechnung – Per Banking-App bezahlen</p>
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-right:20px;vertical-align:top;">
                <div style="background:white;border:1px solid #e2e8f0;border-radius:10px;padding:10px;display:inline-block;">
                  <img src="${data.qrCodeDataUrl}" alt="Swiss QR Code" width="110" height="110" style="display:block;" />
                  <div style="text-align:center;margin-top:6px;">
                    <span style="display:inline-block;background:#FF0000;border-radius:4px;width:22px;height:22px;line-height:22px;text-align:center;color:white;font-weight:900;font-size:16px;">+</span>
                  </div>
                </div>
              </td>
              <td style="vertical-align:top;">
                <p style="margin:0 0 8px;font-size:12px;color:#64748b;">QR-Code mit Banking-App (z.B. PostFinance, UBS, Raiffeisen) oder TWINT scannen.</p>
                ${data.qrIban ? `<p style="margin:0 0 3px;font-size:11px;color:#94a3b8;">QR-IBAN: <span style="color:#1e293b;font-family:monospace;font-weight:600;">${data.qrIban}</span></p>` : ''}
                ${data.creditorName ? `<p style="margin:0 0 3px;font-size:11px;color:#94a3b8;">Empfänger: <span style="color:#1e293b;font-weight:600;">${data.creditorName}</span></p>` : ''}
                ${data.scorRef ? `<p style="margin:0 0 3px;font-size:11px;color:#94a3b8;">Referenz: <span style="color:#1e293b;font-family:monospace;font-weight:600;">${data.scorRef}</span></p>` : ''}
                <p style="margin:10px 0 0;font-size:18px;font-weight:800;color:${brandColor};">${_formatChf(data.totalRappen)}</p>
              </td>
            </tr>
          </table>
        </div>` : ''}

      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:20px 40px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">${data.tenantName} · Diese Rechnung wurde automatisch von Simy erstellt</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

function generateAdminInvoiceNotification(data: {
  invoiceNumber: string
  studentName: string
  studentEmail: string
  totalRappen: number
  itemCount: number
  staffName: string
  tenantName: string
}): string {
  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Neue Rechnung versendet</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<div style="max-width:540px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
  <div style="background:#1e293b;padding:24px 32px;">
    <h1 style="color:white;margin:0;font-size:18px;font-weight:700;">📄 Rechnung versendet</h1>
    <p style="color:#94a3b8;margin:4px 0 0;font-size:13px;">${data.tenantName}</p>
  </div>
  <div style="padding:28px 32px;">
    <p style="color:#475569;margin:0 0 20px;">Eine neue Rechnung wurde automatisch erstellt und versendet:</p>
    <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <tr><td style="padding:10px 14px;color:#64748b;font-size:13px;border-bottom:1px solid #e2e8f0;">Rechnungsnummer</td><td style="padding:10px 14px;font-weight:700;color:#1e293b;border-bottom:1px solid #e2e8f0;">${data.invoiceNumber}</td></tr>
      <tr><td style="padding:10px 14px;color:#64748b;font-size:13px;border-bottom:1px solid #e2e8f0;">Schüler</td><td style="padding:10px 14px;font-weight:600;color:#1e293b;border-bottom:1px solid #e2e8f0;">${data.studentName}</td></tr>
      <tr><td style="padding:10px 14px;color:#64748b;font-size:13px;border-bottom:1px solid #e2e8f0;">E-Mail gesendet an</td><td style="padding:10px 14px;color:#1e293b;border-bottom:1px solid #e2e8f0;">${data.studentEmail}</td></tr>
      <tr><td style="padding:10px 14px;color:#64748b;font-size:13px;border-bottom:1px solid #e2e8f0;">Positionen</td><td style="padding:10px 14px;color:#1e293b;border-bottom:1px solid #e2e8f0;">${data.itemCount} Fahrstunde${data.itemCount !== 1 ? 'n' : ''}</td></tr>
      <tr><td style="padding:10px 14px;color:#64748b;font-size:13px;border-bottom:1px solid #e2e8f0;">Betrag</td><td style="padding:10px 14px;font-weight:800;color:#6000BD;font-size:15px;border-bottom:1px solid #e2e8f0;">${_formatChf(data.totalRappen)}</td></tr>
      <tr><td style="padding:10px 14px;color:#64748b;font-size:13px;">Erstellt von</td><td style="padding:10px 14px;color:#1e293b;">${data.staffName}</td></tr>
    </table>
    <p style="color:#94a3b8;font-size:12px;margin:0;">Diese Benachrichtigung wurde automatisch von Simy generiert.</p>
  </div>
</div></body></html>`
}

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()

  const { data: staffUser } = await supabase
    .from('users')
    .select('id, tenant_id, role, first_name, last_name, email')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!staffUser || !['admin', 'staff'].includes(staffUser.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await readBody(event)
  const { draft } = body

  if (!draft || !draft.user_id || !draft.items?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid draft data' })
  }

  // Sicherstellen, dass der Draft zum Tenant gehört
  if (draft.tenant_id !== staffUser.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Tenant mismatch' })
  }

  // Tenant laden (für Rechnungsnummer + Admin-Mail + Farben)
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, name, legal_company_name, contact_email, invoice_number_prefix, next_invoice_number, primary_color, secondary_color, logo_square_url, invoice_street, invoice_street_nr, invoice_zip, invoice_city')
    .eq('id', staffUser.tenant_id)
    .single()

  // Fallback falls Spalten noch nicht existieren (Migration ausstehend)
  let tenantData = tenant as any
  if (tenantError || !tenant) {
    const { data: tenantBasic } = await supabase
      .from('tenants')
      .select('id, name, contact_email, primary_color, secondary_color')
      .eq('id', staffUser.tenant_id)
      .single()
    if (!tenantBasic) throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
    tenantData = { ...tenantBasic, invoice_number_prefix: 'RE', next_invoice_number: 1 }
  }

  // Nächste Rechnungsnummer atomar reservieren (mit Jahr)
  const prefix = tenantData.invoice_number_prefix || 'RE'
  const nextNum = tenantData.next_invoice_number || 1
  const year = new Date().getFullYear()
  const invoiceNumber = `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`

  await supabase
    .from('tenants')
    .update({ next_invoice_number: nextNum + 1 })
    .eq('id', staffUser.tenant_id)

  const now = new Date().toISOString()

  // Rechnung in DB schreiben
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      tenant_id: staffUser.tenant_id,
      user_id: draft.user_id,
      staff_id: draft.staff_id || staffUser.id,
      invoice_number: invoiceNumber,
      invoice_date: draft.invoice_date,
      due_date: draft.due_date,
      billing_type: draft.billing_type || 'individual',
      billing_contact_person: [draft.billing_first_name, draft.billing_last_name].filter(Boolean).join(' ') || null,
      billing_company_name: (draft as any).billing_company_name || null,
      billing_email: draft.billing_email,
      billing_street: draft.billing_street || null,
      billing_zip: draft.billing_zip || null,
      billing_city: draft.billing_city || null,
      billing_country: draft.billing_country || 'CH',
      subtotal_rappen: draft.subtotal_rappen,
      vat_rate: draft.vat_rate || 0,
      vat_amount_rappen: draft.vat_amount_rappen || 0,
      discount_amount_rappen: draft.discount_amount_rappen || 0,
      total_amount_rappen: draft.total_amount_rappen,
      status: 'sent',
      payment_status: 'pending',
      paid_amount_rappen: 0,
      accounto_sync_status: 'not_synced',
      sent_at: now,
    })
    .select()
    .single()

  if (invoiceError || !invoice) {
    throw createError({ statusCode: 500, statusMessage: invoiceError?.message || 'Failed to create invoice' })
  }

  // Invoice Items schreiben
  if (draft.items.length > 0) {
    const items = draft.items.map((item: any, i: number) => ({
      invoice_id: invoice.id,
      tenant_id: staffUser.tenant_id,
      appointment_id: item.appointment_id || null,
      payment_id: item.payment_id || null,
      product_name: item.product_name,
      product_description: item.product_description || null,
      appointment_title: item.appointment_title || null,
      appointment_date: item.appointment_date || null,
      appointment_duration_minutes: item.appointment_duration_minutes || null,
      quantity: item.quantity || 1,
      unit_price_rappen: item.unit_price_rappen,
      total_price_rappen: item.total_price_rappen,
      vat_rate: item.vat_rate || 0,
      vat_amount_rappen: item.vat_amount_rappen || 0,
      sort_order: item.sort_order ?? i,
    }))

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(items)

    if (itemsError) {
      console.warn('⚠️ invoice_items insert warning:', itemsError.message)
    }
  }

  // Payments aktualisieren: invoice_id setzen + status auf 'invoiced'
  if (draft.payment_ids?.length > 0) {
    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({
        invoice_id: invoice.id,
        payment_status: 'invoiced',
        payment_method: 'invoice',
        updated_at: now,
      })
      .in('id', draft.payment_ids)

    if (paymentUpdateError) {
      console.error('⚠️ Fehler beim Setzen von payment_status=invoiced:', paymentUpdateError.message)
    }
  }

  const studentName = draft.student?.name || 'Schüler'
  const studentEmail = draft.billing_email

  // Billing-Adresse in company_billing_addresses speichern/aktualisieren (non-blocking)
  if (draft.user_id) {
    const contactPerson = [draft.billing_first_name, draft.billing_last_name].filter(Boolean).join(' ')
    const billingStreetParts = (draft.billing_street || '').trim().split(/\s+/)
    // Letztes Token als Hausnummer falls vorhanden (z.B. "Musterstrasse 12" → street="Musterstrasse", nr="12")
    const hasNumber = billingStreetParts.length > 1 && /^\d/.test(billingStreetParts[billingStreetParts.length - 1])
    const streetName = hasNumber ? billingStreetParts.slice(0, -1).join(' ') : draft.billing_street || ''
    const streetNumber = hasNumber ? billingStreetParts[billingStreetParts.length - 1] : ''

    const billingPayload = {
      user_id: draft.user_id,
      tenant_id: staffUser.tenant_id,
      company_name: (draft as any).billing_company_name || `${draft.billing_first_name || ''} ${draft.billing_last_name || ''}`.trim(),
      contact_person: contactPerson || studentName,
      email: draft.billing_email || '',
      street: streetName,
      street_number: streetNumber || null,
      zip: draft.billing_zip || '',
      city: draft.billing_city || '',
      country: draft.billing_country || 'Schweiz',
      is_active: true,
      updated_at: now,
    }

    // Vorhandene aktive Adresse suchen und updaten, sonst neu einfügen
    const { data: existing } = await supabase
      .from('company_billing_addresses')
      .select('id')
      .eq('user_id', draft.user_id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('company_billing_addresses')
        .update(billingPayload)
        .eq('id', existing.id)
    } else {
      await supabase
        .from('company_billing_addresses')
        .insert({ ...billingPayload, created_by: staffUser.id })
    }
  }

  // QR-Code generieren wenn QR-IBAN vorhanden
  let qrCodeDataUrl: string | null = null
  if ((draft as any).qr_iban) {
    try {
      const { generateSwissQRBase64, generateReference } = await import('~/server/utils/swiss-qr')
      const { ref: paymentRef, refType } = generateReference(invoiceNumber, (draft as any).qr_iban)
      qrCodeDataUrl = await generateSwissQRBase64({
        qr_iban: (draft as any).qr_iban,
        creditor_name: (draft as any).creditor_name || tenantData.name || '',
        creditor_street: (draft as any).creditor_street || '',
        creditor_street_nr: (draft as any).creditor_street_nr || '',
        creditor_zip: (draft as any).creditor_zip || '',
        creditor_city: (draft as any).creditor_city || '',
        debtor_name: studentName,
        debtor_street: draft.billing_street || '',
        debtor_zip: draft.billing_zip || '',
        debtor_city: draft.billing_city || '',
        amount_rappen: draft.total_amount_rappen,
        reference: paymentRef,
        additional_info: `Rechnung ${invoiceNumber}`,
      })
      ;(draft as any).scor_reference = paymentRef
      ;(draft as any).ref_type = refType
    } catch { /* QR optional – Fehler ignorieren */ }
  }

  // E-Mail an Schüler
  if (studentEmail) {
    try {
      const html = generateInvoiceEmail({
        customerName: studentName,
        invoiceNumber,
        invoiceDate: draft.invoice_date,
        dueDate: draft.due_date,
        items: draft.items,
        totalRappen: draft.total_amount_rappen,
        tenantName: tenantData.name,
        staffName: `${staffUser.first_name} ${staffUser.last_name}`.trim(),
        primaryColor: tenantData.primary_color || null,
        qrCodeDataUrl,
        qrIban: (draft as any).qr_iban || null,
        creditorName: (draft as any).creditor_name || tenantData.name,
        scorRef: (draft as any).scor_reference || null,
      })

      // PDF generieren und als Anhang beifügen
      let pdfAttachments: any[] = []
      try {
        // Logo aus base64 data URL extrahieren
        const logoDataUrl: string | null = (tenantData as any).logo_square_url || null
        let tenantLogoBase64: string | null = null
        let tenantLogoFormat: 'png' | 'jpeg' = 'png'
        if (logoDataUrl?.startsWith('data:image/')) {
          const match = logoDataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/)
          if (match) {
            tenantLogoFormat = match[1] === 'jpg' ? 'jpeg' : match[1] as 'png' | 'jpeg'
            tenantLogoBase64 = match[2]
          }
        }

        const legalName = (tenantData as any).legal_company_name || tenantData.name
        const tenantStreet = [
          (draft as any).creditor_street?.trim() || (tenantData as any).invoice_street?.trim(),
          (draft as any).creditor_street_nr?.trim() || (tenantData as any).invoice_street_nr?.trim(),
        ].filter(Boolean).join(' ')
        const tenantZip = (draft as any).creditor_zip || (tenantData as any).invoice_zip || ''
        const tenantCity = (draft as any).creditor_city || (tenantData as any).invoice_city || ''

        const pdfBuffer = await generateInvoicePdf({
          invoiceNumber,
          invoiceDate: draft.invoice_date,
          dueDate: draft.due_date,
          tenantName: legalName,
          tenantStreet,
          tenantZip,
          tenantCity,
          tenantEmail: tenantData.contact_email,
          tenantLogoBase64,
          tenantLogoFormat,
          customerName: studentName,
          billingStreet: draft.billing_street,
          billingZip: draft.billing_zip,
          billingCity: draft.billing_city,
          billingEmail: studentEmail,
          items: draft.items,
          subtotalRappen: draft.subtotal_rappen || draft.total_amount_rappen,
          totalRappen: draft.total_amount_rappen,
          qrCodeDataUrl,
          qrIban: (draft as any).qr_iban || null,
          creditorName: (draft as any).creditor_name || legalName,
          primaryColor: tenantData.primary_color || '#1E40AF',
          secondaryColor: tenantData.secondary_color || '#64748B',
        })
        pdfAttachments = [{
          filename: `Rechnung_${invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        }]
        console.log(`✅ PDF generiert: Rechnung_${invoiceNumber}.pdf (${pdfBuffer.length} bytes)`)
      } catch (pdfErr: any) {
        console.warn('⚠️ PDF-Generierung fehlgeschlagen (non-fatal):', pdfErr.message)
      }

      await sendEmail({
        to: studentEmail,
        subject: `Rechnung ${invoiceNumber} – ${tenantData.name}`,
        html,
        senderName: tenantData.name,
        attachments: pdfAttachments,
      })
    } catch (emailErr: any) {
      console.warn('⚠️ Schüler-E-Mail fehlgeschlagen (non-fatal):', emailErr.message)
    }
  }

  // Admin-Benachrichtigung
  try {
    const adminEmail = tenantData.contact_email || staffUser.email
    if (adminEmail) {
      const adminHtml = generateAdminInvoiceNotification({
        invoiceNumber,
        studentName,
        studentEmail: studentEmail || '–',
        totalRappen: draft.total_amount_rappen,
        itemCount: draft.items.length,
        staffName: `${staffUser.first_name} ${staffUser.last_name}`.trim(),
        tenantName: tenantData.name,
      })

      await sendEmail({
        to: adminEmail,
        subject: `📄 Neue Rechnung ${invoiceNumber} für ${studentName}`,
        html: adminHtml,
      })
    }
  } catch (adminEmailErr: any) {
    console.warn('⚠️ Admin-E-Mail fehlgeschlagen (non-fatal):', adminEmailErr.message)
  }

  // Accounto-Sync (fire-and-forget, non-blocking)
  setImmediate(async () => {
    try {
      await supabase
        .from('invoices')
        .update({ accounto_sync_status: 'syncing' })
        .eq('id', invoice.id)

      await $fetch('/api/accounto/create-invoice', {
        method: 'POST',
        body: {
          appointments: draft.items.map((item: any) => ({
            title: item.product_name,
            amount: item.unit_price_rappen / 100,
          })),
          customerData: {
            firstName: draft.billing_first_name || studentName.split(' ')[0],
            lastName: draft.billing_last_name || studentName.split(' ').slice(1).join(' '),
            email: studentEmail,
          },
          billingAddress: {
            street: `${draft.billing_street || ''} ${draft.billing_street_number || ''}`.trim(),
            zip: draft.billing_zip || '',
            city: draft.billing_city || '',
          },
          emailData: {
            email: studentEmail,
            subject: `Rechnung ${invoiceNumber}`,
          },
          totalAmount: draft.total_amount_rappen / 100,
        },
      })

      await supabase
        .from('invoices')
        .update({ accounto_sync_status: 'synced', accounto_last_sync: new Date().toISOString() })
        .eq('id', invoice.id)
    } catch (accountoErr: any) {
      console.warn('⚠️ Accounto-Sync fehlgeschlagen (non-fatal):', accountoErr.message)
      await supabase
        .from('invoices')
        .update({
          accounto_sync_status: 'error',
          accounto_sync_error: accountoErr.message?.substring(0, 255),
        })
        .eq('id', invoice.id)
    }
  })

  return {
    success: true,
    invoice_id: invoice.id,
    invoice_number: invoiceNumber,
    total_amount_rappen: draft.total_amount_rappen,
    student_email: studentEmail,
  }
})
