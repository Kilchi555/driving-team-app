import { createError } from 'h3'
import { Wallee } from 'wallee'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getWalleeConfigForTenant, getWalleeSDKConfig } from '~/server/utils/wallee-config'
import { BOOKING_ERROR, bookingError } from '~/server/utils/booking-errors'
import { logger } from '~/utils/logger'

export const CHECKOUT_STATUS = {
  idle: 'idle',
  creating: 'creating',
  created: 'created',
  recovery_pending: 'recovery_pending',
} as const

export type CheckoutStatus = (typeof CHECKOUT_STATUS)[keyof typeof CHECKOUT_STATUS]
export type CheckoutClaimOutcome = 'allow_create' | 'reuse' | 'in_progress' | 'recovery' | 'blocked' | 'not_found'

export const CHECKOUT_STALE_AFTER = '90 seconds'

export function paymentMerchantReference(paymentId: string): string {
  return `payment-${paymentId}`
}

export function isCheckoutRecoveryPendingError(error: unknown): boolean {
  const err = error as { data?: { error?: string } }
  return err?.data?.error === BOOKING_ERROR.CHECKOUT_RECOVERY_PENDING
    || err?.data?.error === BOOKING_ERROR.CHECKOUT_IN_PROGRESS
}

export function checkoutBlocksHoldRelease(payment: {
  checkout_status?: string | null
  wallee_transaction_id?: string | null
} | null | undefined): boolean {
  if (!payment) return false
  if (payment.wallee_transaction_id) return true
  return payment.checkout_status === CHECKOUT_STATUS.creating
    || payment.checkout_status === CHECKOUT_STATUS.recovery_pending
}

export function classifyWalleeCreateFailure(error: unknown): 'rejected' | 'unknown' {
  const err = error as {
    statusCode?: number
    status?: number
    code?: string
    message?: string
    name?: string
  }
  const status = Number(err?.statusCode || err?.status || 0)
  const blob = `${err?.code || ''} ${err?.message || ''} ${err?.name || ''}`.toLowerCase()
  if (
    blob.includes('timeout')
    || blob.includes('timed out')
    || blob.includes('etimedout')
    || blob.includes('econnreset')
    || blob.includes('econnrefused')
    || blob.includes('socket hang up')
    || blob.includes('aborted')
    || blob.includes('network')
    || blob.includes('fetch failed')
  ) {
    return 'unknown'
  }
  if (status >= 500 || status === 409 || status === 429) return 'unknown'
  if (status >= 400 && status < 500) return 'rejected'
  return 'unknown'
}

export interface CheckoutClaim {
  outcome: CheckoutClaimOutcome
  allow_create?: boolean
  payment_id?: string
  tenant_id?: string
  payment_status?: string
  checkout_status?: string
  checkout_claim_token?: string | null
  checkout_merchant_reference?: string | null
  wallee_transaction_id?: string | null
  wallee_space_id?: string | null
  appointment_id?: string | null
}

export interface FoundWalleeTransaction {
  id: string
  state?: string | null
  paymentPageUrl?: string | null
}

export interface PaymentCheckoutCreateResult {
  paymentUrl: string
  transactionId: string
  reused: boolean
  recovered: boolean
}

export interface PaymentCheckoutDeps {
  claim: (paymentId: string, tenantId: string) => Promise<CheckoutClaim>
  persist: (opts: {
    paymentId: string
    tenantId: string
    transactionId: string
    spaceId: string
    claimToken?: string | null
    merchantReference: string
  }) => Promise<{ outcome: string; wallee_transaction_id?: string | null }>
  markRecovery: (paymentId: string, tenantId: string, claimToken?: string | null) => Promise<void>
  releaseIdle: (paymentId: string, tenantId: string, claimToken: string) => Promise<void>
  search: (opts: { tenantId: string; merchantReference: string; paymentId: string }) => Promise<FoundWalleeTransaction[]>
  create: (opts: { merchantReference: string; claim: CheckoutClaim }) => Promise<{
    id: string
    paymentPageUrl?: string | null
    spaceId?: string | number | null
  }>
  resolveUrl?: (transactionId: string) => Promise<string | null>
  loadAppointmentStatus?: (appointmentId: string, tenantId: string) => Promise<string | null>
}

