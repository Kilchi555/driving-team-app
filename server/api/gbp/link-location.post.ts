import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { linkGbpLocation } from '~/server/utils/gbp'

/**
 * POST /api/gbp/link-location
 * Links a real GBP location (from Google APIs) to the tenant.
 * Rejects Place-ID style values.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const body = await readBody(event) as {
    gbpAccountName?: string
    gbpLocationId?: string
    gbpLocationName?: string
    // legacy UI field names
    accountName?: string
    locationId?: string
    title?: string
  }

  const gbpAccountName = body.gbpAccountName || body.accountName
  const gbpLocationId = body.gbpLocationId || body.locationId
  const title = body.gbpLocationName || body.title || null

  if (!gbpAccountName || !gbpLocationId) {
    throw createError({ statusCode: 400, statusMessage: 'gbpAccountName and gbpLocationId required' })
  }

  try {
    const location = await linkGbpLocation(authUser.tenant_id, {
      gbpAccountName,
      gbpLocationId,
      title,
    })
    return {
      ok: true,
      location: {
        id: location.id,
        title: location.title,
        gbpAccountName: location.gbp_account_name,
        gbpLocationId: location.gbp_location_id,
      },
    }
  } catch (err: any) {
    throw createError({ statusCode: 400, statusMessage: err.message || 'Failed to link location' })
  }
})
