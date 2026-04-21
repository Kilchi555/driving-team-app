// server/api/tenants/template-categories.get.ts
// Returns template categories (tenant_id IS NULL) filtered by business_type
// Used during tenant registration to show pre-selected categories

import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const businessType = (query.business_type as string) || 'driving_school'

  const supabase = getSupabaseAdmin()

  const { data: categories, error } = await supabase
    .from('categories')
    .select('id, name, code, description, color, icon, parent_category_id, display_order, business_type')
    .is('tenant_id', null)
    .eq('is_active', true)
    .or(`business_type.eq.${businessType},business_type.is.null`)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Fehler beim Laden der Kategorien: ${error.message}` })
  }

  // Build tree structure: parent categories with their children
  const parents = (categories || []).filter(c => !c.parent_category_id)
  const children = (categories || []).filter(c =>  c.parent_category_id)

  const tree = parents.map(p => ({
    ...p,
    children: children.filter(c => c.parent_category_id === p.id)
  }))

  return { categories: tree, flat: categories || [] }
})
