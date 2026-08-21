import { describe, expect, it } from 'vitest'
import {
  CATEGORY_TO_ACCOUNT,
  KMU_DEFAULT_ACCOUNTS,
  accountClassFromNumber,
  defaultAccountForCategory,
  ledgerLinesBalanced,
  proposeLedgerLines,
  reverseLedgerLines,
  statementsFromTrial,
  buildTrialBalance,
} from '../accounting-ledger'

describe('KMU chart', () => {
  it('covers KMU classes and maps existing categories', () => {
    const classes = new Set(KMU_DEFAULT_ACCOUNTS.map(a => accountClassFromNumber(a.number)))
    expect([...classes].sort()).toEqual([1, 2, 3, 5, 6, 9])
    expect(defaultAccountForCategory('Fahrzeugkosten', 'expense')).toBe('6200')
    expect(defaultAccountForCategory('Termine', 'income')).toBe('3000')
    expect(CATEGORY_TO_ACCOUNT['Lohnaufwand']).toBe('5000')
  })
})

describe('proposeLedgerLines', () => {
  it('books unpaid creditor: expense + VAT to Kreditoren', () => {
    const lines = proposeLedgerLines({
      type: 'expense',
      amount_rappen: 10_810,
      document_kind: 'creditor',
      is_paid: false,
      vat_amount_rappen: 810,
      category_name: 'Fahrzeugkosten',
    })
    expect(ledgerLinesBalanced(lines)).toBe(true)
    expect(lines).toEqual([
      { account_number: '6200', debit_rappen: 10_000, credit_rappen: 0 },
      { account_number: '1170', debit_rappen: 810, credit_rappen: 0 },
      { account_number: '2000', debit_rappen: 0, credit_rappen: 10_810 },
    ])
  })

  it('books paid expense to Bank', () => {
    const lines = proposeLedgerLines({
      type: 'expense',
      amount_rappen: 5_000,
      document_kind: 'spesen',
      is_paid: true,
      category_name: 'Büro & Verwaltung',
      payment_account_number: '1020',
    })
    expect(ledgerLinesBalanced(lines)).toBe(true)
    expect(lines.find(l => l.account_number === '1020')?.credit_rappen).toBe(5_000)
    expect(lines.find(l => l.account_number === '2000')).toBeUndefined()
  })

  it('books payment income to Bank and revenue', () => {
    const lines = proposeLedgerLines({
      type: 'income',
      amount_rappen: 12_000,
      document_kind: 'debtor',
      linked_payment_id: 'pay-1',
      is_paid: true,
      category_name: 'Termine',
    })
    expect(ledgerLinesBalanced(lines)).toBe(true)
    expect(lines).toEqual([
      { account_number: '1020', debit_rappen: 12_000, credit_rappen: 0 },
      { account_number: '3000', debit_rappen: 0, credit_rappen: 12_000 },
    ])
  })

  it('skips contracts and reverses storno from original lines', () => {
    expect(proposeLedgerLines({ type: 'expense', amount_rappen: 100, document_kind: 'contract' })).toEqual([])
    const original = proposeLedgerLines({ type: 'expense', amount_rappen: 1000, is_paid: true, category_name: 'Miete & Raumkosten' })
    const storno = reverseLedgerLines(original)
    expect(ledgerLinesBalanced(storno)).toBe(true)
    expect(storno.find(l => l.account_number === '6000')?.credit_rappen).toBe(1000)
  })

  it('builds a balanced trial from lines', () => {
    const accounts = [
      { id: 'a', number: '1020', name: 'Bank', type: 'asset' as const, class: 1 },
      { id: 'b', number: '3000', name: 'Termine', type: 'income' as const, class: 3 },
    ]
    const rows = buildTrialBalance(accounts, [
      { account_id: 'a', debit_rappen: 100, credit_rappen: 0 },
      { account_id: 'b', debit_rappen: 0, credit_rappen: 100 },
    ])
    const stmt = statementsFromTrial(rows)
    expect(stmt.income_rappen).toBe(100)
    expect(stmt.assets_rappen).toBe(100)
    expect(stmt.result_rappen).toBe(100)
  })
})
