import { defineEventHandler, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getTenantSecretsSecure } from '~/server/utils/get-tenant-secrets-secure'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  // sari_enabled / sari_environment still live on tenants
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('sari_enabled, sari_environment')
    .eq('id', profile.tenant_id)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Credentials were migrated to tenant_secrets — load & decrypt them
  let credentials: Record<string, string> = {}
  try {
    credentials = await getTenantSecretsSecure(
      profile.tenant_id,
      ['SARI_CLIENT_ID', 'SARI_CLIENT_SECRET', 'SARI_USERNAME', 'SARI_PASSWORD'],
      'ADMIN_SARI_SETTINGS'
    )
  } catch {
    // Credentials not yet configured — return empty strings so form shows as blank
  }

  return {
    sari_enabled: tenant?.sari_enabled ?? false,
    sari_environment: tenant?.sari_environment ?? 'test',
    sari_client_id: credentials.SARI_CLIENT_ID ?? '',
    sari_client_secret: credentials.SARI_CLIENT_SECRET ?? '',
    sari_username: credentials.SARI_USERNAME ?? '',
    sari_password: credentials.SARI_PASSWORD ?? '',
  }
})
