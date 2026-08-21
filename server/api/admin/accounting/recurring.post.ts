import { defineEventHandler, readBody, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  documentKindToEntryType,
  inferDocumentKind,
  isAccountingDocumentKind,
} from '~/server/utils/accounting'
import { isRecurringInterval, nextDueDate } from '~/server/utils/accounting-recurring'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event, { write: true })
  const supabase = getSupabaseAdmin()
  const body = await readBody(event)

  if (!isRecurringInterval(body.interval)) {
    throw createError({ statusCode: 400, statusMessage: 'Intervall muss monthly, quarterly oder yearly sein' })
  }
  const document_kind = isAccountingDocumentKind(body.document_kind)
    ? body.document_kind
    : inferDocumentKind({ type: body.type, document_kind: body.document_kind })
  const type = documentKindToEntryType(document_kind)
  const amount = Number(body.amount_rappen ?? 0)
  if (amount <= 0) throw createError({ statusCode: 400, statusMessage: 'Betrag muss > 0 sein' })
  if (!body.description?.trim()) throw createError({ statusCode: 400, statusMessage: 'Beschreibung fehlt' })

  const firstDate = String(body.entry_date || body.next_due_date || '')
  const next_due_date = body.next_due_date || (firstDate ? nextDueDate(firstDate, body.interval) : null)
  if (!next_due_date) throw createError({ statusCode: 400, statusMessage: 'Nächstes Datum fehlt' })

  const { data, error } = await supabase
    .from('accounting_recurring_entries')
    .insert({
      tenant_id: profile.tenant_id,
      interval: body.interval,
      next_due_date,
      ends_on: body.ends_on || null,
      type,
      document_kind,
      amount_rappen: amount,
      description: body.description.trim(),
      category_id: body.category_id || null,
      creditor_name: body.creditor_name || null,
      creditor_iban: body.creditor_iban || null,
      payment_reference: body.payment_reference || null,
      is_paid: !!body.is_paid,
      vat_rate: body.vat_rate ?? null,
      vat_amount_rappen: body.vat_amount_rappen ?? null,
      notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
      created_by: profile.id,
    })
    .select('id, interval, next_due_date, is_active, description, amount_rappen')
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true, data }
})
