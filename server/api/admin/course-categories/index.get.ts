import { defineEventHandler } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * GET /api/admin/course-categories
 * Returns all active course categories for the authenticated admin's tenant.
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('course_categories')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .order('sort_order', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { categories: data ?? [] }
})
