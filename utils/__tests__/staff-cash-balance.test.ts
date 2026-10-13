import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { calculateStaffCashBalance } from '~/utils/staff-cash-balance'

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8')

describe('calculateStaffCashBalance', () => {
  it('adds a deposit to the displayed balance', () => {
    expect(calculateStaffCashBalance([{ movement_type: 'deposit', amount_rappen: 10_000 }], [])).toBe(10_000)
  })

  it('subtracts a withdrawal', () => {
    expect(
      calculateStaffCashBalance(
        [
          { movement_type: 'deposit', amount_rappen: 10_000 },
          { movement_type: 'withdrawal', amount_rappen: 2_500 },
        ],
        [],
      ),
    ).toBe(7_500)
  })

  it('subtracts one cash_handover exactly once', () => {
    expect(
      calculateStaffCashBalance(
        [
          { movement_type: 'deposit', amount_rappen: 10_000 },
          { movement_type: 'cash_handover', amount_rappen: 9_200_00 },
        ],
        [],
      ),
    ).toBe(10_000 - 9_200_00)
  })

  it('adds pending cash receipts', () => {
    expect(
      calculateStaffCashBalance([], [{ status: 'pending', amount_rappen: 22_081_40 }]),
    ).toBe(22_081_40)
  })

  it('leaves confirmed and disputed receipts out of the staff total', () => {
    expect(
      calculateStaffCashBalance(
        [],
        [
          { status: 'pending', amount_rappen: 1_000 },
          { status: 'confirmed', amount_rappen: 15 },
          { status: 'confirmed', amount_rappen: 815_000 },
          { status: 'disputed', amount_rappen: 4_000 },
        ],
      ),
    ).toBe(1_000)
  })

  it('subtracts a cash-to-bank movement and adds its reversal once', () => {
    expect(calculateStaffCashBalance([
      { movement_type: 'deposit', amount_rappen: 50_000 },
      { movement_type: 'cash_to_bank', amount_rappen: 10_000 },
      { movement_type: 'cash_to_bank_reversal', amount_rappen: 10_000 },
    ], [])).toBe(50_000)
    expect(calculateStaffCashBalance([
      { movement_type: 'deposit', amount_rappen: 50_000 },
      { movement_type: 'cash_to_bank', amount_rappen: 10_000 },
    ], [])).toBe(40_000)
  })

  it('ignores movement types that are not deposit, withdrawal, cash_handover, or cash-to-bank', () => {
    expect(
      calculateStaffCashBalance(
        [
          { movement_type: 'deposit', amount_rappen: 5_000 },
          { movement_type: 'adjustment', amount_rappen: 700 },
          { movement_type: 'system_init', amount_rappen: 0 },
          { movement_type: 'cash_transaction', amount_rappen: 5_000 },
        ],
        [],
      ),
    ).toBe(5_000)
  })

  it('combines a deposit, a pending receipt, a withdrawal, and a handover', () => {
    expect(
      calculateStaffCashBalance(
        [
          { movement_type: 'deposit', amount_rappen: 1_000 },
          { movement_type: 'withdrawal', amount_rappen: 200 },
          { movement_type: 'cash_handover', amount_rappen: 300 },
        ],
        [
          { status: 'pending', amount_rappen: 500 },
          { status: 'confirmed', amount_rappen: 9_000 },
          { status: 'disputed', amount_rappen: 40 },
        ],
      ),
    ).toBe(1_000)
  })

  it('does not deduplicate two handover rows', () => {
    expect(
      calculateStaffCashBalance(
        [
          { movement_type: 'cash_handover', amount_rappen: 100 },
          { movement_type: 'cash_handover', amount_rappen: 100 },
        ],
        [],
      ),
    ).toBe(-200)
  })
})

describe('staff cash balance wiring', () => {
  const component = read('components/StaffCashBalance.vue')
  const api = read('server/api/staff/cash-balance.post.ts')

  it('uses the shared calculator for the displayed total', () => {
    expect(component).toContain("import { calculateStaffCashBalance } from '~/utils/staff-cash-balance'")
    expect(component).toContain('calculateStaffCashBalance(cashMovements.value, cashTransactions.value)')
    expect(component).toContain('Aktueller Kassenstand')
  })

  it('keeps the per-movement feed', () => {
    expect(component).toContain('cashMovements.value.forEach(movement =>')
    expect(component).toContain("item.data.movement_type === 'deposit' ? '+' : '-'")
    expect(component).toContain("action: 'loadMovements'")
    expect(component).toContain("action: 'loadTransactions'")
  })

  it('does not relax the staff API tenant or authorization filters', () => {
    expect(api).toContain('requireTenantStaff(event)')
    expect(api).toContain('loadStaffInTenant')
    expect(api).toContain('assertSelfOrTenantAdmin')
    expect(api.match(/\.eq\('tenant_id', actor\.tenant_id\)/g)).toHaveLength(2)
    expect(api.match(/\.eq\('instructor_id', instructor\.id\)/g)).toHaveLength(2)
    expect(api).not.toMatch(/tenant_id IS NULL|is\('tenant_id', null\)/)
    expect(component).not.toMatch(/\.from\(['"]cash_/)
  })
})
