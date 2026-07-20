// GET /api/tenant-admin/business-types
// Lists all business types (incl. inactive) for the super-admin UI.
// Cookie/Bearer auth — does not rely on a client-side supabase-js session.

import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('business_types')
    .select('code, name, description, is_active')
    .order('name')

  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Fehler beim Laden: ${error.message}` })
  }

  return { businessTypes: data || [] }
})
