import { createError, defineEventHandler, readBody } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { planCancellationObligationChange, stampableObligationMemory, type ObligationPlan } from '~/server/utils/cancellation-payment-obligation'
import { applyStudentCreditDelta, StudentCreditConflict } from '~/server/utils/student-credit-ledger'
import { logAudit } from '~/server/utils/audit'
import { logger } from '~/utils/logger'

const ADMIN_ROLES = ['admin', 'tenant_admin', 'super_admin', 'superadmin']
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function appendNote(existing: string | null | undefined, suffix: string): string {
  const base = (existing || '').trim()
  const next = base ? `${base} | ${suffix}` : suffix
  return next.slice(-4000)
}

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ADMIN_ROLES)
  const body = await readBody(event)
  const appointmentId = body?.appointment_id
  const mustPay = body?.must_pay
  const dryRun = body?.dry_run === true
  const note = typeof body?.note === 'string' ? body.note.trim() : ''

  if (typeof appointmentId !== 'string' || !UUID_RE.test(appointmentId)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Termin-ID.' })
  }
  if (typeof mustPay !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'Bitte angeben, ob der Kunde bezahlen muss.' })
  }

  const supabase = getSupabaseAdmin()
  const { data: appointment, error: appointmentError } = await supabase
    .from('appointments')
    .select('id, user_id, tenant_id, status, cancellation_charge_percentage, start_time, type')
    .eq('id', appointmentId)
    .eq('tenant_id', profile.tenant_id)
    .maybeSingle()

  if (appointmentError || !appointment) {
    throw createError({ statusCode: 404, statusMessage: 'Termin nicht gefunden.' })
  }
  if (appointment.status !== 'cancelled') {
    throw createError({ statusCode: 400, statusMessage: 'Nur stornierte Termine können hier geändert werden.' })
  }

  const { data: payments, error: paymentError } = await supabase
    .from('payments')
    .select('id, payment_status, total_amount_rappen, credit_used_rappen, amount_paid_rappen, refunded_amount_rappen, notes, metadata, user_id, tenant_id')
    .eq('appointment_id', appointment.id)
    .eq('tenant_id', profile.tenant_id)
    .eq('user_id', appointment.user_id)

  if (paymentError) {
    throw createError({ statusCode: 500, statusMessage: 'Zahlungen zum Termin konnten nicht geladen werden.' })
  }

  const paymentIds = (payments || []).map((payment) => payment.id)
  const referenceIds = [appointment.id, ...paymentIds]
  const { data: ledgerRows, error: ledgerError } = await supabase
    .from('credit_transactions')
    .select('transaction_type, amount_rappen, payment_method, balance_before_rappen, balance_after_rappen, notes, reference_id, tenant_id')
    .eq('user_id', appointment.user_id)
    .in('reference_id', referenceIds)

  if (ledgerError) {
    throw createError({ statusCode: 500, statusMessage: 'Guthaben-Buchungen konnten nicht geladen werden.' })
  }

  const ledger = (ledgerRows || []).filter((row) => !row.tenant_id || row.tenant_id === profile.tenant_id)
  const plan = planCancellationObligationChange({
    appointmentStatus: appointment.status,
    chargePercentage: appointment.cancellation_charge_percentage,
    mustPay,
    note,
    payments: payments || [],
    ledger,
    nowIso: new Date().toISOString(),
  })

  if (!plan.ok) {
    throw createError({ statusCode: 400, statusMessage: plan.error })
  }

  const preview = {
    success: true,
    dry_run: dryRun,
    noop: plan.noop,
    currently_must_pay: plan.currentlyMustPay,
    next_must_pay: plan.nextMustPay,
    next_charge_percentage: plan.nextChargePercentage,
    credit_delta_rappen: plan.creditDeltaRappen,
    summary: plan.summary,
  }

  if (dryRun || plan.noop) return preview

  if (note.length < 3) {
    throw createError({ statusCode: 400, statusMessage: 'Vermerk muss mindestens 3 Zeichen haben.' })
  }
  if (note.length > 500) {
    throw createError({ statusCode: 400, statusMessage: 'Vermerk darf höchstens 500 Zeichen haben.' })
  }

  const previousCharge = appointment.cancellation_charge_percentage
  // The charge column is the lock. Remember the outgoing percentage on the
  // payment first, so a crash after the wallet write can still restore a
  // partial fee and can still finish the payment status without a second credit.
  if (plan.nextChargePercentage === 0 && typeof previousCharge === 'number' && previousCharge > 0) {
    for (const payment of payments || []) {
      const metadata = stampableObligationMemory(payment, previousCharge)
      if (!metadata) continue
      const { error: memoryError } = await supabase
        .from('payments')
        .update({ metadata, updated_at: new Date().toISOString() })
        .eq('id', payment.id)
        .eq('tenant_id', profile.tenant_id)
        .eq('user_id', appointment.user_id)
      if (memoryError) {
        throw createError({ statusCode: 500, statusMessage: 'Die bisherige Gebühr konnte nicht gesichert werden.' })
      }
    }
  }

  const claimed = await setCharge(supabase, appointment.id, profile.tenant_id, previousCharge, plan.nextChargePercentage)
  if (!claimed) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Die Zahlpflicht wurde gerade geändert. Bitte die Ansicht neu laden.',
    })
  }

  let credited = false
  let appliedDelta = 0
  try {
    let balanceRappen: number | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      const currentPlan: ObligationPlan = attempt === 0
        ? plan
        : await readObligationPlan(supabase, appointment, profile.tenant_id, mustPay, note)
      if (currentPlan.creditDeltaRappen === 0 || !currentPlan.ledgerNote) break
      try {
        const credit = await applyStudentCreditDelta(supabase, {
          userId: appointment.user_id,
          tenantId: profile.tenant_id,
          deltaRappen: currentPlan.creditDeltaRappen,
          transactionType: currentPlan.creditDeltaRappen > 0 ? 'cancellation_charge_waiver' : 'cancellation_charge_reinstate',
          notes: currentPlan.ledgerNote,
          description: currentPlan.summary,
          referenceType: 'appointment',
          referenceId: appointment.id,
          createdBy: profile.id,
          paymentMethod: currentPlan.creditDeltaRappen > 0 ? 'refund' : 'adjustment',
          maxAttempts: 1,
        })
        appliedDelta = currentPlan.creditDeltaRappen
        credited = true
        balanceRappen = credit.balanceAfterRappen
        break
      } catch (creditError) {
        if (!(creditError instanceof StudentCreditConflict) || attempt === 2) throw creditError
      }
    }

    for (const update of plan.paymentUpdates) {
      const { data: current, error: readError } = await supabase
        .from('payments')
        .select('notes')
        .eq('id', update.id)
        .eq('tenant_id', profile.tenant_id)
        .eq('user_id', appointment.user_id)
        .maybeSingle()
      if (readError) throw new Error(readError.message)

      const patch: Record<string, unknown> = {
        payment_status: update.payment_status,
        metadata: update.metadata,
        notes: appendNote(current?.notes, update.noteSuffix),
        updated_at: new Date().toISOString(),
      }
      if (update.credit_used_rappen !== undefined) patch.credit_used_rappen = update.credit_used_rappen
      if (update.refunded_at !== undefined) patch.refunded_at = update.refunded_at

      const { error: updateError } = await supabase
        .from('payments')
        .update(patch)
        .eq('id', update.id)
        .eq('tenant_id', profile.tenant_id)
        .eq('user_id', appointment.user_id)
      if (updateError) throw new Error(updateError.message)
    }

    await logAudit({
      user_id: profile.id,
      auth_user_id: profile.auth_user_id,
      action: 'cancellation_obligation_change',
      resource_type: 'appointment',
      resource_id: appointment.id,
      status: 'success',
      tenant_id: profile.tenant_id,
      details: {
        must_pay: mustPay,
        previous_charge_percentage: previousCharge,
        next_charge_percentage: plan.nextChargePercentage,
        credit_delta_rappen: credited ? appliedDelta : plan.creditDeltaRappen,
        note,
      },
    }, event)

    return {
      ...preview,
      dry_run: false,
      credit_delta_rappen: credited ? appliedDelta : plan.creditDeltaRappen,
      balance_rappen: balanceRappen,
    }
  } catch (error: any) {
    logger.error('❌ Cancellation obligation change failed', {
      appointmentId: appointment.id,
      error: error?.message,
    })
    if (credited) {
      try {
        await applyStudentCreditDelta(supabase, {
          userId: appointment.user_id,
          tenantId: profile.tenant_id,
          deltaRappen: -appliedDelta,
          transactionType: 'cancellation_charge_reinstate',
          notes: `Rollback: ${note}`,
          description: 'Rollback der Zahlpflicht-Änderung',
          referenceType: 'appointment',
          referenceId: appointment.id,
          createdBy: profile.id,
          paymentMethod: 'adjustment',
        })
      } catch (rollbackError: any) {
        logger.error('❌ Credit rollback after failed obligation change failed', {
          appointmentId: appointment.id,
          error: rollbackError?.message,
        })
      }
    }
    await setCharge(supabase, appointment.id, profile.tenant_id, plan.nextChargePercentage, previousCharge)
    await logAudit({
      user_id: profile.id,
      auth_user_id: profile.auth_user_id,
      action: 'cancellation_obligation_change',
      resource_type: 'appointment',
      resource_id: appointment.id,
      status: 'error',
      tenant_id: profile.tenant_id,
      error_message: error?.message || 'failed',
    }, event)
    throw createError({
      statusCode: 500,
      statusMessage: 'Die Zahlpflicht konnte nicht geändert werden.',
    })
  }
})

