/**
 * F-03 — Resolve who may get/save customer payment method tokens.
 *
 * Unauthenticated callers must not pass arbitrary userId/tenantId.
 * Webhook/internal callers must present a verified internal secret and are
 * bound to the payment row for the Wallee transaction (not bare body IDs).
 * Session callers must own the payment / token scope via db user + tenant.
 */
import { createError, type H3Event } from 'h3'
import { getAuthenticatedUserWithDbId } from '~/server/utils/auth'
import { isInternalSecretRequest } from '~/server/utils/require-staff-or-internal'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export type PaymentTokenActor =
  | { mode: 'internal'; userId: string; tenantId: string; transactionId: string }
  | { mode: 'owner'; userId: string; tenantId: string; transactionId?: string }

function requireNonEmptyString(value: unknown, field: string): string {
  const s = typeof value === 'string' ? value.trim() : value != null ? String(value).trim() : ''
  if (!s) {
    throw createError({ statusCode: 400, statusMessage: `Missing required field: ${field}` })
  }
  return s
}

async function loadPaymentForTransaction(transactionId: string) {
  const supabase = getSupabaseAdmin()
  const txn = String(transactionId)

  const { data, error } = await supabase
    .from('payments')
    .select('id, user_id, tenant_id, wallee_transaction_id')
    .eq('wallee_transaction_id', txn)
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to look up payment for transaction',
    })
  }

  return data
}

/**
 * Authorize save-payment-token.
 * - Internal: x-internal-secret + payment row for transactionId (body user/tenant ignored for identity)
 * - Owner: authenticated session; payment must belong to session user+tenant
 */
export async function authorizeSavePaymentToken(
  event: H3Event,
  body: { transactionId?: unknown; userId?: unknown; tenantId?: unknown }
): Promise<PaymentTokenActor> {
  const transactionId = requireNonEmptyString(body?.transactionId, 'transactionId')

  if (isInternalSecretRequest(event)) {
    const payment = await loadPaymentForTransaction(transactionId)
    if (!payment?.user_id || !payment?.tenant_id) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Payment not found for transaction',
      })
    }
    return {
      mode: 'internal',
      userId: payment.user_id,
      tenantId: payment.tenant_id,
      transactionId,
    }
  }

  const user = await getAuthenticatedUserWithDbId(event)
  if (!user?.id || !user.tenant_id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required',
    })
  }

  const payment = await loadPaymentForTransaction(transactionId)
  if (!payment?.user_id || !payment?.tenant_id) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Payment not found for transaction',
    })
  }

  if (payment.user_id !== user.id || payment.tenant_id !== user.tenant_id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
    })
  }

  return {
    mode: 'owner',
    userId: user.id,
    tenantId: user.tenant_id,
    transactionId,
  }
}

/**
 * Authorize get-user-payment-token — session owner only.
 * Body userId/tenantId are ignored; identity comes from the session.
 */
export async function authorizeGetUserPaymentToken(event: H3Event): Promise<{
  mode: 'owner'
  userId: string
  tenantId: string
}> {
  const user = await getAuthenticatedUserWithDbId(event)
  if (!user?.id || !user.tenant_id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required',
    })
  }

  return {
    mode: 'owner',
    userId: user.id,
    tenantId: user.tenant_id,
  }
}
