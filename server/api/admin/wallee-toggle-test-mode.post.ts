/**
 * POST /api/admin/wallee-toggle-test-mode
 *
 * Super-admin only. Enables or disables wallee_test_mode for a tenant.
 * When test mode is active, new transactions use the WALLEE_TEST_* credentials.
 * Existing pending transactions in the production space continue to work via
 * the space-aware webhook credential resolution.
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { invalidateWalleeConfigCache } from '~/server/utils/wallee-config'
import { clearProviderCache } from '~/server/payment-providers/factory'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (authUser.role !== 'super_admin') {
    throw createError({ statusCode: 403, statusMessage: 'Super-Admin role required' })
  }

  const { tenant_id, test_mode } = await readBody(event)

  if (!tenant_id) throw createError({ statusCode: 400, statusMessage: 'tenant_id erforderlich' })
  if (typeof test_mode !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'test_mode (boolean) erforderlich' })
  }

  const supabase = getSupabaseAdmin()

  const { error } = await supabase
    .from('tenants')
    .update({ wallee_test_mode: test_mode, updated_at: new Date().toISOString() })
    .eq('id', tenant_id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  invalidateWalleeConfigCache(tenant_id)
  clearProviderCache(tenant_id)

  return {
    success: true,
    message: test_mode
      ? 'Test-Modus aktiviert — neue Zahlungen laufen über Test-Space'
      : 'Test-Modus deaktiviert — neue Zahlungen laufen wieder über Produktions-Space',
  }
})
