// POST /api/correspondence/preview-pdf — PDF without DB write

import { readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { uploadPdfAndGetPublicUrl } from '~/server/utils/upload-pdf-public'
import {
  requireCorrespondenceStaff,
  resolveRecipientSnapshot,
  buildCorrespondencePdfFromRow,
  todayZurichDate,
} from '~/server/utils/correspondence'

export default defineEventHandler(async (event) => {
  const staff = await requireCorrespondenceStaff(event)
  const body = await readBody(event) || {}

  const subject = String(body.subject || '').trim()
  const letterBody = String(body.body || '').trim()
  if (!subject) throw createError({ statusCode: 400, statusMessage: 'subject required' })
  if (!letterBody) throw createError({ statusCode: 400, statusMessage: 'body required' })

  const supabase = getSupabaseAdmin()
  const snapshot = await resolveRecipientSnapshot(supabase, staff.tenant_id, {
    user_id: body.user_id || null,
    company_id: body.company_id || null,
  })

  // Preview uses a temporary reference (does not consume the counter) unless
  // the client already has a draft reference.
  let referenceNumber = String(body.our_reference || body.reference_number || '').trim()
  if (!referenceNumber) {
    // Soft preview label — do not allocate from DB counter on every keystroke/preview
    const year = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' }).slice(0, 4)
    referenceNumber = `BR-${year}-PREVIEW`
  }

  const signerName = [staff.first_name, staff.last_name].filter(Boolean).join(' ')
  const { pdfBuffer } = await buildCorrespondencePdfFromRow(
    supabase,
    {
      tenant_id: staff.tenant_id,
      reference_number: referenceNumber,
      letter_date: body.letter_date || todayZurichDate(),
      document_title: body.document_title || 'BRIEF',
      subject,
      body: letterBody,
      salutation: body.salutation || null,
      closing: body.closing || 'Freundliche Grüsse',
      their_reference: body.their_reference || null,
      recipient_name: snapshot.recipient_name,
      billing_company_name: snapshot.billing_company_name,
      billing_street: snapshot.billing_street,
      billing_zip: snapshot.billing_zip,
      billing_city: snapshot.billing_city,
    },
    { signerName }
  )

  const filename = `Brief_${referenceNumber}.pdf`
  const { pdfUrl } = await uploadPdfAndGetPublicUrl(supabase, {
    folder: 'correspondence',
    filename,
    pdfBuffer,
  })

  return { success: true, pdfUrl, filename }
})
