import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  OBLIGATION_REPAIR_BASIS_NONE,
  obligationRepairBasisId,
  type ObligationLedgerEntry,
} from '../cancellation-payment-obligation'

const TENANT_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const TENANT_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const USER_A = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const USER_B = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const APPOINTMENT_A = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
const APPOINTMENT_B = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
const MIGRATION = resolve(process.cwd(), 'migrations/20260930_cancellation_obligation_repair_idempotency.sql')

type RepairType = 'cancellation_charge_waiver' | 'cancellation_charge_reinstate'

type StoredRepair = {
  id: string
  tenantId: string
  userId: string
  appointmentId: string
  transactionType: RepairType
  amount: number
  basisId: string
}

type RepairCall = {
  tenantId: string
  userId: string
  appointmentId: string
  transactionType: RepairType
  delta: number
  expectedBasisId: string
}

type RepairResult = {
  applied: boolean
  alreadyApplied: boolean
  stale: boolean
  amount: number
  balance: number
}

/**
 * In-process model of apply_cancellation_obligation_repair.
 * The appointment queue is the FOR UPDATE row lock.
 * The unique key is the partial unique index.
 * A thrown increment removes the uncommitted insert, matching one transaction.
 */
class RepairDatabase {
  private rows: StoredRepair[] = []
  private balances = new Map<string, number>()
  private tails = new Map<string, Promise<void>>()
  private serial = 0
  increments = 0

  basis(tenantId: string, userId: string, appointmentId: string): string {
    const ids = this.rows
      .filter((row) => row.tenantId === tenantId && row.userId === userId && row.appointmentId === appointmentId)
      .map((row) => row.id)
      .sort()
    if (ids.length === 0) return OBLIGATION_REPAIR_BASIS_NONE
    const hex = createHash('md5').update(ids.join(',')).digest('hex')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  balanceOf(tenantId: string, userId: string): number {
    return this.balances.get(`${tenantId}:${userId}`) ?? 0
  }

  async apply(call: RepairCall, options?: { failIncrement?: boolean }): Promise<RepairResult> {
    return this.lock(`${call.tenantId}:${call.appointmentId}`, async () => {
      const current = this.basis(call.tenantId, call.userId, call.appointmentId)
      const balance = this.balanceOf(call.tenantId, call.userId)
      if (current !== call.expectedBasisId) {
        return { applied: false, alreadyApplied: false, stale: true, amount: 0, balance }
      }

      const existing = this.rows.find((row) =>
        row.tenantId === call.tenantId
        && row.appointmentId === call.appointmentId
        && row.transactionType === call.transactionType
        && row.basisId === call.expectedBasisId
      )
      if (existing) {
        return { applied: false, alreadyApplied: true, stale: false, amount: existing.amount, balance }
      }

      const row: StoredRepair = {
        id: `tx-${++this.serial}`,
        tenantId: call.tenantId,
        userId: call.userId,
        appointmentId: call.appointmentId,
        transactionType: call.transactionType,
        amount: call.delta,
        basisId: call.expectedBasisId,
      }
      this.rows.push(row)
      try {
        if (options?.failIncrement) throw new Error('increment_failed')
        const next = balance + call.delta
        this.balances.set(`${call.tenantId}:${call.userId}`, next)
        this.increments += 1
        return { applied: true, alreadyApplied: false, stale: false, amount: call.delta, balance: next }
      } catch (error) {
        this.rows.splice(this.rows.indexOf(row), 1)
        throw error
      }
    })
  }

  private lock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve()
    const run = previous.then(fn, fn)
    this.tails.set(key, run.then(() => undefined, () => undefined))
    return run
  }
}

function entry(partial: ObligationLedgerEntry): ObligationLedgerEntry {
  return partial
}

