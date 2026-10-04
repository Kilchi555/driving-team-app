/**
 * Historical cash attribution.
 *
 * legacy_service_staff does NOT mean the appointment staff took the cash.
 * The cashier is unknown. service_staff_id is only the person who delivered
 * the lesson, used as a documented historical proxy.
 *
 * cashier_staff_id stays null for that proxy. A later payment may set
 * cashier_staff_id and attribution = 'cashier_staff'. The appointment
 * trigger must not do that.
 *
 * This classifier is the spec for cash_ledger_classify_payments() in
 * migrations/20261004_cash_ledger_foundation.sql. Keep the two in step.
 * It does not write payments, refunds, movements, or balances.
 */

export const CASH_ATTRIBUTIONS = ['cashier_staff', 'legacy_service_staff', 'unknown'] as const

export type CashAttribution = (typeof CASH_ATTRIBUTIONS)[number]

export type LegacyExcludeReason =
  | 'not_completed_cash'
  | 'identity'
  | 'refund'
  | 'original_completed'
  | 'ambiguous'
  | 'foreign_tenant'

export type LegacyBucket = 'legacy_no_switch' | 'legacy_wallee' | 'legacy_invoice' | 'legacy_other_switch'

export type HistoricalCashInput = {
  paymentMethod: string | null
  paymentStatus: string | null
  appointmentId: string | null
  paymentStaffId: string | null
  appointmentStaffId: string | null
  paymentTenantId: string | null
  appointmentTenantId: string | null
  /** Tenant the caller is allowed to attribute. Cross-tenant inputs are excluded. */
  scopeTenantId: string
  totalAmountRappen: number
  amountPaidRappen: number | null
  creditUsedRappen: number
  refundedAmountRappen: number
  partialSumRappen: number
  cashTransactionCount: number
  cashTransactionAmountRappen: number
  /** Set when the cash row already belongs to a different tenant. Null is allowed. */
  cashTransactionTenantId: string | null
  successfulRefund: boolean
  /** Non-null when an audit row changed a real previous method onto cash. */
  switchedFrom: string | null
  /** True when that previous method already reached completed or paid. */
  originalMethodCompleted: boolean
}

export type HistoricalCashDecision =
  | {
      kind: 'legacy_service_staff'
      bucket: LegacyBucket
      serviceStaffId: string
      tenantId: string
    }
  | { kind: 'exclude'; reason: LegacyExcludeReason }

export type CashAttributionRow = {
  cashierStaffId: string | null
  serviceStaffId: string | null
  attribution: CashAttribution | null
  tenantId: string | null
}

/**
 * A cash sum is exact only when every stored figure describes that same sum.
 * Credit, a partial history that does not add up, or a cash row that disagrees
 * with the payment total is ambiguous and must not be forced into one column.
 */
export function cashAmountIsExact(input: Pick<
  HistoricalCashInput,
  | 'totalAmountRappen'
  | 'amountPaidRappen'
  | 'creditUsedRappen'
  | 'refundedAmountRappen'
  | 'partialSumRappen'
  | 'cashTransactionCount'
  | 'cashTransactionAmountRappen'
>): boolean {
  if (input.creditUsedRappen !== 0) return false
  if (input.refundedAmountRappen !== 0) return false
  if (input.cashTransactionCount !== 1) return false
  if (input.cashTransactionAmountRappen !== input.totalAmountRappen) return false
  if (input.partialSumRappen !== 0 && input.partialSumRappen !== input.totalAmountRappen) return false
  if (input.amountPaidRappen != null && input.amountPaidRappen !== input.totalAmountRappen) return false
  return true
}

export function classifyHistoricalCashPayment(input: HistoricalCashInput): HistoricalCashDecision {
  if (input.paymentStatus === 'refunded' || input.successfulRefund) {
    return { kind: 'exclude', reason: 'refund' }
  }

  if (input.paymentMethod !== 'cash' || input.paymentStatus !== 'completed' || !input.appointmentId) {
    return { kind: 'exclude', reason: 'not_completed_cash' }
  }

  if (
    !input.paymentStaffId
    || !input.appointmentStaffId
    || input.paymentStaffId !== input.appointmentStaffId
    || !input.paymentTenantId
    || input.paymentTenantId !== input.scopeTenantId
    || input.appointmentTenantId !== input.paymentTenantId
  ) {
    return { kind: 'exclude', reason: 'identity' }
  }

  if (
    input.cashTransactionTenantId != null
    && input.cashTransactionTenantId !== input.paymentTenantId
  ) {
    return { kind: 'exclude', reason: 'foreign_tenant' }
  }

  if (input.switchedFrom && input.originalMethodCompleted) {
    return { kind: 'exclude', reason: 'original_completed' }
  }

  if (!cashAmountIsExact(input)) {
    return { kind: 'exclude', reason: 'ambiguous' }
  }

  const bucket: LegacyBucket = !input.switchedFrom
    ? 'legacy_no_switch'
    : input.switchedFrom === 'wallee'
      ? 'legacy_wallee'
      : input.switchedFrom === 'invoice'
        ? 'legacy_invoice'
        : 'legacy_other_switch'

  return {
    kind: 'legacy_service_staff',
    bucket,
    serviceStaffId: input.appointmentStaffId,
    tenantId: input.paymentTenantId,
  }
}

/**
 * Sets only service staff, legacy attribution, and tenant.
 * Leaves cashier_staff_id null. Refuses to overwrite a cashier or an attribution.
 * Returns null when the row must stay unchanged.
 */
/**
 * Insert rule for the protect trigger.
 * An appointment row with no attribution becomes unknown, so a later backfill
 * cannot treat it as legacy_service_staff. A non-appointment row (product sale,
 * credit deposit) keeps a null attribution. legacy_service_staff is not an
 * insert value. The caller is not a cashier input.
 */
export function attributionForNewCashInsert(input: {
  appointmentId: string | null
  attribution: CashAttribution | null
}): CashAttribution | null | 'reject_legacy_insert' {
  if (input.attribution === 'legacy_service_staff') return 'reject_legacy_insert'
  if (input.appointmentId && input.attribution == null) return 'unknown'
  return input.attribution
}

export function applyLegacyAttribution(
  row: CashAttributionRow,
  decision: HistoricalCashDecision,
): CashAttributionRow | null {
  if (decision.kind !== 'legacy_service_staff') return null
  if (row.cashierStaffId != null) return null
  if (row.attribution != null) return null
  if (row.tenantId != null && row.tenantId !== decision.tenantId) return null

  return {
    cashierStaffId: null,
    serviceStaffId: decision.serviceStaffId,
    attribution: 'legacy_service_staff',
    tenantId: decision.tenantId,
  }
}
