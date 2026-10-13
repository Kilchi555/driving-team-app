/**
 * Cash-to-bank reconciliation domain.
 *
 * A reported or matched deposit is not money in the bank.
 * Reconciliation posts one balance-sheet transfer (Dr 1020 / Cr 1000)
 * into cash_bank_transfer_journals. It does not post income or expense,
 * and it does not write cash_balances or tenants.bank_balance_rappen.
 *
 * The accounting_entries.type check allows only income and expense, and the
 * accounting UI renders every non-income row as an expense. This transfer
 * therefore does not use accounting_entries. The posting itself is the
 * SQL function confirm_cash_bank_deposit(), which runs in one transaction.
 */

import { ledgerLinesBalanced, type LedgerLineDraft } from '~/server/utils/accounting-ledger'

export const BANK_ACCOUNT_NUMBER = '1020'
export const CASH_ACCOUNT_NUMBER = '1000'
export const DEPOSIT_DATE_WINDOW_DAYS = 7
export const DEPOSITOR_ROLES = ['staff', 'admin', 'tenant_admin', 'super_admin'] as const
export const CONFIRM_ROLES = ['admin', 'tenant_admin', 'super_admin'] as const

export type DepositStatus = 'reported' | 'matched' | 'reconciled' | 'cancelled'
export type AttributionStatus = 'unassigned' | 'reported' | 'confirmed'
export type MatchClass = 'exact' | 'suggestion' | 'ambiguous' | 'none' | 'unresolved_amount' | 'ineligible'
export type SourceKind = 'business' | 'staff' | 'admin'

export type DepositMatchInput = {
  id: string
  tenantId: string
  amountRappen: number
  reportedOn: string
  referenceToken: string
  status: DepositStatus
}

export type BankCreditInput = {
  dedupeKey: string
  amountRappen: number
  date: string
  currency?: string | null
  /** credit, debit, or reversal. CSV credits are passed as credit. */
  direction: 'credit' | 'debit' | 'reversal'
  reference?: string | null
  remittance?: string | null
}

export type OpenDeposit = {
  id: string
  tenantId: string
  status: DepositStatus
  amountRappen: number
  currency: string
  sourceKind: SourceKind
  sourceUserId: string | null
  depositorUserId: string | null
  attributionStatus: AttributionStatus
  referenceToken: string
  reportedOn: string
  reportedBy: string
  candidateDedupeKey: string | null
  bankImportRecordId: string | null
  journalId: string | null
}

export function cashToBankTransferLines(amountRappen: number): LedgerLineDraft[] {
  return [
    { account_number: BANK_ACCOUNT_NUMBER, debit_rappen: amountRappen, credit_rappen: 0 },
    { account_number: CASH_ACCOUNT_NUMBER, debit_rappen: 0, credit_rappen: amountRappen },
  ]
}

export function transferTouchesProfitAndLoss(lines: LedgerLineDraft[]): boolean {
  return lines.some(line => line.account_number !== BANK_ACCOUNT_NUMBER && line.account_number !== CASH_ACCOUNT_NUMBER)
}

const TRANSITIONS: Record<DepositStatus, DepositStatus[]> = {
  reported: ['matched', 'cancelled'],
  matched: ['reported', 'reconciled', 'cancelled'],
  reconciled: [],
  cancelled: [],
}

export function canTransition(from: DepositStatus, to: DepositStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

export function isEligibleDepositorRole(role: string | null | undefined): boolean {
  return !!role && (DEPOSITOR_ROLES as readonly string[]).includes(role)
}

export function canConfirmReconciliation(role: string | null | undefined): boolean {
  return !!role && (CONFIRM_ROLES as readonly string[]).includes(role)
}

export function canAssignDepositor(input: {
  actorRole: string
  actorId: string
  depositReportedBy: string
  nextDepositorId: string | null
  status: DepositStatus
}): boolean {
  if (input.status === 'reconciled' || input.status === 'cancelled') return false
  if (canConfirmReconciliation(input.actorRole)) return true
  if (input.actorRole !== 'staff') return false
  if (input.actorId !== input.depositReportedBy) return false
  return input.nextDepositorId === null || input.nextDepositorId === input.actorId
}

export function canCorrectAttribution(role: string, status: DepositStatus): boolean {
  return status === 'reconciled' && canConfirmReconciliation(role)
}

export type AttributionEvent = {
  previousUserId: string | null
  nextUserId: string | null
  actorId: string
  kind: 'assign' | 'correction'
  reason: string | null
}

export function planAttributionChange(input: {
  actorRole: string
  actorId: string
  depositReportedBy: string
  status: DepositStatus
  currentDepositorId: string | null
  nextDepositorId: string | null
  reason?: string | null
}): { ok: true; event: AttributionEvent; attributionStatus: AttributionStatus } | { ok: false; reason: string } {
  if (input.status === 'cancelled') return { ok: false, reason: 'cancelled' }
  if (input.currentDepositorId === input.nextDepositorId) return { ok: false, reason: 'unchanged' }

  if (input.status === 'reconciled') {
    if (!canCorrectAttribution(input.actorRole, input.status)) return { ok: false, reason: 'forbidden' }
    const reason = (input.reason ?? '').trim()
    if (reason.length < 3) return { ok: false, reason: 'reason_required' }
    return {
      ok: true,
      attributionStatus: input.nextDepositorId ? 'confirmed' : 'unassigned',
      event: {
        previousUserId: input.currentDepositorId,
        nextUserId: input.nextDepositorId,
        actorId: input.actorId,
        kind: 'correction',
        reason,
      },
    }
  }

  if (!canAssignDepositor({
    actorRole: input.actorRole,
    actorId: input.actorId,
    depositReportedBy: input.depositReportedBy,
    nextDepositorId: input.nextDepositorId,
    status: input.status,
  })) {
    return { ok: false, reason: 'forbidden' }
  }

  return {
    ok: true,
    attributionStatus: input.nextDepositorId ? 'reported' : 'unassigned',
    event: {
      previousUserId: input.currentDepositorId,
      nextUserId: input.nextDepositorId,
      actorId: input.actorId,
      kind: 'assign',
      reason: null,
    },
  }
}

/** The person who uploads a statement is not the depositor. */
export function depositorFromStatementImport(): null {
  return null
}

function dayNumber(isoDate: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate)
  if (!match) return null
  const utc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (Number.isNaN(utc)) return null
  return Math.floor(utc / 86_400_000)
}

