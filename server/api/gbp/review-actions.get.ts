import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getGbpLocationIdFromEvent } from '~/server/utils/gbp-location-param'

/**
 * GET /api/gbp/review-actions?locationId=&status=suggested
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const locationId = getGbpLocationIdFromEvent(event)
  const { status } = getQuery(event) as { status?: string }

  let q = getSupabaseAdmin()
    .from('gbp_review_actions')
    .select('*')
    .eq('tenant_id', authUser.tenant_id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (locationId) q = q.eq('location_id', locationId)
  if (status) q = q.eq('status', status)
  else q = q.in('status', ['suggested', 'approved', 'failed'])

  const { data, error } = await q
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { actions: data ?? [] }
})
