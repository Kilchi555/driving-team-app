import { defineEventHandler } from 'h3'
import { requireSuperAdmin, getSimyGbpTenantId } from '~/server/utils/require-super-admin'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const tenantId = getSimyGbpTenantId()

  const { data } = await getSupabaseAdmin()
    .from('tenant_google_connections')
    .select('google_account_email, gbp_location_name, gbp_account_name, connected_at')
    .eq('tenant_id', tenantId)
    .single()

  if (!data) return { connected: false }
  return { connected: true, email: data.google_account_email, locationName: data.gbp_location_name, accountName: data.gbp_account_name, connectedAt: data.connected_at }
})
