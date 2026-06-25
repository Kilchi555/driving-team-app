/**
 * POST /api/admin/wallee-promote-test-credentials
 *
 * Super-admin only. Promotes the current WALLEE_TEST_* credentials to become
 * the new production credentials (WALLEE_*), then disables test mode.
 * Use this when the test phase is complete and the new space should go live.
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { encryptSecret, decryptSecret } from '~/server/utils/encryption'
import { invalidateWalleeConfigCache } from '~/server/utils/wallee-config'
import { clearProviderCache } from '~/server/payment-providers/factory'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (authUser.role !== 'super_admin') {
    throw createError({ statusCode: 403, statusMessage: 'Super-Admin role required' })
  }

  const { tenant_id } = await readBody(event)
  if (!tenant_id) throw createError({ statusCode: 400, statusMessage: 'tenant_id erforderlich' })

  const supabase = getSupabaseAdmin()

  // 1. Load test credentials from tenant_secrets
  const { data: testSecrets, error: loadError } = await supabase
    .from('tenant_secrets')
    .select('secret_name, secret_value')
    .eq('tenant_id', tenant_id)
    .eq('secret_type', 'wallee_test_api_key')

  if (loadError) throw createError({ statusCode: 500, statusMessage: loadError.message })

  const byName = Object.fromEntries(
    (testSecrets || []).map(s => [s.secret_name, s.secret_value])
  )

  const testSpaceIdEncrypted  = byName['wallee_test_space_id']
  const testUserIdEncrypted   = byName['wallee_test_user_id']
  const testSecretKeyEncrypted = byName['wallee_test_secret_key']

  if (!testSpaceIdEncrypted || !testUserIdEncrypted || !testSecretKeyEncrypted) {
    throw createError({ statusCode: 400, statusMessage: 'Keine vollständigen Test-Credentials gefunden. Bitte zuerst Test-Credentials speichern.' })
  }

  // 2. Decrypt test credentials
  const spaceId   = parseInt(decryptSecret(testSpaceIdEncrypted), 10)
  const userId    = parseInt(decryptSecret(testUserIdEncrypted), 10)
  const secretKey = decryptSecret(testSecretKeyEncrypted)

  if (isNaN(spaceId) || isNaN(userId) || !secretKey) {
    throw createError({ statusCode: 500, statusMessage: 'Ungültige Test-Credentials (können nicht konvertiert werden)' })
  }

  // 3. Overwrite production credentials with test credentials
  const prodSecrets = [
    { secret_name: 'wallee_space_id',   secret_value: String(spaceId) },
    { secret_name: 'wallee_user_id',    secret_value: String(userId) },
    { secret_name: 'wallee_secret_key', secret_value: secretKey },
  ].map(({ secret_name, secret_value }) => ({
    tenant_id,
    secret_type: 'wallee_api_key',
    secret_name,
    secret_value: encryptSecret(secret_value),
    updated_at: new Date().toISOString(),
  }))

  const { error: upsertError } = await supabase
    .from('tenant_secrets')
    .upsert(prodSecrets, { onConflict: 'tenant_id,secret_type,secret_name' })

  if (upsertError) {
    throw createError({ statusCode: 500, statusMessage: `Fehler beim Übertragen der Credentials: ${upsertError.message}` })
  }

  // 4. Update tenants table with new space/user IDs and disable test mode
  const { error: tenantError } = await supabase
    .from('tenants')
    .update({
      wallee_space_id:   spaceId,
      wallee_user_id:    userId,
      wallee_test_mode:  false,
      updated_at:        new Date().toISOString(),
    })
    .eq('id', tenant_id)

  if (tenantError) throw createError({ statusCode: 500, statusMessage: tenantError.message })

  // 5. Invalidate caches
  invalidateWalleeConfigCache(tenant_id)
  clearProviderCache(tenant_id)

  logger.info(`✅ [wallee-promote] Test credentials promoted to production for tenant ${tenant_id} (space ${spaceId})`)

  return {
    success: true,
    message: `Test-Credentials erfolgreich als Produktions-Credentials übernommen (Space ${spaceId}). Test-Modus deaktiviert.`,
    newSpaceId: spaceId,
  }
})
