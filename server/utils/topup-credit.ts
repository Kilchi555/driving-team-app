import { logger } from '~/utils/logger'
import {
  inspectWalleeTopupPayment,
  mergePaymentMetadata,
  type TopupInspection,
} from '~/server/utils/payment-metadata'

export type ApplyWalleeTopupDepositRow = {
  applied: boolean
  already_applied: boolean
  amount_rappen: number
  balance_rappen: number
  transaction_id: string | null
}

export type ApplyWalleeTopupDepositArgs = {
  p_payment_id: string
  p_user_id: string
  p_tenant_id: string
  p_amount: number
}

type ApplyWalleeTopupDepositClient = {
  rpc: (
    fn: 'apply_wallee_topup_deposit',
    args: ApplyWalleeTopupDepositArgs
  ) => PromiseLike<{ data: ApplyWalleeTopupDepositRow[] | ApplyWalleeTopupDepositRow | null; error: { message?: string } | null }>
}

type PaymentUpdateClient = {
  from: (table: string) => {
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: unknown) => PromiseLike<{ error: { message?: string } | null }> & {
        eq: (column: string, value: unknown) => PromiseLike<{ error: { message?: string } | null }>
      }
    }
  }
}

export type ApplyTopupResult =
  | { kind: 'not_topup' }
  | { kind: 'invalid_amount'; inspection: TopupInspection }
  | { kind: 'applied'; amountRappen: number; alreadyApplied: boolean; balanceRappen: number | null }
  | { kind: 'failed'; error: string; inspection: TopupInspection }

function firstRpcRow(data: ApplyWalleeTopupDepositRow[] | ApplyWalleeTopupDepositRow | null): ApplyWalleeTopupDepositRow | null {
  if (Array.isArray(data)) return data[0] || null
  if (data && typeof data === 'object') return data
  return null
}

export type TopupPaymentInput = {
  id?: string | null
  user_id?: string | null
  tenant_id?: string | null
  payment_method?: string | null
  description?: string | null
  metadata?: unknown
  total_amount_rappen?: number | null
  lesson_price_rappen?: number | null
  products_price_rappen?: number | null
  appointment_id?: string | null
  invoice_id?: string | null
  course_registration_id?: string | null
  payment_status?: string | null
}

/**
 * Idempotent wallet deposit for a captured Wallee top-up.
 * Deposit row + balance increment live in one DB function.
 */
export async function applyCapturedWalleeTopupCredit(
  supabase: ApplyWalleeTopupDepositClient,
  payment: TopupPaymentInput
): Promise<ApplyTopupResult> {
  const inspection = inspectWalleeTopupPayment(payment)
  if (!inspection.isTopup) return { kind: 'not_topup' }

  if (inspection.amountRappen == null || inspection.amountRappen <= 0) {
    logger.error('❌ Top-up amount is not determinable; refusing credit', {
      paymentId: payment.id,
      inspection,
    })
    return { kind: 'invalid_amount', inspection }
  }

  if (!payment.id || !payment.user_id || !payment.tenant_id) {
    logger.error('❌ Top-up credit missing payment identity', { paymentId: payment.id })
    return { kind: 'failed', error: 'missing_payment_identity', inspection }
  }

  const rpcResult = await supabase.rpc('apply_wallee_topup_deposit', {
    p_payment_id: payment.id,
    p_user_id: payment.user_id,
    p_tenant_id: payment.tenant_id,
    p_amount: inspection.amountRappen,
  })
  const { data, error } = rpcResult || { data: null, error: { message: 'rpc_failed' } }

  const row = firstRpcRow(data)
  if (error || !row) {
    logger.error('❌ apply_wallee_topup_deposit failed', {
      paymentId: payment.id,
      error: error?.message,
    })
    return { kind: 'failed', error: error?.message || 'rpc_failed', inspection }
  }

  const alreadyApplied = row.already_applied === true || row.applied === false
  logger.info(alreadyApplied ? '⏭️ Top-up already credited' : '✅ Top-up credit applied', {
    paymentId: payment.id,
    amountRappen: inspection.amountRappen,
    alreadyApplied,
    source: inspection.source,
  })

  return {
    kind: 'applied',
    amountRappen: Number(row.amount_rappen) || inspection.amountRappen,
    alreadyApplied,
    balanceRappen: row.balance_rappen == null ? null : Number(row.balance_rappen),
  }
}

export async function applyCapturedWalleeTopupCredits(
  supabase: ApplyWalleeTopupDepositClient,
  payments: TopupPaymentInput[]
): Promise<{ failedIds: string[] }> {
  const failedIds: string[] = []
  for (const payment of payments) {
    const result = await applyCapturedWalleeTopupCredit(supabase, payment)
    if (result.kind === 'failed' || result.kind === 'invalid_amount') {
      if (payment.id) failedIds.push(payment.id)
    }
  }
  return { failedIds }
}

/**
 * Shared complete path for webhook, recover-cron and process retry.
 * Top-ups are credited before (or without leaving) `completed`.
 */
export async function completeCapturedWalleePayment(
  supabase: ApplyWalleeTopupDepositClient & PaymentUpdateClient,
  payment: TopupPaymentInput,
  opts: {
    targetStatus?: string
    extraUpdate?: Record<string, unknown>
    statusGuard?: string
    healMetadata?: boolean
  } = {}
): Promise<{ ok: boolean; isTopup: boolean; alreadyApplied?: boolean; error?: string }> {
  const targetStatus = opts.targetStatus || 'completed'
  const inspection = inspectWalleeTopupPayment(payment)

  if (inspection.isTopup && targetStatus === 'completed') {
    const credit = await applyCapturedWalleeTopupCredit(supabase, payment)
    if (credit.kind !== 'applied') {
      return {
        ok: false,
        isTopup: true,
        error: credit.kind === 'failed' ? credit.error : 'invalid_amount',
      }
    }

    const now = new Date().toISOString()
    const update: Record<string, unknown> = {
      payment_status: 'completed',
      paid_at: now,
      updated_at: now,
      ...(opts.extraUpdate || {}),
    }
    if (opts.healMetadata !== false) {
      update.metadata = mergePaymentMetadata(payment.metadata, {
        is_topup: true,
        topup_amount_rappen: credit.amountRappen,
      })
    }

    const { error } = await updatePaymentStatus(supabase, payment.id, update, opts.statusGuard)
    if (error) {
      logger.error('❌ Failed to mark top-up payment completed after credit', {
        paymentId: payment.id,
        error: error.message,
      })
      return { ok: false, isTopup: true, error: error.message }
    }

    return {
      ok: true,
      isTopup: true,
      alreadyApplied: credit.alreadyApplied,
    }
  }

  const now = new Date().toISOString()
  const update: Record<string, unknown> = {
    payment_status: targetStatus,
    updated_at: now,
    ...(opts.extraUpdate || {}),
  }
  if (targetStatus === 'completed' && update.paid_at == null) {
    update.paid_at = now
  }

  const { error } = await updatePaymentStatus(supabase, payment.id, update, opts.statusGuard)
  if (error) return { ok: false, isTopup: false, error: error.message }
  return { ok: true, isTopup: false }
}

async function updatePaymentStatus(
  supabase: PaymentUpdateClient,
  paymentId: string | null | undefined,
  update: Record<string, unknown>,
  statusGuard?: string
): Promise<{ error: { message?: string } | null }> {
  const query = supabase.from('payments').update(update).eq('id', paymentId)
  return statusGuard ? query.eq('payment_status', statusGuard) : query
}
