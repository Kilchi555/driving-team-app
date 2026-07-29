import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { resolveGbpLocation } from '~/server/utils/gbp'
import { runGbpAudit } from '~/server/utils/gbp-audit'
import { getGbpLocationIdFromEvent } from '~/server/utils/gbp-location-param'

/**
 * POST /api/gbp/analysis
 * Runs a fresh GBP audit (live Google data + AI recommendations) and stores it.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const body = await readBody<{ locationId?: string | null }>(event).catch(() => ({}))
  const locationId = getGbpLocationIdFromEvent(event, body)

  try {
    const supabase = getSupabaseAdmin()
    const [loc, tenant] = await Promise.all([
      resolveGbpLocation(authUser.tenant_id, locationId),
      supabase.from('tenants').select('name').eq('id', authUser.tenant_id).single(),
    ])

    const audit = await runGbpAudit(authUser.tenant_id, tenant.data?.name || 'Fahrschule', loc.id)

    const { overallScore, ...result } = audit
    await supabase.from('gbp_audits').insert({
      tenant_id: authUser.tenant_id,
      location_id: loc.id,
      overall_score: overallScore,
      result,
    })

    return { success: true, audit }
  } catch (err: any) {
    if (err?.statusCode) throw err
    throw createError({ statusCode: 502, statusMessage: err?.message || 'Analyse fehlgeschlagen' })
  }
})
