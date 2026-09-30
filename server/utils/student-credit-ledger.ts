import { logger } from '~/utils/logger'

export class StudentCreditConflict extends Error {
  constructor() {
    super('credit_conflict')
    this.name = 'StudentCreditConflict'
  }
}

export type StudentCreditDeltaArgs = {
  userId: string
  tenantId: string
  deltaRappen: number
  transactionType: string
  notes: string
  description: string
  referenceType: string
  referenceId?: string | null
  createdBy: string
  paymentMethod: string
  maxAttempts?: number
}

export type StudentCreditDeltaResult = {
  balanceBeforeRappen: number
  balanceAfterRappen: number
  transactionId: string | null
}

type CreditRow = { id: string; balance_rappen: number | null }

/**
 * Inserts the ledger row first, then moves the balance only if it is still
 * the value we read. A lost race deletes the ledger row and retries.
 * Negative balances are allowed: reversing a spent refund leaves a debt.
 */
export async function applyStudentCreditDelta(
  supabase: any,
  args: StudentCreditDeltaArgs
): Promise<StudentCreditDeltaResult> {
  if (!Number.isInteger(args.deltaRappen) || args.deltaRappen === 0) {
    const existing = await loadCredit(supabase, args.userId, args.tenantId)
    const balance = existing?.balance_rappen || 0
    return { balanceBeforeRappen: balance, balanceAfterRappen: balance, transactionId: null }
  }

  const maxAttempts = args.maxAttempts ?? 3
  let lastError: string | null = null
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const credit = await loadOrCreateCredit(supabase, args.userId, args.tenantId)
    const balanceBefore = Math.round(Number(credit.balance_rappen) || 0)
    const balanceAfter = balanceBefore + args.deltaRappen

    const { data: transaction, error: insertError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: args.userId,
        tenant_id: args.tenantId,
        amount_rappen: args.deltaRappen,
        transaction_type: args.transactionType,
        balance_before_rappen: balanceBefore,
        balance_after_rappen: balanceAfter,
        payment_method: args.paymentMethod,
        reference_type: args.referenceType,
        reference_id: args.referenceId || null,
        created_by: args.createdBy,
        notes: args.notes,
        description: args.description,
      })
      .select('id')
      .single()

    if (insertError || !transaction?.id) {
      throw new Error(insertError?.message || 'Guthaben-Buchung konnte nicht gespeichert werden.')
    }

    const { data: updated, error: updateError } = await supabase
      .from('student_credits')
      .update({
        balance_rappen: balanceAfter,
        updated_at: new Date().toISOString(),
      })
      .eq('id', credit.id)
      .eq('tenant_id', args.tenantId)
      .eq('balance_rappen', balanceBefore)
      .select('balance_rappen')
      .maybeSingle()

    if (!updateError && updated) {
      return {
        balanceBeforeRappen: balanceBefore,
        balanceAfterRappen: balanceAfter,
        transactionId: transaction.id,
      }
    }

    await supabase.from('credit_transactions').delete().eq('id', transaction.id).eq('tenant_id', args.tenantId)
    lastError = updateError?.message || 'Guthaben wurde zwischenzeitlich verändert.'
    logger.warn('⚠️ Credit balance compare-and-swap missed, retrying', {
      userId: args.userId,
      attempt,
      lastError,
    })
  }

  if (maxAttempts === 1) throw new StudentCreditConflict()
  throw new Error(lastError || 'Guthaben konnte nicht aktualisiert werden.')
}

async function loadCredit(supabase: any, userId: string, tenantId: string): Promise<CreditRow | null> {
  const { data, error } = await supabase
    .from('student_credits')
    .select('id, balance_rappen')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data || null
}

async function loadOrCreateCredit(supabase: any, userId: string, tenantId: string): Promise<CreditRow> {
  const existing = await loadCredit(supabase, userId, tenantId)
  if (existing) return existing

  const { data, error } = await supabase
    .from('student_credits')
    .insert({ user_id: userId, tenant_id: tenantId, balance_rappen: 0 })
    .select('id, balance_rappen')
    .single()

  if (!error && data) return data

  const raced = await loadCredit(supabase, userId, tenantId)
  if (raced) return raced
  throw new Error(error?.message || 'Guthaben-Konto konnte nicht angelegt werden.')
}
