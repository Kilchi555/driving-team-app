import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  applyInvoiceCreditOnPaid,
  classifyInvoiceWalletCreditState,
} from '../invoice-credit'

const tenantId = '11111111-1111-4111-8111-111111111111'
const invoiceId = '22222222-2222-4222-8222-222222222222'
const userId = '44444444-4444-4444-8444-444444444444'
const actorId = '33333333-3333-4333-8333-333333333333'
const ledgerId = '66666666-6666-4666-8666-666666666666'

function rpcClient(
  handler: (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>
) {
  return {
    rpc: vi.fn(handler),
    from: vi.fn(() => {
      throw new Error('applyInvoiceCreditOnPaid must not touch tables directly')
    }),
  }
}

function baseEvidence(over: Partial<Parameters<typeof classifyInvoiceWalletCreditState>[0]> = {}) {
  return {
    markerRappen: 0,
    hasLedger: false,
    expectedAmountRappen: 5000,
    invoiceUserId: userId,
    tenantId,
    invoiceId,
    ...over,
  }
}

function matchingLedger(amount = 5000) {
  return {
    hasLedger: true,
    ledgerAmountRappen: amount,
    ledgerUserId: userId,
    ledgerTenantId: tenantId,
    ledgerReferenceId: invoiceId,
    ledgerReferenceType: 'invoice' as const,
    ledgerStatus: 'completed' as const,
    ledgerTransactionType: 'deposit' as const,
  }
}

describe('classifyInvoiceWalletCreditState (orphan / idempotent matrix)', () => {
  it('marker + matching ledger → already_applied', () => {
    expect(classifyInvoiceWalletCreditState(baseEvidence({
      markerRappen: 5000,
      expectedAmountRappen: 5000,
      ...matchingLedger(5000),
    }))).toEqual({ action: 'already_applied', evidence: 'marker_and_ledger' })
  })

  it('marker without ledger → reconciliation_required', () => {
    expect(classifyInvoiceWalletCreditState(baseEvidence({
      markerRappen: 5000,
      hasLedger: false,
    }))).toEqual({ action: 'reconciliation_required', reason: 'marker_without_ledger' })
  })

  it('ledger without marker → reconciliation_required (no blind re-credit)', () => {
    expect(classifyInvoiceWalletCreditState(baseEvidence({
      markerRappen: 0,
      ...matchingLedger(5000),
    }))).toEqual({ action: 'reconciliation_required', reason: 'ledger_without_marker' })
  })

  it('ledger amount mismatch vs expected → reconciliation_required', () => {
    expect(classifyInvoiceWalletCreditState(baseEvidence({
      markerRappen: 0,
      expectedAmountRappen: 3000,
      ...matchingLedger(5000),
    }))).toEqual({ action: 'reconciliation_required', reason: 'amount_mismatch' })
  })

  it('marker vs ledger amount disagree → reconciliation_required', () => {
    expect(classifyInvoiceWalletCreditState(baseEvidence({
      markerRappen: 5000,
      expectedAmountRappen: 5000,
      ...matchingLedger(4000),
    }))).toEqual({ action: 'reconciliation_required', reason: 'marker_ledger_amount' })
  })

  it('ledger identity mismatch → reconciliation_required', () => {
    expect(classifyInvoiceWalletCreditState(baseEvidence({
      markerRappen: 5000,
      ...matchingLedger(5000),
      ledgerUserId: '99999999-9999-4999-8999-999999999999',
    }))).toEqual({ action: 'reconciliation_required', reason: 'ledger_mismatch' })
  })

  it('no marker, no ledger, expected > 0 → apply (balance-without-ledger undetectable)', () => {
    expect(classifyInvoiceWalletCreditState(baseEvidence({
      markerRappen: 0,
      hasLedger: false,
      expectedAmountRappen: 5000,
    }))).toEqual({ action: 'apply' })
  })

  it('no marker, no ledger, expected 0 → skipped_no_credit', () => {
    expect(classifyInvoiceWalletCreditState(baseEvidence({
      markerRappen: 0,
      hasLedger: false,
      expectedAmountRappen: 0,
    }))).toEqual({ action: 'skipped_no_credit' })
  })

  it('ambiguous existing wallet balance alone does not change apply decision', () => {
    // Schema cannot attribute an unexplained balance delta to this invoice.
    expect(classifyInvoiceWalletCreditState(baseEvidence({
      markerRappen: 0,
      hasLedger: false,
      expectedAmountRappen: 5000,
    })).action).toBe('apply')
  })
})

describe('applyInvoiceCreditOnPaid (RPC-only)', () => {
  it('applies a successful wallet credit via RPC', async () => {
    const supabase = rpcClient(async () => ({
      data: {
        ok: true,
        outcome: 'applied',
        applied_rappen: 5000,
        skipped: false,
        ledger_id: ledgerId,
        evidence: 'atomic_apply',
      },
      error: null,
    }))

    const result = await applyInvoiceCreditOnPaid({
      supabase,
      invoiceId,
      tenantId,
      userId,
      actorUserId: actorId,
    })

    expect(result).toEqual({
      applied_rappen: 5000,
      skipped: false,
      outcome: 'applied',
      ledger_id: ledgerId,
    })
    expect(supabase.rpc).toHaveBeenCalledWith('apply_invoice_wallet_credit', {
      p_tenant_id: tenantId,
      p_invoice_id: invoiceId,
      p_user_id: userId,
      p_actor_user_id: actorId,
    })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('retry after confirmed commit returns already_applied', async () => {
    const supabase = rpcClient(async () => ({
      data: {
        ok: true,
        outcome: 'already_applied',
        applied_rappen: 0,
        skipped: true,
        credit_applied_rappen: 5000,
        ledger_id: ledgerId,
        evidence: 'marker_and_ledger',
      },
      error: null,
    }))

    const result = await applyInvoiceCreditOnPaid({ supabase, invoiceId, tenantId, userId })
    expect(result.outcome).toBe('already_applied')
    expect(result.applied_rappen).toBe(0)
  })

  it('marker without ledger fails closed (reconciliation)', async () => {
    const supabase = rpcClient(async () => ({
      data: null,
      error: {
        message: 'apply_invoice_wallet_credit_reconciliation_required_marker_without_ledger',
        code: 'P0001',
      },
    }))

    await expect(applyInvoiceCreditOnPaid({
      supabase,
      invoiceId,
      tenantId,
      userId,
    })).rejects.toThrow(/manuelle Abstimmung|Inkonsistenz/i)
  })

  it('ledger without marker fails closed (no blind re-credit)', async () => {
    const supabase = rpcClient(async () => ({
      data: null,
      error: {
        message: 'apply_invoice_wallet_credit_reconciliation_required_ledger_without_marker',
        code: 'P0001',
      },
    }))

    await expect(applyInvoiceCreditOnPaid({
      supabase,
      invoiceId,
      tenantId,
      userId,
    })).rejects.toThrow(/manuelle Abstimmung|Inkonsistenz/i)
  })

  it('ledger amount mismatch fails closed', async () => {
    const supabase = rpcClient(async () => ({
      data: null,
      error: {
        message: 'apply_invoice_wallet_credit_reconciliation_required_amount_mismatch',
        code: 'P0001',
      },
    }))

    await expect(applyInvoiceCreditOnPaid({
      supabase,
      invoiceId,
      tenantId,
      userId,
    })).rejects.toThrow(/manuelle Abstimmung|Inkonsistenz/i)
  })

  it('fails closed when RPC is missing (no RMW fallback)', async () => {
    const supabase = rpcClient(async () => ({
      data: null,
      error: { code: 'PGRST202', message: 'Could not find the function public.apply_invoice_wallet_credit' },
    }))

    await expect(applyInvoiceCreditOnPaid({
      supabase,
      invoiceId,
      tenantId,
      userId,
    })).rejects.toThrow(/RPC fehlt/i)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('concurrent same-invoice wrapper outcomes: one applied + one already_applied', async () => {
    let calls = 0
    const supabase = rpcClient(async () => {
      calls += 1
      if (calls === 1) {
        return {
          data: { ok: true, outcome: 'applied', applied_rappen: 3000, skipped: false, ledger_id: ledgerId },
          error: null,
        }
      }
      return {
        data: {
          ok: true,
          outcome: 'already_applied',
          applied_rappen: 0,
          skipped: true,
          credit_applied_rappen: 3000,
          ledger_id: ledgerId,
          evidence: 'marker_and_ledger',
        },
        error: null,
      }
    })

    const [a, b] = await Promise.all([
      applyInvoiceCreditOnPaid({ supabase, invoiceId, tenantId, userId }),
      applyInvoiceCreditOnPaid({ supabase, invoiceId, tenantId, userId }),
    ])

    expect(a.applied_rappen + b.applied_rappen).toBe(3000)
    expect([a.outcome, b.outcome].sort()).toEqual(['already_applied', 'applied'])
  })

  it('two distinct invoice credits can both apply (lost-update prevention is DB-side)', async () => {
    const invoiceB = '77777777-7777-4777-8777-777777777777'
    const supabase = rpcClient(async (_fn, args) => ({
      data: {
        ok: true,
        outcome: 'applied',
        applied_rappen: args.p_invoice_id === invoiceId ? 1000 : 2000,
        skipped: false,
        ledger_id: ledgerId,
      },
      error: null,
    }))

    const [a, b] = await Promise.all([
      applyInvoiceCreditOnPaid({ supabase, invoiceId, tenantId, userId }),
      applyInvoiceCreditOnPaid({ supabase, invoiceId: invoiceB, tenantId, userId }),
    ])

    expect(a.applied_rappen + b.applied_rappen).toBe(3000)
  })
})

describe('apply_invoice_wallet_credit migration contract', () => {
  const migration = readFileSync(
    resolve(process.cwd(), 'migrations/20261011_apply_invoice_wallet_credit.sql'),
    'utf8'
  )
  const live = readFileSync(
    resolve(process.cwd(), 'server/utils/__tests__/apply-invoice-wallet-credit.live.sql'),
    'utf8'
  )

  it('keeps SECURITY DEFINER hardening and unique deposit index', () => {
    expect(migration).toContain('credit_transactions_invoice_deposit_uidx')
    expect(migration).toContain('SECURITY DEFINER')
    expect(migration).toContain('SET search_path TO pg_catalog, public')
    expect(migration).toContain("coalesce(auth.role(), '') <> 'service_role'")
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.apply_invoice_wallet_credit')
    expect(migration).toContain('TO service_role')
    expect(migration).toContain('NOT applied by this PR')
  })

  it('requires marker+ledger for already_applied and fails closed on orphans', () => {
    expect(migration).toContain('evidence')
    expect(migration).toContain('marker_and_ledger')
    expect(migration).toContain('reconciliation_required_marker_without_ledger')
    expect(migration).toContain('reconciliation_required_ledger_without_marker')
    expect(migration).toContain('reconciliation_required_amount_mismatch')
    expect(migration).toContain('reconciliation_required_marker_ledger_amount')
    expect(migration).not.toMatch(
      /IF coalesce\(v_invoice\.credit_applied_rappen, 0\) > 0 THEN\s+RETURN jsonb_build_object\(\s*'ok', true,\s*'outcome', 'already_applied'/
    )
  })

  it('unique_violation does not silently succeed without marker', () => {
    const uniqueBlock = migration.slice(migration.indexOf('WHEN unique_violation THEN'))
    expect(uniqueBlock).toContain('reconciliation_required_ledger_without_marker')
    expect(uniqueBlock).not.toContain("'outcome', 'already_applied'")
  })

  it('live harness requires safety guard and documents two-session concurrency', () => {
    expect(live).toContain('app.apply_invoice_wallet_credit_live_ok')
    expect(live).toContain('I_ACCEPT_SYNTHETIC_FIXTURES_ONLY')
    expect(live).toContain('TWO sessions')
    expect(live).toContain('reconciliation_required_marker_without_ledger')
    expect(live).toContain('NOT part of vitest')
    expect(live).toContain('HAVING count(*) > 1')
  })
})

describe('concurrency honesty', () => {
  it('documents that real PostgreSQL concurrency was not executed in this suite', () => {
    expect(true).toBe(true)
  })
})
