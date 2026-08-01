// POST /api/correspondence/send — create (or update draft) + email PDF

import { readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { allocateCorrespondenceNumber } from '~/server/utils/allocate-correspondence-number'
import { uploadPdfAndGetPublicUrl } from '~/server/utils/upload-pdf-public'
import { sendEmail } from '~/server/utils/email'
import {
  requireCorrespondenceStaff,
  resolveRecipientSnapshot,
  buildCorrespondencePdfFromRow,
  buildCorrespondenceEmailHtml,
  todayZurichDate,
} from '~/server/utils/correspondence'

export default defineEventHandler(async (event) => {
  const staff = await requireCorrespondenceStaff(event)
  const body = await readBody(event) || {}
  const supabase = getSupabaseAdmin()

  let row: any = null

  if (body.id) {
    const { data, error } = await supabase
      .from('correspondence')
      .select('*')
      .eq('id', body.id)
      .eq('tenant_id', staff.tenant_id)
      .single()
    if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Correspondence not found' })
    row = data

    // Allow last-minute edits on draft before send
    if (row.status === 'draft') {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() }
      if (body.subject != null) updates.subject = String(body.subject).trim()
      if (body.body != null) updates.body = String(body.body).trim()
      if (body.salutation != null) updates.salutation = body.salutation
      if (body.closing != null) updates.closing = body.closing
      if (body.their_reference != null) updates.their_reference = body.their_reference
      if (body.letter_date != null) updates.letter_date = body.letter_date
      if (body.document_title != null) updates.document_title = body.document_title

      if (body.user_id || body.company_id) {
        const snapshot = await resolveRecipientSnapshot(supabase, staff.tenant_id, {
          user_id: body.user_id ?? row.user_id,
          company_id: body.company_id ?? row.company_id,
        })
        Object.assign(updates, {
          user_id: snapshot.user_id,
          company_id: snapshot.company_id,
          recipient_name: snapshot.recipient_name,
          billing_company_name: snapshot.billing_company_name || null,
          billing_street: snapshot.billing_street || null,
          billing_zip: snapshot.billing_zip || null,
          billing_city: snapshot.billing_city || null,
          billing_email: snapshot.billing_email || null,
        })
      }

      const { data: updated, error: updErr } = await supabase
        .from('correspondence')
        .update(updates)
        .eq('id', row.id)
        .select('*')
        .single()
      if (updErr || !updated) {
        throw createError({ statusCode: 500, statusMessage: updErr?.message || 'Update failed' })
      }
      row = updated
    }
  } else {
    const subject = String(body.subject || '').trim()
    const letterBody = String(body.body || '').trim()
    if (!subject) throw createError({ statusCode: 400, statusMessage: 'subject required' })
    if (!letterBody) throw createError({ statusCode: 400, statusMessage: 'body required' })

    const snapshot = await resolveRecipientSnapshot(supabase, staff.tenant_id, {
      user_id: body.user_id || null,
      company_id: body.company_id || null,
    })

    const referenceNumber = body.our_reference?.trim()
      ? String(body.our_reference).trim()
      : await allocateCorrespondenceNumber(supabase, staff.tenant_id)

    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('correspondence')
      .insert({
        tenant_id: staff.tenant_id,
        user_id: snapshot.user_id,
        company_id: snapshot.company_id,
        reference_number: referenceNumber,
        document_title: body.document_title || 'BRIEF',
        subject,
        body: letterBody,
        salutation: body.salutation || null,
        closing: body.closing || 'Freundliche Grüsse',
        their_reference: body.their_reference || null,
        letter_date: body.letter_date || todayZurichDate(),
        status: 'draft',
        recipient_name: snapshot.recipient_name,
        billing_company_name: snapshot.billing_company_name || null,
        billing_street: snapshot.billing_street || null,
        billing_zip: snapshot.billing_zip || null,
        billing_city: snapshot.billing_city || null,
        billing_email: snapshot.billing_email || null,
        created_by: staff.id,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single()

    if (error || !data) {
      throw createError({ statusCode: 500, statusMessage: error?.message || 'Failed to create correspondence' })
    }
    row = data
  }

  const sendEmailFlag = body.send_email !== false
  const toEmail = (body.to_email || row.billing_email || '').trim()
  if (sendEmailFlag && !toEmail) {
    throw createError({ statusCode: 400, statusMessage: 'Keine E-Mail-Adresse für den Empfänger' })
  }

  const signerName = [staff.first_name, staff.last_name].filter(Boolean).join(' ')
  const { pdfBuffer, tenantName, tenant } = await buildCorrespondencePdfFromRow(supabase, row, { signerName })
  const filename = `Brief_${row.reference_number}.pdf`
  const { pdfUrl } = await uploadPdfAndGetPublicUrl(supabase, {
    folder: 'correspondence',
    filename,
    pdfBuffer,
  })

  if (sendEmailFlag) {
    const html = buildCorrespondenceEmailHtml({
      recipientName: row.recipient_name || 'Kunde',
      subject: row.subject,
      body: row.body,
      referenceNumber: row.reference_number,
      tenantName,
      primaryColor: tenant?.primary_color,
    })

    await sendEmail({
      to: toEmail,
      subject: `${row.subject} (${row.reference_number})`,
      html,
      fromName: tenantName,
      fromEmail: tenant?.from_email,
      domainVerified: !!tenant?.resend_domain_verified,
      attachments: [{ filename, content: pdfBuffer }],
    })
  }

  const now = new Date().toISOString()
  const { data: sentRow, error: sentErr } = await supabase
    .from('correspondence')
    .update({
      status: 'sent',
      sent_at: now,
      sent_to_email: sendEmailFlag ? toEmail : row.sent_to_email,
      updated_at: now,
    })
    .eq('id', row.id)
    .select('*')
    .single()

  if (sentErr || !sentRow) {
    throw createError({ statusCode: 500, statusMessage: sentErr?.message || 'Failed to mark as sent' })
  }

  return { success: true, data: sentRow, pdfUrl, filename }
})
