import { defineEventHandler, readBody, createError } from 'h3'
import { Wallee } from 'wallee'
import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { STAFF_ADMIN_ROLES } from '~/server/utils/require-staff-or-internal'
import { getWalleeConfigForTenant, getWalleeSDKConfig } from '~/server/utils/wallee-config'
import {
  capturedAmountRappenFromTx,
  expectedChargeRappen,
  merchantReferenceMatchesPayment,
  walleeCapturedCoversExpected,
} from '~/server/utils/wallee-payment-sync'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const userProfile = authUser.db_user_id
    ? { id: authUser.db_user_id, tenant_id: authUser.tenant_id, role: authUser.role || '' }
    : null

  if (!userProfile?.id || !userProfile.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'User profile not found' })
  }

  const body = await readBody(event)
  const { payment_id, wallee_transaction_id } = body

  if (!payment_id || !wallee_transaction_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: payment_id, wallee_transaction_id'
    })
  }

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('id, tenant_id, user_id, payment_status, wallee_transaction_id, metadata, total_amount_rappen, credit_used_rappen')
    .eq('id', payment_id)
    .eq('tenant_id', userProfile.tenant_id)
    .single()

  if (paymentError || !payment) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Payment not found'
    })
  }

  const isPrivileged = (STAFF_ADMIN_ROLES as readonly string[]).includes(userProfile.role)
  const isOwner = payment.user_id === userProfile.id

  if (!isPrivileged && !isOwner) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden – insufficient permissions'
    })
  }

  // Clients may only attach a tx id when none is set yet (or it already matches).
  // Never allow overwriting an existing different Wallee id (hijack / double-charge risk).
  if (
    payment.wallee_transaction_id &&
    String(payment.wallee_transaction_id) !== String(wallee_transaction_id)
  ) {
    if (!isPrivileged) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden – cannot overwrite existing Wallee transaction id'
      })
    }
    if (['completed', 'authorized'].includes(payment.payment_status || '')) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Cannot change Wallee transaction id on a paid payment'
      })
    }
  }

  if (
    payment.wallee_transaction_id &&
    String(payment.wallee_transaction_id) === String(wallee_transaction_id)
  ) {
    return {
      success: true,
      data: {
        id: payment.id,
        payment_status: payment.payment_status,
        wallee_transaction_id: payment.wallee_transaction_id,
        tenant_id: payment.tenant_id,
      }
    }
  }

  const { data: otherPayment } = await supabase
    .from('payments')
    .select('id')
    .eq('wallee_transaction_id', String(wallee_transaction_id))
    .neq('id', payment_id)
    .maybeSingle()

  if (otherPayment) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Wallee transaction is already linked to another payment'
    })
  }

  const walleeConfig = await getWalleeConfigForTenant(userProfile.tenant_id)
  const spaceId = walleeConfig.spaceId
  const config = getWalleeSDKConfig(spaceId, walleeConfig.userId, walleeConfig.apiSecret)
  const transactionService: Wallee.api.TransactionService = new Wallee.api.TransactionService(config)

  let tx: any = {}
  try {
    const response = await transactionService.read(spaceId, parseInt(String(wallee_transaction_id), 10))
    tx = (response as any)?.body || response || {}
  } catch (err: any) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Wallee transaction could not be verified'
    })
  }

  if (!merchantReferenceMatchesPayment(tx?.merchantReference, payment_id)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Wallee merchant reference does not match this payment'
    })
  }

  const expected = expectedChargeRappen(payment)
  const captured = capturedAmountRappenFromTx(tx)
  if (!walleeCapturedCoversExpected(captured, expected, { requireKnownAmount: !isPrivileged })) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Wallee-Betrag stimmt nicht mit der Zahlung überein'
    })
  }

  let updateQuery = supabase
    .from('payments')
    .update({
      wallee_transaction_id,
      checkout_status: 'created',
      checkout_merchant_reference: `payment-${payment_id}`,
      metadata: {
        ...(payment.metadata || {}),
        wallee_transaction_id
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', payment_id)
    .is('wallee_transaction_id', null)

  const { data: updatedPayment, error: updateError } = await updateQuery
    .select('id, payment_status, wallee_transaction_id, tenant_id')
    .maybeSingle()

  if (updateError) {
    console.error('Error updating payment with Wallee transaction ID:', updateError)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update payment'
    })
  }

  if (!updatedPayment) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Payment already has a Wallee transaction id'
    })
  }

  return {
    success: true,
    data: updatedPayment
  }
})
