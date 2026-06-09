import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()
  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID fehlt' })

  const body = await readBody(event)

  // Sicherstellen dass der Eintrag zum Mandanten gehört
  const { data: existing } = await supabase
    .from('accounting_entries')
    .select('id, locked_at')
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .is('deleted_at', null)
    .single()

  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Eintrag nicht gefunden' })

  // OR Art. 957a: Gesperrte Buchungen sind unveränderbar
  if (existing.locked_at) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Diese Buchung ist gesperrt und kann nicht mehr bearbeitet werden. Bitte eine Storno-Buchung erstellen.',
    })
  }

  const allowedFields = [
    'amount_rappen', 'entry_date', 'description', 'category_id',
    'vat_rate', 'vat_amount_rappen', 'creditor_name', 'creditor_iban',
    'payment_reference', 'is_paid', 'paid_date', 'external_reference',
    'receipt_url', 'receipt_filename', 'qr_data',
  ]

  const updates: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field]
  }

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Keine Felder zum Aktualisieren' })
  }

  const { data, error } = await supabase
    .from('accounting_entries')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .select(`*, category:accounting_categories(id, name, type, color)`)
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true, data }
})
