// POST /api/tenant-admin/business-type-presets
// Upsert feature_flags / ui_labels / defaults for a business type.

import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)

  const body = await readBody(event)
  const businessTypeCode = String(body?.business_type_code || '').trim()
  if (!businessTypeCode) {
    throw createError({ statusCode: 400, statusMessage: 'business_type_code is required' })
  }

  const supabase = getSupabaseAdmin()
  const payload = {
    business_type_code: businessTypeCode,
    feature_flags: body.feature_flags || {},
    ui_labels: body.ui_labels || {},
    defaults: body.defaults || {},
    updated_at: new Date().toISOString(),
  }

  const { data: existing } = await supabase
    .from('business_type_presets')
    .select('id')
    .eq('business_type_code', businessTypeCode)
    .maybeSingle()

  let data
  let error
  if (existing?.id) {
    ;({ data, error } = await supabase
      .from('business_type_presets')
      .update(payload)
      .eq('id', existing.id)
      .select('business_type_code, feature_flags, ui_labels, defaults')
      .single())
  } else {
    ;({ data, error } = await supabase
      .from('business_type_presets')
      .insert({ ...payload, created_at: new Date().toISOString() })
      .select('business_type_code, feature_flags, ui_labels, defaults')
      .single())
  }

  if (error) throw createError({ statusCode: 500, statusMessage: `Preset save failed: ${error.message}` })
  return { preset: data }
})
