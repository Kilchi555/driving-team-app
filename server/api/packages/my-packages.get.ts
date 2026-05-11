import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

/**
 * GET /api/packages/my-packages
 * Returns active lesson packages for the authenticated user.
 * Used by the booking confirmation page.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()

  const { data: userProfile } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!userProfile) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('customer_packages')
    .select(`
      id,
      lessons_total,
      lessons_used,
      expires_at,
      purchased_at,
      lesson_packages(id, name, category_code, color)
    `)
    .eq('user_id', userProfile.id)
    .eq('tenant_id', userProfile.tenant_id)
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('purchased_at')

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Filter: only packages with remaining lessons
  const active = (data || []).filter((cp: any) => cp.lessons_used < cp.lessons_total)
  return { success: true, packages: active }
})
