// server/api/invoices/send-dunning.post.ts
// Versendet eine Zahlungserinnerung/Mahnung für eine Rechnung, protokolliert
// sie in invoice_dunning_log und aktualisiert den Mahnstatus der Rechnung.
// Optional wird die Mahngebühr automatisch als Rechnungsposition hinzugefügt
// und der Rechnungsbetrag entsprechend erhöht (siehe dunning_settings.add_fee_to_invoice_total).
//
// Body: { invoiceId, stage, language?, overrideSubject?, overrideBody?, overrideFeeRappen? }

import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'
import { prepareDunning } from '~/server/utils/invoice-dunning-send'

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
  const tenantName = (prepared.tenant as any)?.name || ''

  let sendError: string | null = null
  try {
    await sendEmail({
      to: prepared.billingEmail,
      subject: prepared.subject,
      html: prepared.bodyHtml,
      fromName: tenantName,
      fromEmail: (prepared.tenant as any)?.from_email ?? null,
      domainVerified: (prepared.tenant as any)?.resend_domain_verified ?? false,
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

  const currentLevel = prepared.invoice.dunning_level || 0
  const invoiceUpdate: Record<string, any> = {
    dunning_level: Math.max(currentLevel, stage),
    last_dunning_sent_at: new Date().toISOString(),
  }

  // Mahngebühr optional als Rechnungsposition + Totalanpassung übernehmen
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
      product_description: 'Automatisch durch das Mahnwesen hinzugefügt',
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
    newDunningLevel: Math.max(currentLevel, stage),
  }
})
