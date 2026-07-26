import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getGbpAutomationSettings } from '~/server/utils/gbp'

/**
 * GET /api/gbp/settings
 * Returns effective automation settings (tenant defaults + optional location override).
 * Query: ?locationId=<uuid>
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const { locationId, scope } = getQuery(event) as { locationId?: string; scope?: string }
  // scope=tenant → only tenant defaults (no merge with location override)
  if (scope === 'tenant') {
    const settings = await getGbpAutomationSettings(authUser.tenant_id, null)
    return { settings, scope: 'tenant' }
  }

  const settings = await getGbpAutomationSettings(authUser.tenant_id, locationId || null)
  return { settings, scope: locationId ? 'location' : 'effective', locationId: locationId || null }
})
