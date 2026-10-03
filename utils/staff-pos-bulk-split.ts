/**
 * Splits one cash-dialog amount across deferred completion and ordinary bulk payments.
 * Staff-POS rows that this dialog does not settle are left out of the bulk amount.
 */
import { isDeferredStaffProductSale, isStaffProductSalePayment } from '~/utils/staff-product-sale-display'

export type StaffPosBulkKind = 'deferred' | 'invoice' | 'wallee' | 'cash' | 'withheld' | 'normal'

type BulkPayment = {
  payment_method?: string | null
  appointment_id?: string | null
  metadata?: { source?: string; fulfillment?: string } | null
} | null | undefined

export function staffPosBulkKind(payment: BulkPayment): StaffPosBulkKind {
  if (!isStaffProductSalePayment(payment)) return 'normal'
  if (isDeferredStaffProductSale(payment)) return 'deferred'
  const method = payment?.payment_method
  const fulfillment = payment?.metadata?.fulfillment
  if (method === 'wallee' || fulfillment === 'wallee') return 'wallee'
  if (method === 'cash' || fulfillment === 'cash') return 'cash'
  if (method === 'invoice' || fulfillment === 'invoice' || fulfillment === 'invoice_send') return 'invoice'
  return 'withheld'
}

export interface StaffPosBulkRow {
  id: string
  dueRappen: number
  kind: StaffPosBulkKind
}

export interface StaffPosBulkPlan {
  deferredIds: string[]
  completeDeferred: boolean
  deferredDueRappen: number
  invoiceSaleIds: string[]
  walleeSaleIds: string[]
  cashSaleIds: string[]
  withheldIds: string[]
  normalIds: string[]
  /** null means the bulk call pays the ordinary rows in full, with no partial amount. */
  bulkPartialRappen: number | null
  callBulk: boolean
}

function sumDue(rows: StaffPosBulkRow[]): number {
  return rows.reduce((sum, row) => sum + Math.max(0, row.dueRappen || 0), 0)
}

function ids(rows: StaffPosBulkRow[]): string[] {
  return rows.map((row) => row.id)
}

/**
 * Entered cash covers the whole selection. Only a deferred sale that is actually
 * completed is removed as settled. Every other staff-POS due stays out of the
 * amount sent to ordinary payments, and that amount cannot exceed those
 * payments plus a genuine overpayment above the whole selection.
 */
export function planStaffPosBulkRemainder(args: {
  method: 'cash' | 'online'
  enteredRappen?: number
  rows: StaffPosBulkRow[]
}): StaffPosBulkPlan {
  const deferred = args.rows.filter((row) => row.kind === 'deferred')
  const invoice = args.rows.filter((row) => row.kind === 'invoice')
  const wallee = args.rows.filter((row) => row.kind === 'wallee')
  const cash = args.rows.filter((row) => row.kind === 'cash')
  const withheld = args.rows.filter((row) => row.kind === 'withheld')
  const normal = args.rows.filter((row) => row.kind === 'normal')
  const deferredDueRappen = sumDue(deferred)
  const normalDueRappen = sumDue(normal)
  const selectedDueRappen = sumDue(args.rows)
  const enteredIsNumber = typeof args.enteredRappen === 'number'
  const completeDeferred = args.method === 'cash'
    && deferred.length > 0
    && (!enteredIsNumber || (args.enteredRappen as number) >= deferredDueRappen)

  let bulkPartialRappen: number | null = null
  if (enteredIsNumber) {
    const entered = args.enteredRappen as number
    const settledDeferred = completeDeferred ? deferredDueRappen : 0
    const available = Math.max(0, entered - settledDeferred)
    const trueOverpayment = Math.max(0, entered - selectedDueRappen)
    const cap = normalDueRappen + trueOverpayment
    bulkPartialRappen = Math.min(available, cap)
  }

  const callBulk = normal.length > 0 && (bulkPartialRappen === null || bulkPartialRappen > 0)
  return {
    deferredIds: ids(deferred),
    completeDeferred,
    deferredDueRappen,
    invoiceSaleIds: ids(invoice),
    walleeSaleIds: ids(wallee),
    cashSaleIds: ids(cash),
    withheldIds: ids(withheld),
    normalIds: ids(normal),
    bulkPartialRappen,
    callBulk,
  }
}
