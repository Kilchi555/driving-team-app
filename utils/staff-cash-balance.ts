/**
 * Displayed staff-drawer balance for Staff Settings.
 *
 * This is the figure under "Aktueller Kassenstand" in components/StaffCashBalance.vue.
 * It is computed in the browser from rows the staff cash API already returned.
 * It does not read or write cash_balances, and it does not change the balance sheet.
 *
 * Staff display (this function):
 *   deposit + cash_to_bank_reversal − withdrawal − cash_handover − cash_to_bank
 *   + pending cash_transactions
 *
 * Admin display (CashBalanceManager.calculatedCurrentBalance and
 * load_staff_balances in server/api/admin/cash-management.post.ts):
 *   the same movement types and the same pending-only rule.
 *   The admin loader does not filter cash_transactions by tenant_id.
 *   This function does not apply a tenant filter. Callers must pass rows
 *   that the staff API has already limited to the session tenant and instructor.
 *
 * Persisted snapshot (public.calculate_cash_balance, not in this repository):
 *   deposit + pending + confirmed.
 *   It ignores withdrawal and cash_handover.
 *   update_cash_balance() writes that result into cash_balances.current_balance_rappen.
 *   The accounting balance sheet reads that snapshot as staff cash.
 *   This module does not call or replace that function. A green staff total
 *   does not mean the persisted balance or the balance sheet was corrected.
 *
 * Left unchanged on purpose:
 * - confirmed rows, including a CHF 0.15 cash credit deposit and a CHF 8,150
 *   invoice credit deposit recorded as cash_transactions, do not affect this total.
 * - disputed rows do not affect this total.
 * - refunded payments that are still status pending still increase the total.
 *   Their target behaviour is not decided here.
 * - repeated cash_handover rows each reduce the total. This function does not
 *   deduplicate them. staff_cash_handover has no idempotency key.
 * - adjustment, system_init, and movement_type cash_transaction do not affect
 *   this total. Counting cash_transaction movements as well as dropping a
 *   confirmed receipt would subtract the same cash twice.
 */

export type StaffCashMovementInput = {
  movement_type?: string | null
  amount_rappen?: number | null
}

export type StaffCashTransactionInput = {
  status?: string | null
  amount_rappen?: number | null
}

function rappen(amount: number | null | undefined): number {
  return typeof amount === 'number' && Number.isFinite(amount) ? amount : 0
}

export function calculateStaffCashBalance(
  movements: readonly StaffCashMovementInput[],
  transactions: readonly StaffCashTransactionInput[],
): number {
  let balance = 0

  for (const movement of movements) {
    const amount = rappen(movement.amount_rappen)
    if (movement.movement_type === 'deposit' || movement.movement_type === 'cash_to_bank_reversal') {
      balance += amount
    } else if (
      movement.movement_type === 'withdrawal'
      || movement.movement_type === 'cash_handover'
      || movement.movement_type === 'cash_to_bank'
    ) {
      balance -= amount
    }
  }

  for (const transaction of transactions) {
    if (transaction.status === 'pending') {
      balance += rappen(transaction.amount_rappen)
    }
  }

  return balance
}
