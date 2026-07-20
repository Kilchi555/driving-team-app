// GET /api/tenant-admin/business-type-presets?business_type_code=CON

import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)

  const code = String(getQuery(event).business_type_code || '').trim()
  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'business_type_code is required' })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('business_type_presets')
    .select('feature_flags, ui_labels, defaults')
    .eq('business_type_code', code)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { preset: data || { feature_flags: {}, ui_labels: {}, defaults: {} } }
})
