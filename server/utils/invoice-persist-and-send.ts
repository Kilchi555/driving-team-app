/**
 * Persist an invoice draft + optionally email the PDF.
 * Shared by manual send-draft and auto-invoice-on-complete.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '~/server/utils/email'
import { generateInvoicePdf, formatTenantContactPerson } from '~/server/utils/invoice-pdf'
import { loadTenantLogoForPdf, resolveTenantWideLogoUrl } from '~/server/utils/tenant-logo-for-pdf'
import { buildInvoiceEmailHtml } from '~/server/utils/invoice-email'
import { allocateInvoiceNumber } from '~/server/utils/allocate-invoice-number'
import { appointmentCountLabel, getTenantTerminology } from '~/server/utils/tenant-terminology'
import { applyMissingInvoiceBilling, pdfBillingFields } from '~/server/utils/invoice-billing-snapshot'
import { formatBillingPersonLabel, joinStreetAndNumber } from '~/utils/billing-address-map'

export type InvoiceDraftPayload = {
  user_id: string
  staff_id?: string | null
  tenant_id: string
  invoice_date: string
  due_date: string
  billing_type?: string
  billing_email?: string | null
  billing_first_name?: string | null
  billing_last_name?: string | null
  billing_company_name?: string | null
  billing_street?: string | null
  billing_street_nr?: string | null
  billing_street_number?: string | null
  billing_zip?: string | null
  billing_city?: string | null
  billing_country?: string | null
  subtotal_rappen: number
  vat_rate?: number
  vat_amount_rappen?: number
  discount_amount_rappen?: number
  total_amount_rappen: number
  notes?: string | null
  payment_terms?: string | null
  footer_text?: string | null
  payment_ids?: string[]
  items: any[]
  student?: { id?: string; name?: string; email?: string | null }
  qr_iban?: string | null
  creditor_name?: string | null
  creditor_street?: string | null
  creditor_street_nr?: string | null
  creditor_zip?: string | null
  creditor_city?: string | null
  scor_reference?: string | null
  ref_type?: string | null
}

export type PersistAndSendActor = {
  id: string
  first_name?: string | null
  last_name?: string | null
  email?: string | null
}

export type PersistAndSendOptions = {
  supabase: SupabaseClient
  tenantId: string
  actor: PersistAndSendActor
  draft: InvoiceDraftPayload
  /** Persist as sent and email PDF (default true) */
  sendEmailFlag?: boolean
  /**
   * Explicit email recipients for the invoice PDF.
   * When set, overrides draft.billing_email as the To address(es).
   * Billing party on the invoice document is unchanged.
   */
  emailTo?: string[]
  /** Skip the usual "Rechnung versendet" admin CC (default false) */
  skipAdminNotify?: boolean
  /** Extra admin alert (e.g. missing customer email) */
  adminAlertHtml?: string | null
  adminAlertSubject?: string | null
}

