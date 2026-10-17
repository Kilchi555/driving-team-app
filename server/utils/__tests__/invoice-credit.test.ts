import { describe, expect, it } from 'vitest'
import {
  applyInvoiceCreditOnPaid,
  resolveInvoiceLineCreditRappen,
  sumInvoiceCreditRappen,
  toInvoiceRappen,
} from '../invoice-credit'

describe('toInvoiceRappen', () => {
  it('keeps integer rappen', () => {
    expect(toInvoiceRappen(19000)).toBe(19000)
  })

  it('converts CHF decimals that leaked into rappen fields', () => {
    expect(toInvoiceRappen(190.5)).toBe(19050)
  })
})

describe('resolveInvoiceLineCreditRappen', () => {
  it('returns 0 unless the line is flagged', () => {
    expect(resolveInvoiceLineCreditRappen({
      credit_to_wallet: false,
      total_price_rappen: 19000,
    })).toBe(0)
  })

  it('uses product credit amount times quantity', () => {
    expect(resolveInvoiceLineCreditRappen(
      { credit_to_wallet: true, quantity: 2, total_price_rappen: 30000 },
      { id: 'p1', is_credit_product: true, credit_amount_rappen: 20000 }
    )).toBe(40000)
  })

  it('falls back to the net line total for free-text amounts', () => {
    expect(resolveInvoiceLineCreditRappen({
      credit_to_wallet: true,
      total_price_rappen: 19000,
      quantity: 1,
    })).toBe(19000)
  })

  it('keeps an explicit snapshot if no credit product is loaded', () => {
    expect(resolveInvoiceLineCreditRappen({
      credit_to_wallet: true,
      credit_amount_rappen: 15000,
      total_price_rappen: 19000,
    })).toBe(15000)
  })
})

describe('sumInvoiceCreditRappen', () => {
  it('sums only flagged snapshots', () => {
    expect(sumInvoiceCreditRappen([
      { credit_to_wallet: true, credit_amount_rappen: 10000 },
      { credit_to_wallet: false, credit_amount_rappen: 5000 },
      { credit_to_wallet: true, credit_amount_rappen: 2500 },
    ])).toBe(12500)
  })
})

describe('applyInvoiceCreditOnPaid', () => {
  function client(state: {
    existingTx: { id: string } | null
    failLedger?: boolean
    failBalance?: boolean
    calls: string[]
  }) {
    return {
      from(table: string) {
        let action = 'select'
        const run = async () => {
          if (table === 'invoices' && action === 'select') {
            return {
              data: {
                id: 'inv',
                user_id: 'student',
                tenant_id: 'tenant',
                payment_status: 'paid',
                credit_applied_rappen: 0,
                invoice_number: 'RE-1',
              },
              error: null,
            }
          }
          if (table === 'credit_transactions' && action === 'select') {
            return { data: state.existingTx, error: null }
          }
          if (table === 'invoice_items' && action === 'select') {
            return { data: [{ credit_to_wallet: true, credit_amount_rappen: 2500 }], error: null }
          }
          if (table === 'student_credits' && action === 'select') {
            return { data: { id: 'wallet', balance_rappen: 1000 }, error: null }
          }
          if (table === 'credit_transactions' && action === 'insert') {
            state.calls.push('ledger')
            if (state.failLedger) return { data: null, error: { message: 'ledger failed' } }
            state.existingTx = { id: 'tx-1' }
            return { data: null, error: null }
          }
          if (table === 'student_credits' && action === 'upsert') {
            state.calls.push('balance')
            if (state.failBalance) return { data: null, error: { message: 'balance failed' } }
            return { data: null, error: null }
          }
          if (table === 'invoices' && action === 'update') {
            state.calls.push('stamp')
            return { data: null, error: null }
          }
          return { data: null, error: null }
        }
        const chain = {
          select: () => chain,
          insert: () => { action = 'insert'; return chain },
          update: () => { action = 'update'; return chain },
          upsert: () => { action = 'upsert'; return chain },
          eq: () => chain,
          in: () => chain,
          limit: () => chain,
          maybeSingle: () => run(),
          then: (ok: (value: { data: unknown; error: unknown }) => unknown, bad?: (reason: unknown) => unknown) => run().then(ok, bad),
        }
        return chain
      },
    }
  }

  const args = {
    invoiceId: 'inv',
    tenantId: 'tenant',
    userId: 'student',
    actorUserId: 'staff',
  }

  it('writes the ledger row before the wallet balance', async () => {
    const state = { existingTx: null, calls: [] as string[] }
    const result = await applyInvoiceCreditOnPaid({ supabase: client(state), ...args })
    expect(result).toEqual({ applied_rappen: 2500, skipped: false })
    expect(state.calls).toEqual(['ledger', 'balance', 'stamp'])
  })

  it('does not change the wallet when the ledger insert fails', async () => {
    const state = { existingTx: null, failLedger: true, calls: [] as string[] }
    await expect(applyInvoiceCreditOnPaid({ supabase: client(state), ...args })).rejects.toThrow(/protokolliert/)
    expect(state.calls).toEqual(['ledger'])
  })

  it('does not add the product credit again once the ledger row exists', async () => {
    const state = { existingTx: { id: 'tx-1' }, calls: [] as string[] }
    const result = await applyInvoiceCreditOnPaid({ supabase: client(state), ...args })
    expect(result).toEqual({ applied_rappen: 0, skipped: true })
    expect(state.calls).toEqual([])
  })
})
