import { defineEventHandler, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { canSoftDeleteAccountingEntry } from '~/server/utils/accounting'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event, { write: true })
  const supabase = getSupabaseAdmin()
  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID fehlt' })

  const { data: existing } = await supabase
    .from('accounting_entries')
    .select('id, locked_at, linked_payment_id, storno_of_id, created_at')
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .is('deleted_at', null)
    .single()

  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Eintrag nicht gefunden' })

  if (!canSoftDeleteAccountingEntry(existing)) {
    throw createError({
      statusCode: 403,
      statusMessage: existing.linked_payment_id
        ? 'Aus Zahlungen erzeugte Buchungen können nicht gelöscht werden. Bitte eine Storno-Buchung erstellen.'
        : 'Diese Buchung kann nicht mehr gelöscht werden. Bitte eine Storno-Buchung erstellen (OR Art. 957a).',
    })
  }

  const { error } = await supabase
    .from('accounting_entries')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true }
})