function recoveryError(message = 'Zahlung wird wiederhergestellt. Bitte in wenigen Sekunden erneut versuchen.') {
  return bookingError(503, BOOKING_ERROR.CHECKOUT_RECOVERY_PENDING, message)
}

function inProgressError() {
  return bookingError(409, BOOKING_ERROR.CHECKOUT_IN_PROGRESS, 'Zahlung wird gerade gestartet. Bitte kurz warten.')
}

export async function runPaymentCheckoutCreate(
  opts: { paymentId: string; tenantId: string },
  deps: PaymentCheckoutDeps
): Promise<PaymentCheckoutCreateResult> {
  const claim = await deps.claim(opts.paymentId, opts.tenantId)

  if (claim.outcome === 'not_found') {
    throw createError({ statusCode: 404, statusMessage: 'Zahlung nicht gefunden' })
  }
  if (claim.outcome === 'blocked' || (claim.payment_status && !['pending', 'processing'].includes(claim.payment_status))) {
    throw bookingError(409, BOOKING_ERROR.PAYMENT_ALREADY_COMPLETED, 'Zahlung kann nicht mehr gestartet werden')
  }

  if (claim.appointment_id && deps.loadAppointmentStatus) {
    const status = await deps.loadAppointmentStatus(claim.appointment_id, opts.tenantId)
    if (status === 'cancelled' || status === 'deleted') {
      throw bookingError(409, BOOKING_ERROR.APPOINTMENT_CANCELLED, 'Termin ist storniert')
    }
  }

  const merchantReference = claim.checkout_merchant_reference || paymentMerchantReference(opts.paymentId)

  if (claim.outcome === 'reuse' && claim.wallee_transaction_id) {
    const url = await resolveOrFallback(deps, claim.wallee_transaction_id, claim.wallee_space_id)
    return { paymentUrl: url, transactionId: String(claim.wallee_transaction_id), reused: true, recovered: false }
  }

  if (claim.outcome === 'in_progress') {
    throw inProgressError()
  }

  const found = await deps.search({
    tenantId: opts.tenantId,
    merchantReference,
    paymentId: opts.paymentId,
  })
  const usable = pickUsableTransaction(found)
  if (usable) {
    if (found.length > 1) {
      logger.error('🚨 Multiple Wallee transactions found for one payment', {
        paymentId: opts.paymentId,
        ids: found.map(tx => tx.id),
      })
    }
    await deps.persist({
      paymentId: opts.paymentId,
      tenantId: opts.tenantId,
      transactionId: usable.id,
      spaceId: String(claim.wallee_space_id || ''),
      claimToken: claim.checkout_claim_token,
      merchantReference,
    })
    const url = usable.paymentPageUrl || await resolveOrFallback(deps, usable.id, claim.wallee_space_id)
    return { paymentUrl: url, transactionId: usable.id, reused: true, recovered: true }
  }

  if (claim.outcome === 'recovery' || !claim.allow_create) {
    throw recoveryError()
  }

  let created: { id: string; paymentPageUrl?: string | null }
  try {
    created = await deps.create({ merchantReference, claim })
  } catch (error) {
    const kind = classifyWalleeCreateFailure(error)
    if (kind === 'rejected' && claim.checkout_claim_token) {
      await deps.releaseIdle(opts.paymentId, opts.tenantId, claim.checkout_claim_token)
      throw error
    }
    await deps.markRecovery(opts.paymentId, opts.tenantId, claim.checkout_claim_token)
    throw recoveryError()
  }

  if (!created?.id) {
    await deps.markRecovery(opts.paymentId, opts.tenantId, claim.checkout_claim_token)
    throw recoveryError()
  }

  const persisted = await deps.persist({
    paymentId: opts.paymentId,
    tenantId: opts.tenantId,
    transactionId: String(created.id),
    spaceId: String(created.spaceId || claim.wallee_space_id || ''),
    claimToken: claim.checkout_claim_token,
    merchantReference,
  })

  if (persisted.outcome === 'conflict' && persisted.wallee_transaction_id) {
    logger.error('🚨 Checkout persist conflict — keeping existing Wallee id', {
      paymentId: opts.paymentId,
      existing: persisted.wallee_transaction_id,
      created: created.id,
    })
    const url = await resolveOrFallback(deps, persisted.wallee_transaction_id, claim.wallee_space_id)
    return { paymentUrl: url, transactionId: String(persisted.wallee_transaction_id), reused: true, recovered: true }
  }

  const url = created.paymentPageUrl || await resolveOrFallback(deps, String(created.id), claim.wallee_space_id)
  return { paymentUrl: url, transactionId: String(created.id), reused: false, recovered: false }
}

