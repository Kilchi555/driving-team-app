import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getGbpLocationIdFromEvent } from '~/server/utils/gbp-location-param'

/**
 * GET /api/gbp/media?locationId=&approved=
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const locationId = getGbpLocationIdFromEvent(event)
  const { approved } = getQuery(event) as { approved?: string }

  let q = getSupabaseAdmin()
    .from('gbp_media_assets')
    .select('*')
    .eq('tenant_id', authUser.tenant_id)
    .order('created_at', { ascending: false })
    .limit(100)

  // Pool assets: location-specific OR tenant-wide (location_id null)
  if (locationId) {
    q = q.or(`location_id.eq.${locationId},location_id.is.null`)
  }
  if (approved === 'true') q = q.eq('approved', true)
  if (approved === 'false') q = q.eq('approved', false)

  const { data, error } = await q
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { assets: data ?? [] }
})
