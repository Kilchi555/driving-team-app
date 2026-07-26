import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getGbpLocationIdFromEvent } from '~/server/utils/gbp-location-param'

/**
 * GET /api/gbp/scheduled-posts?locationId=&status=
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const locationId = getGbpLocationIdFromEvent(event)
  const { status } = getQuery(event) as { status?: string }

  let q = getSupabaseAdmin()
    .from('gbp_scheduled_posts')
    .select('*')
    .eq('tenant_id', authUser.tenant_id)
    .order('scheduled_for', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(50)

  if (locationId) q = q.eq('location_id', locationId)
  if (status) q = q.eq('status', status)

  const { data, error } = await q
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { posts: data ?? [] }
})
