/**
 * Post-commit recovery for mark-invoice-paid.
 *
 * Core settlement remains in mark_invoice_paid_core. This module resumes
 * payments-status sync, staff-POS apply_credit, and wallet credits after
 * settlement — including on already_settled retries — without treating
 * already_settled as proof that downstream work finished.
 *
 * Durable status lives in invoice_settlement_post_commit (migration file only
 * until applied). Side-effect idempotency relies on:
 *   - staff_pos_sale(apply_credit) replay semantics
 *   - credit_transactions unique invoice-deposit index + credit_applied_rappen
 *   - payments status updates that are naturally re-runnable
 */

import { applyInvoiceCreditOnPaid } from '~/server/utils/invoice-credit'
import { applyStaffPosCreditsForPaidInvoice } from '~/server/utils/staff-pos-completion'

export type PostCommitStepStatus = 'pending' | 'completed' | 'failed' | 'not_required'

export type PostCommitTrackingRow = {
  invoice_id: string
  tenant_id: string
  payments_sync_status: PostCommitStepStatus
  staff_pos_status: PostCommitStepStatus
  wallet_credit_status: PostCommitStepStatus
  last_error?: string | null
  attempts?: number
}

export type PostCommitStepResult = {
  status: PostCommitStepStatus
  error?: string | null
  credited?: number
  applied_rappen?: number
  skipped?: boolean
}

export type PostCommitRunResult = {
  payments_sync: PostCommitStepResult
  staff_pos: PostCommitStepResult
  wallet_credit: PostCommitStepResult
  downstream_complete: boolean
  tracking_persisted: boolean
  tracking_unavailable: boolean
  resumed_from_already_settled: boolean
}

const RETRYABLE: PostCommitStepStatus[] = ['pending', 'failed']

export function initialPostCommitStatuses(isPartial: boolean): Pick<
  PostCommitTrackingRow,
  'payments_sync_status' | 'staff_pos_status' | 'wallet_credit_status'
> {
  if (isPartial) {
    return {
      payments_sync_status: 'not_required',
      staff_pos_status: 'not_required',
      wallet_credit_status: 'not_required',
    }
  }
  return {
    payments_sync_status: 'pending',
    staff_pos_status: 'pending',
    wallet_credit_status: 'pending',
  }
}

export function isDownstreamComplete(row: {
  payments_sync_status: PostCommitStepStatus
  staff_pos_status: PostCommitStepStatus
  wallet_credit_status: PostCommitStepStatus
}): boolean {
  const done = (s: PostCommitStepStatus) => s === 'completed' || s === 'not_required'
  return done(row.payments_sync_status) && done(row.staff_pos_status) && done(row.wallet_credit_status)
}

export function stepNeedsWork(status: PostCommitStepStatus): boolean {
  return RETRYABLE.includes(status)
}

function isMissingRelationError(err: unknown): boolean {
  const message = err && typeof err === 'object' && 'message' in err ? String((err as any).message) : String(err || '')
  const code = err && typeof err === 'object' && 'code' in err ? String((err as any).code) : ''
  return (
    code === '42P01'
    || code === 'PGRST205'
    || /invoice_settlement_post_commit/i.test(message)
    || /Could not find the table/i.test(message)
    || /relation .* does not exist/i.test(message)
  )
}

export async function ensurePostCommitTracking(opts: {
  supabase: any
  invoiceId: string
  tenantId: string
  isPartial: boolean
}): Promise<{ row: PostCommitTrackingRow | null; unavailable: boolean }> {
  const initials = initialPostCommitStatuses(opts.isPartial)
  const now = new Date().toISOString()

  const { data: existing, error: loadError } = await opts.supabase
    .from('invoice_settlement_post_commit')
    .select('invoice_id, tenant_id, payments_sync_status, staff_pos_status, wallet_credit_status, last_error, attempts')
    .eq('invoice_id', opts.invoiceId)
    .eq('tenant_id', opts.tenantId)
    .maybeSingle()

  if (loadError) {
    if (isMissingRelationError(loadError)) {
      return { row: null, unavailable: true }
    }
    throw loadError
  }

  if (existing) {
    return { row: existing as PostCommitTrackingRow, unavailable: false }
  }

  const insertPayload = {
    invoice_id: opts.invoiceId,
    tenant_id: opts.tenantId,
    ...initials,
    attempts: 0,
    created_at: now,
    updated_at: now,
  }

  const { data: inserted, error: insertError } = await opts.supabase
    .from('invoice_settlement_post_commit')
    .insert(insertPayload)
    .select('invoice_id, tenant_id, payments_sync_status, staff_pos_status, wallet_credit_status, last_error, attempts')
    .maybeSingle()

  if (insertError) {
    if (isMissingRelationError(insertError)) {
      return { row: null, unavailable: true }
    }
    // Concurrent insert: reload
    if (insertError.code === '23505') {
      const { data: raced } = await opts.supabase
        .from('invoice_settlement_post_commit')
        .select('invoice_id, tenant_id, payments_sync_status, staff_pos_status, wallet_credit_status, last_error, attempts')
        .eq('invoice_id', opts.invoiceId)
        .eq('tenant_id', opts.tenantId)
        .maybeSingle()
      return { row: (raced as PostCommitTrackingRow) || null, unavailable: false }
    }
    throw insertError
  }

  return { row: (inserted as PostCommitTrackingRow) || null, unavailable: false }
}

