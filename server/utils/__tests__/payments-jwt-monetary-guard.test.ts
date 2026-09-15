import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { policiesForTable } from '../rls-policy-parser'
import {
  PAYMENT_MONETARY_FIELDS,
  PAYMENTS_JWT_INSERT_FORBIDDEN,
  PAYMENTS_JWT_MONETARY_UPDATE_FORBIDDEN,
  applyJwtPaymentMonetaryGuard,
} from '../payments-jwt-monetary-guard'

const sql = readFileSync(
  resolve(process.cwd(), 'migrations/20260911_prevent_authenticated_payment_monetary_mutation.sql'),
  'utf8',
)

describe('Phase 1 payments JWT monetary RLS contract', () => {
  it('pins a search_path-safe trigger that blocks authenticated inserts and monetary updates', () => {
    expect(sql).toContain('SET search_path TO pg_catalog, public')
    expect(sql).toContain("coalesce(auth.role(), '') = 'service_role'")
    expect(sql).toContain("RAISE EXCEPTION 'payments_jwt_insert_forbidden'")
    expect(sql).toContain("RAISE EXCEPTION 'payments_jwt_monetary_update_forbidden'")
    expect(sql).toContain('trg_prevent_jwt_payment_monetary_mutation')
    for (const field of PAYMENT_MONETARY_FIELDS) {
      expect(sql).toContain(`NEW.${field} IS DISTINCT FROM OLD.${field}`)
    }
  })

  it('keeps shop guest INSERT on anon only', () => {
    const policies = policiesForTable(sql, 'payments')
    const shop = policies.find((policy) => policy.name === 'anon_insert_shop_payment')
    expect(shop?.command).toBe('INSERT')
    expect(shop?.roles).toEqual(['anon'])
    expect(shop?.roles).not.toContain('authenticated')
    expect(sql).toContain('AND appointment_id IS NULL')
    expect(sql).toContain('AND COALESCE(lesson_price_rappen, 0) = 0')
  })

  it('does not apply itself; production apply remains a separate ops step', () => {
    expect(sql).toContain('Do NOT apply this to production from the remediation agent')
  })
})

describe('Phase 1 JWT payment monetary guard behavior', () => {
  const planted = {
    lesson_price_rappen: 1,
    total_amount_rappen: 1,
    admin_fee_rappen: 1,
    products_price_rappen: 1,
    discount_amount_rappen: 1,
    voucher_discount_rappen: 0,
    credit_used_rappen: 0,
    payment_status: 'pending',
  }

  it('rejects authenticated INSERT of a planted lesson payment', () => {
    expect(applyJwtPaymentMonetaryGuard({
      role: 'authenticated',
      op: 'INSERT',
      newRow: planted,
    })).toEqual({ ok: false, code: PAYMENTS_JWT_INSERT_FORBIDDEN })
  })

  it('rejects authenticated UPDATE of lesson_price_rappen / total_amount_rappen', () => {
    expect(applyJwtPaymentMonetaryGuard({
      role: 'authenticated',
      op: 'UPDATE',
      oldRow: { ...planted, lesson_price_rappen: 9495, total_amount_rappen: 14495 },
      newRow: planted,
    })).toEqual({ ok: false, code: PAYMENTS_JWT_MONETARY_UPDATE_FORBIDDEN })
  })

  it('allows authenticated status-only updates', () => {
    const oldRow = { ...planted, lesson_price_rappen: 9495, total_amount_rappen: 14495, payment_status: 'pending' }
    const result = applyJwtPaymentMonetaryGuard({
      role: 'authenticated',
      op: 'UPDATE',
      oldRow,
      newRow: { ...oldRow, payment_status: 'completed' },
    })
    expect(result.ok).toBe(true)
  })

  it('lets service_role persist a quoted payment', () => {
    const result = applyJwtPaymentMonetaryGuard({
      role: 'service_role',
      op: 'INSERT',
      newRow: { lesson_price_rappen: 9495, total_amount_rappen: 14495 },
    })
    expect(result).toEqual({
      ok: true,
      row: { lesson_price_rappen: 9495, total_amount_rappen: 14495 },
    })
  })

  it('lets anon shop-shaped inserts through the replica (policy still constrains shape)', () => {
    const result = applyJwtPaymentMonetaryGuard({
      role: 'anon',
      op: 'INSERT',
      newRow: { appointment_id: null, lesson_price_rappen: 0, total_amount_rappen: 2500 },
    })
    expect(result.ok).toBe(true)
  })
})
