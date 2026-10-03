/**
 * Persists a genuine cash surplus from a deferred-only staff-POS selection.
 * The bulk endpoint cannot do this: it requires appointment payments and
 * rejects every staff-product sale. The surplus is a student-wallet deposit.
 * It does not update the deferred payment.
 */
import { StaffProductSaleError } from '~/server/utils/staff-product-sale'
import { applyStudentCreditDelta } from '~/server/utils/student-credit-ledger'
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

export function deferredCashOverpaymentKey(paymentIds: string[]): string {
  return `staff-pos-deferred-overpay:${[...paymentIds].sort().join(',')}`
}

export function deferredCashOverpaymentNote(amountRappen: number): string {
  return `Überzahlung bei Barzahlung (CHF ${(amountRappen / 100).toFixed(2)} Rückgeld)`
}

export async function creditDeferredCashOverpayment(args: {
  supabase: any
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

  const { data: existing, error: lookupError } = await args.supabase
    .from('credit_transactions')
    .select('id, amount_rappen, user_id')
    .eq('tenant_id', args.actorTenantId)
    .eq('user_id', studentId)
    .eq('transaction_type', 'deposit')
    .eq('payment_method', 'cash')
    .eq('reference_type', 'overpayment')
    .eq('description', key)
    .maybeSingle()

  if (lookupError) {
    throw new StaffProductSaleError('sale_failed', 500, 'Überzahlung konnte nicht geprüft werden')
  }
  if (existing) {
    if (existing.user_id !== studentId || existing.amount_rappen !== args.amountRappen) {
      throw new StaffProductSaleError('invalid_amount', 409, 'Überzahlung wurde bereits anders verbucht')
    }
    return { creditedRappen: 0, replayed: true }
  }

  await applyStudentCreditDelta(args.supabase, {
    userId: studentId,
    tenantId: args.actorTenantId,
    deltaRappen: args.amountRappen,
    transactionType: 'deposit',
    notes: deferredCashOverpaymentNote(args.amountRappen),
    description: key,
    referenceType: 'overpayment',
    referenceId: null,
    createdBy: args.actorId,
    paymentMethod: 'cash',
  })

  return { creditedRappen: args.amountRappen, replayed: false }
}