describe('cancellation obligation repair basis', () => {
  it('uses the zero sentinel when no eligible appointment row exists', () => {
    expect(obligationRepairBasisId([], TENANT_A, APPOINTMENT_A)).toBe(OBLIGATION_REPAIR_BASIS_NONE)
  })

  it('hashes the sorted eligible ids the same way as the SQL md5 formatting', () => {
    const ids = [
      '22222222-2222-4222-8222-222222222222',
      '11111111-1111-4111-8111-111111111111',
    ]
    const basis = obligationRepairBasisId(ids.map((id) => entry({
      id,
      transaction_type: 'cancellation',
      amount_rappen: 4750,
      payment_method: 'credit',
      balance_before_rappen: 0,
      balance_after_rappen: 4750,
      reference_id: APPOINTMENT_A,
      reference_type: 'appointment',
      tenant_id: TENANT_A,
    })), TENANT_A, APPOINTMENT_A)
    expect(basis).toBe('f8797778-f5a7-2c48-4e02-076e4b644e57')
  })

  it('ignores another tenant, another appointment, wallee refunds, and unposted rows', () => {
    const shared = {
      transaction_type: 'cancellation',
      amount_rappen: 1000,
      balance_before_rappen: 0,
      balance_after_rappen: 1000,
      reference_type: 'appointment',
    }
    const withNoise = obligationRepairBasisId([
      entry({ ...shared, id: '11111111-1111-4111-8111-111111111111', reference_id: APPOINTMENT_A, tenant_id: TENANT_A }),
      entry({ ...shared, id: '99999999-9999-4999-8999-999999999999', reference_id: APPOINTMENT_A, tenant_id: TENANT_B }),
      entry({ ...shared, id: '88888888-8888-4888-8888-888888888888', reference_id: APPOINTMENT_B, tenant_id: TENANT_A }),
      entry({ ...shared, id: '77777777-7777-4777-8777-777777777777', reference_id: APPOINTMENT_A, tenant_id: TENANT_A, payment_method: 'wallee_refund' }),
      entry({ ...shared, id: '66666666-6666-4666-8666-666666666666', reference_id: APPOINTMENT_A, tenant_id: TENANT_A, balance_before_rappen: null, balance_after_rappen: null }),
    ], TENANT_A, APPOINTMENT_A)
    const alone = obligationRepairBasisId([
      entry({ ...shared, id: '11111111-1111-4111-8111-111111111111', reference_id: APPOINTMENT_A, tenant_id: TENANT_A }),
    ], TENANT_A, APPOINTMENT_A)
    expect(withNoise).toBe(alone)
    expect(withNoise).not.toBe(OBLIGATION_REPAIR_BASIS_NONE)
  })
})

describe('cancellation obligation repair concurrency', () => {
  function sameRepair(expectedBasisId: string, delta = 9500): RepairCall {
    return {
      tenantId: TENANT_A,
      userId: USER_A,
      appointmentId: APPOINTMENT_A,
      transactionType: 'cancellation_charge_waiver',
      delta,
      expectedBasisId,
    }
  }

  it('lets exactly one of two parallel identical repairs change the wallet', async () => {
    const db = new RepairDatabase()
    const basis = db.basis(TENANT_A, USER_A, APPOINTMENT_A)
    const [first, second] = await Promise.all([
      db.apply(sameRepair(basis)),
      db.apply(sameRepair(basis)),
    ])

    const applied = [first, second].filter((result) => result.applied)
    expect(applied).toHaveLength(1)
    expect(applied[0]?.balance).toBe(9500)
    expect(db.increments).toBe(1)
    expect(db.balanceOf(TENANT_A, USER_A)).toBe(9500)
    expect([first, second].some((result) => result.stale || result.alreadyApplied)).toBe(true)
  })

  it('does not create a second economic effect when the same basis is retried', async () => {
    const db = new RepairDatabase()
    const basis = db.basis(TENANT_A, USER_A, APPOINTMENT_A)
    await db.apply(sameRepair(basis))
    const retry = await db.apply(sameRepair(basis))

    expect(retry.applied).toBe(false)
    expect(retry.stale || retry.alreadyApplied).toBe(true)
    expect(db.increments).toBe(1)
    expect(db.balanceOf(TENANT_A, USER_A)).toBe(9500)
  })

  it('allows a later legitimate change, another appointment, another tenant, and the opposite direction', async () => {
    const db = new RepairDatabase()
    const initial = db.basis(TENANT_A, USER_A, APPOINTMENT_A)
    const waiver = await db.apply(sameRepair(initial, 9500))
    expect(waiver.applied).toBe(true)

    const afterWaiver = db.basis(TENANT_A, USER_A, APPOINTMENT_A)
    expect(afterWaiver).not.toBe(initial)
    const reinstate = await db.apply({
      ...sameRepair(afterWaiver, -9500),
      transactionType: 'cancellation_charge_reinstate',
    })
    expect(reinstate.applied).toBe(true)

    const otherAppointment = await db.apply({
      ...sameRepair(OBLIGATION_REPAIR_BASIS_NONE, 1000),
      appointmentId: APPOINTMENT_B,
    })
    const otherTenant = await db.apply({
      ...sameRepair(OBLIGATION_REPAIR_BASIS_NONE, 2000),
      tenantId: TENANT_B,
      userId: USER_B,
    })

    expect(otherAppointment.applied).toBe(true)
    expect(otherTenant.applied).toBe(true)
    expect(db.balanceOf(TENANT_A, USER_A)).toBe(1000)
    expect(db.balanceOf(TENANT_B, USER_B)).toBe(2000)
    expect(db.increments).toBe(4)
  })

  it('rolls a failed increment back so a retry can post the single effect', async () => {
    const db = new RepairDatabase()
    const basis = db.basis(TENANT_A, USER_A, APPOINTMENT_A)
    await expect(db.apply(sameRepair(basis), { failIncrement: true })).rejects.toThrow('increment_failed')
    expect(db.increments).toBe(0)
    expect(db.balanceOf(TENANT_A, USER_A)).toBe(0)
    expect(db.basis(TENANT_A, USER_A, APPOINTMENT_A)).toBe(basis)

    const retry = await db.apply(sameRepair(basis))
    expect(retry.applied).toBe(true)
    expect(db.increments).toBe(1)
    expect(db.balanceOf(TENANT_A, USER_A)).toBe(9500)
  })

  it('keeps ten parallel identical repairs to one ledger effect', async () => {
    const db = new RepairDatabase()
    const basis = db.basis(TENANT_A, USER_A, APPOINTMENT_A)
    const results = await Promise.all(Array.from({ length: 10 }, () => db.apply(sameRepair(basis, 4750))))
    expect(results.filter((result) => result.applied)).toHaveLength(1)
    expect(db.increments).toBe(1)
    expect(db.balanceOf(TENANT_A, USER_A)).toBe(4750)
  })
})

