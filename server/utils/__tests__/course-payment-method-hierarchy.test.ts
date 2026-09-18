import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { resolveEffectiveCoursePaymentMethod } from '../resolve-effective-course-payment-method'
import {
  assertCourseCategoryBelongsToTenant,
  parseWritableCoursePaymentMethod,
} from '../course-payment-method-config'

const TENANT_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const TENANT_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const CATEGORY_A = '11111111-1111-4111-8111-111111111111'
const CATEGORY_B = '22222222-2222-4222-8222-222222222222'
const COURSE_A = '33333333-3333-4333-8333-333333333333'

function makeSupabase(tables: Record<string, Array<Record<string, unknown>>>) {
  return {
    from(table: string) {
      let rows = [...(tables[table] || [])]
      const builder = {
        select() { return builder },
        eq(col: string, val: unknown) {
          rows = rows.filter((r) => r[col] === val)
          return builder
        },
        maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
        single: async () => ({
          data: rows[0] ?? null,
          error: rows[0] ? null : { message: 'not found' },
        }),
      }
      return builder
    },
  }
}

function paymentTables(overrides?: {
  coursePaymentMethod?: string | null
  categoryPaymentMethod?: string | null
  categoryTenant?: string
  tenantDefault?: string
  walleeEnabled?: boolean
  invoiceEnabled?: boolean
}) {
  return {
    courses: [{
      id: COURSE_A,
      tenant_id: TENANT_A,
      payment_method: overrides?.coursePaymentMethod ?? null,
      course_category_id: CATEGORY_A,
      city: 'Zürich',
      name: 'VKU',
    }],
    course_categories: [{
      id: CATEGORY_A,
      tenant_id: overrides?.categoryTenant ?? TENANT_A,
      payment_method: overrides?.categoryPaymentMethod ?? null,
    }, {
      id: CATEGORY_B,
      tenant_id: TENANT_B,
      payment_method: 'INVOICE',
    }],
    tenants: [{
      id: TENANT_A,
      wallee_enabled: overrides?.walleeEnabled ?? true,
    }],
    tenant_settings: [{
      tenant_id: TENANT_A,
      category: 'payment',
      setting_key: 'payment_settings',
      setting_value: {
        default_payment_method: overrides?.tenantDefault ?? 'wallee',
        invoice_payments_enabled: overrides?.invoiceEnabled ?? false,
      },
    }],
  }
}

describe('parseWritableCoursePaymentMethod', () => {
  it('stores inherit as NULL', () => {
    expect(parseWritableCoursePaymentMethod(null)).toBeNull()
    expect(parseWritableCoursePaymentMethod('')).toBeNull()
    expect(parseWritableCoursePaymentMethod('inherit')).toBeNull()
  })

  it('accepts explicit methods and rejects malformed values', () => {
    expect(parseWritableCoursePaymentMethod('WALLEE')).toBe('WALLEE')
    expect(parseWritableCoursePaymentMethod('CASH_ON_SITE')).toBe('CASH_ON_SITE')
    expect(parseWritableCoursePaymentMethod('INVOICE')).toBe('INVOICE')
    expect(() => parseWritableCoursePaymentMethod('TWINT')).toThrow()
    expect(() => parseWritableCoursePaymentMethod('wallee')).toThrow()
  })
})

