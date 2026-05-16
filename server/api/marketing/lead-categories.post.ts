/**
 * POST /api/marketing/lead-categories
 * Create a custom marketing lead category.
 */
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const { tenantId, name, code, color } = await readBody(event)

  if (!tenantId || !name || !code) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId, name and code required' })
  }

  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('lead_categories')
    .insert({ tenant_id: tenantId, name: name.trim(), code: code.trim().toUpperCase(), color: color || '#6366f1' })
    .select('id, code, name, color')
    .single()

  if (error) {
    if (error.code === '23505') throw createError({ statusCode: 409, statusMessage: 'Code bereits vergeben' })
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true, category: data }
})
