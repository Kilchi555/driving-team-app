import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * GET /api/staff/get-courses
 * Returns all courses for the authenticated user's tenant.
 * Used in admin affiliate reward configuration.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const supabaseAdmin = getSupabaseAdmin()
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!profile || !['admin', 'super_admin', 'staff'].includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Staff access required' })
  }

  const { data, error } = await supabaseAdmin
    .from('courses')
    .select('id, name, category, start_date')
    .eq('tenant_id', profile.tenant_id)
    .order('start_date', { ascending: false })

  if (error) throw createError({ statusCode: 500, message: error.message })

  return { success: true, data: data ?? [] }
})