describe('assertCourseCategoryBelongsToTenant', () => {
  it('rejects a category from another tenant', async () => {
    const supabase = makeSupabase(paymentTables())
    await expect(
      assertCourseCategoryBelongsToTenant(supabase, CATEGORY_B, TENANT_A)
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('allows a category from the same tenant', async () => {
    const supabase = makeSupabase(paymentTables())
    await expect(
      assertCourseCategoryBelongsToTenant(supabase, CATEGORY_A, TENANT_A)
    ).resolves.toBeUndefined()
  })
})

describe('resolveEffectiveCoursePaymentMethod', () => {
  it('uses tenant default when course and category inherit', async () => {
    const result = await resolveEffectiveCoursePaymentMethod(
      makeSupabase(paymentTables({ tenantDefault: 'wallee' })),
      { tenant_id: TENANT_A, payment_method: null, course_category_id: CATEGORY_A, city: 'Zürich' }
    )
    expect(result.configured).toBe('WALLEE')
    expect(result.source).toBe('tenant')
    expect(result.usable).toBe('WALLEE')
  })

  it('uses category override when course inherits', async () => {
    const result = await resolveEffectiveCoursePaymentMethod(
      makeSupabase(paymentTables({ categoryPaymentMethod: 'CASH_ON_SITE', tenantDefault: 'wallee' })),
      { tenant_id: TENANT_A, payment_method: null, course_category_id: CATEGORY_A, city: 'Zürich' }
    )
    expect(result.configured).toBe('CASH_ON_SITE')
    expect(result.source).toBe('category')
  })

  it('uses course override over category', async () => {
    const result = await resolveEffectiveCoursePaymentMethod(
      makeSupabase(paymentTables({
        coursePaymentMethod: 'INVOICE',
        categoryPaymentMethod: 'CASH_ON_SITE',
        invoiceEnabled: true,
      })),
      { tenant_id: TENANT_A, payment_method: 'INVOICE', course_category_id: CATEGORY_A, city: 'Zürich' }
    )
    expect(result.configured).toBe('INVOICE')
    expect(result.source).toBe('course')
    expect(result.usable).toBe('INVOICE')
  })

  it('ignores a poisoned category id from another tenant', async () => {
    const result = await resolveEffectiveCoursePaymentMethod(
      makeSupabase(paymentTables({ tenantDefault: 'wallee' })),
      { tenant_id: TENANT_A, payment_method: null, course_category_id: CATEGORY_B, city: 'Zürich' }
    )
    expect(result.source).toBe('tenant')
    expect(result.configured).toBe('WALLEE')
  })

  it('does not treat WALLEE as usable when wallee is disabled', async () => {
    const result = await resolveEffectiveCoursePaymentMethod(
      makeSupabase(paymentTables({ coursePaymentMethod: 'WALLEE', walleeEnabled: false })),
      { tenant_id: TENANT_A, payment_method: 'WALLEE', course_category_id: CATEGORY_A, city: 'Zürich' }
    )
    expect(result.configured).toBe('WALLEE')
    expect(result.usable).toBe('CASH_ON_SITE')
  })

  it('does not treat INVOICE as usable when invoice payments are disabled', async () => {
    const result = await resolveEffectiveCoursePaymentMethod(
      makeSupabase(paymentTables({ coursePaymentMethod: 'INVOICE', invoiceEnabled: false, walleeEnabled: true })),
      { tenant_id: TENANT_A, payment_method: 'INVOICE', course_category_id: CATEGORY_A, city: 'Zürich' }
    )
    expect(result.configured).toBe('INVOICE')
    expect(result.usable).toBe('WALLEE')
  })
})

describe('enrollment endpoints ignore client paymentMethod', () => {
  it('enroll-cash still discards the requested payment method', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/api/courses/enroll-cash.post.ts'), 'utf8')
    expect(src).toContain('paymentMethod: _requestedPaymentMethod')
    expect(src).toContain('resolveEffectiveCoursePaymentMethod')
    expect(src).toContain('resolveNonWalleeEnrollmentMethod')
    expect(src).not.toContain('fulfillCourseWalleePayment')
  })

  it('enroll-wallee uses configured hierarchy instead of the course column alone', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/api/courses/enroll-wallee.post.ts'), 'utf8')
    expect(src).toContain('resolveEffectiveCoursePaymentMethod')
    expect(src).toContain("configured === 'CASH_ON_SITE'")
    expect(src).toContain("configured === 'INVOICE'")
    expect(src).toContain('invoiceEnabled')
  })

  it('process-public public path refuses cash/invoice courses', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/api/payments/process-public.post.ts'), 'utf8')
    expect(src).toContain('resolveEffectiveCoursePaymentMethod')
    expect(src).toContain("configured === 'CASH_ON_SITE'")
  })

  it('lesson booking resolver is unchanged and separate', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/utils/resolve-online-booking-payment-method.ts'), 'utf8')
    expect(src).not.toContain('resolveEffectiveCoursePaymentMethod')
    expect(src).not.toContain('course_categories')
  })
})

describe('admin writes stay tenant-scoped', () => {
  it('category save scopes updates to the authenticated tenant', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/api/admin/course-categories/save.post.ts'), 'utf8')
    expect(src).toContain('parseWritableCoursePaymentMethod')
    expect(src).toContain("'payment_method'")
    expect(src).toContain('.eq(\'tenant_id\', tenantId)')
    expect(src).toContain('tenant_id: tenantId')
  })

  it('course upsert sanitizes payment_method and checks category ownership', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/api/admin/courses/upsert.post.ts'), 'utf8')
    expect(src).toContain('parseWritableCoursePaymentMethod')
    expect(src).toContain('assertCourseCategoryBelongsToTenant')
    expect(src).toContain('tenant_id: profile.tenant_id')
    expect(src).toContain('.eq(\'tenant_id\', profile.tenant_id)')
  })
})

describe('migration is additive and reversible', () => {
  it('adds a nullable category payment_method without rewriting courses', () => {
    const sql = readFileSync(resolve(process.cwd(), 'migrations/20260918_course_category_payment_method.sql'), 'utf8')
    expect(sql).toContain('ALTER TABLE public.course_categories')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS payment_method TEXT')
    expect(sql).toContain("payment_method IN ('WALLEE', 'CASH_ON_SITE', 'INVOICE')")
    expect(sql).toContain('DROP COLUMN IF EXISTS payment_method')
    expect(sql).not.toContain('UPDATE public.courses')
    expect(sql).not.toContain('UPDATE courses')
  })
})
