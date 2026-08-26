import { logger } from '~/utils/logger'
import { consumeGiftCardForPayment, giftCardCodeFromPaymentMetadata } from '~/server/utils/consume-gift-card'

export type CreditPaymentInput = {
  id: string
  user_id: string
  tenant_id?: string
  appointment_id?: string | null
  total_amount_rappen?: number | null
  admin_fee_rappen?: number | null
  credit_used_rappen?: number | null
  amount_paid_rappen?: number | null
  payment_status?: string | null
  appointments?: {
    status?: string | null
    cancellation_charge_percentage?: number | null
    type?: string | null
  } | null
  metadata?: { discount_code?: string | null } | null
}

export type CreditDueRow = CreditPaymentInput & {
  due_rappen: number
  already_paid_rappen: number
  full_due_rappen: number
}

export type CreditAllocation = {
  payment_id: string
  apply_rappen: number
  fully_covered: boolean
}

export type ApplyStudentCreditResult = {
  credit_used_rappen: number
  credit_remaining_rappen: number
  allocations: CreditAllocation[]
  fully_covered_payment_ids: string[]
  remaining_payment_ids: string[]
  applied_by_payment_id: Record<string, number>
}

const OPEN_STATUSES = new Set(['pending', 'partial', 'processing', 'open'])

export function availableWalletRappen(
  row?: { balance_rappen?: number | null; pending_withdrawal_rappen?: number | null } | null
): number {
  const raw = Math.round(Number(row?.balance_rappen) || 0)
  const frozen = Math.round(Number(row?.pending_withdrawal_rappen) || 0)
  return Math.max(0, raw - frozen)
}

export function emptyCreditApplyResult(paymentIds: string[] = []): ApplyStudentCreditResult {
  return {
    credit_used_rappen: 0,
    credit_remaining_rappen: 0,
    allocations: [],
    fully_covered_payment_ids: [],
    remaining_payment_ids: paymentIds,
    applied_by_payment_id: {},
  }
}

export function remainingDueRappen(p: CreditPaymentInput): number {
  let fullDue = (p.total_amount_rappen || 0) - (p.credit_used_rappen || 0)
  if (p.appointments?.status === 'cancelled') {
    const chargePercentage = p.appointments.cancellation_charge_percentage ?? 100
    const appointmentCost = (p.total_amount_rappen || 0) - (p.admin_fee_rappen || 0)
    fullDue = Math.round(appointmentCost * chargePercentage / 100)
  }
  const alreadyPaid = p.payment_status === 'partial' ? (p.amount_paid_rappen || 0) : 0
  return Math.max(0, fullDue - alreadyPaid)
}

/** Cheapest open dues first — same order as process-bulk-payment. */
export function allocateCreditAcrossDues(
  dues: { id: string; due_rappen: number }[],
  creditRappen: number
): CreditAllocation[] {
  let remaining = Math.max(0, Math.round(creditRappen))
  const eligible = dues
    .filter(d => d.due_rappen > 0)
    .sort((a, b) => a.due_rappen - b.due_rappen)

  const allocations: CreditAllocation[] = []
  for (const d of eligible) {
    if (remaining <= 0) break
    const apply = Math.min(d.due_rappen, remaining)
    if (apply <= 0) continue
    allocations.push({
      payment_id: d.id,
      apply_rappen: apply,
      fully_covered: apply >= d.due_rappen,
    })
    remaining -= apply
  }
  return allocations
}

