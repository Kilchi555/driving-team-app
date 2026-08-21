import { defineEventHandler, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { syncEntryLedger } from '~/server/utils/accounting-ledger-db'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event, { write: true })
  const supabase = getSupabaseAdmin()
  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID fehlt' })

  // Original-Buchung laden
  const { data: original } = await supabase
    .from('accounting_entries')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .is('deleted_at', null)
    .single()

  if (!original) throw createError({ statusCode: 404, statusMessage: 'Buchung nicht gefunden' })

  // Prüfen ob diese Buchung bereits storniert wurde
  const { data: existingStorno } = await supabase
    .from('accounting_entries')
    .select('id')
    .eq('storno_of_id', id)
    .is('deleted_at', null)
    .single()

  if (existingStorno) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Diese Buchung wurde bereits storniert.',
    })
  }

  const today = new Date().toISOString().split('T')[0]

  // Storno-Buchung erstellen (Gegenbuchung mit umgekehrtem Typ)
  const { data: storno, error } = await supabase
    .from('accounting_entries')
    .insert({
      type: original.type === 'expense' ? 'income' : 'expense',
      amount_rappen: original.amount_rappen,
      entry_date: today,
      description: `Storno: ${original.description}`,
      category_id: original.category_id,
      notes: original.notes ?? null,
      document_kind: original.document_kind ?? (original.type === 'income' ? 'debtor' : 'expense'),
      storno_of_id: original.id,
      tenant_id: profile.tenant_id,
    })
    .select(`*, category:accounting_categories(id, name, type, color)`)
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (storno?.id) await syncEntryLedger(supabase, profile.tenant_id, storno.id)

  // Original-Buchung sperren falls noch nicht gesperrt
  if (!original.locked_at) {
    await supabase
      .from('accounting_entries')
      .update({ locked_at: new Date().toISOString() })
      .eq('id', original.id)
  }

  return { success: true, data: storno }
})
