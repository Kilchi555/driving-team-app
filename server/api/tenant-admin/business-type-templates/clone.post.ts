// POST /api/tenant-admin/business-type-templates/clone
// Body: { sourceCode: string, targetCode: string }
// Clones template categories, event types and the business_type_presets row
// from an existing business type onto a new one. Used by the "create from
// existing type" flow in the super-admin dashboard so a new business type
// never starts out with zero defaults (the original bug this whole system
// was built to prevent).
// Super-admin only. Only ever touches template rows (tenant_id IS NULL).

import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)

  const body = await readBody(event)
  const sourceCode = String(body?.sourceCode || '').trim()
  const targetCode = String(body?.targetCode || '').trim()

  if (!sourceCode || !targetCode) {
    throw createError({ statusCode: 400, statusMessage: 'sourceCode and targetCode are required' })
  }
  if (sourceCode === targetCode) {
    throw createError({ statusCode: 400, statusMessage: 'sourceCode and targetCode must differ' })
  }

  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()

  const { data: targetType, error: targetErr } = await supabase
    .from('business_types').select('code').eq('code', targetCode).maybeSingle()
  if (targetErr || !targetType) {
    throw createError({ statusCode: 404, statusMessage: `Business type '${targetCode}' does not exist yet — create it first` })
  }

  const [{ data: cats }, { data: ets }, { data: preset }] = await Promise.all([
    supabase.from('categories').select('*').is('tenant_id', null).eq('business_type', sourceCode),
    supabase.from('event_types').select('*').is('tenant_id', null).eq('business_type', sourceCode),
    supabase.from('business_type_presets').select('feature_flags, ui_labels, defaults').eq('business_type_code', sourceCode).maybeSingle(),
  ])

  let categoriesCloned = 0
  let eventTypesCloned = 0

  if (cats?.length) {
    const idMap = new Map<number, number>()
    const parents = cats.filter(c => !c.parent_category_id)
    const children = cats.filter(c => !!c.parent_category_id)

    if (parents.length > 0) {
      const { data: inserted, error } = await supabase.from('categories').insert(
        parents.map(({ id: _id, ...c }) => ({ ...c, business_type: targetCode, tenant_id: null, created_at: now, updated_at: now }))
      ).select('id')
      if (error) throw createError({ statusCode: 500, statusMessage: `Clone categories failed: ${error.message}` })
      parents.forEach((c, i) => { if (inserted?.[i]) idMap.set(c.id, inserted[i].id) })
      categoriesCloned += parents.length
    }
    if (children.length > 0) {
      const { error } = await supabase.from('categories').insert(
        children.map(({ id: _id, ...c }) => ({
          ...c,
          business_type: targetCode,
          tenant_id: null,
          parent_category_id: idMap.get(c.parent_category_id) ?? null,
          created_at: now,
          updated_at: now,
        }))
      )
      if (error) throw createError({ statusCode: 500, statusMessage: `Clone sub-categories failed: ${error.message}` })
      categoriesCloned += children.length
    }
  }

  if (ets?.length) {
    const { error } = await supabase.from('event_types').insert(
      ets.map(({ id: _id, ...et }) => ({ ...et, id: crypto.randomUUID(), business_type: targetCode, tenant_id: null, created_at: now, updated_at: now }))
    )
    if (error) throw createError({ statusCode: 500, statusMessage: `Clone event types failed: ${error.message}` })
    eventTypesCloned = ets.length
  }

  if (preset) {
    await supabase.from('business_type_presets').upsert({
      business_type_code: targetCode,
      feature_flags: preset.feature_flags || {},
      ui_labels: preset.ui_labels || {},
      defaults: preset.defaults || {},
    }, { onConflict: 'business_type_code' })
  }

  return { success: true, categoriesCloned, eventTypesCloned, presetCloned: !!preset }
})