function pickUsableTransaction(found: FoundWalleeTransaction[]): FoundWalleeTransaction | null {
  if (!found.length) return null
  const terminalFailure = new Set(['FAILED', 'CANCELED', 'DECLINE', 'VOIDED'])
  return found.find(tx => !terminalFailure.has(String(tx.state || '').toUpperCase())) || found[0]
}

async function resolveOrFallback(
  deps: PaymentCheckoutDeps,
  transactionId: string,
  spaceId?: string | null
): Promise<string> {
  const url = deps.resolveUrl ? await deps.resolveUrl(transactionId) : null
  if (url) return url
  return `https://app-wallee.com/payment/transaction/pay?spaceId=${spaceId || ''}&transactionId=${transactionId}`
}

export async function claimPaymentCheckout(paymentId: string, tenantId: string): Promise<CheckoutClaim> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.rpc('claim_payment_checkout', {
    p_payment_id: paymentId,
    p_tenant_id: tenantId,
    p_stale_after: CHECKOUT_STALE_AFTER,
  })
  if (error) {
    logger.error('❌ claim_payment_checkout failed', { paymentId, message: error.message })
    throw createError({ statusCode: 503, statusMessage: 'Zahlung konnte nicht gestartet werden' })
  }
  return (data || { outcome: 'not_found' }) as CheckoutClaim
}

export async function persistPaymentCheckout(opts: {
  paymentId: string
  tenantId: string
  transactionId: string
  spaceId: string
  claimToken?: string | null
  merchantReference: string
}): Promise<{ outcome: string; wallee_transaction_id?: string | null }> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.rpc('persist_payment_checkout', {
    p_payment_id: opts.paymentId,
    p_tenant_id: opts.tenantId,
    p_wallee_transaction_id: opts.transactionId,
    p_wallee_space_id: opts.spaceId || null,
    p_claim_token: opts.claimToken || null,
  })
  if (error) {
    logger.error('❌ persist_payment_checkout failed', { paymentId: opts.paymentId, message: error.message })
    throw recoveryError()
  }

  try {
    const { error: historyError } = await supabase.from('payment_wallee_transactions').insert({
      payment_id: opts.paymentId,
      wallee_transaction_id: opts.transactionId,
      wallee_space_id: opts.spaceId ? Number(opts.spaceId) || opts.spaceId : null,
      merchant_reference: opts.merchantReference,
    })
    if (historyError && historyError.code !== '23505') {
      logger.warn('⚠️ Transaction history save failed:', historyError.message)
    }
  } catch (historyErr: any) {
    logger.warn('⚠️ Transaction history save failed:', historyErr?.message)
  }

  return (data || { outcome: 'created', wallee_transaction_id: opts.transactionId }) as {
    outcome: string
    wallee_transaction_id?: string | null
  }
}

export async function markPaymentCheckoutRecovery(
  paymentId: string,
  tenantId: string,
  claimToken?: string | null
): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.rpc('mark_payment_checkout_recovery', {
    p_payment_id: paymentId,
    p_tenant_id: tenantId,
    p_claim_token: claimToken || null,
  })
  if (error) logger.warn('⚠️ mark_payment_checkout_recovery failed', { paymentId, message: error.message })
}

