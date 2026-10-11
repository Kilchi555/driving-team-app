import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { applyInvoiceCreditOnPaid } from '../invoice-credit'

const tenantId = '11111111-1111-4111-8111-111111111111'
const invoiceId = '22222222-2222-4222-8222-222222222222'
const userId = '44444444-4444-4444-8444-444444444444'
const actorId = '33333333-3333-4333-8333-333333333333'
const ledgerId = '66666666-6666-4666-8666-666666666666'

function rpcClient(handler: (fn: string, args: Record<string, unknown>) => Promise<{ data: any; error: any }>) {
  return {
    rpc: vi.fn(handler),
    from: vi.fn(() => {
      throw new Error('applyInvoiceCreditOnPaid must not touch tables directly')
    }),
  }
}

describe('applyInvoiceCreditOnPaid (RPC-only)', () => {
  it('applies a successful wallet credit via RPC', async () => {
    const supabase = rpcClient(async () => ({
      data: {
        ok: true,
        outcome: 'applied',
        applied_rappen: 5000,
        skipped: false,
        balance_before_rappen: 1000,
        balance_after_rappen: 6000,
        ledger_id: ledgerId,
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

  it('retry after full success returns already_applied with zero applied_rappen', async () => {
    const supabase = rpcClient(async () => ({
      data: {
        ok: true,
        outcome: 'already_applied',
        applied_rappen: 0,
        skipped: true,
        credit_applied_rappen: 5000,
        ledger_id: ledgerId,
      },
      error: null,
    }))

    const result = await applyInvoiceCreditOnPaid({
      supabase,
      invoiceId,
      tenantId,
      userId,
    })

    expect(result.applied_rappen).toBe(0)
    expect(result.skipped).toBe(true)
    expect(result.outcome).toBe('already_applied')
  })

  it('retry after commit but before app completion marker is already_applied (no duplicate)', async () => {
    // Simulates: DB txn committed (ledger + balance + stamp), app crashed before
    // invoice_settlement_post_commit.wallet_credit_status = completed.
    const supabase = rpcClient(async () => ({
      data: {
        ok: true,
        outcome: 'already_applied',
        applied_rappen: 0,
        skipped: true,
        credit_applied_rappen: 2500,
        ledger_id: ledgerId,
      },
      error: null,
    }))

    const first = await applyInvoiceCreditOnPaid({ supabase, invoiceId, tenantId, userId })
    const second = await applyInvoiceCreditOnPaid({ supabase, invoiceId, tenantId, userId })

    expect(first.applied_rappen).toBe(0)
    expect(second.applied_rappen).toBe(0)
    expect(supabase.rpc).toHaveBeenCalledTimes(2)
  })

  it('existing ledger record for same invoice is validated by RPC and treated as already_applied', async () => {
    const supabase = rpcClient(async () => ({
      data: {
        ok: true,
        outcome: 'already_applied',
        applied_rappen: 0,
        skipped: true,
        credit_applied_rappen: 4200,
        ledger_id: ledgerId,
      },
      error: null,
    }))

    const result = await applyInvoiceCreditOnPaid({ supabase, invoiceId, tenantId, userId })
    expect(result.outcome).toBe('already_applied')
    expect(result.ledger_id).toBe(ledgerId)
  })

  it('cross-tenant / user mismatch is rejected without treating it as success', async () => {
    const supabase = rpcClient(async () => ({
      data: null,
      error: { message: 'apply_invoice_wallet_credit_user_mismatch', code: '42501' },
    }))

    await expect(applyInvoiceCreditOnPaid({
      supabase,
      invoiceId,
      tenantId,
      userId,
    })).rejects.toThrow(/nicht zum angegebenen Benutzer|Ledger/i)
  })

  it('ledger mismatch (generic unique conflict without verified identity) fails closed', async () => {
    const supabase = rpcClient(async () => ({
      data: null,
      error: { message: 'apply_invoice_wallet_credit_ledger_mismatch', code: 'P0001' },
    }))

    await expect(applyInvoiceCreditOnPaid({
      supabase,
      invoiceId,
      tenantId,
      userId,
    })).rejects.toThrow(/Ledger/i)
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

  it('simulated RPC failure before commit surfaces as thrown error (no partial app-side write)', async () => {
    const supabase = rpcClient(async () => ({
      data: null,
      error: { message: 'simulated_abort_before_commit' },
    }))

    await expect(applyInvoiceCreditOnPaid({
      supabase,
      invoiceId,
      tenantId,
      userId,
    })).rejects.toThrow(/simulated_abort_before_commit|gutgeschrieben/i)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('skipped_no_credit returns skipped without applying', async () => {
    const supabase = rpcClient(async () => ({
      data: {
        ok: true,
        outcome: 'skipped_no_credit',
        applied_rappen: 0,
        skipped: true,
        ledger_id: null,
      },
      error: null,
    }))

    const result = await applyInvoiceCreditOnPaid({ supabase, invoiceId, tenantId, userId })
    expect(result).toMatchObject({ applied_rappen: 0, skipped: true, outcome: 'skipped_no_credit' })
  })

  it('missing identity args skip without RPC', async () => {
    const supabase = rpcClient(async () => {
      throw new Error('should not call rpc')
    })
    expect(await applyInvoiceCreditOnPaid({
      supabase,
      invoiceId: '',
      tenantId,
      userId,
    })).toEqual({ applied_rappen: 0, skipped: true, outcome: 'missing_args' })
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('concurrent same-invoice requests: wrapper invokes RPC each time; DB must serialize to one credit', async () => {
    let calls = 0
    const supabase = rpcClient(async () => {
      calls += 1
      if (calls === 1) {
        return {
          data: {
            ok: true,
            outcome: 'applied',
            applied_rappen: 3000,
            skipped: false,
            ledger_id: ledgerId,
          },
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
        },
        error: null,
      }
    })

    const [a, b] = await Promise.all([
      applyInvoiceCreditOnPaid({ supabase, invoiceId, tenantId, userId }),
      applyInvoiceCreditOnPaid({ supabase, invoiceId, tenantId, userId }),
    ])

    const appliedSum = a.applied_rappen + b.applied_rappen
    expect(appliedSum).toBe(3000)
    expect([a.outcome, b.outcome].sort()).toEqual(['already_applied', 'applied'])
  })

  it('two distinct invoice credits: both can apply (lost-update prevention is DB-side)', async () => {
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
    expect(a.outcome).toBe('applied')
    expect(b.outcome).toBe('applied')
  })
})

describe('apply_invoice_wallet_credit migration contract', () => {
  const migration = readFileSync(
    resolve(process.cwd(), 'migrations/20261011_apply_invoice_wallet_credit.sql'),
    'utf8'
  )

  it('creates tenant-scoped unique deposit index and SECURITY DEFINER RPC', () => {
    expect(migration).toContain('credit_transactions_invoice_deposit_uidx')
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.apply_invoice_wallet_credit')
    expect(migration).toContain('SECURITY DEFINER')
    expect(migration).toContain('SET search_path TO pg_catalog, public')
    expect(migration).toContain("coalesce(auth.role(), '') <> 'service_role'")
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.apply_invoice_wallet_credit')
    expect(migration).toContain('TO service_role')
    expect(migration).toContain('NOT applied by this PR')
  })

  it('locks invoice and wallet, inserts ledger, increments balance, stamps invoice in one function', () => {
    expect(migration).toContain('FOR UPDATE')
    expect(migration).toContain('INSERT INTO public.credit_transactions')
    expect(migration).toContain('balance_rappen = balance_rappen + v_amount')
    expect(migration).toContain('credit_applied_rappen = v_amount')
    expect(migration).toContain('WHEN unique_violation THEN')
    expect(migration).toContain('apply_invoice_wallet_credit_ledger_mismatch')
    expect(migration).toContain('apply_invoice_wallet_credit_user_mismatch')
  })

  it('does not treat unique_violation alone as success without re-verifying identity', () => {
    const uniqueBlock = migration.slice(migration.indexOf('WHEN unique_violation THEN'))
    expect(uniqueBlock).toContain('apply_invoice_wallet_credit_ledger_mismatch')
    expect(uniqueBlock).toContain('v_existing.user_id IS DISTINCT FROM p_user_id')
    expect(uniqueBlock).toContain('v_existing.amount_rappen')
  })
})

describe('concurrency honesty', () => {
  it('documents that real PostgreSQL concurrency was not executed in this suite', () => {
    // These unit tests mock the RPC boundary. Exactly-once and lost-update
    // guarantees require the migration applied to PostgreSQL and concurrent
    // sessions (see server/utils/__tests__/apply-invoice-wallet-credit.live.sql).
    expect(true).toBe(true)
  })
})
