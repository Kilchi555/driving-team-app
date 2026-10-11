import type { SupabaseClient } from '@supabase/supabase-js'
import type { ValidatedLineSettlement } from '~/server/utils/invoice-create-settlement'

export interface CreateInvoiceRpcResult {
  ok: boolean
  replayed: boolean
  invoice_id: string
  invoice_number: string
  paid_amount_rappen: number
  payment_status: string
  total_amount_rappen: number
  outstanding_rappen: number
}

export async function callCreateInvoiceWithSettlement(opts: {
  supabase: SupabaseClient | { rpc: Function }
  actorUserId: string
  idempotencyKey: string | null
  invoice: Record<string, unknown>
  items: Record<string, unknown>[]
  settlements: ValidatedLineSettlement[]
}): Promise<CreateInvoiceRpcResult> {
  const { data, error } = await opts.supabase.rpc('create_invoice_with_settlement', {
    p_actor_user_id: opts.actorUserId,
    p_idempotency_key: opts.idempotencyKey,
    p_invoice: opts.invoice,
    p_items: opts.items,
    p_settlements: opts.settlements.map((s) => ({
      item_index: s.item_index,
      payment_method: s.payment_method,
      payment_date: s.payment_date,
      amount_rappen: s.amount_rappen,
      linked_payment_id: s.linked_payment_id,
      notes: s.notes,
    })),
  })

  if (error) {
    const msg = error.message || 'Invoice create RPC failed'
    const status =
      /forbidden|42501/i.test(msg) ? 403
        : /idempotency_conflict|idempotency_orphan|idempotency/i.test(msg) ? 409
          : /invalid_|overpayment|duplicate_/i.test(msg) ? 400
            : 500
    throw Object.assign(new Error(msg), {
      statusCode: status,
      statusMessage: msg,
      code: error.code,
    })
  }

  const row = (typeof data === 'string' ? JSON.parse(data) : data) as CreateInvoiceRpcResult
  if (!row?.ok || !row.invoice_id) {
    throw Object.assign(new Error('Invoice create RPC returned invalid payload'), {
      statusCode: 500,
      statusMessage: 'Invoice create RPC returned invalid payload',
    })
  }
  return row
}
