import { createError } from 'h3'

export type ObligationRepairOutcome = {
  applied: boolean
  alreadyApplied: boolean
  stale: boolean
  amountRappen: number
  balanceRappen: number | null
  transactionId: string | null
  basisAfter: string | null
}

type RepairRpcError = { message?: string }
type RepairRpcClient = {
  rpc: (
    fn: 'apply_cancellation_obligation_repair',
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: RepairRpcError | null }>
}

export type ObligationRepairInput = {
  appointmentId: string
  userId: string
  tenantId: string
  deltaRappen: number
  transactionType: 'cancellation_charge_waiver' | 'cancellation_charge_reinstate'
  expectedBasisId: string
  note: string
  description: string
  paymentMethod: 'refund' | 'adjustment'
  createdBy: string | null
}

function repairFailure(error: RepairRpcError | null): never {
  const message = error?.message || ''
  if (message.includes('appointment_mismatch')) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Der stornierte Termin gehört nicht zu diesem Mandanten.',
    })
  }
  if (message.includes('invalid_repair_')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Die Guthaben-Korrektur ist ungültig.',
    })
  }
  throw createError({
    statusCode: 500,
    statusMessage: 'Die Guthaben-Korrektur konnte nicht gespeichert werden.',
  })
}

function asRow(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) {
    const first = data[0]
    return first && typeof first === 'object' ? first as Record<string, unknown> : null
  }
  if (data && typeof data === 'object') return data as Record<string, unknown>
  return null
}

export async function applyCancellationObligationRepair(
  supabase: RepairRpcClient,
  input: ObligationRepairInput,
): Promise<ObligationRepairOutcome> {
  const { data, error } = await supabase.rpc('apply_cancellation_obligation_repair', {
    p_appointment_id: input.appointmentId,
    p_user_id: input.userId,
    p_tenant_id: input.tenantId,
    p_delta_rappen: input.deltaRappen,
    p_transaction_type: input.transactionType,
    p_expected_basis_id: input.expectedBasisId,
    p_note: input.note,
    p_description: input.description,
    p_payment_method: input.paymentMethod,
    p_created_by: input.createdBy,
  })
  if (error) repairFailure(error)

  const row = asRow(data)
  if (!row) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Die Guthaben-Korrektur konnte nicht gespeichert werden.',
    })
  }

  return {
    applied: row.applied === true,
    alreadyApplied: row.already_applied === true,
    stale: row.stale === true,
    amountRappen: Math.round(Number(row.amount_rappen) || 0),
    balanceRappen: row.balance_rappen == null ? null : Math.round(Number(row.balance_rappen)),
    transactionId: typeof row.transaction_id === 'string' ? row.transaction_id : null,
    basisAfter: typeof row.basis_after === 'string' ? row.basis_after : null,
  }
}