export async function releasePaymentCheckoutClaim(
  paymentId: string,
  tenantId: string,
  claimToken: string
): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.rpc('release_payment_checkout_claim', {
    p_payment_id: paymentId,
    p_tenant_id: tenantId,
    p_claim_token: claimToken,
  })
  if (error) logger.warn('⚠️ release_payment_checkout_claim failed', { paymentId, message: error.message })
}

export async function searchWalleeTransactionsForPayment(opts: {
  tenantId: string
  merchantReference: string
  paymentId: string
}): Promise<FoundWalleeTransaction[]> {
  const supabase = getSupabaseAdmin()
  const found: FoundWalleeTransaction[] = []
  const seen = new Set<string>()

  const { data: history } = await supabase
    .from('payment_wallee_transactions')
    .select('wallee_transaction_id')
    .eq('payment_id', opts.paymentId)

  for (const row of history || []) {
    if (row.wallee_transaction_id) seen.add(String(row.wallee_transaction_id))
  }

  try {
    const walleeConfig = await getWalleeConfigForTenant(opts.tenantId)
    const config = getWalleeSDKConfig(walleeConfig.spaceId, walleeConfig.userId, walleeConfig.apiSecret)
    const transactionService = new Wallee.api.TransactionService(config)
    const response = await transactionService.search(walleeConfig.spaceId, {
      filter: {
        fieldName: 'merchantReference',
        value: opts.merchantReference,
        operator: Wallee.model.CriteriaOperator.EQUALS,
        type: Wallee.model.EntityQueryFilterType.LEAF,
      },
      numberOfEntities: 20,
    } as any)
    const rows = ((response as any)?.body || response || []) as any[]
    for (const tx of rows) {
      const id = tx?.id != null ? String(tx.id) : ''
      if (!id) continue
      seen.add(id)
      found.push({
        id,
        state: tx.state || null,
        paymentPageUrl: tx.paymentPageUrl || tx.paymentPageEndpoint || null,
      })
    }
  } catch (searchErr: any) {
    logger.warn('⚠️ Wallee search failed; using history only', { paymentId: opts.paymentId, message: searchErr?.message })
  }

  for (const id of seen) {
    if (!found.some(tx => tx.id === id)) found.push({ id })
  }
  return found
}

export async function recoverPaymentCheckout(opts: {
  paymentId: string
  tenantId: string
}): Promise<PaymentCheckoutCreateResult | null> {
  const claim = await claimPaymentCheckout(opts.paymentId, opts.tenantId)
  if (claim.wallee_transaction_id) {
    return {
      paymentUrl: `https://app-wallee.com/payment/transaction/pay?transactionId=${claim.wallee_transaction_id}`,
      transactionId: String(claim.wallee_transaction_id),
      reused: true,
      recovered: true,
    }
  }
  const merchantReference = claim.checkout_merchant_reference || paymentMerchantReference(opts.paymentId)
  const found = await searchWalleeTransactionsForPayment({
    tenantId: opts.tenantId,
    merchantReference,
    paymentId: opts.paymentId,
  })
  const usable = pickUsableTransaction(found)
  if (!usable) return null
  await persistPaymentCheckout({
    paymentId: opts.paymentId,
    tenantId: opts.tenantId,
    transactionId: usable.id,
    spaceId: String(claim.wallee_space_id || ''),
    merchantReference,
  })
  return {
    paymentUrl: usable.paymentPageUrl || `https://app-wallee.com/payment/transaction/pay?transactionId=${usable.id}`,
    transactionId: usable.id,
    reused: true,
    recovered: true,
  }
}

export function livePaymentCheckoutDeps(create: PaymentCheckoutDeps['create'], extras?: {
  resolveUrl?: PaymentCheckoutDeps['resolveUrl']
  loadAppointmentStatus?: PaymentCheckoutDeps['loadAppointmentStatus']
}): PaymentCheckoutDeps {
  return {
    claim: claimPaymentCheckout,
    persist: persistPaymentCheckout,
    markRecovery: markPaymentCheckoutRecovery,
    releaseIdle: releasePaymentCheckoutClaim,
    search: searchWalleeTransactionsForPayment,
    create,
    resolveUrl: extras?.resolveUrl,
    loadAppointmentStatus: extras?.loadAppointmentStatus,
  }
}