describe('cancellation obligation repair migration', () => {
  const sql = readFileSync(MIGRATION, 'utf8')

  it('guards the repair with a partial unique index and one balance mutation', () => {
    expect(sql).toContain('credit_tx_obligation_repair_basis_uidx')
    expect(sql).toContain('obligation_repair_basis_id')
    expect(sql).toContain("reference_type = 'appointment'")
    expect(sql).toContain("'cancellation_charge_waiver'")
    expect(sql).toContain("'cancellation_charge_reinstate'")
    expect(sql).toContain('obligation_repair_basis_id IS NOT NULL')
    expect(sql).toContain('DO NOTHING')
    expect(sql).toContain('FOR UPDATE')
    expect(sql).toContain('SELECT ib.balance_rappen')
    expect(sql).toContain('FROM public.increment_balance(p_user_id, p_tenant_id, p_delta_rappen) AS ib')
    expect(sql).not.toMatch(/v_balance\s*:=\s*public\.increment_balance/)
    expect(sql.match(/public\.increment_balance\s*\(/g)).toHaveLength(1)

    const staleAt = sql.indexOf('stale := true')
    const insertAt = sql.indexOf('INSERT INTO public.credit_transactions')
    const incrementAt = sql.indexOf('increment_balance')
    const replayAt = sql.indexOf('already_applied := true')
    expect(staleAt).toBeGreaterThan(-1)
    expect(staleAt).toBeLessThan(insertAt)
    expect(insertAt).toBeLessThan(replayAt)
    expect(replayAt).toBeLessThan(incrementAt)
  })

  it('does not weaken the applied manual top-up idempotency', () => {
    expect(sql).not.toContain('apply_manual_credit_topup')
    expect(sql).not.toContain('credit_tx_manual_topup_idempotency_uidx')
    expect(sql).not.toContain('DROP INDEX')
    expect(sql).not.toContain('DROP FUNCTION')
  })

  it('locks the appointment inside the caller tenant and student', () => {
    expect(sql).toContain('a.tenant_id = p_tenant_id')
    expect(sql).toContain('a.user_id = p_user_id')
    expect(sql).toContain("a.status = 'cancelled'")
    expect(sql).toContain('appointment_mismatch')
  })
})
