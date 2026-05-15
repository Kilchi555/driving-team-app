import { defineEventHandler, createError, getRouterParam } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)
  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid category id' })
  }

  // Verify ownership and get category code
  const { data: category, error: fetchError } = await supabase
    .from('categories')
    .select('id, code, tenant_id')
    .eq('id', id)
    .single()

  if (fetchError || !category) {
    throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  }

  if (category.tenant_id !== profile.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden – category does not belong to your tenant' })
  }

  // Delete pricing rules first
  await supabase
    .from('pricing_rules')
    .delete()
    .eq('category_code', category.code)
    .eq('tenant_id', profile.tenant_id)

  // Delete category
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true }
})
