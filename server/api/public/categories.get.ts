// server/api/public/categories.get.ts
// Gibt alle Template-Kategorien zurück (tenant_id IS NULL).
// Öffentlich zugänglich – kein Auth erforderlich.
import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async () => {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('categories')
    .select('id, code, name, parent_category_id, color, icon')
    .is('tenant_id', null)
    .eq('is_active', true)
    .order('code')

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Fehler beim Laden der Kategorien' })
  }

  const allCats = data || []

  // Alle IDs die als parent_category_id verwendet werden
  const parentIds = new Set(allCats.map(c => c.parent_category_id).filter(Boolean))

  // Subcategories = Kategorien, die selbst child einer anderen sind
  const subcategories = allCats.filter(c => c.parent_category_id !== null)

  return {
    all: allCats,
    subcategories,
  }
})
