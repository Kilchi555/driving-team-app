import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { resolveGbpLocation } from '~/server/utils/gbp'
import { getGbpLocationIdFromEvent } from '~/server/utils/gbp-location-param'

/**
 * GET /api/gbp/post-calendar?locationId=
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const locationId = getGbpLocationIdFromEvent(event)
  const loc = await resolveGbpLocation(authUser.tenant_id, locationId)
  const supabase = getSupabaseAdmin()

  const { data: upcoming, error } = await supabase
    .from('gbp_post_calendar')
    .select('*')
    .eq('tenant_id', authUser.tenant_id)
    .eq('location_id', loc.id)
    .in('status', ['planned', 'failed'])
    .order('queue_priority', { ascending: false })
    .order('planned_for', { ascending: true })
    .limit(40)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const { count: publishedCount } = await supabase
    .from('gbp_post_calendar')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', authUser.tenant_id)
    .eq('location_id', loc.id)
    .eq('status', 'published')

  return {
    upcoming: upcoming ?? [],
    publishedCount: publishedCount ?? 0,
    nextPublishAt: upcoming?.[0]?.planned_for || null,
  }
})
