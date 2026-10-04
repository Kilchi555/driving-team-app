import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  applyLegacyAttribution,
  attributionForNewCashInsert,
  classifyHistoricalCashPayment,
  type CashAttributionRow,
  type HistoricalCashInput,
} from '../cash-ledger-attribution'

const TENANT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const TENANT_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const STAFF = '11111111-1111-1111-1111-111111111111'
const OTHER_STAFF = '22222222-2222-2222-2222-222222222222'
const CASHIER = '33333333-3333-3333-3333-333333333333'

function exactCash(overrides: Partial<HistoricalCashInput> = {}): HistoricalCashInput {
  return {
    paymentMethod: 'cash',
    paymentStatus: 'completed',
    appointmentId: 'appt-1',
    paymentStaffId: STAFF,
    appointmentStaffId: STAFF,
    paymentTenantId: TENANT_A,
    appointmentTenantId: TENANT_A,
    scopeTenantId: TENANT_A,
    totalAmountRappen: 9500,
    amountPaidRappen: 9500,
    creditUsedRappen: 0,
    refundedAmountRappen: 0,
    partialSumRappen: 0,
    cashTransactionCount: 1,
    cashTransactionAmountRappen: 9500,
    cashTransactionTenantId: null,
    successfulRefund: false,
    switchedFrom: null,
    originalMethodCompleted: false,
    ...overrides,
  }
}

const emptyRow: CashAttributionRow = {
  cashierStaffId: null,
  serviceStaffId: null,
  attribution: null,
  tenantId: null,
}

describe('classifyHistoricalCashPayment', () => {
  it('classifies an exact cash payment without a method change as a service-staff proxy', () => {
    const decision = classifyHistoricalCashPayment(exactCash())
    expect(decision).toEqual({
      kind: 'legacy_service_staff',
      bucket: 'legacy_no_switch',
      serviceStaffId: STAFF,
      tenantId: TENANT_A,
    })
  })

  it('classifies an unpaid Wallee checkout that later completed as cash', () => {
    const decision = classifyHistoricalCashPayment(exactCash({
      switchedFrom: 'wallee',
      originalMethodCompleted: false,
    }))
    expect(decision).toMatchObject({
      kind: 'legacy_service_staff',
      bucket: 'legacy_wallee',
      serviceStaffId: STAFF,
    })
  })

  it('classifies an unpaid invoice that later completed as cash', () => {
    const decision = classifyHistoricalCashPayment(exactCash({
      switchedFrom: 'invoice',
      originalMethodCompleted: false,
      amountPaidRappen: null,
    }))
    expect(decision).toMatchObject({
      kind: 'legacy_service_staff',
      bucket: 'legacy_invoice',
    })
  })

  it('excludes a switch that happened after the original method was already completed', () => {
    expect(classifyHistoricalCashPayment(exactCash({
      switchedFrom: 'wallee',
      originalMethodCompleted: true,
    }))).toEqual({ kind: 'exclude', reason: 'original_completed' })

    expect(classifyHistoricalCashPayment(exactCash({
      switchedFrom: 'invoice',
      originalMethodCompleted: true,
    }))).toEqual({ kind: 'exclude', reason: 'original_completed' })
  })

  it('excludes refunded payments and successful refund rows', () => {
    expect(classifyHistoricalCashPayment(exactCash({
      paymentStatus: 'refunded',
    }))).toEqual({ kind: 'exclude', reason: 'refund' })

    expect(classifyHistoricalCashPayment(exactCash({
      successfulRefund: true,
    }))).toEqual({ kind: 'exclude', reason: 'refund' })
  })

  it('excludes a cash method change that never completed', () => {
    expect(classifyHistoricalCashPayment(exactCash({
      paymentStatus: 'cancelled',
      switchedFrom: 'wallee',
    }))).toEqual({ kind: 'exclude', reason: 'not_completed_cash' })

    expect(classifyHistoricalCashPayment(exactCash({
      paymentStatus: 'pending',
    }))).toEqual({ kind: 'exclude', reason: 'not_completed_cash' })
  })

  it('excludes an amount that the stored figures do not agree on', () => {
    expect(classifyHistoricalCashPayment(exactCash({
      creditUsedRappen: 1900,
    }))).toEqual({ kind: 'exclude', reason: 'ambiguous' })

    expect(classifyHistoricalCashPayment(exactCash({
      totalAmountRappen: 14778,
      amountPaidRappen: 16890,
      partialSumRappen: 16890,
      cashTransactionAmountRappen: 16890,
    }))).toEqual({ kind: 'exclude', reason: 'ambiguous' })

    expect(classifyHistoricalCashPayment(exactCash({
      partialSumRappen: 7500,
    }))).toEqual({ kind: 'exclude', reason: 'ambiguous' })

    expect(classifyHistoricalCashPayment(exactCash({
      cashTransactionCount: 2,
    }))).toEqual({ kind: 'exclude', reason: 'ambiguous' })

    expect(classifyHistoricalCashPayment(exactCash({
      cashTransactionAmountRappen: 8500,
    }))).toEqual({ kind: 'exclude', reason: 'ambiguous' })
  })

  it('does not treat a matching partial history as ambiguous', () => {
    const decision = classifyHistoricalCashPayment(exactCash({
      partialSumRappen: 9500,
    }))
    expect(decision.kind).toBe('legacy_service_staff')
  })
})

