import { createError, defineEventHandler, readBody } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { parseManualCreditTopup } from '~/server/utils/manual-credit-topup'
import { applyStudentCreditDelta } from '~/server/utils/student-credit-ledger'
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
    const result = await applyStudentCreditDelta(supabase, {
      userId: target.id,
      tenantId: profile.tenant_id,
      deltaRappen: parsed.amountRappen,
      transactionType: 'deposit',
      notes: parsed.note,
      description: `Manuelle Guthaben-Aufladung: ${parsed.note}`,
      referenceType: 'manual',
      referenceId: null,
      createdBy: profile.id,
      paymentMethod: 'manual',
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
        amount_rappen: parsed.amountRappen,
        note: parsed.note,
        balance_before_rappen: result.balanceBeforeRappen,
        balance_after_rappen: result.balanceAfterRappen,
        transaction_id: result.transactionId,
      },
    }, event)

    return {
      success: true,
      balance_rappen: result.balanceAfterRappen,
      credited_rappen: parsed.amountRappen,
    }
  } catch (error: any) {
    logger.error('❌ Manual credit top-up failed', { userId, error: error?.message })
    await logAudit({
      user_id: profile.id,
      auth_user_id: profile.auth_user_id,
      action: 'manual_credit_topup',
      resource_type: 'student_credit',
      resource_id: userId,
      status: 'error',
      tenant_id: profile.tenant_id,
      error_message: error?.message || 'failed',
    }, event)
    throw createError({
      statusCode: 500,
      statusMessage: 'Guthaben konnte nicht aufgeladen werden.',
    })
  }
})
