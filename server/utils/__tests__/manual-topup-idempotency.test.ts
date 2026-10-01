import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { applyManualCreditTopup } from '../apply-manual-credit-topup'

const TENANT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const OTHER_TENANT = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const USER = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const OTHER_USER = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
const ADMIN = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
const KEY_A = '11111111-1111-4111-8111-111111111111'
const KEY_B = '22222222-2222-4222-8222-222222222222'

type Stored = { id: string; userId: string; tenantId: string; amount: number }

/**
 * Models the partial unique index: same tenant + key waits, then replays.
 * A different key is a different slot and credits again.
 */
function uniqueTopupDb() {
  const rows = new Map<string, Stored>()
  const balances = new Map<string, number>()
  const tails = new Map<string, Promise<void>>()
  const calls: Array<Record<string, unknown>> = []

  const slot = (tenantId: string, key: string) => `${tenantId}:${key}`
  const wallet = (tenantId: string, userId: string) => `${tenantId}:${userId}`

  async function rpc(_name: string, args: Record<string, unknown>) {
    calls.push(args)
    if (_name !== 'apply_manual_credit_topup') {
      return { data: null, error: { message: 'unknown_rpc' } }
    }
    const tenantId = String(args.p_tenant_id)
    const userId = String(args.p_user_id)
    const key = String(args.p_idempotency_key)
    const amount = Number(args.p_amount)
    const id = slot(tenantId, key)
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
      const stored: Stored = { id: `tx-${rows.size + 1}`, userId, tenantId, amount }
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
    calls,
    get rows() { return rows },
    balance(tenantId: string, userId: string) { return balances.get(wallet(tenantId, userId)) || 0 },
  }
}

const base = {
  userId: USER,
  tenantId: TENANT,
  note: 'Bar erhalten',
  createdBy: ADMIN,
}

describe('applyManualCreditTopup', () => {
  it('books the first top-up once', async () => {
    const db = uniqueTopupDb()
    const result = await applyManualCreditTopup(db, { ...base, idempotencyKey: KEY_A, amountRappen: 10_000 })
    expect(result).toMatchObject({ balanceRappen: 10_000, creditedRappen: 10_000, replayed: false, transactionId: 'tx-1' })
    expect(db.rows.size).toBe(1)
    expect(db.balance(TENANT, USER)).toBe(10_000)
  })

  it('returns the existing result for the same key and does not book again', async () => {
    const db = uniqueTopupDb()
    const first = await applyManualCreditTopup(db, { ...base, idempotencyKey: KEY_A, amountRappen: 10_000 })
    const retry = await applyManualCreditTopup(db, { ...base, idempotencyKey: KEY_A, amountRappen: 10_000 })
    expect(retry).toMatchObject({
      balanceRappen: 10_000,
      creditedRappen: 10_000,
      replayed: true,
      transactionId: first.transactionId,
    })
    expect(db.rows.size).toBe(1)
    expect(db.balance(TENANT, USER)).toBe(10_000)
  })

  it('keeps a single booking when the same key arrives concurrently', async () => {
    const db = uniqueTopupDb()
    const results = await Promise.all(
      Array.from({ length: 10 }, () => applyManualCreditTopup(db, { ...base, idempotencyKey: KEY_A, amountRappen: 10_000 })),
    )
    expect(new Set(results.map((result) => result.transactionId)).size).toBe(1)
    expect(results.filter((result) => !result.replayed)).toHaveLength(1)
    expect(db.rows.size).toBe(1)
    expect(db.balance(TENANT, USER)).toBe(10_000)
  })

  it('books a second top-up when the key is new', async () => {
    const db = uniqueTopupDb()
    await applyManualCreditTopup(db, { ...base, idempotencyKey: KEY_A, amountRappen: 10_000 })
    const second = await applyManualCreditTopup(db, { ...base, idempotencyKey: KEY_B, amountRappen: 10_000 })
    expect(second).toMatchObject({ balanceRappen: 20_000, creditedRappen: 10_000, replayed: false })
    expect(db.rows.size).toBe(2)
    expect(db.balance(TENANT, USER)).toBe(20_000)
  })

  it('does not treat the same key in another tenant as a duplicate', async () => {
    const db = uniqueTopupDb()
    await applyManualCreditTopup(db, { ...base, idempotencyKey: KEY_A, amountRappen: 10_000 })
    const other = await applyManualCreditTopup(db, {
      ...base,
      tenantId: OTHER_TENANT,
      idempotencyKey: KEY_A,
      amountRappen: 2500,
    })
    expect(other.replayed).toBe(false)
    expect(other.creditedRappen).toBe(2500)
    expect(db.balance(TENANT, USER)).toBe(10_000)
    expect(db.balance(OTHER_TENANT, USER)).toBe(2500)
  })

  it('rejects the same key for a different customer without moving the balance', async () => {
    const db = uniqueTopupDb()
    await applyManualCreditTopup(db, { ...base, idempotencyKey: KEY_A, amountRappen: 10_000 })
    await expect(applyManualCreditTopup(db, {
      ...base,
      userId: OTHER_USER,
      idempotencyKey: KEY_A,
      amountRappen: 10_000,
    })).rejects.toMatchObject({ statusCode: 409 })
    expect(db.balance(TENANT, USER)).toBe(10_000)
    expect(db.balance(TENANT, OTHER_USER)).toBe(0)
    expect(db.rows.size).toBe(1)
  })
})

describe('manual top-up migration', () => {
  const sql = readFileSync(resolve(process.cwd(), 'migrations/20260930_manual_topup_idempotency.sql'), 'utf8')

  it('creates only the partial unique index for manual top-ups', () => {
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_manual_topup_idempotency_uidx')
    expect(sql).toContain('ON public.credit_transactions (tenant_id, reference_id)')
    expect(sql).toContain("transaction_type = 'deposit'")
    expect(sql).toContain("payment_method = 'manual'")
    expect(sql).toContain("reference_type = 'manual_topup'")
    expect(sql).toContain('reference_id IS NOT NULL')
    expect(sql).not.toContain('CREATE OR REPLACE FUNCTION public.apply_wallee_topup_deposit')
    expect(sql).not.toContain('credit_tx_staff_appointment_credit_payment_uidx')
    expect(sql.match(/CREATE UNIQUE INDEX/g)).toHaveLength(1)
  })

  it('inserts first and increments only when the key was new', () => {
    const insertAt = sql.indexOf('INSERT INTO public.credit_transactions')
    const conflictAt = sql.indexOf('ON CONFLICT (tenant_id, reference_id)')
    const replayAt = sql.indexOf('IF v_tx_id IS NULL THEN')
    const incrementAt = sql.indexOf('public.increment_balance')
    expect(insertAt).toBeGreaterThan(0)
    expect(conflictAt).toBeGreaterThan(insertAt)
    expect(replayAt).toBeGreaterThan(conflictAt)
    expect(incrementAt).toBeGreaterThan(replayAt)
    const replay = sql.slice(replayAt, incrementAt)
    expect(replay).toContain('already_applied := true')
    expect(replay).not.toContain('increment_balance')
    expect(sql).toContain('DO NOTHING')
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.apply_manual_credit_topup')
    expect(sql).toContain('TO service_role')
  })
})
