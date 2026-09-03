/**
 * F-03 — Resolve who may get/save customer payment method tokens.
 *
 * Unauthenticated callers must not pass arbitrary userId/tenantId.
 * Webhook/internal callers must present a verified internal secret and are
 * bound to the payment row for the Wallee transaction (not bare body IDs).
 * Session callers must own the payment / token scope via db user + tenant.
 *
 * Lookups are always scoped by tenant_id and/or wallee_space_id — transaction
 * IDs alone collide across Wallee spaces.
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

function optionalString(value: unknown): string | null {
  if (value == null) return null
  const s = String(value).trim()
  return s || null
}

async function loadPaymentForTransaction(opts: {
  transactionId: string
  tenantId?: string | null
  spaceId?: string | null
}) {
  const supabase = getSupabaseAdmin()
  const txn = String(opts.transactionId)

  // Require at least one disambiguator — bare transaction id is not unique across spaces.
  if (!opts.tenantId && !opts.spaceId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'tenantId or spaceId required to resolve payment transaction',
    })
  }

  let query = supabase
    .from('payments')
    .select('id, user_id, tenant_id, wallee_transaction_id, wallee_space_id')
    .eq('wallee_transaction_id', txn)

  if (opts.spaceId) {
    query = query.eq('wallee_space_id', opts.spaceId) as typeof query
  }
  if (opts.tenantId) {
    query = query.eq('tenant_id', opts.tenantId) as typeof query
  }

  const { data, error } = await query.limit(2)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to look up payment for transaction',
    })
  }

  if (!data?.length) return null
  if (data.length > 1) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Ambiguous payment for transaction — refine spaceId/tenantId',
    })
  }

  return data[0]
}

/**
 * Authorize save-payment-token.
 * - Internal: x-internal-secret + payment row scoped by transactionId + tenantId/spaceId
 * - Owner: authenticated session; payment must belong to session user+tenant
 */
export async function authorizeSavePaymentToken(
  event: H3Event,
  body: {
    transactionId?: unknown
    userId?: unknown
    tenantId?: unknown
    spaceId?: unknown
  }
): Promise<PaymentTokenActor> {
  const transactionId = requireNonEmptyString(body?.transactionId, 'transactionId')
  const spaceId = optionalString(body?.spaceId)
  const tenantHint = optionalString(body?.tenantId)

  if (isInternalSecretRequest(event)) {
    const payment = await loadPaymentForTransaction({
      transactionId,
      tenantId: tenantHint,
      spaceId,
    })
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

  const payment = await loadPaymentForTransaction({
    transactionId,
    tenantId: user.tenant_id,
    spaceId,
  })
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
