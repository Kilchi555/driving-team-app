/**
 * GET /api/admin/wallee-get-space-ids?tenant_id=...
 *
 * Super-admin only. Returns the non-secret Wallee identifiers (space ID + user ID)
 * for both production and test credentials from tenant_secrets.
 * Used to pre-fill the admin modal without exposing the secret key.
 */

import { defineEventHandler, getQuery, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { decryptSecret } from '~/server/utils/encryption'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (authUser.role !== 'super_admin') {
    throw createError({ statusCode: 403, statusMessage: 'Super-Admin role required' })
  }

  const { tenant_id } = getQuery(event)
  if (!tenant_id) throw createError({ statusCode: 400, statusMessage: 'tenant_id erforderlich' })

  const supabase = getSupabaseAdmin()

  const { data: secrets } = await supabase
    .from('tenant_secrets')
    .select('secret_name, secret_value')
    .eq('tenant_id', tenant_id)
    .in('secret_name', ['wallee_space_id', 'wallee_user_id', 'wallee_test_space_id', 'wallee_test_user_id'])

  const byName: Record<string, string> = {}
  for (const s of secrets ?? []) {
    try {
      byName[s.secret_name] = decryptSecret(s.secret_value)
    } catch {}
  }

  return {
    prod: {
      space_id: byName['wallee_space_id'] ?? null,
      user_id:  byName['wallee_user_id']  ?? null,
    },
    test: {
      space_id: byName['wallee_test_space_id'] ?? null,
      user_id:  byName['wallee_test_user_id']  ?? null,
    },
  }
})