function generateAdminInvoiceNotification(data: {
  invoiceNumber: string
  studentName: string
  studentEmail: string
  totalRappen: number
  itemCount: number
  staffName: string
  tenantName: string
  clientLabel?: string
  itemCountLabel?: string
}): string {
  const clientLabel = data.clientLabel || 'Schüler'
  const itemCountLabel = data.itemCountLabel || `${data.itemCount} Termin${data.itemCount !== 1 ? 'e' : ''}`
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
      <tr><td style="padding:10px 14px;color:#64748b;font-size:13px;border-bottom:1px solid #e2e8f0;">${clientLabel}</td><td style="padding:10px 14px;font-weight:600;color:#1e293b;border-bottom:1px solid #e2e8f0;">${data.studentName}</td></tr>
      <tr><td style="padding:10px 14px;color:#64748b;font-size:13px;border-bottom:1px solid #e2e8f0;">E-Mail gesendet an</td><td style="padding:10px 14px;color:#1e293b;border-bottom:1px solid #e2e8f0;">${data.studentEmail}</td></tr>
      <tr><td style="padding:10px 14px;color:#64748b;font-size:13px;border-bottom:1px solid #e2e8f0;">Positionen</td><td style="padding:10px 14px;color:#1e293b;border-bottom:1px solid #e2e8f0;">${itemCountLabel}</td></tr>
      <tr><td style="padding:10px 14px;color:#64748b;font-size:13px;border-bottom:1px solid #e2e8f0;">Betrag</td><td style="padding:10px 14px;font-weight:800;color:#6000BD;font-size:15px;border-bottom:1px solid #e2e8f0;">CHF ${(data.totalRappen / 100).toFixed(2)}</td></tr>
      <tr><td style="padding:10px 14px;color:#64748b;font-size:13px;">Erstellt von</td><td style="padding:10px 14px;color:#1e293b;">${data.staffName}</td></tr>
    </table>
    <p style="color:#94a3b8;font-size:12px;margin:0;">Diese Benachrichtigung wurde automatisch von Simy generiert.</p>
  </div>
</div></body></html>`
}

export async function persistAndSendInvoiceDraft(opts: PersistAndSendOptions): Promise<{
  success: true
  invoice_id: string
  invoice_number: string
  total_amount_rappen: number
  emailed_to: string[]
}> {
  const {
    supabase,
    tenantId,
    actor,
    draft,
    sendEmailFlag = true,
    emailTo,
    skipAdminNotify = false,
    adminAlertHtml = null,
    adminAlertSubject = null,
  } = opts

  if (!draft?.user_id || !draft.items?.length) {
    throw new Error('Invalid draft data')
  }
  if (draft.tenant_id !== tenantId) {
    throw new Error('Tenant mismatch')
  }

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, name, legal_company_name, contact_email, contact_person_first_name, contact_person_last_name, invoice_number_prefix, next_invoice_number, primary_color, secondary_color, logo_wide_url, invoice_street, invoice_street_nr, invoice_zip, invoice_city, invoice_intro_text, invoice_payment_terms, invoice_footer_text, invoice_window_side, from_email, resend_domain_verified')
    .eq('id', tenantId)
    .single()

  let tenantData: any = tenant
  if (tenantError || !tenant) {
    const { data: tenantBasic } = await supabase
      .from('tenants')
      .select('id, name, contact_email, primary_color, secondary_color')
      .eq('id', tenantId)
      .single()
    if (!tenantBasic) throw new Error('Tenant not found')
    tenantData = { ...tenantBasic, invoice_number_prefix: 'RE', next_invoice_number: 1 }
  }

  const invoiceNumber = await allocateInvoiceNumber(supabase, tenantId)
  const now = new Date().toISOString()
  const billedDraft = await applyMissingInvoiceBilling(supabase, tenantId, draft)
  Object.assign(draft, billedDraft)
  const billedStreetNumber = draft.billing_street_number || draft.billing_street_nr || null

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      tenant_id: tenantId,
      user_id: draft.user_id,
      staff_id: draft.staff_id || actor.id,
      invoice_number: invoiceNumber,
      invoice_date: draft.invoice_date,
      due_date: draft.due_date,
      billing_type: draft.billing_type || 'individual',
      billing_contact_person: formatBillingPersonLabel(draft.billing_first_name, draft.billing_last_name) || null,
      billing_company_name: draft.billing_company_name || null,
      billing_email: draft.billing_email,
      billing_street: joinStreetAndNumber(draft.billing_street, billedStreetNumber) || null,
      billing_street_number: billedStreetNumber,
      billing_zip: draft.billing_zip || null,
      billing_city: draft.billing_city || null,
      billing_country: draft.billing_country || 'CH',
      subtotal_rappen: draft.subtotal_rappen,
      vat_rate: draft.vat_rate || 0,
      vat_amount_rappen: draft.vat_amount_rappen || 0,
      discount_amount_rappen: draft.discount_amount_rappen || 0,
      total_amount_rappen: draft.total_amount_rappen,
      status: sendEmailFlag ? 'sent' : 'draft',
      payment_status: 'pending',
      paid_amount_rappen: 0,
      sent_at: sendEmailFlag ? now : null,
      notes: draft.notes || null,
      payment_terms: draft.payment_terms || null,
      footer_text: draft.footer_text || null,
    })
    .select()
    .single()

  if (invoiceError || !invoice) {
    throw new Error(invoiceError?.message || 'Failed to create invoice')
  }

  if (draft.items.length > 0) {
    const items = draft.items.map((item: any, i: number) => ({
      invoice_id: invoice.id,
      tenant_id: tenantId,
      appointment_id: item.appointment_id || null,
      payment_id: item.payment_id || null,
      product_id: item.product_id || null,
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

    const { error: itemsError } = await supabase.from('invoice_items').insert(items)
    if (itemsError) {
      console.warn('⚠️ invoice_items insert warning:', itemsError.message)
    }
  }

  if (draft.payment_ids?.length) {
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

  const terms = await getTenantTerminology(supabase, tenantId)
  const appointmentLabel = terms.appointment || 'Termin'
  const clientLabel = terms.client || 'Schüler'
  const studentName = draft.student?.name || clientLabel
  const billingEmail = draft.billing_email || null
  const staffName = `${actor.first_name || ''} ${actor.last_name || ''}`.trim() || 'System'

  if (draft.user_id) {
    const contactPerson = [draft.billing_first_name, draft.billing_last_name].filter(Boolean).join(' ')
    const billingStreetParts = (draft.billing_street || '').trim().split(/\s+/)
    const hasNumber = billingStreetParts.length > 1 && /^\d/.test(billingStreetParts[billingStreetParts.length - 1])
    const streetName = hasNumber ? billingStreetParts.slice(0, -1).join(' ') : draft.billing_street || ''
    const streetNumber = hasNumber
      ? billingStreetParts[billingStreetParts.length - 1]
      : (draft.billing_street_nr || draft.billing_street_number || '')

    const billingPayload = {
      user_id: draft.user_id,
      tenant_id: tenantId,
      company_name: draft.billing_company_name || `${draft.billing_first_name || ''} ${draft.billing_last_name || ''}`.trim(),
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

    const { data: existing } = await supabase
      .from('company_billing_addresses')
      .select('id')
      .eq('user_id', draft.user_id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (existing) {
      await supabase.from('company_billing_addresses').update(billingPayload).eq('id', existing.id)
    } else {
      await supabase.from('company_billing_addresses').insert({ ...billingPayload, created_by: actor.id })
    }
  }

  let qrCodeDataUrl: string | null = null
  if (draft.qr_iban) {
    try {
      const { generateSwissQRBase64, generateReference } = await import('~/server/utils/swiss-qr')
      const { ref: paymentRef, refType } = generateReference(invoiceNumber, draft.qr_iban)
      qrCodeDataUrl = await generateSwissQRBase64({
        qr_iban: draft.qr_iban,
        creditor_name: draft.creditor_name || tenantData.name || '',
        creditor_street: draft.creditor_street || '',
        creditor_street_nr: draft.creditor_street_nr || '',
        creditor_zip: draft.creditor_zip || '',
        creditor_city: draft.creditor_city || '',
        debtor_name: studentName,
        debtor_street: draft.billing_street || '',
        debtor_street_nr: draft.billing_street_number || draft.billing_street_nr || '',
        debtor_zip: draft.billing_zip || '',
        debtor_city: draft.billing_city || '',
        amount_rappen: draft.total_amount_rappen,
        reference: paymentRef,
        additional_info: `Rechnung ${invoiceNumber}`,
      })
      draft.scor_reference = paymentRef
      draft.ref_type = refType
    } catch { /* QR optional */ }
  }

  const recipients = (emailTo?.length
    ? emailTo
    : billingEmail
      ? [billingEmail]
      : []
  )
    .map((e) => (e || '').trim())
    .filter(Boolean)

  const uniqueRecipients = [...new Set(recipients)]
  let pdfAttachments: any[] = []

  if (sendEmailFlag && uniqueRecipients.length > 0) {
    try {
      const html = buildInvoiceEmailHtml({
        customerName: studentName,
        invoiceNumber,
        invoiceDate: draft.invoice_date,
        dueDate: draft.due_date,
        items: draft.items,
        subtotalRappen: draft.subtotal_rappen || draft.total_amount_rappen,
        discountRappen: draft.discount_amount_rappen || 0,
        totalRappen: draft.total_amount_rappen,
        tenantName: tenantData.name,
        staffName,
        primaryColor: tenantData.primary_color || null,
        qrCodeDataUrl,
        qrIban: draft.qr_iban || null,
        creditorName: draft.creditor_name || tenantData.name,
        scorRef: draft.scor_reference || null,
        introText: draft.notes || tenantData.invoice_intro_text || null,
        paymentTerms: draft.payment_terms || tenantData.invoice_payment_terms || null,
        footerText: draft.footer_text || tenantData.invoice_footer_text || null,
        appointmentLabel,
      })

      try {
        const logo = await loadTenantLogoForPdf(resolveTenantWideLogoUrl(tenantData))
        const legalName = tenantData.legal_company_name || tenantData.name
        const tenantStreet = [
          draft.creditor_street?.trim() || tenantData.invoice_street?.trim(),
          draft.creditor_street_nr?.trim() || tenantData.invoice_street_nr?.trim(),
        ].filter(Boolean).join(' ')
        const pdfAddr = pdfBillingFields(draft)

        const pdfBuffer = await generateInvoicePdf({
          invoiceNumber,
          invoiceDate: draft.invoice_date,
          dueDate: draft.due_date,
          tenantName: legalName,
          tenantStreet,
          tenantZip: draft.creditor_zip || tenantData.invoice_zip || '',
          tenantCity: draft.creditor_city || tenantData.invoice_city || '',
          tenantEmail: tenantData.contact_email,
          tenantContactPerson: formatTenantContactPerson(tenantData),
          tenantLogoBase64: logo?.base64 || null,
          tenantLogoFormat: logo?.format,
          customerName: [draft.billing_first_name, draft.billing_last_name].filter(Boolean).join(' ') || studentName,
          studentName: (draft.student?.name || '').trim() || undefined,
          billingCompanyName: draft.billing_company_name || '',
          billingStreet: pdfAddr.billingStreet,
          billingZip: pdfAddr.billingZip,
          billingCity: pdfAddr.billingCity,
          billingEmail: billingEmail || uniqueRecipients[0],
          items: draft.items,
          subtotalRappen: draft.subtotal_rappen || draft.total_amount_rappen,
          discountRappen: draft.discount_amount_rappen || 0,
          vatRate: Number(draft.vat_rate) || 0,
          vatAmountRappen: draft.vat_amount_rappen || 0,
          totalRappen: draft.total_amount_rappen,
          qrCodeDataUrl,
          qrIban: draft.qr_iban || null,
          scorRef: draft.scor_reference || null,
          creditorName: draft.creditor_name || legalName,
          primaryColor: tenantData.primary_color || '#1E40AF',
          secondaryColor: tenantData.secondary_color || '#64748B',
          windowSide: tenantData.invoice_window_side === 'right' ? 'right' : 'left',
          introText: draft.notes || tenantData.invoice_intro_text || null,
          paymentTerms: draft.payment_terms || tenantData.invoice_payment_terms || null,
          footerText: draft.footer_text || tenantData.invoice_footer_text || null,
          appointmentLabel,
        })
        pdfAttachments = [{
          filename: `Rechnung_${invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        }]
      } catch (pdfErr: any) {
        console.warn('⚠️ PDF-Generierung fehlgeschlagen (non-fatal):', pdfErr.message)
      }

      for (const to of uniqueRecipients) {
        await sendEmail({
          to,
          subject: `Rechnung ${invoiceNumber} – ${tenantData.name}`,
          html,
          fromName: tenantData.name,
          fromEmail: tenantData.from_email ?? null,
          domainVerified: !!tenantData.resend_domain_verified,
          attachments: pdfAttachments,
        })
      }
    } catch (emailErr: any) {
      console.warn('⚠️ Rechnungs-E-Mail fehlgeschlagen (non-fatal):', emailErr.message)
    }
  }

  if (sendEmailFlag && !skipAdminNotify) {
    try {
      const adminEmail = tenantData.contact_email || actor.email
      if (adminEmail) {
        const adminHtml = generateAdminInvoiceNotification({
          invoiceNumber,
          studentName,
          studentEmail: uniqueRecipients.join(', ') || billingEmail || '–',
          totalRappen: draft.total_amount_rappen,
          itemCount: draft.items.length,
          staffName,
          tenantName: tenantData.name,
          clientLabel,
          itemCountLabel: appointmentCountLabel(terms, draft.items.length),
        })
        await sendEmail({
          to: adminEmail,
          subject: `📄 Neue Rechnung ${invoiceNumber} für ${studentName}`,
          html: adminHtml,
          fromName: tenantData.name,
          fromEmail: tenantData.from_email ?? null,
          domainVerified: !!tenantData.resend_domain_verified,
        })
      }
    } catch (adminEmailErr: any) {
      console.warn('⚠️ Admin-E-Mail fehlgeschlagen (non-fatal):', adminEmailErr.message)
    }
  }

  if (adminAlertHtml && sendEmailFlag) {
    try {
      const adminEmail = tenantData.contact_email || actor.email
      if (adminEmail) {
        await sendEmail({
          to: adminEmail,
          subject: adminAlertSubject || `⚠️ Rechnung ${invoiceNumber} – Hinweis`,
          html: adminAlertHtml,
          fromName: tenantData.name,
          fromEmail: tenantData.from_email ?? null,
          domainVerified: !!tenantData.resend_domain_verified,
          attachments: pdfAttachments,
        })
      }
    } catch (alertErr: any) {
      console.warn('⚠️ Admin-Alert fehlgeschlagen (non-fatal):', alertErr.message)
    }
  }

  return {
    success: true,
    invoice_id: invoice.id,
    invoice_number: invoiceNumber,
    total_amount_rappen: draft.total_amount_rappen,
    emailed_to: uniqueRecipients,
  }
}
