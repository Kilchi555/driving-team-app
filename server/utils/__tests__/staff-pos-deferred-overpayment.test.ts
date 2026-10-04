import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { StaffProductSaleError } from '~/server/utils/staff-product-sale'
import {
  creditDeferredCashOverpayment,
  deferredCashOverpaymentKey,
  deferredCashOverpaymentNote,
} from '../staff-pos-deferred-overpayment'

const tenantA = '11111111-1111-4111-8111-111111111111'
const tenantB = '22222222-2222-4222-8222-222222222222'
const studentA = '44444444-4444-4444-8444-444444444444'
const studentB = '55555555-5555-4555-8555-555555555555'
const paymentA = '33333333-3333-4333-8333-333333333333'
const paymentB = '66666666-6666-4666-8666-666666666666'
const actor = '77777777-7777-4777-8777-777777777777'
const CONSTRAINT = 'credit_transactions_staff_pos_deferred_overpay_uidx'

function deferred(overrides: Record<string, unknown> = {}) {
  return {
    id: paymentA,
    tenant_id: tenantA,
    user_id: studentA,
    payment_method: 'deferred',
    payment_status: 'completed',
    appointment_id: null,
    metadata: { source: 'staff_product_sale', fulfillment: 'deferred' },
    ...overrides,
  }
}

type Stored = {
  id: string
  userId: string
  tenantId: string
  amount: number
  description: string
  referenceId: null
}

/**
 * Models the partial unique index: one slot per tenant and description.
 * The first caller inserts and increments. A later caller with the same
 * amount is a replay. A different amount is rejected. A forced foreign
 * unique violation is returned as an error and is not a replay.
 */
function uniqueOverpayDb(options: { foreignUnique?: boolean } = {}) {
  const rows = new Map<string, Stored>()
  const balances = new Map<string, number>()
  const tails = new Map<string, Promise<void>>()

  const slot = (tenantId: string, description: string) => `${tenantId}:${description}`
  const wallet = (tenantId: string, userId: string) => `${tenantId}:${userId}`

  async function rpc(name: string, args: Record<string, unknown>) {
    if (name !== 'apply_staff_pos_deferred_cash_overpayment') {
      return { data: null, error: { message: 'unknown_rpc' } }
    }
    if (options.foreignUnique) {
      return {
        data: null,
        error: {
          code: '23505',
          message: 'duplicate key value violates unique constraint "student_credits_user_id_unique"',
        },
      }
    }
    const tenantId = String(args.p_tenant_id)
    const userId = String(args.p_user_id)
    const description = String(args.p_description)
    const amount = Number(args.p_amount)
    const id = slot(tenantId, description)
    const previous = tails.get(id) || Promise.resolve()
    let release: () => void = () => {}
    const gate = new Promise<void>((resolveGate) => {
      release = resolveGate
    })
    tails.set(id, previous.then(() => gate))
    await previous

    try {
      const existing = rows.get(id)
      if (existing) {
        if (existing.userId !== userId) {
          return { data: null, error: { message: 'idempotency_user_mismatch' } }
        }
        if (existing.amount !== amount) {
          return { data: null, error: { message: 'overpayment_amount_mismatch' } }
        }
        return {
          data: [{
            applied: false,
            already_applied: true,
            amount_rappen: existing.amount,
            balance_rappen: balances.get(wallet(tenantId, userId)) || 0,
            transaction_id: existing.id,
          }],
          error: null,
        }
      }
      const stored: Stored = {
        id: `tx-${rows.size + 1}`,
        userId,
        tenantId,
        amount,
        description,
        referenceId: null,
      }
      rows.set(id, stored)
      const next = (balances.get(wallet(tenantId, userId)) || 0) + amount
      balances.set(wallet(tenantId, userId), next)
      return {
        data: [{
          applied: true,
          already_applied: false,
          amount_rappen: amount,
          balance_rappen: next,
          transaction_id: stored.id,
        }],
        error: null,
      }
    } finally {
      release()
    }
  }

  return {
    rpc,
    get rows() { return rows },
    balance(tenantId: string, userId: string) { return balances.get(wallet(tenantId, userId)) || 0 },
  }
}

const base = {
  actorId: actor,
  actorTenantId: tenantA,
  payments: [deferred()],
  amountRappen: 2000,
}

