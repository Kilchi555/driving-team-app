/**
 * GET /api/marketing/lead-categories
 * Returns merged categories from:
 * 1. categories table (driving license categories: B, A, BE, C, D...)
 * 2. course_categories table (course types: VKU, CZV, PGS...)
 * 3. lead_categories table (custom marketing categories)
 * Deduplicated by code.
 */
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const { tenantId } = getQuery(event) as { tenantId: string }

  if (!tenantId) throw createError({ statusCode: 400, statusMessage: 'tenantId required' })

  const supabase = getSupabaseAdmin()

  const [
    { data: drivingCats },
    { data: courseCats },
    { data: customCats },
  ] = await Promise.all([
    supabase
      .from('categories')
      .select('code, name, color')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('course_categories')
      .select('code, name, color')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('lead_categories')
      .select('id, code, name, color')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name'),
  ])

  // Merge and deduplicate by code (custom categories take precedence)
  const seen = new Set<string>()
  const result: { code: string; name: string; color: string; source: string; id?: string }[] = []

  for (const cat of (customCats || [])) {
    if (!seen.has(cat.code)) {
      seen.add(cat.code)
      result.push({ ...cat, source: 'custom' })
    }
  }
  for (const cat of (drivingCats || [])) {
    if (!seen.has(cat.code)) {
      seen.add(cat.code)
      result.push({ code: cat.code, name: cat.name, color: cat.color || '#6366f1', source: 'driving' })
    }
  }
  for (const cat of (courseCats || [])) {
    if (!seen.has(cat.code)) {
      seen.add(cat.code)
      result.push({ code: cat.code, name: cat.name, color: cat.color || '#6366f1', source: 'course' })
    }
  }

  return { categories: result }
})
