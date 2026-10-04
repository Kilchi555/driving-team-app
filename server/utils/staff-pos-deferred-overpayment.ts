/**
 * Persists a genuine cash surplus from a deferred-only staff-POS selection.
 * The bulk endpoint cannot do this: it requires appointment payments and
 * rejects every staff-product sale. The surplus is a student-wallet deposit.
 * It does not update the deferred payment.
 *
 * Idempotency is the partial unique index inside
 * apply_staff_pos_deferred_cash_overpayment. The key is the tenant plus the
 * sorted deferred payment ids. The amount is not part of the key.
 */
import { StaffProductSaleError } from '~/server/utils/staff-product-sale'
import { isDeferredStaffProductSale } from '~/utils/staff-product-sale-display'

export interface DeferredOverpaymentPayment {
  id: string
  tenant_id?: string | null
  user_id?: string | null
  payment_method?: string | null
  payment_status?: string | null
  appointment_id?: string | null
  metadata?: { source?: string; fulfillment?: string } | null
}

export interface DeferredOverpaymentResult {
  creditedRappen: number
  replayed: boolean
}

type RpcError = { message?: string; code?: string; details?: string }

export type DeferredOverpaymentClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: RpcError | null }>
}

export function deferredCashOverpaymentKey(paymentIds: string[]): string {
  return `staff-pos-deferred-overpay:${[...paymentIds].sort().join(',')}`
}

export function deferredCashOverpaymentNote(amountRappen: number): string {
  return `Überzahlung bei Barzahlung (CHF ${(amountRappen / 100).toFixed(2)} Rückgeld)`
}

function firstRow(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) {
    const row = data[0]
    return row && typeof row === 'object' ? row as Record<string, unknown> : null
  }
  if (data && typeof data === 'object') return data as Record<string, unknown>
  return null
}

function mapRpcError(error: RpcError): Error {
  const message = `${error.message || ''} ${error.details || ''}`
  if (message.includes('overpayment_amount_mismatch') || message.includes('idempotency_user_mismatch')) {
    return new StaffProductSaleError('invalid_amount', 409, 'Überzahlung wurde bereits anders verbucht')
  }
  if (
    message.includes('invalid_amount')
    || message.includes('invalid_description')
    || message.includes('invalid_identity')
    || message.includes('invalid_note')
  ) {
    return new StaffProductSaleError('invalid_amount', 400, 'Überzahlung ist ungültig')
  }
  const failure = new Error(error.message || 'Überzahlung konnte nicht verbucht werden')
  if (error.code) {
    Object.assign(failure, { code: error.code })
  }
  return failure
}

export async function creditDeferredCashOverpayment(args: {
  supabase: DeferredOverpaymentClient
  actorId: string
  actorTenantId: string
  payments: DeferredOverpaymentPayment[]
  amountRappen: number
}): Promise<DeferredOverpaymentResult> {
  if (!Number.isInteger(args.amountRappen) || args.amountRappen <= 0) {
    throw new StaffProductSaleError('invalid_amount', 400, 'Überzahlung ist ungültig')
  }
  if (args.payments.length === 0) {
    throw new StaffProductSaleError('invalid_payment', 404, 'Zahlung nicht gefunden')
  }

  const studentIds = new Set<string>()
  for (const payment of args.payments) {
    if (!payment?.id || payment.tenant_id !== args.actorTenantId) {
      throw new StaffProductSaleError('invalid_payment', 404, 'Zahlung nicht gefunden')
    }
    if (payment.payment_status !== 'completed' || !isDeferredStaffProductSale(payment)) {
      throw new StaffProductSaleError('invalid_payment', 409, 'Überzahlung gehört nicht zu einem abgeschlossenen Produktverkauf')
    }
    if (!payment.user_id) {
      throw new StaffProductSaleError('invalid_payment', 409, 'Überzahlung hat keinen Schüler')
    }
    studentIds.add(payment.user_id)
  }
  if (studentIds.size !== 1) {
    throw new StaffProductSaleError('invalid_payment', 409, 'Überzahlung betrifft mehrere Schüler')
  }
  const studentId = [...studentIds][0]
  const key = deferredCashOverpaymentKey(args.payments.map((payment) => payment.id))

  const { data, error } = await args.supabase.rpc('apply_staff_pos_deferred_cash_overpayment', {
    p_user_id: studentId,
    p_tenant_id: args.actorTenantId,
    p_amount: args.amountRappen,
    p_description: key,
    p_note: deferredCashOverpaymentNote(args.amountRappen),
    p_created_by: args.actorId,
  })
  if (error) throw mapRpcError(error)

  const row = firstRow(data)
  if (!row || (row.applied !== true && row.already_applied !== true)) {
    throw new Error('Überzahlung konnte nicht verbucht werden')
  }
  if (row.already_applied === true) {
    return { creditedRappen: 0, replayed: true }
  }
  return { creditedRappen: args.amountRappen, replayed: false }
}