async function persistStepStatus(opts: {
  supabase: any
  invoiceId: string
  tenantId: string
  patch: Partial<PostCommitTrackingRow> & { last_error?: string | null }
  unavailable: boolean
}): Promise<boolean> {
  if (opts.unavailable) return false
  const { error } = await opts.supabase
    .from('invoice_settlement_post_commit')
    .update({
      ...opts.patch,
      updated_at: new Date().toISOString(),
    })
    .eq('invoice_id', opts.invoiceId)
    .eq('tenant_id', opts.tenantId)

  if (error) {
    if (isMissingRelationError(error)) return false
    throw error
  }
  return true
}

export async function syncLinkedPaymentsStatus(opts: {
  supabase: any
  invoiceId: string
  tenantId: string
  userId?: string | null
  paidAt: string
  now: string
}): Promise<void> {
  const { error: byInvoiceError } = await opts.supabase
    .from('payments')
    .update({ payment_status: 'completed', paid_at: opts.paidAt, updated_at: opts.now })
    .eq('invoice_id', opts.invoiceId)
    .eq('tenant_id', opts.tenantId)
    .in('payment_status', ['invoice', 'invoiced', 'pending', 'open', 'failed', 'partial'])

  if (byInvoiceError) throw byInvoiceError

  const { data: invoiceItems, error: itemsError } = await opts.supabase
    .from('invoice_items')
    .select('appointment_id')
    .eq('invoice_id', opts.invoiceId)
    .not('appointment_id', 'is', null)

  if (itemsError) throw itemsError

  if (invoiceItems && invoiceItems.length > 0 && opts.userId) {
    const appointmentIds = invoiceItems.map((item: any) => item.appointment_id).filter(Boolean)
    if (appointmentIds.length > 0) {
      const { error: byApptError } = await opts.supabase
        .from('payments')
        .update({
          payment_status: 'completed',
          invoice_id: opts.invoiceId,
          paid_at: opts.paidAt,
          updated_at: opts.now,
        })
        .eq('user_id', opts.userId)
        .eq('tenant_id', opts.tenantId)
        .in('appointment_id', appointmentIds)
        .in('payment_status', ['invoice', 'invoiced', 'pending', 'open', 'failed', 'partial'])

      if (byApptError) throw byApptError
    }
  }
}

/**
 * Run or resume post-commit steps. Safe to call after settled or already_settled.
 * Does not reverse core settlement. Never marks complete while a required step failed.
 */