describe('applyLegacyAttribution', () => {
  it('sets the service staff and tenant and leaves the cashier empty', () => {
    const applied = applyLegacyAttribution(emptyRow, classifyHistoricalCashPayment(exactCash()))
    expect(applied).toEqual({
      cashierStaffId: null,
      serviceStaffId: STAFF,
      attribution: 'legacy_service_staff',
      tenantId: TENANT_A,
    })
  })

  it('does not overwrite a row that already names a cashier', () => {
    const applied = applyLegacyAttribution(
      { ...emptyRow, cashierStaffId: CASHIER },
      classifyHistoricalCashPayment(exactCash()),
    )
    expect(applied).toBeNull()
  })

  it('does not overwrite an existing attribution', () => {
    const applied = applyLegacyAttribution(
      { ...emptyRow, attribution: 'unknown' },
      classifyHistoricalCashPayment(exactCash()),
    )
    expect(applied).toBeNull()

    const alreadyLegacy = applyLegacyAttribution(
      {
        cashierStaffId: null,
        serviceStaffId: STAFF,
        attribution: 'legacy_service_staff',
        tenantId: TENANT_A,
      },
      classifyHistoricalCashPayment(exactCash()),
    )
    expect(alreadyLegacy).toBeNull()
  })

  it('does not attribute a payment into another tenant', () => {
    expect(classifyHistoricalCashPayment(exactCash({
      scopeTenantId: TENANT_B,
    }))).toEqual({ kind: 'exclude', reason: 'identity' })

    expect(classifyHistoricalCashPayment(exactCash({
      appointmentTenantId: TENANT_B,
    }))).toEqual({ kind: 'exclude', reason: 'identity' })

    expect(classifyHistoricalCashPayment(exactCash({
      cashTransactionTenantId: TENANT_B,
    }))).toEqual({ kind: 'exclude', reason: 'foreign_tenant' })

    expect(classifyHistoricalCashPayment(exactCash({
      paymentStaffId: OTHER_STAFF,
    }))).toEqual({ kind: 'exclude', reason: 'identity' })

    const decision = classifyHistoricalCashPayment(exactCash())
    expect(applyLegacyAttribution(
      { ...emptyRow, tenantId: TENANT_B },
      decision,
    )).toBeNull()
  })

  it('is idempotent because the second pass sees an attribution', () => {
    const decision = classifyHistoricalCashPayment(exactCash({ switchedFrom: 'wallee' }))
    const first = applyLegacyAttribution(emptyRow, decision)
    expect(first?.attribution).toBe('legacy_service_staff')
    expect(first?.cashierStaffId).toBeNull()
    expect(applyLegacyAttribution(first!, decision)).toBeNull()
  })

  it('does not apply an excluded decision', () => {
    expect(applyLegacyAttribution(
      emptyRow,
      classifyHistoricalCashPayment(exactCash({ creditUsedRappen: 1000 })),
    )).toBeNull()
  })
})

describe('attributionForNewCashInsert', () => {
  it('turns a new appointment row with no attribution into unknown', () => {
    expect(attributionForNewCashInsert({
      appointmentId: 'appt-1',
      attribution: null,
    })).toBe('unknown')
  })

  it('keeps product-sale and credit-deposit rows unclassified', () => {
    expect(attributionForNewCashInsert({
      appointmentId: null,
      attribution: null,
    })).toBeNull()
  })

  it('refuses to insert a legacy proxy', () => {
    expect(attributionForNewCashInsert({
      appointmentId: 'appt-1',
      attribution: 'legacy_service_staff',
    })).toBe('reject_legacy_insert')
  })

  it('does not infer a cashier from the caller', () => {
    const result = attributionForNewCashInsert({
      appointmentId: 'appt-1',
      attribution: null,
    })
    expect(result).toBe('unknown')
    expect(result).not.toBe('cashier_staff')
  })
})