export async function applyStudentCreditToPayments(opts: {
  supabase: any
  tenantId: string
  actorUserId: string
  studentUserId: string
  payments: CreditPaymentInput[]
  apply?: boolean
}): Promise<ApplyStudentCreditResult> {
  const { supabase, tenantId, actorUserId, studentUserId, payments, apply = true } = opts

  if (apply === false) {
    return emptyCreditApplyResult(payments.map(p => p.id))
  }

  if (!studentUserId) {
    throw new Error('No student on selected payments')
  }
  if (payments.some(p => p.user_id && p.user_id !== studentUserId)) {
    throw new Error('Selected payments must belong to the same student')
  }

  const dues: CreditDueRow[] = payments.map((p) => {
    const due = remainingDueRappen(p)
    const alreadyPaid = p.payment_status === 'partial' ? (p.amount_paid_rappen || 0) : 0
    return {
      ...p,
      due_rappen: due,
      already_paid_rappen: alreadyPaid,
      full_due_rappen: (p.total_amount_rappen || 0) - (p.credit_used_rappen || 0),
    }
  })

  const eligible = dues.filter(p => OPEN_STATUSES.has(p.payment_status || '') && p.due_rappen > 0)
  if (eligible.length === 0) {
    return {
      credit_used_rappen: 0,
      credit_remaining_rappen: 0,
      allocations: [],
      fully_covered_payment_ids: [],
      remaining_payment_ids: payments.map(p => p.id),
      applied_by_payment_id: {},
    }
  }

  const { data: creditRow } = await supabase
    .from('student_credits')
    .select('id, balance_rappen, pending_withdrawal_rappen')
    .eq('user_id', studentUserId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const rawBalance = creditRow?.balance_rappen || 0
  const frozen = creditRow?.pending_withdrawal_rappen || 0
  const available = availableWalletRappen(creditRow)

  if (available <= 0) {
    throw new Error('Kein verfügbares Guthaben')
  }

  const allocations = allocateCreditAcrossDues(
    eligible.map(p => ({ id: p.id, due_rappen: p.due_rappen })),
    available
  )

  const now = new Date().toISOString()
  let runningBalance = rawBalance
  let totalApplied = 0
  const appliedByPaymentId: Record<string, number> = {}
  const fullyCoveredPaymentIds: string[] = []

  for (const alloc of allocations) {
    const p = eligible.find(row => row.id === alloc.payment_id)
    if (!p) continue

    const newCreditUsed = (p.credit_used_rappen || 0) + alloc.apply_rappen
    const balanceBefore = runningBalance
    const balanceAfter = runningBalance - alloc.apply_rappen
    const updateData: Record<string, unknown> = {
      credit_used_rappen: newCreditUsed,
      updated_at: now,
    }

    if (alloc.fully_covered) {
      updateData.payment_status = 'completed'
      updateData.payment_method = 'credit'
      updateData.paid_at = now
    }

    const { error: updateError } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', p.id)
      .eq('tenant_id', tenantId)

    if (updateError) {
      logger.error('applyStudentCredit: payment update failed', { paymentId: p.id, updateError })
      throw new Error(`Guthaben konnte nicht auf Zahlung ${p.id} gebucht werden`)
    }

    const { data: tx, error: txErr } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: studentUserId,
        tenant_id: tenantId,
        transaction_type: 'appointment_payment',
        amount_rappen: -alloc.apply_rappen,
        balance_before_rappen: balanceBefore,
        balance_after_rappen: balanceAfter,
        payment_method: 'credit',
        reference_id: p.appointment_id || p.id,
        reference_type: p.appointment_id ? 'appointment' : 'payment',
        created_by: actorUserId,
        notes: `Guthaben für Zahlung (Payment ${p.id})`,
        status: 'completed',
        created_at: now,
      })
      .select('id')
      .single()

    if (txErr) {
      logger.warn('applyStudentCredit: credit transaction log failed', { paymentId: p.id, txErr })
    } else if (tx?.id) {
      await supabase.from('payments').update({ credit_transaction_id: tx.id }).eq('id', p.id)
    }

    if (alloc.fully_covered) {
      await consumeGiftCardForPayment({
        supabase,
        tenantId,
        paymentId: p.id,
        redeemedBy: studentUserId,
        discountCode: giftCardCodeFromPaymentMetadata(p.metadata),
      })
    }

    if (alloc.fully_covered && p.appointment_id) {
      await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', p.appointment_id)
        .eq('status', 'pending_confirmation')
        .eq('tenant_id', tenantId)

      $fetch('/api/affiliate/process-reward', {
        method: 'POST',
        headers: { 'x-internal-secret': process.env.CRON_SECRET || '' },
        body: {
          appointment_id: p.appointment_id,
          user_id: studentUserId,
          tenant_id: tenantId,
          driving_category: p.appointments?.type ?? null,
        },
      }).catch((err: any) =>
        logger.warn('applyStudentCredit: affiliate reward failed (non-fatal)', { message: err?.message })
      )
    }

    runningBalance = balanceAfter
    totalApplied += alloc.apply_rappen
    appliedByPaymentId[p.id] = alloc.apply_rappen
    if (alloc.fully_covered) fullyCoveredPaymentIds.push(p.id)
  }

  if (totalApplied > 0) {
    if (!creditRow?.id) {
      throw new Error('Guthaben-Konto fehlt')
    }
    const { error: creditErr } = await supabase
      .from('student_credits')
      .update({ balance_rappen: rawBalance - totalApplied, updated_at: now })
      .eq('id', creditRow.id)
    if (creditErr) {
      logger.error('applyStudentCredit: wallet update failed', creditErr)
      throw new Error('Guthaben konnte nicht aktualisiert werden')
    }
  }

  const remainingPaymentIds = payments
    .map(p => p.id)
    .filter(id => !fullyCoveredPaymentIds.includes(id))

  return {
    credit_used_rappen: totalApplied,
    credit_remaining_rappen: Math.max(0, rawBalance - totalApplied - frozen),
    allocations,
    fully_covered_payment_ids: fullyCoveredPaymentIds,
    remaining_payment_ids: remainingPaymentIds,
    applied_by_payment_id: appliedByPaymentId,
  }
}

