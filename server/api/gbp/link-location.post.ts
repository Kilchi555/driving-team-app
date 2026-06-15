import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * POST /api/gbp/link-location
 * Manually links a GBP location to the tenant's connection.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { gbpAccountName, gbpLocationId, gbpLocationName } = await readBody(event) as {
    gbpAccountName: string
    gbpLocationId: string
    gbpLocationName: string
  }

  if (!gbpAccountName || !gbpLocationId) {
    throw createError({ statusCode: 400, statusMessage: 'gbpAccountName and gbpLocationId required' })
  }

  const { error } = await getSupabaseAdmin()
    .from('tenant_google_connections')
    .update({ gbp_account_name: gbpAccountName, gbp_location_id: gbpLocationId, gbp_location_name: gbpLocationName ?? null })
    .eq('tenant_id', authUser.tenant_id)

  if (error) throw createError({ statusCode: 500, statusMessage: 'DB update failed' })

  return { ok: true }
})
