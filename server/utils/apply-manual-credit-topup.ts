export class ManualTopupRejected extends Error {
  readonly statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'ManualTopupRejected'
    this.statusCode = statusCode
  }
}

export type ManualTopupApplyResult = {
  balanceRappen: number
  creditedRappen: number
  transactionId: string | null
  replayed: boolean
}

type RpcError = { message?: string; code?: string }

function mapRpcError(error: RpcError): ManualTopupRejected {
  const message = error.message || ''
  if (message.includes('idempotency_user_mismatch')) {
    return new ManualTopupRejected(409, 'Dieser Vorgang gehört zu einem anderen Kunden.')
  }
  if (
    message.includes('invalid_amount')
    || message.includes('invalid_note')
    || message.includes('invalid_identity')
    || message.includes('invalid_idempotency_key')
  ) {
    return new ManualTopupRejected(400, 'Die Aufladung ist ungültig.')
  }
  return new ManualTopupRejected(500, 'Guthaben konnte nicht aufgeladen werden.')
}

function firstRow(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) {
    const row = data[0]
    return row && typeof row === 'object' ? row as Record<string, unknown> : null
  }
  if (data && typeof data === 'object') return data as Record<string, unknown>
  return null
}

/**
 * One database call. The unique index inside apply_manual_credit_topup is the
 * guarantee: a second call with the same key does not insert or increment.
 */
export async function applyManualCreditTopup(
  supabase: { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: RpcError | null }> },
  args: {
    userId: string
    tenantId: string
    idempotencyKey: string
    amountRappen: number
    note: string
    createdBy: string
  }
): Promise<ManualTopupApplyResult> {
  const { data, error } = await supabase.rpc('apply_manual_credit_topup', {
    p_user_id: args.userId,
    p_tenant_id: args.tenantId,
    p_idempotency_key: args.idempotencyKey,
    p_amount: args.amountRappen,
    p_note: args.note,
    p_created_by: args.createdBy,
  })
  if (error) throw mapRpcError(error)

  const row = firstRow(data)
  if (!row || typeof row.balance_rappen !== 'number' || typeof row.amount_rappen !== 'number') {
    throw new ManualTopupRejected(500, 'Guthaben konnte nicht aufgeladen werden.')
  }
  return {
    balanceRappen: row.balance_rappen,
    creditedRappen: row.amount_rappen,
    transactionId: typeof row.transaction_id === 'string' ? row.transaction_id : null,
    replayed: row.already_applied === true,
  }
}
