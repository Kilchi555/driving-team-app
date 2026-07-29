import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { resolveGbpLocation } from '~/server/utils/gbp'
import { getGbpLocationIdFromEvent } from '~/server/utils/gbp-location-param'

/**
 * GET /api/gbp/analysis
 * Returns the most recent stored audit for a location, if any (no fresh Google/AI calls).
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const locationId = getGbpLocationIdFromEvent(event)
  try {
    const loc = await resolveGbpLocation(authUser.tenant_id, locationId)
    const { data, error } = await getSupabaseAdmin()
      .from('gbp_audits')
      .select('overall_score, result, created_at')
      .eq('tenant_id', authUser.tenant_id)
      .eq('location_id', loc.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    if (!data) return { success: true, audit: null }
    return { success: true, audit: { ...data.result, overallScore: data.overall_score, generatedAt: data.created_at } }
  } catch (err: any) {
    if (err?.statusCode) throw err
    throw createError({ statusCode: 502, statusMessage: err?.message || 'Analyse konnte nicht geladen werden' })
  }
})
