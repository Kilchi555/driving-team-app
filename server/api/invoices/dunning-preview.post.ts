// server/api/invoices/dunning-preview.post.ts
// Rendert Betreff/Text/HTML für eine geplante Mahnung, ohne sie zu versenden.
// Body: { invoiceId, stage, language?, overrideSubject?, overrideBody?, overrideFeeRappen? }

import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
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

  return {
    subject: prepared.subject,
    bodyText: prepared.bodyText,
    bodyHtml: prepared.bodyHtml,
    billingEmail: prepared.billingEmail,
    outstandingRappen: prepared.outstandingRappen,
    feeRappen: prepared.feeRappen,
    interestRappen: prepared.interestRappen,
    totalDueRappen: prepared.totalDueRappen,
    overdueDays: prepared.overdueDays,
    newDueDate: prepared.newDueDateIso,
    stageLabel: prepared.stageDef.label,
  }
})
