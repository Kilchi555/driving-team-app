/**
 * POST /api/admin/wallee-save-test-credentials
 *
 * Super-admin only. Saves a parallel set of Wallee test credentials for a tenant
 * in tenant_secrets under the WALLEE_TEST_* keys. These credentials are used
 * when wallee_test_mode = true, while existing production credentials remain intact.
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { encryptSecret } from '~/server/utils/encryption'
import { invalidateWalleeConfigCache } from '~/server/utils/wallee-config'
import { clearProviderCache } from '~/server/payment-providers/factory'
import { ensureWalleeWebhook } from '~/server/utils/wallee-webhook-setup'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (authUser.role !== 'super_admin') {
    throw createError({ statusCode: 403, statusMessage: 'Super-Admin role required' })
  }

  const { tenant_id, wallee_space_id, wallee_user_id, wallee_secret_key } = await readBody(event)

  if (!tenant_id) throw createError({ statusCode: 400, statusMessage: 'tenant_id erforderlich' })
  if (!wallee_space_id || !wallee_user_id) {
    throw createError({ statusCode: 400, statusMessage: 'wallee_space_id und wallee_user_id erforderlich' })
  }
  if (!wallee_secret_key?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'wallee_secret_key (API Secret) ist erforderlich' })
  }

  const supabase = getSupabaseAdmin()

  const secretsToUpsert = [
    { secret_name: 'wallee_test_space_id',   secret_value: String(wallee_space_id) },
    { secret_name: 'wallee_test_user_id',    secret_value: String(wallee_user_id) },
    { secret_name: 'wallee_test_secret_key', secret_value: wallee_secret_key.trim() },
  ].map(({ secret_name, secret_value }) => ({
    tenant_id,
    secret_type: 'wallee_api_key',
    secret_name,
    secret_value: encryptSecret(secret_value),
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('tenant_secrets')
    .upsert(secretsToUpsert, { onConflict: 'tenant_id,secret_type,secret_name' })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Test-Credentials konnten nicht gespeichert werden: ${error.message}` })
  }

  invalidateWalleeConfigCache(tenant_id)
  clearProviderCache(tenant_id)

  // Auto-register our webhook in the test space (non-fatal if it fails)
  let webhookMessage = ''
  try {
    const webhookResult = await ensureWalleeWebhook(
      parseInt(wallee_space_id),
      parseInt(wallee_user_id),
      wallee_secret_key.trim(),
    )
    webhookMessage = webhookResult.skipped
      ? ' (Webhook bereits vorhanden)'
      : webhookResult.success
        ? ' (Webhook registriert)'
        : ` (Webhook-Warnung: ${webhookResult.message})`
  } catch (webhookErr: any) {
    console.error(`⚠️ Webhook-Registrierung fehlgeschlagen (non-fatal): ${webhookErr?.message}`)
    webhookMessage = ' (Webhook konnte nicht registriert werden – bitte manuell)'
  }

  return { success: true, message: `Test-Credentials gespeichert${webhookMessage}` }
})
