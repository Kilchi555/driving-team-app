import { createError, defineEventHandler, isError, readBody } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { parseManualCreditTopup, parseManualTopupIdempotencyKey } from '~/server/utils/manual-credit-topup'
import { applyManualCreditTopup, ManualTopupRejected } from '~/server/utils/apply-manual-credit-topup'
import { logAudit } from '~/server/utils/audit'
import { logger } from '~/utils/logger'

const ADMIN_ROLES = ['admin', 'tenant_admin', 'super_admin', 'superadmin']

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ADMIN_ROLES)
  const body = await readBody(event)
  const parsed = parseManualCreditTopup({
    amountRappen: body?.amount_rappen,
    note: body?.note,
  })
  if (!parsed.ok) {
    throw createError({ statusCode: 400, statusMessage: parsed.error })
  }
  const idempotency = parseManualTopupIdempotencyKey(body?.idempotency_key)
  if (!idempotency.ok) {
    throw createError({ statusCode: 400, statusMessage: idempotency.error })
  }

  const userId = body?.user_id
  if (typeof userId !== 'string' || !/^[0-9a-f-]{36}$/i.test(userId)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Kunden-ID.' })
  }

  const supabase = getSupabaseAdmin()
  const { data: target, error: targetError } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('id', userId)
    .maybeSingle()

  if (targetError || !target) {
    throw createError({ statusCode: 404, statusMessage: 'Kunde nicht gefunden.' })
  }
  if (target.tenant_id !== profile.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Kunde gehört zu einem anderen Mandanten.' })
  }
  if (!['client', 'customer'].includes(target.role)) {
    throw createError({ statusCode: 400, statusMessage: 'Guthaben kann nur für Privatkunden aufgeladen werden.' })
  }

  try {
    const result = await applyManualCreditTopup(supabase, {
      userId: target.id,
      tenantId: profile.tenant_id,
      idempotencyKey: idempotency.key,
      amountRappen: parsed.amountRappen,
      note: parsed.note,
      createdBy: profile.id,
    })

    await logAudit({
      user_id: profile.id,
      auth_user_id: profile.auth_user_id,
      action: 'manual_credit_topup',
      resource_type: 'student_credit',
      resource_id: target.id,
      status: 'success',
      tenant_id: profile.tenant_id,
      details: {
        amount_rappen: result.creditedRappen,
        note: parsed.note,
        balance_rappen: result.balanceRappen,
        transaction_id: result.transactionId,
        idempotency_key: idempotency.key,
        replayed: result.replayed,
      },
    }, event)

    return {
      success: true,
      balance_rappen: result.balanceRappen,
      credited_rappen: result.creditedRappen,
      replayed: result.replayed,
    }
  } catch (error: unknown) {
    if (isError(error)) throw error
    if (error instanceof ManualTopupRejected && error.statusCode < 500) {
      throw createError({ statusCode: error.statusCode, statusMessage: error.message })
    }
    const message = error instanceof Error ? error.message : 'failed'
    logger.error('❌ Manual credit top-up failed', { userId, error: message })
    await logAudit({
      user_id: profile.id,
      auth_user_id: profile.auth_user_id,
      action: 'manual_credit_topup',
      resource_type: 'student_credit',
      resource_id: userId,
      status: 'error',
      tenant_id: profile.tenant_id,
      error_message: message,
    }, event)
    throw createError({
      statusCode: error instanceof ManualTopupRejected ? error.statusCode : 500,
      statusMessage: 'Guthaben konnte nicht aufgeladen werden.',
    })
  }
})
