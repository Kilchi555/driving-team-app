// POST /api/correspondence/create — save draft + allocate BR reference

import { readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { allocateCorrespondenceNumber } from '~/server/utils/allocate-correspondence-number'
import {
  requireCorrespondenceStaff,
  resolveRecipientSnapshot,
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

  const referenceNumber = body.our_reference?.trim()
    ? String(body.our_reference).trim()
    : await allocateCorrespondenceNumber(supabase, staff.tenant_id)

  const now = new Date().toISOString()
  const insert = {
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
  }

  const { data, error } = await supabase
    .from('correspondence')
    .insert(insert)
    .select('*')
    .single()

  if (error || !data) {
    throw createError({ statusCode: 500, statusMessage: error?.message || 'Failed to create correspondence' })
  }

  return { success: true, data }
})
