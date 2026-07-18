// server/api/tenants/business-types.get.ts
// Public endpoint: returns the active business types for the registration
// dropdown (tenant-register.vue). This is the same allowlist used server-side
// by resolveBusinessType() in server/utils/business-type-presets.ts, so the
// dropdown and the actual validation can never drift apart again.

import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async () => {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('business_types')
    .select('code, name, description')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Fehler beim Laden der Business-Types: ${error.message}` })
  }

  return { businessTypes: data || [] }
})