describe('cash ledger migration contract', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'migrations/20261004_cash_ledger_foundation.sql'),
    'utf8',
  )

  it('adds the attribution columns without rewriting payment or balance tables', () => {
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS cashier_staff_id uuid')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS service_staff_id uuid')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS attribution text')
    expect(sql).not.toMatch(/UPDATE\s+public\.payments\b/i)
    expect(sql).not.toMatch(/UPDATE\s+public\.payment_refunds\b/i)
    expect(sql).not.toMatch(/UPDATE\s+public\.cash_movements\b/i)
    expect(sql).not.toMatch(/UPDATE\s+public\.cash_balances\b/i)
    expect(sql).not.toMatch(/\bDELETE\s+FROM\b/i)
    expect(sql).not.toMatch(/PERFORM\s+public\.apply_legacy_cash_attribution/i)
    expect(sql).not.toMatch(/SELECT\s+public\.apply_legacy_cash_attribution/i)
  })

  it('keeps a legacy proxy from also claiming a cashier', () => {
    expect(sql).toContain("attribution IN ('cashier_staff', 'legacy_service_staff', 'unknown')")
    expect(sql).toContain('cash_transactions_legacy_cashier_null_check')
    expect(sql).toContain("attribution IS DISTINCT FROM 'legacy_service_staff'")
    expect(sql).toContain('OR cashier_staff_id IS NULL')
    expect(sql).toContain("attribution IS DISTINCT FROM 'cashier_staff'")
    expect(sql).toContain('OR cashier_staff_id IS NOT NULL')
  })

  it('limits the backfill to empty cashier and empty attribution inside one tenant', () => {
    expect(sql).toContain('UPDATE public.cash_transactions ct')
    expect(sql).toContain("attribution = 'legacy_service_staff'")
    expect(sql).toContain('service_staff_id = c.service_staff_id')
    expect(sql).toContain('tenant_id = c.tenant_id')
    expect(sql).toContain('AND ct.cashier_staff_id IS NULL')
    expect(sql).toContain('AND ct.attribution IS NULL')
    expect(sql).toContain('AND (ct.tenant_id IS NULL OR ct.tenant_id = p_tenant_id)')
    expect(sql).toContain("RAISE EXCEPTION 'tenant_required'")
    expect(sql).not.toMatch(/SET[\s\S]{0,240}cashier_staff_id\s*=/)
  })

  it('does not invent a cashier from the appointment staff on new cash payments', () => {
    const start = sql.indexOf('CREATE OR REPLACE FUNCTION public.create_cash_transaction_from_payment()')
    const end = sql.indexOf('CREATE OR REPLACE FUNCTION public.create_cash_transaction(', start)
    const triggerSql = sql.slice(start, end)
    expect(triggerSql).toContain('cashier_staff_id')
    expect(triggerSql).toContain('service_staff_id')
    expect(triggerSql).toContain('v_appointment_data.instructor_id')
    expect(triggerSql).toContain("'unknown'")
    expect(triggerSql).toContain('NULL')
    expect(triggerSql).not.toContain("attribution = 'cashier_staff'")
    expect(triggerSql).not.toContain("'legacy_service_staff'")
    expect(triggerSql).toContain('NEW.tenant_id IS NOT DISTINCT FROM v_appointment_data.appointment_tenant_id')
    expect(triggerSql).not.toMatch(/cashier_staff_id,\s*\n\s*attribution\s*\)\s*VALUES[\s\S]*auth\.uid\(\)/)
  })

  it('makes create_cash_transaction write unknown and not the caller as cashier', () => {
    const start = sql.indexOf('CREATE OR REPLACE FUNCTION public.create_cash_transaction(')
    const end = sql.indexOf('COMMENT ON FUNCTION public.create_cash_transaction', start)
    const fn = sql.slice(start, end)
    expect(fn).toContain('p_instructor_id uuid')
    expect(fn).toContain('p_notes text DEFAULT NULL')
    expect(fn).not.toContain('p_cashier_staff_id')
    expect(fn).not.toContain('p_attribution')
    expect(fn).not.toContain('auth.uid()')
    expect(fn).toContain('a.staff_id')
    expect(fn).toContain("'unknown'")
    expect(fn).toContain('Nur Fahrlehrer können Bargeldtransaktionen erstellen')
    expect(fn).toContain('Termin nicht gefunden')
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.create_cash_transaction(uuid, uuid, uuid, integer, text) FROM authenticated')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.create_cash_transaction(uuid, uuid, uuid, integer, text) TO service_role')
  })

  it('stops a new appointment insert from remaining unclassified or legacy', () => {
    expect(sql).toContain('CREATE TRIGGER cash_transactions_protect_attribution')
    expect(sql).toContain('BEFORE INSERT OR UPDATE ON public.cash_transactions')
    expect(sql).toContain("RAISE EXCEPTION 'attribution_not_client_writable'")
    expect(sql).toContain("RAISE EXCEPTION 'legacy_attribution_insert_forbidden'")
    expect(sql).toContain('NEW.appointment_id IS NOT NULL AND NEW.attribution IS NULL')
    expect(sql).toContain("NEW.attribution := 'unknown'")
    expect(sql).toContain("coalesce(auth.role(), '') IN ('authenticated', 'anon')")
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.cash_transactions_protect_attribution() TO authenticated')
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.cash_transactions_protect_attribution() FROM anon')
    expect(sql).not.toContain('REVOKE ALL ON FUNCTION public.cash_transactions_protect_attribution() FROM authenticated')
  })

  it('removes authenticated write access to the attribution columns only', () => {
    expect(sql).toContain('REVOKE INSERT, UPDATE ON TABLE public.cash_transactions FROM authenticated')
    expect(sql).not.toContain('DROP POLICY')
    expect(sql).not.toContain('REVOKE DELETE')
    expect(sql).not.toContain('REVOKE SELECT')

    const grantAt = sql.indexOf('GRANT INSERT (')
    const grantEnd = sql.indexOf(') ON TABLE public.cash_transactions TO authenticated', grantAt)
    const granted = sql.slice(grantAt, grantEnd)
    expect(granted).toContain('amount_rappen')
    expect(granted).toContain('notes')
    expect(granted).toContain('status')
    expect(granted).toContain('instructor_id')
    expect(granted).toContain('tenant_id')
    expect(granted).not.toContain('cashier_staff_id')
    expect(granted).not.toContain('service_staff_id')
    expect(granted).not.toContain('attribution')
  })

  it('leaves product-sale and credit-deposit inserts outside appointment legacy', () => {
    const pos = readFileSync(
      resolve(process.cwd(), 'migrations/20261001_staff_pos_payment_rpc.sql'),
      'utf8',
    )
    const posStart = pos.indexOf('INSERT INTO public.cash_transactions')
    const posEnd = pos.indexOf("IF p_method IN ('invoice', 'invoice_send')", posStart)
    const posInsert = pos.slice(posStart, posEnd)
    expect(posInsert).toContain('NULL')
    expect(posInsert).toContain("'product_sale'")
    expect(posInsert).not.toContain('attribution')
    expect(posInsert).not.toContain('cashier_staff_id')
    expect(posInsert).not.toContain('service_staff_id')

    const deposit = readFileSync(
      resolve(process.cwd(), 'server/api/student-credits/deposit.post.ts'),
      'utf8',
    )
    const depositStart = deposit.indexOf(".from('cash_transactions')")
    const depositInsert = deposit.slice(depositStart, depositStart + 700)
    expect(depositInsert).toContain("transaction_source: 'credit_deposit'")
    expect(depositInsert).not.toContain('appointment_id')
    expect(depositInsert).not.toContain('attribution')
    expect(depositInsert).not.toContain('cashier_staff_id')
    expect(depositInsert).not.toContain('service_staff_id')
  })

  it('grants the new functions to service_role only', () => {
    for (const name of [
      'cash_ledger_classify_payments(uuid)',
      'cash_ledger_legacy_candidates(uuid)',
      'apply_legacy_cash_attribution(uuid)',
    ]) {
      expect(sql).toContain(`REVOKE ALL ON FUNCTION public.${name} FROM PUBLIC`)
      expect(sql).toContain(`REVOKE ALL ON FUNCTION public.${name} FROM authenticated`)
      expect(sql).toContain(`GRANT EXECUTE ON FUNCTION public.${name} TO service_role`)
    }
  })

  it('documents the historical proxy and the verified 345 population', () => {
    expect(sql).toContain('legacy_service_staff does NOT mean the appointment staff took the cash')
    expect(sql).toContain('legacy_no_switch = 204')
    expect(sql).toContain('legacy_wallee = 136')
    expect(sql).toContain('legacy_invoice = 5')
    expect(sql).toContain('legacy total = 345')
    expect(sql).toContain('ambiguous = 6')
    expect(sql).not.toContain('28455b49')
    expect(sql).not.toContain('517bb4ca')
  })
})
