import { describe, expect, it } from 'vitest'
import {
  INVOICE_PAYMENT_DISABLED_MESSAGE,
  assertInvoicePaymentMethodAllowed,
  parseCategoryDefaultPaymentMethod,
  resolveNewCoursePaymentMethod,
  shouldApplyCategoryPaymentDefault,
} from '~/utils/category-default-payment-method'
import { getCoursePaymentMethod } from '~/utils/courseLocationUtils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8')

describe('parseCategoryDefaultPaymentMethod', () => {
  it('maps empty values to NULL (Mandantenstandard)', () => {
    expect(parseCategoryDefaultPaymentMethod(null)).toBeNull()
    expect(parseCategoryDefaultPaymentMethod(undefined)).toBeNull()
    expect(parseCategoryDefaultPaymentMethod('')).toBeNull()
  })

  it('accepts explicit course payment enums', () => {
    expect(parseCategoryDefaultPaymentMethod('WALLEE')).toBe('WALLEE')
    expect(parseCategoryDefaultPaymentMethod('CASH_ON_SITE')).toBe('CASH_ON_SITE')
    expect(parseCategoryDefaultPaymentMethod('INVOICE')).toBe('INVOICE')
  })

  it('rejects invalid values', () => {
    expect(() => parseCategoryDefaultPaymentMethod('wallee')).toThrow(/Ungültige Standard-Zahlungsart/)
    expect(() => parseCategoryDefaultPaymentMethod('invoice')).toThrow(/Ungültige Standard-Zahlungsart/)
  })
})

describe('resolveNewCoursePaymentMethod', () => {
  it('uses tenant default when category default is NULL', () => {
    expect(resolveNewCoursePaymentMethod({
      categoryDefaultPaymentMethod: null,
      tenantDefaultPaymentMethod: 'wallee',
    })).toBe('WALLEE')
    expect(resolveNewCoursePaymentMethod({
      categoryDefaultPaymentMethod: null,
      tenantDefaultPaymentMethod: 'cash',
    })).toBe('CASH_ON_SITE')
    expect(resolveNewCoursePaymentMethod({
      categoryDefaultPaymentMethod: null,
      tenantDefaultPaymentMethod: 'invoice',
    })).toBe('INVOICE')
  })

  it('inherits explicit category defaults', () => {
    expect(resolveNewCoursePaymentMethod({
      categoryDefaultPaymentMethod: 'WALLEE',
      tenantDefaultPaymentMethod: 'invoice',
    })).toBe('WALLEE')
    expect(resolveNewCoursePaymentMethod({
      categoryDefaultPaymentMethod: 'CASH_ON_SITE',
      tenantDefaultPaymentMethod: 'wallee',
    })).toBe('CASH_ON_SITE')
    expect(resolveNewCoursePaymentMethod({
      categoryDefaultPaymentMethod: 'INVOICE',
      tenantDefaultPaymentMethod: 'wallee',
    })).toBe('INVOICE')
  })
})

describe('shouldApplyCategoryPaymentDefault', () => {
  it('applies when the category changes even after a manual edit', () => {
    expect(shouldApplyCategoryPaymentDefault({
      categoryChanged: true,
      paymentManuallyEdited: true,
    })).toBe(true)
  })

  it('respects a manual payment edit until the category changes again', () => {
    expect(shouldApplyCategoryPaymentDefault({
      categoryChanged: false,
      paymentManuallyEdited: true,
    })).toBe(false)
    expect(shouldApplyCategoryPaymentDefault({
      categoryChanged: false,
      paymentManuallyEdited: false,
    })).toBe(true)
  })
})

describe('assertInvoicePaymentMethodAllowed', () => {
  it('allows non-invoice methods when invoices are disabled', () => {
    expect(() => assertInvoicePaymentMethodAllowed({
      paymentMethod: 'WALLEE',
      invoicePaymentsEnabled: false,
    })).not.toThrow()
    expect(() => assertInvoicePaymentMethodAllowed({
      paymentMethod: null,
      invoicePaymentsEnabled: false,
    })).not.toThrow()
  })

  it('allows INVOICE when invoices are enabled', () => {
    expect(() => assertInvoicePaymentMethodAllowed({
      paymentMethod: 'INVOICE',
      invoicePaymentsEnabled: true,
    })).not.toThrow()
  })

  it('errors on INVOICE when invoices are disabled (no silent downgrade)', () => {
    expect(() => assertInvoicePaymentMethodAllowed({
      paymentMethod: 'INVOICE',
      invoicePaymentsEnabled: false,
    })).toThrow(INVOICE_PAYMENT_DISABLED_MESSAGE)
  })
})

