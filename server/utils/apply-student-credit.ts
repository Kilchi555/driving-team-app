import { logger } from '~/utils/logger'

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
}): Promise<ApplyStudentCreditResult> {
  const { supabase, tenantId, actorUserId, studentUserId, payments } = opts

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
  const available = Math.max(0, rawBalance - frozen)

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
