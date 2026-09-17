import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

const ALLOWED_ROLES = ['admin', 'staff', 'super_admin', 'tenant_admin']
const ALLOWED_STAGES = ['first', 'second', 'final'] as const

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

/**
 * Stamp reminder metadata on a payment after a staff reminder send.
 * Replaces browser JWT/PostgREST UPDATEs of public.payments (C5).
 * Does not accept monetary columns.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, tenant_id, role, is_active')
    .eq('auth_user_id', authUser.id)
    .single()

  if (profileError || !profile || profile.is_active === false) {
    throw createError({ statusCode: 403, statusMessage: 'User profile not found' })
  }
  if (!ALLOWED_ROLES.includes(profile.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Staff or admin role required' })
  }

  const body = await readBody(event)
  const paymentId = typeof body?.paymentId === 'string' ? body.paymentId : ''
  const stage = typeof body?.stage === 'string' ? body.stage : ''
  const channels = asRecord(body?.channels)

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid payment ID' })
  }
  if (!ALLOWED_STAGES.includes(stage as (typeof ALLOWED_STAGES)[number])) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid reminder stage' })
  }

  const { data: payment, error: loadError } = await supabase
    .from('payments')
    .select('id, tenant_id, metadata')
    .eq('id', paymentId)
    .eq('tenant_id', profile.tenant_id)
    .maybeSingle()

  if (loadError || !payment) {
    throw createError({ statusCode: 404, statusMessage: 'Payment not found' })
  }

  const existingMeta = asRecord(payment.metadata)
  const history = Array.isArray(existingMeta.reminder_history)
    ? existingMeta.reminder_history
    : []
  const now = new Date().toISOString()
  const enabledChannels = Object.keys(channels).filter((key) => channels[key] === true)

  const { error: updateError } = await supabase
    .from('payments')
    .update({
      last_reminder_sent_at: now,
      last_reminder_stage: stage,
      metadata: {
        ...existingMeta,
        reminder_history: [
          ...history,
          {
            stage,
            sent_at: now,
            channels: enabledChannels,
          },
        ],
      },
    })
    .eq('id', payment.id)
    .eq('tenant_id', profile.tenant_id)

  if (updateError) {
    logger.error('❌ record-payment-reminder update failed:', updateError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to record reminder' })
  }

  return { success: true }
})
