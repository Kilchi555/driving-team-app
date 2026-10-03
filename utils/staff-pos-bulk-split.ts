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

export type StaffPosCashExclusion = 'invoice' | 'wallee' | 'cash' | 'withheld' | 'deferred-short'

export interface StaffPosCashLine {
  id: string
  kind: StaffPosBulkKind
  dueRappen: number
  bookedRappen: number
  exclusion: StaffPosCashExclusion | null
  message: string | null
}

export interface StaffPosCashAccounting {
  plan: StaffPosBulkPlan
  enteredRappen: number
  accountedRappen: number
  unaccountedRappen: number
  overpaymentRappen: number
  bookedDeferredRappen: number
  bookedNormalRappen: number
  lines: StaffPosCashLine[]
  /** True only when every entered rappen is recorded by this cash flow. */
  confirmable: boolean
}

export interface StaffPosPermanentExclusion {
  kind: Exclude<StaffPosCashExclusion, 'deferred-short'>
  dueRappen: number
  message: string
}

const PERMANENT_EXCLUSION_ORDER = ['invoice', 'wallee', 'cash', 'withheld'] as const

export function staffPosExclusionCopy(exclusion: StaffPosCashExclusion): string {
  switch (exclusion) {
    case 'invoice':
      return 'Produktverkäufe auf Rechnung werden über die Rechnung bezahlt.'
    case 'wallee':
      return 'Offene Online-Produktverkäufe werden nicht über die Barzahlung abgeschlossen.'
    case 'cash':
      return 'Bar-Produktverkäufe werden in dieser Sammelzahlung nicht noch einmal verbucht.'
    case 'deferred-short':
      return 'Produktverkäufe können nur vollständig abgeschlossen werden.'
    default:
      return 'Dieser Betrag wird in dieser Barzahlung nicht verbucht.'
  }
}

function exclusionFor(kind: StaffPosBulkKind, completeDeferred: boolean): StaffPosCashExclusion | null {
  if (kind === 'invoice' || kind === 'wallee' || kind === 'cash' || kind === 'withheld') return kind
  if (kind === 'deferred' && !completeDeferred) return 'deferred-short'
  return null
}

/**
 * Reads one bulk-split plan and states exactly which entered rappen this cash
 * flow records. The dialog and the payment handler both use this result.
 */
export function accountStaffPosCash(args: {
  method: 'cash' | 'online'
  enteredRappen: number
  rows: StaffPosBulkRow[]
}): StaffPosCashAccounting {
  const enteredRappen = Math.max(0, Math.round(args.enteredRappen || 0))
  const plan = planStaffPosBulkRemainder({
    method: args.method,
    enteredRappen,
    rows: args.rows,
  })
  const normalRows = args.rows.filter((row) => row.kind === 'normal')
  const normalDue = sumDue(normalRows)
  const selectedDue = sumDue(args.rows)
  const bookedDeferredRappen = plan.completeDeferred ? plan.deferredDueRappen : 0
  // bulkPartial is only persisted when the bulk call runs. A deferred-only
  // surplus is not inside that call, so it must not be counted as booked here.
  const bookedNormalRappen = plan.callBulk
    ? (plan.bulkPartialRappen === null ? normalDue : plan.bulkPartialRappen)
    : 0
  const trueOverpayment = Math.max(0, enteredRappen - selectedDue)
  const deferredOnlyOverpayment = !plan.callBulk && plan.completeDeferred ? trueOverpayment : 0
  const accountedRappen = bookedDeferredRappen + bookedNormalRappen + deferredOnlyOverpayment
  const unaccountedRappen = Math.max(0, enteredRappen - accountedRappen)
  const overpaymentRappen = plan.callBulk
    ? Math.max(0, bookedNormalRappen - normalDue)
    : deferredOnlyOverpayment

  const allocation = new Map<string, number>()
  const sortedNormal = [...normalRows].sort((a, b) => a.dueRappen - b.dueRappen || a.id.localeCompare(b.id))
  let remaining = bookedNormalRappen
  for (const row of sortedNormal) {
    const due = Math.max(0, row.dueRappen || 0)
    const take = Math.min(Math.max(0, remaining), due)
    allocation.set(row.id, take)
    remaining -= take
  }

  const lines = args.rows.map((row) => {
    const dueRappen = Math.max(0, row.dueRappen || 0)
    const exclusion = exclusionFor(row.kind, plan.completeDeferred)
    let bookedRappen = 0
    if (row.kind === 'deferred' && plan.completeDeferred) bookedRappen = dueRappen
    if (row.kind === 'normal') bookedRappen = allocation.get(row.id) || 0
    return {
      id: row.id,
      kind: row.kind,
      dueRappen,
      bookedRappen,
      exclusion,
      message: exclusion ? staffPosExclusionCopy(exclusion) : null,
    }
  })

  return {
    plan,
    enteredRappen,
    accountedRappen,
    unaccountedRappen,
    overpaymentRappen,
    bookedDeferredRappen,
    bookedNormalRappen,
    lines,
    confirmable: enteredRappen > 0 && unaccountedRappen === 0 && accountedRappen === enteredRappen,
  }
}

/** Full cash amount this flow can record. Excluded staff-POS dues are omitted. */
export function staffPosCashBookableRappen(args: {
  method: 'cash' | 'online'
  rows: StaffPosBulkRow[]
}): number {
  const settleable = args.rows
    .filter((row) => row.kind === 'normal' || row.kind === 'deferred')
    .reduce((sum, row) => sum + Math.max(0, row.dueRappen || 0), 0)
  return accountStaffPosCash({
    method: args.method,
    enteredRappen: settleable,
    rows: args.rows,
  }).accountedRappen
}

export function staffPosPermanentExclusions(rows: StaffPosBulkRow[]): StaffPosPermanentExclusion[] {
  return PERMANENT_EXCLUSION_ORDER.flatMap((kind) => {
    const dueRappen = sumDue(rows.filter((row) => row.kind === kind))
    if (dueRappen <= 0 && !rows.some((row) => row.kind === kind)) return []
    return [{ kind, dueRappen, message: staffPosExclusionCopy(kind) }]
  })
}
