import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * GET /api/gbp/status
 * Returns the GBP connection status for the current tenant.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { data, error } = await getSupabaseAdmin()
    .from('tenant_google_connections')
    .select('google_account_email, gbp_location_name, gbp_account_name, connected_at')
    .eq('tenant_id', authUser.tenant_id)
    .single()

  if (error || !data) return { connected: false }

  return {
    connected: true,
    email: data.google_account_email,
    locationName: data.gbp_location_name,
    accountName: data.gbp_account_name,
    connectedAt: data.connected_at,
  }
})