describe('deferred cash overpayment', () => {
  it('credits CHF 20 once for a completed deferred sale', async () => {
    const db = uniqueOverpayDb()
    const result = await creditDeferredCashOverpayment({ supabase: db, ...base })

    expect(result).toEqual({ creditedRappen: 2000, replayed: false })
    expect(db.rows.size).toBe(1)
    expect([...db.rows.values()][0]).toMatchObject({
      userId: studentA,
      tenantId: tenantA,
      amount: 2000,
      description: deferredCashOverpaymentKey([paymentA]),
      referenceId: null,
    })
    expect(db.balance(tenantA, studentA)).toBe(2000)
  })

  it('does not credit the same deferred overpayment again', async () => {
    const db = uniqueOverpayDb()
    await creditDeferredCashOverpayment({ supabase: db, ...base })
    const result = await creditDeferredCashOverpayment({ supabase: db, ...base })

    expect(result).toEqual({ creditedRappen: 0, replayed: true })
    expect(db.rows.size).toBe(1)
    expect(db.balance(tenantA, studentA)).toBe(2000)
  })

  it('rejects a second amount for the same deferred sale', async () => {
    const db = uniqueOverpayDb()
    await creditDeferredCashOverpayment({ supabase: db, ...base })
    await expect(creditDeferredCashOverpayment({
      supabase: db,
      ...base,
      amountRappen: 3000,
    })).rejects.toMatchObject({ statusCode: 409 })
    expect(db.rows.size).toBe(1)
    expect(db.balance(tenantA, studentA)).toBe(2000)
  })

  it('keeps one ledger row and one credit when the same request arrives together', async () => {
    const db = uniqueOverpayDb()
    const results = await Promise.all(
      Array.from({ length: 10 }, () => creditDeferredCashOverpayment({ supabase: db, ...base })),
    )
    expect(results.filter((result) => !result.replayed)).toHaveLength(1)
    expect(results.filter((result) => result.replayed)).toHaveLength(9)
    expect(db.rows.size).toBe(1)
    expect(db.balance(tenantA, studentA)).toBe(2000)
  })

  it('does not turn a different unique violation into a replay', async () => {
    const db = uniqueOverpayDb({ foreignUnique: true })
    await expect(creditDeferredCashOverpayment({ supabase: db, ...base })).rejects.toMatchObject({
      code: '23505',
      message: expect.stringContaining('student_credits_user_id_unique'),
    })
    expect(db.rows.size).toBe(0)
    expect(db.balance(tenantA, studentA)).toBe(0)
  })

  it('rejects a pending sale, another tenant, and another student', async () => {
    const db = uniqueOverpayDb()
    await expect(creditDeferredCashOverpayment({
      supabase: db,
      ...base,
      payments: [deferred({ payment_status: 'pending' })],
    })).rejects.toBeInstanceOf(StaffProductSaleError)

    await expect(creditDeferredCashOverpayment({
      supabase: db,
      ...base,
      payments: [deferred({ tenant_id: tenantB })],
    })).rejects.toMatchObject({ statusCode: 404 })

    await expect(creditDeferredCashOverpayment({
      supabase: db,
      ...base,
      payments: [deferred(), deferred({ id: paymentB, user_id: studentB })],
    })).rejects.toMatchObject({ statusCode: 409 })
    expect(db.rows.size).toBe(0)
  })

  it('rejects invoice and Wallee rows', async () => {
    const db = uniqueOverpayDb()
    await expect(creditDeferredCashOverpayment({
      supabase: db,
      ...base,
      payments: [deferred({ payment_method: 'wallee', metadata: { source: 'staff_product_sale', fulfillment: 'wallee' } })],
    })).rejects.toMatchObject({ statusCode: 409 })
    expect(db.rows.size).toBe(0)
  })

  it('uses one stable key for the same deferred payments', () => {
    expect(deferredCashOverpaymentKey([paymentB, paymentA])).toBe(deferredCashOverpaymentKey([paymentA, paymentB]))
    expect(deferredCashOverpaymentKey([paymentA])).not.toContain('2000')
    expect(deferredCashOverpaymentNote(2000)).toContain('20.00')
  })
})

