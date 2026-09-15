export type ApplyCreditToPaymentResult = {
  payment_id: string
  credit_used_rappen: number
  remaining_amount_rappen: number
  payment_status: string | null
  credit_to_use_rappen: number
  credit_transaction_id: string | null
  applied: boolean
}

export function capStaffAppointmentCredit(input: {
  availableWalletRappen: number
  payableRappen: number
  alreadyUsedRappen: number
  requestedRappen: number
}): number {
  const availableWallet = Math.max(0, Math.round(Number(input.availableWalletRappen) || 0))
  const payable = Math.max(0, Math.round(Number(input.payableRappen) || 0))
  const alreadyUsed = Math.max(0, Math.round(Number(input.alreadyUsedRappen) || 0))
  const requested = Math.max(0, Math.round(Number(input.requestedRappen) || 0))
  const remainingCapacity = Math.max(0, payable - alreadyUsed)
  if (requested <= 0 || remainingCapacity <= 0 || availableWallet <= 0) return 0
  return Math.min(availableWallet, remainingCapacity, requested)
}

function firstRpcRow(data: unknown): ApplyCreditToPaymentResult | null {
  const row = Array.isArray(data) ? data[0] : data
  if (!row || typeof row !== 'object') return null
  const r = row as Record<string, unknown>
  if (!r.payment_id) return null
  return {
    payment_id: String(r.payment_id),
    credit_used_rappen: Math.round(Number(r.credit_used_rappen) || 0),
    remaining_amount_rappen: Math.round(Number(r.remaining_amount_rappen) || 0),
    payment_status: r.payment_status == null ? null : String(r.payment_status),
    credit_to_use_rappen: Math.round(Number(r.credit_to_use_rappen) || 0),
    credit_transaction_id: r.credit_transaction_id ? String(r.credit_transaction_id) : null,
    applied: r.applied === true,
  }
}

export async function applyCreditToPayment(
  supabase: { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }> },
  opts: {
    paymentId: string
    tenantId: string
    requestedRappen: number
    actorUserId: string
  },
): Promise<ApplyCreditToPaymentResult> {
  const { data, error } = await supabase.rpc('apply_credit_to_payment', {
    p_payment_id: opts.paymentId,
    p_tenant_id: opts.tenantId,
    p_requested_rappen: Math.round(Number(opts.requestedRappen) || 0),
    p_actor_user_id: opts.actorUserId,
  })
  const row = firstRpcRow(data)
  if (error || !row) {
    throw new Error(error?.message || 'Guthaben konnte nicht auf die Zahlung angewendet werden')
  }
  return row
}
