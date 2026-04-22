// server/api/tenants/template-categories.get.ts
// Returns template categories (tenant_id IS NULL) for a given business_type
// Used during tenant registration to show pre-selected categories

import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  const queryParams = getQuery(event)
  const businessType = (queryParams.business_type as string) || 'driving_school'

  const supabase = getSupabaseAdmin()

  // Load all template categories (tenant_id IS NULL)
  const { data: categories, error } = await supabase
    .from('categories')
    .select('id, name, code, description, color, parent_category_id, icon_svg')
    .is('tenant_id', null)
    .eq('is_active', true)
    .order('code', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Fehler beim Laden der Kategorien: ${error.message}` })
  }

  // Build tree: only categories with NULL parent_category_id are roots.
  // Categories with a parent_category_id that doesn't resolve to a template category are orphans
  // (cross-tenant parent reference) and are excluded from the tree entirely.
  const templateIds = new Set((categories || []).map(c => c.id))
  const parents = (categories || []).filter(c => !c.parent_category_id)
  const children = (categories || []).filter(c => !!c.parent_category_id && templateIds.has(c.parent_category_id))

  const tree = parents.map(p => ({
    ...p,
    children: children.filter(c => c.parent_category_id === p.id)
  }))

  return { categories: tree, flat: categories || [] }
})