async function readObligationPlan(
  supabase: any,
  appointment: { id: string; user_id: string; status: string; cancellation_charge_percentage: number | null },
  tenantId: string,
  mustPay: boolean,
  note: string
): Promise<ObligationPlan> {
  const { data: payments, error: paymentError } = await supabase
    .from('payments')
    .select('id, payment_status, total_amount_rappen, credit_used_rappen, amount_paid_rappen, refunded_amount_rappen, notes, metadata, user_id, tenant_id')
    .eq('appointment_id', appointment.id)
    .eq('tenant_id', tenantId)
    .eq('user_id', appointment.user_id)
  if (paymentError) throw new Error(paymentError.message)

  const referenceIds = [appointment.id, ...(payments || []).map((payment: { id: string }) => payment.id)]
  const { data: ledgerRows, error: ledgerError } = await supabase
    .from('credit_transactions')
    .select('transaction_type, amount_rappen, payment_method, balance_before_rappen, balance_after_rappen, notes, reference_id, tenant_id')
    .eq('user_id', appointment.user_id)
    .in('reference_id', referenceIds)
  if (ledgerError) throw new Error(ledgerError.message)

  const { data: freshAppointment, error: appointmentError } = await supabase
    .from('appointments')
    .select('status, cancellation_charge_percentage')
    .eq('id', appointment.id)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (appointmentError || !freshAppointment) throw new Error(appointmentError?.message || 'Termin nicht gefunden.')

  const ledger = (ledgerRows || []).filter((row: { tenant_id?: string | null }) => !row.tenant_id || row.tenant_id === tenantId)
  const plan = planCancellationObligationChange({
    appointmentStatus: freshAppointment.status,
    chargePercentage: freshAppointment.cancellation_charge_percentage,
    mustPay,
    note,
    payments: payments || [],
    ledger,
    nowIso: new Date().toISOString(),
  })
  if (!plan.ok) throw new Error(plan.error)
  return plan
}

async function setCharge(
  supabase: any,
  appointmentId: string,
  tenantId: string,
  fromCharge: number | null,
  toCharge: number | null
): Promise<boolean> {
  let query = supabase
    .from('appointments')
    .update({ cancellation_charge_percentage: toCharge })
    .eq('id', appointmentId)
    .eq('tenant_id', tenantId)
    .eq('status', 'cancelled')

  query = fromCharge == null
    ? query.is('cancellation_charge_percentage', null)
    : query.eq('cancellation_charge_percentage', fromCharge)

  const { data, error } = await query.select('id').maybeSingle()
  if (error) throw new Error(error.message)
  return !!data
}
