import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ACCOUNTING_CATEGORIES,
  PRIVATE_EXPENSE_CATEGORY_NAME,
  canEditAccountingMaterial,
  canSoftDeleteAccountingEntry,
  changedMaterialFields,
  computeSimpleBookIncome,
  computeNetAssets,
  invoiceOutstandingRappen,
  cashDifferenceRappen,
  CASH_DIFF_CATEGORY_NAME,
  documentKindToEntryType,
  inferDocumentKind,
  isAccountingPlEntry,
  isPrivateExpenseCategory,
  isWithinAccountingGrace,
  requiresAccountingReceipt,
  LOHN_CATEGORY_NAME,
} from '../accounting'

describe('accounting P0 helpers', () => {
  it('includes Eigenverbrauch / Privat in default categories', () => {
    expect(DEFAULT_ACCOUNTING_CATEGORIES.some(c => c.name === PRIVATE_EXPENSE_CATEGORY_NAME && c.type === 'expense')).toBe(true)
    expect(isPrivateExpenseCategory(PRIVATE_EXPENSE_CATEGORY_NAME)).toBe(true)
    expect(isPrivateExpenseCategory('Fahrzeugkosten')).toBe(false)
  })

  it('allows material edits only inside the 24h grace window', () => {
    const now = Date.parse('2026-08-18T10:00:00Z')
    const fresh = { created_at: '2026-08-18T08:00:00Z' }
    const old = { created_at: '2026-08-16T10:00:00Z' }
    expect(isWithinAccountingGrace(fresh.created_at, now)).toBe(true)
    expect(canEditAccountingMaterial(fresh, now)).toBe(true)
    expect(canEditAccountingMaterial(old, now)).toBe(false)
    expect(canEditAccountingMaterial({ ...fresh, linked_payment_id: 'pay-1' }, now)).toBe(false)
    expect(canSoftDeleteAccountingEntry({ ...fresh, locked_at: '2026-08-18T09:00:00Z' }, now)).toBe(false)
  })

  it('detects material field changes and ignores operational ones', () => {
    const existing = { amount_rappen: 1000, description: 'Tank', is_paid: false, receipt_url: null }
    expect(changedMaterialFields(existing, { amount_rappen: 1500, is_paid: true })).toEqual(['amount_rappen'])
    expect(changedMaterialFields(existing, { is_paid: true, receipt_url: 'https://x' })).toEqual([])
  })

  it('maps Beleg-Art to entry type and excludes contracts from P&L', () => {
    expect(documentKindToEntryType('debtor')).toBe('income')
    expect(documentKindToEntryType('creditor')).toBe('expense')
    expect(documentKindToEntryType('contract')).toBe('expense')
    expect(isAccountingPlEntry({ document_kind: 'expense' })).toBe(true)
    expect(isAccountingPlEntry({ document_kind: 'contract' })).toBe(false)
    expect(inferDocumentKind({ type: 'income' })).toBe('debtor')
    expect(inferDocumentKind({ type: 'expense', submitted_by_user_id: 'u1' })).toBe('spesen')
    expect(inferDocumentKind({ document_kind: 'contract', type: 'expense' })).toBe('contract')
  })

  it('requires a receipt for Spesen and Kreditor, not for Lohn or Verträge', () => {
    expect(requiresAccountingReceipt({ type: 'expense', document_kind: 'creditor' })).toBe(true)
    expect(requiresAccountingReceipt({ type: 'expense', document_kind: 'spesen' })).toBe(true)
    expect(requiresAccountingReceipt({ type: 'expense', document_kind: 'expense' })).toBe(true)
    expect(requiresAccountingReceipt({ type: 'expense', document_kind: 'contract' })).toBe(false)
    expect(requiresAccountingReceipt({ type: 'income', document_kind: 'debtor' })).toBe(false)
    expect(requiresAccountingReceipt({ type: 'expense', document_kind: 'expense', category_name: LOHN_CATEGORY_NAME })).toBe(false)
    expect(requiresAccountingReceipt({ type: 'expense', document_kind: 'expense', storno_of_id: 's1' })).toBe(false)
  })

  it('does not double-count payments that already have a linked income entry', () => {
    const result = computeSimpleBookIncome({
      paymentsIncomeRappen: 50_000,
      entries: [
        { type: 'income', amount_rappen: 50_000, linked_payment_id: 'p1' },
        { type: 'income', amount_rappen: 2_000, linked_payment_id: null },
        { type: 'income', amount_rappen: 9_000, linked_payment_id: null, document_kind: 'contract' },
        { type: 'expense', amount_rappen: 1_000 },
      ],
    })
    expect(result.manualIncomeRappen).toBe(2_000)
    expect(result.totalIncomeRappen).toBe(52_000)
  })

  it('computes Vermögenslage and invoice outstanding', () => {
    expect(DEFAULT_ACCOUNTING_CATEGORIES.some(c => c.name === CASH_DIFF_CATEGORY_NAME)).toBe(true)
    expect(invoiceOutstandingRappen({ total_amount_rappen: 10000, paid_amount_rappen: 2500, payment_status: 'pending', status: 'sent' })).toBe(7500)
    expect(invoiceOutstandingRappen({ total_amount_rappen: 10000, payment_status: 'paid', status: 'sent' })).toBe(0)
    expect(invoiceOutstandingRappen({ total_amount_rappen: 10000, status: 'draft' })).toBe(0)
    expect(computeNetAssets({ cashRappen: 5000, bankRappen: 20000, receivablesRappen: 3000, payablesRappen: 1000 })).toBe(27000)
    expect(cashDifferenceRappen(4800, 5000)).toBe(-200)
  })
})