describe('deferred overpayment migration', () => {
  const sql = readFileSync(resolve(process.cwd(), 'migrations/20261005_staff_pos_deferred_overpay_idempotency.sql'), 'utf8')
  const helper = readFileSync(resolve(process.cwd(), 'server/utils/staff-pos-deferred-overpayment.ts'), 'utf8')
  const bulk = readFileSync(resolve(process.cwd(), 'server/api/staff/process-bulk-payment.post.ts'), 'utf8')
  const completion = readFileSync(resolve(process.cwd(), 'migrations/20261004_staff_pos_payment_completion.sql'), 'utf8')

  function exceptionBlock(source: string): string {
    const start = source.indexOf('WHEN unique_violation THEN')
    const end = source.indexOf('END;\n$$;', start)
    return source.slice(start, end)
  }

  it('creates the exact partial unique index and stops on existing duplicates', () => {
    const index = sql.indexOf('CREATE UNIQUE INDEX credit_transactions_staff_pos_deferred_overpay_uidx')
    const guard = sql.slice(0, index)
    expect(index).toBeGreaterThan(0)
    expect(sql).toContain(`CREATE UNIQUE INDEX ${CONSTRAINT}
  ON public.credit_transactions (tenant_id, description)
  WHERE transaction_type = 'deposit'
    AND payment_method = 'cash'
    AND reference_type = 'overpayment'
    AND description LIKE 'staff-pos-deferred-overpay:%';`)
    expect(sql.match(/CREATE UNIQUE INDEX/g)).toHaveLength(1)
    expect(guard).toContain('staff_pos_deferred_overpay_duplicates_exist')
    expect(guard).not.toMatch(/\bDELETE\b/)
    expect(guard).not.toMatch(/\bUPDATE\b/)
    expect(guard).not.toMatch(/\bINSERT\b/)
  })

  it('replays only the deferred overpayment index and increments after the insert', () => {
    const block = exceptionBlock(sql)
    const insertAt = sql.indexOf('INSERT INTO public.credit_transactions')
    const incrementAt = sql.indexOf('public.increment_balance')
    const exceptionAt = sql.indexOf('WHEN unique_violation THEN')
    const gate = block.indexOf(`v_constraint_name = '${CONSTRAINT}'`)
    const raise = block.lastIndexOf('\n      RAISE;')
    const endIf = block.lastIndexOf('END IF;', raise)
    expect(insertAt).toBeGreaterThan(0)
    expect(incrementAt).toBeGreaterThan(insertAt)
    expect(exceptionAt).toBeGreaterThan(incrementAt)
    expect(block).toContain('GET STACKED DIAGNOSTICS v_constraint_name = CONSTRAINT_NAME')
    expect(gate).toBeGreaterThan(0)
    expect(block.slice(gate, endIf)).toContain('already_applied := true')
    expect(block.slice(gate, endIf)).toContain('overpayment_amount_mismatch')
    expect(block.slice(gate, endIf)).not.toContain('increment_balance')
    expect(raise).toBeGreaterThan(endIf)
    expect(sql.slice(exceptionAt)).not.toContain('increment_balance')
    expect(sql).toContain('reference_id')
    expect(sql).toContain('NULL')
    expect(sql).toContain("p_description NOT LIKE 'staff-pos-deferred-overpay:%'")
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.apply_staff_pos_deferred_cash_overpayment')
    expect(sql).toContain('TO service_role')
    expect(sql).not.toContain('ON CONFLICT')
  })

  it('leaves appointment overpayment and deferred completion replay unchanged', () => {
    expect(bulk).toContain("reference_type: 'overpayment'")
    expect(bulk).not.toContain('apply_staff_pos_deferred_cash_overpayment')
    expect(bulk).not.toContain('staff-pos-deferred-overpay:')
    expect(completion).toContain("v_constraint_name = 'credit_transactions_credit_product_purchase_payment_uidx'")
    expect(completion).not.toContain(CONSTRAINT)
    expect(completion).not.toContain('apply_staff_pos_deferred_cash_overpayment')
    expect(helper).toContain("rpc('apply_staff_pos_deferred_cash_overpayment'")
    expect(helper).not.toContain('applyStudentCreditDelta')
    expect(helper).not.toContain('23505')
    expect(helper).not.toContain('unique_violation')
  })
})
