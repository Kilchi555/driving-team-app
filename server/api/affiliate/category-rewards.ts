import { defineEventHandler, readBody, createError, getQuery } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

async function getAdminProfile(event: any) {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const supabaseAdmin = getSupabaseAdmin()
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }
  return { profile, supabaseAdmin }
}

/**
 * GET    /api/affiliate/category-rewards        → list all category rewards for tenant
 * POST   /api/affiliate/category-rewards        → upsert a category reward
 * DELETE /api/affiliate/category-rewards?id=…   → delete a category reward
 */
export default defineEventHandler(async (event) => {
  const { profile, supabaseAdmin } = await getAdminProfile(event)

  if (event.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('affiliate_category_rewards')
      .select('id, driving_category, reward_rappen, is_active, updated_at')
      .eq('tenant_id', profile.tenant_id)
      .order('driving_category', { ascending: true })

    if (error) throw createError({ statusCode: 500, message: error.message })
    return { success: true, data: data ?? [] }
  }

  if (event.method === 'POST') {
    const body = await readBody(event)
    const { driving_category, reward_rappen, is_active } = body

    if (!driving_category || reward_rappen === undefined) {
      throw createError({ statusCode: 400, message: 'driving_category and reward_rappen are required' })
    }

    const { data, error } = await supabaseAdmin
      .from('affiliate_category_rewards')
      .upsert({
        tenant_id: profile.tenant_id,
        driving_category: String(driving_category).trim().toUpperCase(),
        reward_rappen: Math.max(0, parseInt(reward_rappen, 10)),
        is_active: is_active !== false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id,driving_category' })
      .select()
      .single()

    if (error) throw createError({ statusCode: 500, message: error.message })
    return { success: true, data }
  }

  if (event.method === 'DELETE') {
    const query = getQuery(event)
    const id = query.id as string
    if (!id) throw createError({ statusCode: 400, message: 'id is required' })

    const { error } = await supabaseAdmin
      .from('affiliate_category_rewards')
      .delete()
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)

    if (error) throw createError({ statusCode: 500, message: error.message })
    return { success: true }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
