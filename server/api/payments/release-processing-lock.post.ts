// POST /api/payments/release-processing-lock
// After a cancelled/failed Wallee redirect, release the caller's optimistic
// processing locks back to pending so "Jetzt bezahlen" is available again.
// Never marks payments completed — webhook-only for paid status.

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'
import { logAudit } from '~/server/utils/audit'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const userId = authUser.db_user_id
  const tenantId = authUser.tenant_id
  if (!userId || !tenantId) {
    throw createError({ statusCode: 404, statusMessage: 'User data not found' })
  }

  const body = await readBody(event).catch(() => ({} as any))
  const paymentId = typeof body?.paymentId === 'string' ? body.paymentId : null

  const supabase = getSupabaseAdmin()

  let query = supabase
    .from('payments')
    .update({
      payment_status: 'pending',
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('payment_status', 'processing')

  if (paymentId) {
    query = query.eq('id', paymentId)
  }

  const { data, error } = await query.select('id')

  if (error) {
    logger.error('❌ release-processing-lock failed:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to release processing lock' })
  }

  const releasedIds = (data || []).map((p: any) => p.id)
  if (releasedIds.length > 0) {
    logger.info('🔓 Released processing locks after payment abort', {
      userId,
      count: releasedIds.length,
      paymentIds: releasedIds
    })
    await logAudit({
      action: 'payment_processing_lock_released',
      user_id: userId,
      tenant_id: tenantId,
      resource_type: 'payment',
      resource_id: releasedIds[0],
      status: 'success',
      details: { released_ids: releasedIds, source: 'client_abort' }
    }).catch(() => {})
  }

  return {
    success: true,
    released: releasedIds.length,
    paymentIds: releasedIds
  }
})
