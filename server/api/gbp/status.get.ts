import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { isFeatureEnabled } from '~/server/utils/require-feature'
import { listTenantGbpLocations } from '~/server/utils/gbp'

/**
 * GET /api/gbp/status
 * Returns GBP connection status + linked locations for the current tenant.
 * When the add-on is not enabled, returns 200 with featureEnabled:false
 * (no 403 — the admin UI uses this to show the upgrade CTA cleanly).
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const featureEnabled = await isFeatureEnabled(authUser.tenant_id, 'gbp_enabled')
  if (!featureEnabled) {
    return { connected: false, featureEnabled: false, locations: [] }
  }

  const { data, error } = await getSupabaseAdmin()
    .from('tenant_google_connections')
    .select('id, google_account_email, gbp_location_name, gbp_account_name, connected_at')
    .eq('tenant_id', authUser.tenant_id)
    .maybeSingle()

  if (error || !data) return { connected: false, featureEnabled: true, locations: [] }

  const locations = await listTenantGbpLocations(authUser.tenant_id)
  const primary = locations[0] || null

  return {
    connected: true,
    featureEnabled: true,
    email: data.google_account_email,
    // Back-compat fields (primary / first location)
    locationName: primary?.title || data.gbp_location_name,
    accountName: primary?.gbp_account_name || data.gbp_account_name,
    connectedAt: data.connected_at,
    locations: locations.map((l) => ({
      id: l.id,
      title: l.title,
      gbpAccountName: l.gbp_account_name,
      gbpLocationId: l.gbp_location_id,
    })),
  }
})