export function datesWithinDepositWindow(reportedOn: string, bookedOn: string): boolean {
  const left = dayNumber(reportedOn)
  const right = dayNumber(bookedOn)
  if (left == null || right == null) return false
  return Math.abs(left - right) <= DEPOSIT_DATE_WINDOW_DAYS
}

function textContainsToken(entry: BankCreditInput, token: string): boolean {
  const needle = token.trim().toUpperCase()
  if (!needle) return false
  const haystack = `${entry.reference ?? ''} ${entry.remittance ?? ''}`.toUpperCase()
  return haystack.includes(needle)
}

export function matchCreditToDeposits(
  entry: BankCreditInput,
  deposits: readonly DepositMatchInput[],
): { matchClass: MatchClass; depositIds: string[] } {
  if (entry.direction !== 'credit' || entry.amountRappen <= 0) {
    return { matchClass: 'ineligible', depositIds: [] }
  }
  const currency = (entry.currency ?? 'CHF').toUpperCase()
  if (currency !== 'CHF') return { matchClass: 'ineligible', depositIds: [] }

  const open = deposits.filter(d => d.status === 'reported' || d.status === 'matched')
  const tokenHits = open.filter(d => textContainsToken(entry, d.referenceToken))
  if (tokenHits.length > 1) return { matchClass: 'ambiguous', depositIds: tokenHits.map(d => d.id) }
  if (tokenHits.length === 1) {
    if (tokenHits[0].amountRappen !== entry.amountRappen) {
      return { matchClass: 'unresolved_amount', depositIds: [tokenHits[0].id] }
    }
    return { matchClass: 'exact', depositIds: [tokenHits[0].id] }
  }

  const amountHits = open.filter(d => d.amountRappen === entry.amountRappen && datesWithinDepositWindow(d.reportedOn, entry.date))
  const nearAmount = open.filter(d => d.amountRappen !== entry.amountRappen && datesWithinDepositWindow(d.reportedOn, entry.date))
  if (amountHits.length > 1) return { matchClass: 'ambiguous', depositIds: amountHits.map(d => d.id) }
  if (amountHits.length === 1) return { matchClass: 'suggestion', depositIds: [amountHits[0].id] }
  if (nearAmount.length > 0) return { matchClass: 'unresolved_amount', depositIds: [] }
  return { matchClass: 'none', depositIds: [] }
}

export function referenceTokenForDeposit(id: string): string {
  const compact = id.replace(/-/g, '').slice(0, 8).toUpperCase()
  return `SIMYDEP${compact}`
}

export type ConfirmationPlan =
  | { action: 'post'; lines: LedgerLineDraft[] }
  | { action: 'already_reconciled'; journalId: string }
  | { action: 'reject'; reason: string }

