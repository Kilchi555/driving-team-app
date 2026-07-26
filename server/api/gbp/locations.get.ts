import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { listTenantGbpLocations } from '~/server/utils/gbp'

/**
 * GET /api/gbp/locations
 * Lists linked GBP locations for the current tenant.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const locations = await listTenantGbpLocations(authUser.tenant_id)
  return {
    locations: locations.map((l) => ({
      id: l.id,
      title: l.title,
      gbpAccountName: l.gbp_account_name,
      gbpLocationId: l.gbp_location_id,
    })),
  }
})
