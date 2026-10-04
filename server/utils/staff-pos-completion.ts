/**
 * Staff POS payment completion.
 * Deferred sales complete only through staff_pos_sale(complete).
 * Invoice sales credit only after the invoice payment is completed.
 * The RPC reads payments.metadata.products. This module does not read products.
 */
import { StaffProductSaleError } from '~/server/utils/staff-product-sale'
import { mapRpcError } from '~/server/utils/staff-product-sale-orchestrator'
import { isStaffProductSalePayment } from '~/utils/staff-product-sale-display'

export interface StaffPosCompletionPayment {
  id: string
  tenant_id?: string | null
  payment_method?: string | null
  payment_status?: string | null
  appointment_id?: string | null
  metadata?: { source?: string; fulfillment?: string } | null
}

export interface StaffPosCompletionResult {
  payment_status: string
  credit_applied: boolean
  replayed: boolean
  credit_rappen: number
}

const CLOSED = new Set(['failed', 'cancelled', 'refunded', 'partial', 'processing'])

export function staffPosCompleteArgs(actorId: string, paymentId: string) {
  return {
    p_actor_user_id: actorId,
    p_customer_id: null,
    p_items: [],
    p_idempotency_key: null,
    p_method: null,
    p_action: 'complete',
    p_payment_id: paymentId,
    p_claim_token: null,
  }
}

export function staffPosApplyCreditArgs(actorId: string, paymentId: string) {
  return {
    ...staffPosCompleteArgs(actorId, paymentId),
    p_action: 'apply_credit',
  }
}

export function refuseStaffPosCompletion(
  payment: StaffPosCompletionPayment | null | undefined,
  actorTenantId: string,
): StaffProductSaleError | null {
  if (!payment?.id || !payment.tenant_id || payment.tenant_id !== actorTenantId) {
    return new StaffProductSaleError('invalid_payment', 404, 'Zahlung nicht gefunden')
  }
  if (!isStaffProductSalePayment(payment) || payment.appointment_id) {
    return new StaffProductSaleError('invalid_payment', 409, 'Zahlung ist kein offener Produktverkauf')
  }
  if (payment.payment_method !== 'deferred') {
    return new StaffProductSaleError('invalid_method', 409, 'Nur später verrechnete Produktverkäufe können hier abgeschlossen werden')
  }
  if (payment.metadata?.fulfillment !== 'deferred') {
    return new StaffProductSaleError('invalid_fulfillment', 409, 'Zahlungsart passt nicht zum Abschluss')
  }
  if (payment.payment_status === 'pending' || payment.payment_status === 'completed') {
    return null
  }
  if (CLOSED.has(String(payment.payment_status || ''))) {
    return new StaffProductSaleError('invalid_transition', 409, 'Zahlung kann nicht abgeschlossen werden')
  }
  return new StaffProductSaleError('invalid_transition', 409, 'Zahlung kann nicht abgeschlossen werden')
}

type StaffPosRpcResult = {
  ok?: boolean
  payment_status?: string
  credit_applied?: boolean
  replayed?: boolean
  credit_rappen?: number
} | null

export async function completeDeferredStaffProductSale(opts: {
  rpc: (args: Record<string, unknown>) => Promise<StaffPosRpcResult>
  actorId: string
  actorTenantId: string
  payment: StaffPosCompletionPayment | null | undefined
}): Promise<StaffPosCompletionResult> {
  const refused = refuseStaffPosCompletion(opts.payment, opts.actorTenantId)
  if (refused) throw refused
  let data: StaffPosRpcResult
  try {
    data = await opts.rpc(staffPosCompleteArgs(opts.actorId, opts.payment!.id))
  } catch (error: unknown) {
    if (error instanceof StaffProductSaleError) throw error
    throw mapRpcError(error)
  }
  if (!data?.ok) {
    throw new StaffProductSaleError('sale_failed', 500, 'Verkauf konnte nicht abgeschlossen werden')
  }
  return {
    payment_status: String(data.payment_status || 'completed'),
    credit_applied: data.credit_applied === true,
    replayed: data.replayed === true,
    credit_rappen: Number(data.credit_rappen || 0),
  }
}

export async function applyStaffPosCreditsForPaidInvoice(opts: {
  payments: Array<{ id?: string | null; tenant_id?: string | null; metadata?: { source?: string } | null }>
  tenantId: string
  actorUserId: string
  isPartial: boolean
  rpc: (args: Record<string, unknown>) => Promise<StaffPosRpcResult>
}): Promise<{ credited: number }> {
  if (opts.isPartial) return { credited: 0 }
  const rows = (opts.payments || []).filter((payment) =>
    payment?.id
    && payment.tenant_id === opts.tenantId
    && isStaffProductSalePayment(payment)
  )
  let credited = 0
  for (const payment of rows) {
    let data: StaffPosRpcResult
    try {
      data = await opts.rpc(staffPosApplyCreditArgs(opts.actorUserId, String(payment.id)))
    } catch (error: unknown) {
      if (error instanceof StaffProductSaleError) throw error
      throw mapRpcError(error)
    }
    if (!data?.ok) {
      throw new StaffProductSaleError('sale_failed', 500, 'Guthaben konnte nicht gebucht werden')
    }
    if (data.credit_applied === true && data.replayed !== true) credited += 1
  }
  return { credited }
}
