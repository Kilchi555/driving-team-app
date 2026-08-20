import { describe, expect, it } from 'vitest'
import { matchEntriesToExpenses, type OpenExpenseForMatching } from '../accounting-camt'
import type { MatchableEntry } from '../bank-reconciliation'

function entry(partial: Partial<MatchableEntry> & Pick<MatchableEntry, 'amount_rappen'>): MatchableEntry {
  return {
    date: '2026-03-01',
    reference: '',
    reference_raw: '',
    debtor_name: '',
    iban: '',
    remittance_info: '',
    raw_amount: partial.amount_rappen / 100,
    bank_ref: null,
    dedupe_key: 't',
    ...partial,
  }
}

function exp(partial: Partial<OpenExpenseForMatching> & Pick<OpenExpenseForMatching, 'id' | 'amount_rappen'>): OpenExpenseForMatching {
  return {
    description: 'Ausgabe',
    creditor_name: null,
    creditor_iban: null,
    payment_reference: null,
    entry_date: '2026-02-20',
    ...partial,
  }
}

describe('matchEntriesToExpenses', () => {
  it('matches payment reference', () => {
    const [r] = matchEntriesToExpenses(
      [entry({ amount_rappen: 10810, reference: 'RF18539007547034' })],
      [exp({ id: 'e1', amount_rappen: 10810, payment_reference: 'RF18539007547034', description: 'Winterreifen' })],
    )
    expect(r.entry_id).toBe('e1')
    expect(r.match_type).toBe('exact_ref')
    expect(r.confidence).toBeGreaterThanOrEqual(98)
  })

  it('matches IBAN plus amount', () => {
    const [r] = matchEntriesToExpenses(
      [entry({ amount_rappen: 50000, iban: 'CH93 0076 2011 6238 5295 7', debtor_name: 'Garage' })],
      [exp({ id: 'e2', amount_rappen: 50000, creditor_iban: 'CH9300762011623852957', creditor_name: 'Garage Süd' })],
    )
    expect(r.entry_id).toBe('e2')
    expect(r.match_type).toBe('iban_amount')
  })

  it('does not assign the same expense twice', () => {
    const results = matchEntriesToExpenses(
      [
        entry({ amount_rappen: 10000, reference: 'RF01AAA', debtor_name: 'A' }),
        entry({ amount_rappen: 10000, reference: 'RF01AAA', debtor_name: 'B', dedupe_key: 'u' }),
      ],
      [exp({ id: 'only', amount_rappen: 10000, payment_reference: 'RF01AAA' })],
    )
    expect(results.filter(r => r.entry_id === 'only')).toHaveLength(1)
  })
})
