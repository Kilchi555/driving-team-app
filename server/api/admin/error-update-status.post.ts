/**
 * POST /api/admin/error-update-status
 *
 * Update the triage status of an error_logs entry (open/investigating/fixed/ignored).
 * `super_admin` can update any entry; `admin` only entries for their own tenant.
 */
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

const ALLOWED_STATUSES = ['open', 'new', 'investigating', 'fixed', 'ignored']

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'super_admin'])
  const body = await readBody(event)
  const errorId = body?.errorId as string
  const status = body?.status as string

  if (!errorId || !status || !ALLOWED_STATUSES.includes(status)) {
    throw createError({ statusCode: 400, statusMessage: 'errorId and a valid status are required' })
  }

  const supabase = getSupabaseAdmin()

  let updateQuery = supabase
    .from('error_logs')
    .update({
      status,
      updated_at: new Date().toISOString(),
      resolved_at: status === 'fixed' ? new Date().toISOString() : null
    })
    .eq('id', errorId)

  if (profile.role !== 'super_admin') {
    updateQuery = updateQuery.eq('tenant_id', profile.tenant_id)
  }

  const { error } = await updateQuery

  if (error) {
    logger.error('ErrorUpdateStatusAPI', 'Failed to update error status:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to update error status' })
  }

  return { success: true }
})
