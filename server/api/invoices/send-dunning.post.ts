// server/api/invoices/send-dunning.post.ts
// Versendet eine Zahlungserinnerung/Mahnung für eine Rechnung, protokolliert
// sie in invoice_dunning_log und aktualisiert den Mahnstatus der Rechnung.
// Hängt ein professionelles Mahnschreiben-PDF an die E-Mail an.
// Optional wird die Mahngebühr automatisch als Rechnungsposition hinzugefügt
// und der Rechnungsbetrag entsprechend erhöht (siehe dunning_settings.add_fee_to_invoice_total).
//
// Body: { invoiceId, stage, language?, overrideSubject?, overrideBody?, overrideFeeRappen? }

import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'
import { prepareDunning } from '~/server/utils/invoice-dunning-send'
import { generateDunningPdf, dunningPdfFilename } from '~/server/utils/dunning-pdf'
import { loadTenantLogoForPdf } from '~/server/utils/tenant-logo-for-pdf'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()
  const body = await readBody(event)

  if (!body?.invoiceId || !body?.stage) {
    throw createError({ statusCode: 400, statusMessage: 'invoiceId und stage sind erforderlich' })
  }

  const prepared = await prepareDunning(supabase, {
    invoiceId: body.invoiceId,
    tenantId: profile.tenant_id,
    stage: body.stage,
    staffUserId: profile.id,
    language: body.language,
    overrideSubject: body.overrideSubject,
    overrideBody: body.overrideBody,
    overrideFeeRappen: body.overrideFeeRappen,
  })

  const stage = Number(body.stage)
  const currentLevelBefore = prepared.invoice.dunning_level || 0
  const MAX_STAGE = 3

  // Eine bereits versendete (oder niedrigere) Stufe darf nicht erneut gewählt
  // werden (z.B. keine zweite "Zahlungserinnerung" nach einer bereits
  // versendeten). Der Admin darf aber frei zwischen allen höheren Stufen
  // wählen (z.B. direkt "2. Mahnung" statt "1. Mahnung", falls gewünscht).
  // Einzige Ausnahme: an der höchsten Stufe darf dieselbe Stufe erneut
  // versendet werden (z.B. für eine weitere Inkasso-Erinnerung).
  const isAllowed = stage > currentLevelBefore || (currentLevelBefore >= MAX_STAGE && stage === MAX_STAGE)
  if (!isAllowed) {
    throw createError({
      statusCode: 409,
      statusMessage: `Für diese Rechnung wurde bereits Mahnstufe ${currentLevelBefore} versendet. Es kann nur eine höhere Stufe (oder erneut Stufe ${MAX_STAGE}) versendet werden.`
    })
  }

  const tenant = prepared.tenant as any
  const invoice = prepared.invoice
  const tenantName = tenant?.name || ''
  const tenantStreet = [tenant?.invoice_street, tenant?.invoice_street_nr].filter(Boolean).join(' ').trim()

  // Professionelles Mahnschreiben-PDF (Anhang) — gleiche Vorlage wie Rechnungs-PDF
  let pdfBuffer: Buffer | null = null
  let pdfName = dunningPdfFilename(prepared.stageDef.label, invoice.invoice_number)
  try {
    const logo = await loadTenantLogoForPdf(tenant?.logo_wide_url)

    pdfBuffer = await generateDunningPdf({
      stage,
      stageLabel: prepared.stageDef.label,
      invoiceNumber: invoice.invoice_number,
      invoiceDate: invoice.invoice_date,
      originalDueDate: invoice.due_date,
      newDueDate: prepared.newDueDateIso,
      overdueDays: prepared.overdueDays,
      bodyText: prepared.bodyText,
      outstandingRappen: prepared.outstandingRappen,
      feeRappen: prepared.feeRappen,
      interestRappen: prepared.interestRappen,
      totalDueRappen: prepared.totalDueRappen,
      tenantName: tenant?.legal_company_name || tenantName,
      tenantStreet: tenantStreet || undefined,
      tenantZip: tenant?.invoice_zip || undefined,
      tenantCity: tenant?.invoice_city || undefined,
      tenantEmail: tenant?.contact_email || undefined,
      tenantLogoBase64: logo?.base64 || null,
      customerName: prepared.customerName,
      billingCompanyName: invoice.billing_company_name || undefined,
      billingStreet: [invoice.billing_street, invoice.billing_street_number].filter(Boolean).join(' ').trim() || undefined,
      billingZip: invoice.billing_zip || undefined,
      billingCity: invoice.billing_city || undefined,
      billingEmail: prepared.billingEmail,
      staffName: prepared.staffName,
      qrCodeDataUrl: prepared.qrCodeDataUrl,
      qrIban: tenant?.qr_iban || null,
      scorRef: prepared.scorRef,
      creditorName: tenant?.legal_company_name || tenantName,
      primaryColor: tenant?.primary_color || undefined,
      windowSide: tenant?.invoice_window_side === 'right' ? 'right' : 'left',
    })
  } catch (pdfErr: any) {
    console.warn('⚠️ Mahnschreiben-PDF konnte nicht erzeugt werden (E-Mail geht ohne Anhang):', pdfErr?.message)
  }

  let sendError: string | null = null
  try {
    await sendEmail({
      to: prepared.billingEmail,
      subject: prepared.subject,
      html: prepared.bodyHtml,
      fromName: tenantName,
      fromEmail: tenant?.from_email ?? null,
      domainVerified: tenant?.resend_domain_verified ?? false,
      attachments: pdfBuffer
        ? [{ filename: pdfName, content: pdfBuffer }]
        : undefined,
    })
  } catch (e: any) {
    sendError = e?.message || 'E-Mail-Versand fehlgeschlagen'
  }

  await supabase.from('invoice_dunning_log').insert({
    invoice_id: body.invoiceId,
    tenant_id: profile.tenant_id,
    stage,
    stage_key: prepared.stageDef.key,
    template_id: prepared.templateId,
    sent_to: prepared.billingEmail,
    subject: prepared.subject,
    body_html: prepared.bodyHtml,
    body_text: prepared.bodyText,
    fee_rappen: prepared.feeRappen,
    interest_rappen: prepared.interestRappen,
    outstanding_amount_rappen: prepared.outstandingRappen,
    new_due_date: prepared.newDueDateIso,
    status: sendError ? 'failed' : 'sent',
    error_message: sendError,
    sent_by: profile.id,
  })

  if (sendError) {
    throw createError({ statusCode: 502, statusMessage: `Mahnung konnte nicht versendet werden: ${sendError}` })
  }

  const invoiceUpdate: Record<string, any> = {
    dunning_level: Math.max(currentLevelBefore, stage),
    last_dunning_sent_at: new Date().toISOString(),
    dunning_due_date: prepared.newDueDateIso,
  }

  if (prepared.settings.add_fee_to_invoice_total && prepared.feeRappen > 0) {
    const { data: maxSortRow } = await supabase
      .from('invoice_items')
      .select('sort_order')
      .eq('invoice_id', body.invoiceId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    await supabase.from('invoice_items').insert({
      invoice_id: body.invoiceId,
      product_name: `Mahngebühr – ${prepared.stageDef.label}`,
      product_description: null,
      quantity: 1,
      unit_price_rappen: prepared.feeRappen,
      total_price_rappen: prepared.feeRappen,
      vat_rate: 0,
      vat_amount_rappen: 0,
      sort_order: (maxSortRow?.sort_order ?? 0) + 1,
      notes: 'Mahngebühr',
    })

    invoiceUpdate.subtotal_rappen = (prepared.invoice.subtotal_rappen || 0) + prepared.feeRappen
    invoiceUpdate.dunning_fees_rappen = (prepared.invoice.dunning_fees_rappen || 0) + prepared.feeRappen
  }

  const { error: updateError } = await supabase
    .from('invoices')
    .update(invoiceUpdate)
    .eq('id', body.invoiceId)

  if (updateError) {
    console.error('⚠️ Mahnung versendet, aber Update der Rechnung fehlgeschlagen:', updateError)
  }

  return {
    success: true,
    invoiceNumber: prepared.invoice.invoice_number,
    sentTo: prepared.billingEmail,
    stage,
    feeAddedRappen: prepared.settings.add_fee_to_invoice_total ? prepared.feeRappen : 0,
    newDunningLevel: Math.max(currentLevelBefore, stage),
    pdfAttached: !!pdfBuffer,
  }
})
