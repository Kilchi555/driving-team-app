import { defineEventHandler, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()
  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID fehlt' })

  // Sicherstellen dass der Eintrag zum Mandanten gehört und Sperrung prüfen
  const { data: existing } = await supabase
    .from('accounting_entries')
    .select('id, locked_at')
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .is('deleted_at', null)
    .single()

  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Eintrag nicht gefunden' })

  // OR Art. 957a: Gesperrte Buchungen können nicht gelöscht werden
  if (existing.locked_at) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Diese Buchung ist gesperrt und kann nicht gelöscht werden. Bitte eine Storno-Buchung erstellen.',
    })
  }

  // Soft delete: OR-konform, Daten werden nie physisch gelöscht
  const { error } = await supabase
    .from('accounting_entries')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true }
})