describe('getCoursePaymentMethod loading semantics', () => {
  it('keeps explicit INVOICE while invoiceEnabled is still unknown', () => {
    expect(getCoursePaymentMethod(
      { payment_method: 'INVOICE', city: 'Zürich' },
      true,
      undefined,
    )).toBe('INVOICE')
  })

  it('never silently rewrites explicit INVOICE when invoices are disabled', () => {
    expect(getCoursePaymentMethod(
      { payment_method: 'INVOICE', city: 'Zürich' },
      true,
      false,
    )).toBe('INVOICE')
  })
})

describe('category default payment method wiring', () => {
  it('adds a nullable DB column with the course payment enum check', () => {
    const sql = read('migrations/20261011_course_categories_default_payment_method.sql')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS default_payment_method text')
    expect(sql).toContain("'WALLEE', 'CASH_ON_SITE', 'INVOICE'")
    expect(sql).not.toMatch(/default_payment_method\s+text\s+NOT\s+NULL/i)
    expect(sql).not.toMatch(/UPDATE\s+course_categories/i)
    expect(sql).not.toMatch(/DROP COLUMN/i)
  })

  it('whitelists and validates the field on category save', () => {
    const src = read('server/api/admin/course-categories/save.post.ts')
    expect(src).toContain("'default_payment_method'")
    expect(src).toContain('parseCategoryDefaultPaymentMethod')
    expect(src).toContain('assertInvoicePaymentMethodAllowed')
    expect(src).toContain('getTenantInvoicePaymentsEnabled')
  })

  it('rejects INVOICE on course upsert when invoices are disabled', () => {
    const src = read('server/api/admin/courses/upsert.post.ts')
    expect(src).toContain('assertInvoicePaymentMethodAllowed')
    expect(src).toContain("courseData.payment_method === 'INVOICE'")
  })

  it('keeps invoice_timing_mode separate from Standard-Zahlungsart in the admin UI', () => {
    const src = read('pages/admin/courses.vue')
    expect(src).toContain('Standard-Zahlungsart')
    expect(src).toContain('Mandantenstandard')
    expect(src).toContain('applyCategoryPaymentDefaultToCourse')
    expect(src).toContain('coursePaymentManuallyEdited')
    expect(src).toContain('resolveNewCoursePaymentMethod')
    expect(src).toContain('Rechnungsstellung')
  })

  it('uses persisted course payment_method on public enrollment and waits for invoice settings', () => {
    const modal = read('components/customer/CourseEnrollmentModal.vue')
    expect(modal).toContain('invoiceSettingsLoaded.value ? invoiceEnabled.value : undefined')
    expect(modal).toContain('invoiceEnrollmentBlocked')
    expect(modal).toContain('getCoursePaymentMethod')
    expect(modal).toContain("paymentMethod.value === 'WALLEE'")
    const publicApi = read('server/api/courses/public.get.ts')
    expect(publicApi).toContain('payment_method')
  })

  it('rejects the legacy courses/create path instead of inserting without payment_method', () => {
    const src = read('server/api/admin/courses/create.post.ts')
    expect(src).toContain('statusCode: 410')
    expect(src).toContain('/api/admin/courses/upsert')
    expect(src).not.toMatch(/\.insert\(/)
  })

  it('blocks Wallee enrollment for INVOICE courses even when invoices are disabled', () => {
    const src = read('server/api/courses/enroll-wallee.post.ts')
    expect(src).toContain('INVOICE_ENROLLMENT_DISABLED_MESSAGE')
    expect(src).toContain("explicitMethod === 'INVOICE'")
    expect(src).not.toContain('auto-degrade')
  })
})
