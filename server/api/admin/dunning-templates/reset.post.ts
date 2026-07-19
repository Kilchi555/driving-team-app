// server/api/admin/dunning-templates/reset.post.ts
// Setzt die Vorlage einer Mahnstufe für den Tenant auf den Plattform-Standard
// zurück, indem die eigene (angepasste) Vorlagen-Zeile gelöscht wird.
// Body: { stage, language? }

import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()
  const { stage, language = 'de' } = await readBody(event)

  if (![1, 2, 3].includes(Number(stage))) {
    throw createError({ statusCode: 400, statusMessage: 'stage muss 1, 2 oder 3 sein' })
  }

  const { error } = await supabase
    .from('dunning_templates')
    .delete()
    .eq('tenant_id', profile.tenant_id)
    .eq('stage', Number(stage))
    .eq('language', language)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true }
})
