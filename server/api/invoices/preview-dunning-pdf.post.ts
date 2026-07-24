// server/api/invoices/preview-dunning-pdf.post.ts
// Erzeugt ein Mahnschreiben-PDF als Vorschau (ohne Versand / ohne Log-Eintrag).
// Nutzt dieselbe prepareDunning-Pipeline wie der tatsächliche Versand.
// Body: { invoiceId, stage, overrideBody?, overrideFeeRappen? }

import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { prepareDunning } from '~/server/utils/invoice-dunning-send'
import { generateDunningPdf, dunningPdfFilename } from '~/server/utils/dunning-pdf'
import { uploadPdfAndGetPublicUrl } from '~/server/utils/upload-pdf-public'
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

  const tenant = prepared.tenant as any
  const invoice = prepared.invoice
  const tenantName = tenant?.name || ''
  const tenantStreet = [tenant?.invoice_street, tenant?.invoice_street_nr].filter(Boolean).join(' ').trim()
  const stage = Number(body.stage)
  const logo = await loadTenantLogoForPdf(tenant?.logo_wide_url)

  const pdfBuffer = await generateDunningPdf({
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

  const filename = `Vorschau_${dunningPdfFilename(prepared.stageDef.label, invoice.invoice_number)}`
  const { pdfUrl } = await uploadPdfAndGetPublicUrl(supabase, {
    folder: 'dunning-preview',
    filename,
    pdfBuffer,
  })

  return {
    success: true,
    pdfUrl,
    filename,
    stageLabel: prepared.stageDef.label,
    preview: true,
  }
})