export async function runMarkInvoicePaidPostCommit(opts: {
  supabase: any
  invoiceId: string
  tenantId: string
  actorUserId: string
  userId?: string | null
  isPartial: boolean
  paidAt: string
  now: string
  resumedFromAlreadySettled: boolean
  staffPosRpc: (args: Record<string, unknown>) => Promise<any>
}): Promise<PostCommitRunResult> {
  const { row: tracking, unavailable } = await ensurePostCommitTracking({
    supabase: opts.supabase,
    invoiceId: opts.invoiceId,
    tenantId: opts.tenantId,
    isPartial: opts.isPartial,
  })

  let paymentsStatus: PostCommitStepStatus =
    tracking?.payments_sync_status
    || (opts.isPartial ? 'not_required' : 'pending')
  let staffPosStatus: PostCommitStepStatus =
    tracking?.staff_pos_status
    || (opts.isPartial ? 'not_required' : 'pending')
  let walletStatus: PostCommitStepStatus =
    tracking?.wallet_credit_status
    || (opts.isPartial ? 'not_required' : 'pending')

  if (!unavailable && tracking) {
    await opts.supabase
      .from('invoice_settlement_post_commit')
      .update({
        attempts: (tracking.attempts || 0) + 1,
        updated_at: opts.now,
      })
      .eq('invoice_id', opts.invoiceId)
      .eq('tenant_id', opts.tenantId)
  }

  let paymentsResult: PostCommitStepResult = { status: paymentsStatus }
  let staffPosResult: PostCommitStepResult = { status: staffPosStatus }
  let walletResult: PostCommitStepResult = { status: walletStatus }
  let lastError: string | null = null
  let trackingPersisted = !unavailable && !!tracking

  // --- payments sync ---
  if (stepNeedsWork(paymentsStatus)) {
    try {
      await syncLinkedPaymentsStatus({
        supabase: opts.supabase,
        invoiceId: opts.invoiceId,
        tenantId: opts.tenantId,
        userId: opts.userId,
        paidAt: opts.paidAt,
        now: opts.now,
      })
      paymentsStatus = 'completed'
      paymentsResult = { status: 'completed' }
      trackingPersisted = (await persistStepStatus({
        supabase: opts.supabase,
        invoiceId: opts.invoiceId,
        tenantId: opts.tenantId,
        unavailable,
        patch: { payments_sync_status: 'completed', last_error: null },
      })) || trackingPersisted
    } catch (err: any) {
      lastError = err?.message || 'payments_sync_failed'
      paymentsStatus = 'failed'
      paymentsResult = { status: 'failed', error: lastError }
      trackingPersisted = (await persistStepStatus({
        supabase: opts.supabase,
        invoiceId: opts.invoiceId,
        tenantId: opts.tenantId,
        unavailable,
        patch: { payments_sync_status: 'failed', last_error: lastError },
      })) || trackingPersisted
    }
  } else {
    paymentsResult = { status: paymentsStatus }
  }

  // --- staff-POS credits (idempotent via staff_pos_sale replay) ---
  if (stepNeedsWork(staffPosStatus)) {
    try {
      const { data: invoicePayments, error: staffPosLoadError } = await opts.supabase
        .from('payments')
        .select('id, tenant_id, metadata')
        .eq('invoice_id', opts.invoiceId)
        .eq('tenant_id', opts.tenantId)

      if (staffPosLoadError) throw staffPosLoadError

      const credited = await applyStaffPosCreditsForPaidInvoice({
        payments: invoicePayments || [],
        tenantId: opts.tenantId,
        actorUserId: opts.actorUserId,
        isPartial: false,
        rpc: opts.staffPosRpc,
      })

      staffPosStatus = 'completed'
      staffPosResult = { status: 'completed', credited: credited.credited }
      trackingPersisted = (await persistStepStatus({
        supabase: opts.supabase,
        invoiceId: opts.invoiceId,
        tenantId: opts.tenantId,
        unavailable,
        patch: { staff_pos_status: 'completed', last_error: null },
      })) || trackingPersisted
    } catch (err: any) {
      lastError = err?.message || 'staff_pos_failed'
      staffPosStatus = 'failed'
      staffPosResult = { status: 'failed', error: lastError }
      trackingPersisted = (await persistStepStatus({
        supabase: opts.supabase,
        invoiceId: opts.invoiceId,
        tenantId: opts.tenantId,
        unavailable,
        patch: { staff_pos_status: 'failed', last_error: lastError },
      })) || trackingPersisted
    }
  } else {
    staffPosResult = { status: staffPosStatus }
  }

  // --- wallet credit (idempotent via credit_applied_rappen + unique deposit index) ---
  if (stepNeedsWork(walletStatus)) {
    try {
      if (!opts.userId) {
        walletStatus = 'not_required'
        walletResult = { status: 'not_required', skipped: true }
      } else {
        const creditResult = await applyInvoiceCreditOnPaid({
          supabase: opts.supabase,
          invoiceId: opts.invoiceId,
          tenantId: opts.tenantId,
          userId: opts.userId,
          actorUserId: opts.actorUserId,
        })
        walletStatus = 'completed'
        walletResult = {
          status: 'completed',
          applied_rappen: creditResult.applied_rappen,
          skipped: creditResult.skipped,
        }
      }
      trackingPersisted = (await persistStepStatus({
        supabase: opts.supabase,
        invoiceId: opts.invoiceId,
        tenantId: opts.tenantId,
        unavailable,
        patch: { wallet_credit_status: walletStatus, last_error: null },
      })) || trackingPersisted
    } catch (err: any) {
      lastError = err?.message || 'wallet_credit_failed'
      walletStatus = 'failed'
      walletResult = { status: 'failed', error: lastError }
      trackingPersisted = (await persistStepStatus({
        supabase: opts.supabase,
        invoiceId: opts.invoiceId,
        tenantId: opts.tenantId,
        unavailable,
        patch: { wallet_credit_status: 'failed', last_error: lastError },
      })) || trackingPersisted
    }
  } else {
    walletResult = { status: walletStatus }
  }

  return {
    payments_sync: paymentsResult,
    staff_pos: staffPosResult,
    wallet_credit: walletResult,
    downstream_complete: isDownstreamComplete({
      payments_sync_status: paymentsStatus,
      staff_pos_status: staffPosStatus,
      wallet_credit_status: walletStatus,
    }),
    tracking_persisted: trackingPersisted && !unavailable,
    tracking_unavailable: unavailable,
    resumed_from_already_settled: opts.resumedFromAlreadySettled,
  }
}
