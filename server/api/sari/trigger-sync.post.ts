/**
 * POST /api/sari/trigger-sync
 * Manually trigger a SARI course sync for the authenticated tenant
 */

import { getSupabaseServerWithSession } from '~/utils/supabase'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { SARIClient } from '~/utils/sariClient'
import { SARISyncEngine } from '~/server/utils/sari-sync-engine'
import { getTenantSecretsSecure } from '~/server/utils/get-tenant-secrets-secure'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseServerWithSession(event)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const supabaseAdmin = getSupabaseAdmin()

  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('tenant_id, role')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!userData) {
    throw createError({ statusCode: 403, statusMessage: 'User not found' })
  }

  if (!['admin', 'superadmin'].includes(userData.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Nur Admins können den Sync manuell auslösen' })
  }

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, name, sari_enabled, sari_environment')
    .eq('id', userData.tenant_id)
    .single()

  if (!tenant?.sari_enabled) {
    throw createError({ statusCode: 400, statusMessage: 'SARI ist für diesen Tenant nicht aktiviert' })
  }

  let sariSecrets
  try {
    sariSecrets = await getTenantSecretsSecure(
      userData.tenant_id,
      ['SARI_CLIENT_ID', 'SARI_CLIENT_SECRET', 'SARI_USERNAME', 'SARI_PASSWORD'],
      'MANUAL_SYNC_TRIGGER'
    )
  } catch (err: any) {
    throw createError({ statusCode: 400, statusMessage: 'SARI-Zugangsdaten nicht konfiguriert' })
  }

  const sari = new SARIClient({
    environment: (tenant.sari_environment || 'test') as 'test' | 'production',
    clientId: sariSecrets.SARI_CLIENT_ID,
    clientSecret: sariSecrets.SARI_CLIENT_SECRET,
    username: sariSecrets.SARI_USERNAME,
    password: sariSecrets.SARI_PASSWORD,
  })

  const syncEngine = new SARISyncEngine(supabaseAdmin, sari, userData.tenant_id)

  logger.info(`🔄 Manual SARI sync triggered by ${user.id} for tenant ${tenant.name}`)

  const [vkuResult, pgsResult] = await Promise.all([
    syncEngine.syncAllCourses('VKU'),
    syncEngine.syncAllCourses('PGS'),
  ])

  await supabaseAdmin
    .from('tenants')
    .update({ sari_last_sync_at: new Date().toISOString() })
    .eq('id', userData.tenant_id)

  return {
    success: true,
    vku: { synced: vkuResult.synced_count, errors: vkuResult.error_count },
    pgs: { synced: pgsResult.synced_count, errors: pgsResult.error_count },
    total_synced: vkuResult.synced_count + pgsResult.synced_count,
    synced_at: new Date().toISOString(),
  }
})
