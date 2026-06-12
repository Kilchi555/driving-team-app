import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * DELETE /api/gbp/disconnect
 * Removes the GBP connection for the current tenant.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { error } = await getSupabaseAdmin()
    .from('tenant_google_connections')
    .delete()
    .eq('tenant_id', authUser.tenant_id)

  if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to disconnect GBP' })

  return { success: true }
})