export function planConfirmation(input: {
  deposit: OpenDeposit
  bankTenantId: string
  bankDedupeKey: string
  bankAmountRappen: number
  bankCurrency: string
  bankDirection: BankCreditInput['direction']
  bankAlreadyLinkedDepositId: string | null
  matchClass: MatchClass
}): ConfirmationPlan {
  if (input.deposit.tenantId !== input.bankTenantId) return { action: 'reject', reason: 'tenant' }
  if (!input.deposit.tenantId) return { action: 'reject', reason: 'tenant' }
  if (input.deposit.status === 'reconciled') {
    if (
      input.deposit.journalId
      && input.deposit.candidateDedupeKey === input.bankDedupeKey
    ) {
      return { action: 'already_reconciled', journalId: input.deposit.journalId }
    }
    return { action: 'reject', reason: 'already_reconciled_other' }
  }
  if (input.deposit.status !== 'matched') return { action: 'reject', reason: 'not_matched' }
  if (input.matchClass !== 'exact' && input.matchClass !== 'suggestion') {
    return { action: 'reject', reason: 'not_confirmable' }
  }
  if (input.bankDirection !== 'credit') return { action: 'reject', reason: 'not_credit' }
  if (input.bankCurrency.toUpperCase() !== 'CHF' || input.deposit.currency.toUpperCase() !== 'CHF') {
    return { action: 'reject', reason: 'currency' }
  }
  if (input.bankAmountRappen !== input.deposit.amountRappen || input.deposit.amountRappen <= 0) {
    return { action: 'reject', reason: 'amount' }
  }
  if (input.deposit.candidateDedupeKey !== input.bankDedupeKey) {
    return { action: 'reject', reason: 'candidate' }
  }
  if (input.bankAlreadyLinkedDepositId && input.bankAlreadyLinkedDepositId !== input.deposit.id) {
    return { action: 'reject', reason: 'bank_line_used' }
  }
  const lines = cashToBankTransferLines(input.deposit.amountRappen)
  if (!ledgerLinesBalanced(lines) || transferTouchesProfitAndLoss(lines)) {
    return { action: 'reject', reason: 'journal' }
  }
  return { action: 'post', lines }
}

/**
 * A failed journal leaves the deposit where it was. The database function
 * rolls the link and the status change back with the journal insert.
 */
export function commitConfirmation<T extends { status: DepositStatus; journalId: string | null; bankImportRecordId: string | null }>(
  deposit: T,
  outcome: 'posted' | 'failed',
  journalId: string | null,
  bankImportRecordId: string | null,
): T {
  if (outcome === 'failed') return { ...deposit }
  return {
    ...deposit,
    status: 'reconciled',
    journalId,
    bankImportRecordId,
  }
}

export function duplicateImportKeepsAttribution<T>(stored: T): T {
  return stored
}

export function tenantOwnsResource(
  resourceTenantId: string | null | undefined,
  actorTenantId: string,
): boolean {
  return !!resourceTenantId && resourceTenantId === actorTenantId
}

/** A client-supplied tenant id is never the source of truth. A different id is rejected. */
export function rejectClientTenantOverride(sessionTenantId: string, clientTenantId: unknown): void {
  if (clientTenantId == null || clientTenantId === '') return
  if (typeof clientTenantId !== 'string' || clientTenantId !== sessionTenantId) {
    throw new Error('tenant')
  }
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const utc = new Date(Date.UTC(year, month - 1, day))
  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day
}

export function isPositiveRappen(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 100_000_000
}

export function validateReportInput(input: {
  actorRole: string
  actorId: string
  actorTenantId: string
  sourceKind: string
  sourceUserId: string | null
  sourceUserTenantId: string | null
  sourceUserRole: string | null
  depositorUserId: string | null
  depositorTenantId: string | null
  depositorRole: string | null
  amountRappen: number
  reportedOn: string
}): { ok: true } | { ok: false; reason: string } {
  if (!input.actorTenantId) return { ok: false, reason: 'tenant' }
  if (!isPositiveRappen(input.amountRappen)) return { ok: false, reason: 'amount' }
  if (!isIsoDate(input.reportedOn)) return { ok: false, reason: 'date' }
  if (input.sourceKind !== 'business' && input.sourceKind !== 'staff' && input.sourceKind !== 'admin') {
    return { ok: false, reason: 'source' }
  }
  if (input.actorRole === 'staff') {
    if (input.sourceKind !== 'staff' || input.sourceUserId !== input.actorId) return { ok: false, reason: 'forbidden' }
    if (input.depositorUserId && input.depositorUserId !== input.actorId) return { ok: false, reason: 'forbidden' }
  } else if (!canConfirmReconciliation(input.actorRole)) {
    return { ok: false, reason: 'forbidden' }
  }

  if (input.sourceKind === 'business') {
    if (input.sourceUserId) return { ok: false, reason: 'source' }
  } else {
    if (!input.sourceUserId) return { ok: false, reason: 'source' }
    if (!tenantOwnsResource(input.sourceUserTenantId, input.actorTenantId)) return { ok: false, reason: 'tenant' }
    if (!isEligibleDepositorRole(input.sourceUserRole)) return { ok: false, reason: 'source' }
    if (input.sourceKind === 'admin' && input.sourceUserRole === 'staff') return { ok: false, reason: 'source' }
  }

  if (input.depositorUserId) {
    if (!tenantOwnsResource(input.depositorTenantId, input.actorTenantId)) return { ok: false, reason: 'tenant' }
    if (!isEligibleDepositorRole(input.depositorRole)) return { ok: false, reason: 'depositor' }
  }
  return { ok: true }
}
