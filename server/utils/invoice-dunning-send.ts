// server/utils/invoice-dunning-send.ts
// Orchestriert das Laden aller Daten, die für eine Zahlungserinnerung/Mahnung
// nötig sind (Rechnung, Tenant, Vorlage, Einstellungen) und rendert Betreff,
// Text und HTML. Wird sowohl von der Vorschau- als auch der Versand-Route
// genutzt, damit Vorschau und tatsächlicher Versand exakt übereinstimmen.

import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'
import {
  DUNNING_SETTINGS_DEFAULTS, DunningSettingsRow, getStageDef, daysOverdue,
  feeRappenForStage, computeInterestRappen, buildDunningPlaceholders,
  renderDunningText, buildDunningEmailHtml, formatChf,
} from '~/server/utils/invoice-dunning'

export interface PrepareDunningOptions {
  invoiceId: string
  tenantId: string
  stage: number
  staffUserId?: string | null
  language?: string
  /** Optionale Overrides aus der Vorschau (Admin passt Text vor dem Versand noch an) */
  overrideSubject?: string
  overrideBody?: string
  overrideFeeRappen?: number
}

export async function prepareDunning(supabase: SupabaseClient, opts: PrepareDunningOptions) {
  const stage = Number(opts.stage)
  const stageDef = getStageDef(stage)
  if (!stageDef) throw createError({ statusCode: 400, statusMessage: 'Ungültige Mahnstufe' })

  const language = opts.language || 'de'

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices_with_details')
    .select('*')
    .eq('id', opts.invoiceId)
    .single()
  if (invoiceError || !invoice) throw createError({ statusCode: 404, statusMessage: 'Rechnung nicht gefunden' })
  if (invoice.tenant_id !== opts.tenantId) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  // invoices_with_details wurde vor Einführung des Mahnwesens erstellt (SELECT i.*
  // wird beim Anlegen der View fixiert) und enthält die neuen dunning_*-Spalten
  // daher (noch) nicht. Ergänzend direkt aus invoices nachladen.
  const { data: dunningCols } = await supabase
    .from('invoices')
    .select('dunning_level, last_dunning_sent_at, dunning_paused, dunning_fees_rappen, subtotal_rappen')
    .eq('id', opts.invoiceId)
    .single()
  if (dunningCols) Object.assign(invoice, dunningCols)

  const billingEmail = invoice.billing_email || invoice.customer_email
  if (!billingEmail) throw createError({ statusCode: 422, statusMessage: 'Keine E-Mail-Adresse für diese Rechnung hinterlegt' })

  const [{ data: tenant }, { data: tenantSettings }, { data: platformSettings }, { data: tenantTemplate }, { data: platformTemplate }, staffNamePromise] = await Promise.all([
    supabase.from('tenants').select('name, legal_company_name, contact_email, primary_color, secondary_color, qr_iban, invoice_street, invoice_street_nr, invoice_zip, invoice_city, from_email, resend_domain_verified, logo_wide_url, invoice_window_side').eq('id', opts.tenantId).single(),
    supabase.from('dunning_settings').select('*').eq('tenant_id', opts.tenantId).maybeSingle(),
    supabase.from('dunning_settings').select('*').is('tenant_id', null).maybeSingle(),
    supabase.from('dunning_templates').select('*').eq('tenant_id', opts.tenantId).eq('stage', stage).eq('language', language).maybeSingle(),
    supabase.from('dunning_templates').select('*').is('tenant_id', null).eq('stage', stage).eq('language', language).maybeSingle(),
    opts.staffUserId
      ? supabase.from('users').select('first_name, last_name').eq('id', opts.staffUserId).maybeSingle()
      : Promise.resolve({ data: null } as any),
  ])

  const settings: DunningSettingsRow = { ...DUNNING_SETTINGS_DEFAULTS, ...(platformSettings || {}), ...(tenantSettings || {}) }
  const template = tenantTemplate || platformTemplate
  if (!template) throw createError({ statusCode: 500, statusMessage: 'Keine Mahnvorlage gefunden' })

  const tenantName = (tenant as any)?.name || ''
  const staffName = staffNamePromise?.data
    ? `${staffNamePromise.data.first_name || ''} ${staffNamePromise.data.last_name || ''}`.trim()
    : tenantName

  const outstandingRappen = Math.max(0, (invoice.total_amount_rappen || 0) - (invoice.paid_amount_rappen || 0))
  const overdueDays = Math.max(0, daysOverdue(invoice.due_date))
  const feeRappen = opts.overrideFeeRappen ?? feeRappenForStage(settings, stage)
  const interestRappen = settings.apply_interest
    ? computeInterestRappen(outstandingRappen, settings.interest_rate_percent, overdueDays)
    : 0

  const newDueDate = new Date()
  newDueDate.setDate(newDueDate.getDate() + (settings.new_due_days || 10))
  const newDueDateIso = newDueDate.toISOString().slice(0, 10)

  const customerName = invoice.billing_contact_person ||
    `${invoice.customer_first_name || ''} ${invoice.customer_last_name || ''}`.trim() || 'Kunde'

  const placeholders = buildDunningPlaceholders({
    customerName,
    invoiceNumber: invoice.invoice_number,
    invoiceDate: invoice.invoice_date,
    dueDate: invoice.due_date,
    outstandingRappen,
    overdueDays,
    feeRappen,
    interestRappen,
    newDueDate: newDueDateIso,
    staffName,
    tenantName,
  })

  const subjectTemplate = opts.overrideSubject ?? template.subject
  const bodyTemplate = opts.overrideBody ?? template.body

  const subject = renderDunningText(subjectTemplate, placeholders)
  const bodyText = renderDunningText(bodyTemplate, placeholders)
  const totalDueRappen = outstandingRappen + feeRappen + interestRappen

  // QR-Code für schnelle Zahlung (optional, best effort)
  let qrCodeDataUrl: string | null = null
  let scorRef: string | null = null
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
        debtor_street_nr: invoice.billing_street_number || '',
        debtor_zip: invoice.billing_zip || '',
        debtor_city: invoice.billing_city || '',
        amount_rappen: totalDueRappen,
        reference: paymentRef,
        additional_info: `${stageDef.label} Rechnung ${invoice.invoice_number}`,
      })
    } catch { /* QR optional */ }
  }

  const bodyHtml = buildDunningEmailHtml({
    stageLabel: stageDef.label,
    stage,
    bodyText,
    invoiceNumber: invoice.invoice_number,
    outstandingRappen,
    feeRappen,
    interestRappen,
    totalDueRappen,
    newDueDate: newDueDateIso,
    tenantName,
    primaryColor: (tenant as any)?.primary_color || null,
    qrCodeDataUrl,
    qrIban,
    creditorName: (tenant as any)?.legal_company_name || tenantName,
    scorRef,
  })

  return {
    invoice,
    tenant,
    stageDef,
    templateId: template.id || null,
    subject,
    bodyText,
    bodyHtml,
    billingEmail,
    outstandingRappen,
    feeRappen,
    interestRappen,
    totalDueRappen,
    overdueDays,
    newDueDateIso,
    settings,
    placeholders,
    formattedTotalDue: formatChf(totalDueRappen),
    staffName,
    customerName,
    qrCodeDataUrl,
    scorRef,
  }
}