/** Booking/checkout wrapper: never fail the sale if the wallet is empty. */
export async function applyRequestedStudentCredit(opts: {
  supabase: any
  tenantId: string
  actorUserId: string
  studentUserId: string
  payment: CreditPaymentInput
  apply?: boolean
}): Promise<{ remaining_due_rappen: number; applied_rappen: number }> {
  const dueBefore = remainingDueRappen(opts.payment)
  if (opts.apply === false || dueBefore <= 0 || !opts.studentUserId) {
    return { remaining_due_rappen: dueBefore, applied_rappen: 0 }
  }

  try {
    const applied = await applyStudentCreditToPayments({
      supabase: opts.supabase,
      tenantId: opts.tenantId,
      actorUserId: opts.actorUserId,
      studentUserId: opts.studentUserId,
      payments: [opts.payment],
    })
    return {
      remaining_due_rappen: Math.max(0, dueBefore - applied.credit_used_rappen),
      applied_rappen: applied.credit_used_rappen,
    }
  } catch (err: any) {
    if (err?.message === 'Kein verfügbares Guthaben') {
      return { remaining_due_rappen: dueBefore, applied_rappen: 0 }
    }
    throw err
  }
}

/** Put wallet credit back when a pending booking hold is released. */
export async function refundStudentCreditFromPayment(opts: {
  supabase: any
  tenantId: string
  payment: {
    id: string
    user_id?: string | null
    credit_used_rappen?: number | null
    appointment_id?: string | null
  }
  actorUserId?: string | null
  notes?: string
}): Promise<number> {
  const amount = Math.round(Number(opts.payment.credit_used_rappen) || 0)
  const userId = opts.payment.user_id
  if (amount <= 0 || !userId) return 0

  const { data: creditRow } = await opts.supabase
    .from('student_credits')
    .select('id, balance_rappen')
    .eq('user_id', userId)
    .eq('tenant_id', opts.tenantId)
    .maybeSingle()

  const current = creditRow?.balance_rappen || 0
  const next = current + amount
  const now = new Date().toISOString()

  if (creditRow?.id) {
    const { error } = await opts.supabase
      .from('student_credits')
      .update({ balance_rappen: next, updated_at: now })
      .eq('id', creditRow.id)
    if (error) {
      logger.error('refundStudentCredit: wallet update failed', error)
      throw new Error('Guthaben konnte nicht zurückgebucht werden')
    }
  } else {
    const { error } = await opts.supabase
      .from('student_credits')
      .upsert({
        user_id: userId,
        tenant_id: opts.tenantId,
        balance_rappen: next,
        updated_at: now,
      }, { onConflict: 'user_id,tenant_id' })
    if (error) {
      logger.error('refundStudentCredit: wallet upsert failed', error)
      throw new Error('Guthaben konnte nicht zurückgebucht werden')
    }
  }

  const { error: txErr } = await opts.supabase.from('credit_transactions').insert({
    user_id: userId,
    tenant_id: opts.tenantId,
    transaction_type: 'refund',
    amount_rappen: amount,
    balance_before_rappen: current,
    balance_after_rappen: next,
    payment_method: 'credit',
    reference_id: opts.payment.appointment_id || opts.payment.id,
    reference_type: opts.payment.appointment_id ? 'appointment' : 'payment',
    created_by: opts.actorUserId || null,
    notes: opts.notes || `Guthaben-Rückbuchung (Payment ${opts.payment.id})`,
    status: 'completed',
    created_at: now,
  })
  if (txErr) {
    logger.warn('refundStudentCredit: transaction log failed', txErr)
  }

  await opts.supabase
    .from('payments')
    .update({ credit_used_rappen: 0, updated_at: now })
    .eq('id', opts.payment.id)
    .eq('tenant_id', opts.tenantId)

  return amount
}
