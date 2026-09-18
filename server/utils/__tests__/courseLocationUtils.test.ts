import { describe, expect, it } from 'vitest'
import {
  applyCoursePaymentAvailability,
  coursePaymentMethodToAdminEnrollmentOption,
  defaultAdminEnrollmentPaymentOption,
  getCoursePaymentMethod,
  mapTenantDefaultToCoursePaymentMethod,
  parseCoursePaymentMethodOverride,
  resolveConfiguredCoursePaymentMethod,
} from '~/utils/courseLocationUtils'

describe('mapTenantDefaultToCoursePaymentMethod', () => {
  it('maps tenant payment settings onto the course enum', () => {
    expect(mapTenantDefaultToCoursePaymentMethod('cash')).toBe('CASH_ON_SITE')
    expect(mapTenantDefaultToCoursePaymentMethod('invoice')).toBe('INVOICE')
    expect(mapTenantDefaultToCoursePaymentMethod('wallee')).toBe('WALLEE')
    expect(mapTenantDefaultToCoursePaymentMethod(null)).toBe('WALLEE')
  })
})

describe('parseCoursePaymentMethodOverride', () => {
  it('accepts only explicit course methods and treats everything else as inherit', () => {
    expect(parseCoursePaymentMethodOverride('WALLEE')).toBe('WALLEE')
    expect(parseCoursePaymentMethodOverride('CASH_ON_SITE')).toBe('CASH_ON_SITE')
    expect(parseCoursePaymentMethodOverride('INVOICE')).toBe('INVOICE')
    expect(parseCoursePaymentMethodOverride(null)).toBeNull()
    expect(parseCoursePaymentMethodOverride('wallee')).toBeNull()
    expect(parseCoursePaymentMethodOverride('TWINT')).toBeNull()
    expect(parseCoursePaymentMethodOverride('CARD')).toBeNull()
    expect(parseCoursePaymentMethodOverride('credit')).toBeNull()
  })
})

describe('resolveConfiguredCoursePaymentMethod hierarchy', () => {
  it('tenant inherit: Tenant=WALLEE, category inherit, course inherit → WALLEE from tenant', () => {
    expect(resolveConfiguredCoursePaymentMethod({
      coursePaymentMethod: null,
      categoryPaymentMethod: null,
      tenantDefault: 'wallee',
    })).toEqual({ paymentMethod: 'WALLEE', source: 'tenant' })
  })

  it('category override beats tenant', () => {
    expect(resolveConfiguredCoursePaymentMethod({
      coursePaymentMethod: null,
      categoryPaymentMethod: 'CASH_ON_SITE',
      tenantDefault: 'wallee',
    })).toEqual({ paymentMethod: 'CASH_ON_SITE', source: 'category' })
  })

  it('course override beats category', () => {
    expect(resolveConfiguredCoursePaymentMethod({
      coursePaymentMethod: 'WALLEE',
      categoryPaymentMethod: 'CASH_ON_SITE',
      tenantDefault: 'wallee',
    })).toEqual({ paymentMethod: 'WALLEE', source: 'course' })
  })

  it('category inherit follows tenant invoice', () => {
    expect(resolveConfiguredCoursePaymentMethod({
      coursePaymentMethod: null,
      categoryPaymentMethod: null,
      tenantDefault: 'invoice',
    })).toEqual({ paymentMethod: 'INVOICE', source: 'tenant' })
  })

  it('course inherit follows category cash', () => {
    expect(resolveConfiguredCoursePaymentMethod({
      coursePaymentMethod: null,
      categoryPaymentMethod: 'CASH_ON_SITE',
      tenantDefault: 'wallee',
    })).toEqual({ paymentMethod: 'CASH_ON_SITE', source: 'category' })
  })

  it('course invoice overrides category cash', () => {
    expect(resolveConfiguredCoursePaymentMethod({
      coursePaymentMethod: 'INVOICE',
      categoryPaymentMethod: 'CASH_ON_SITE',
      tenantDefault: 'wallee',
    })).toEqual({ paymentMethod: 'INVOICE', source: 'course' })
  })

  it('tenant default change affects only inheriting rows', () => {
    const inheriting = resolveConfiguredCoursePaymentMethod({
      coursePaymentMethod: null,
      categoryPaymentMethod: null,
      tenantDefault: 'cash',
    })
    const overridden = resolveConfiguredCoursePaymentMethod({
      coursePaymentMethod: 'WALLEE',
      categoryPaymentMethod: null,
      tenantDefault: 'cash',
    })
    expect(inheriting).toEqual({ paymentMethod: 'CASH_ON_SITE', source: 'tenant' })
    expect(overridden).toEqual({ paymentMethod: 'WALLEE', source: 'course' })
  })

  it('category change affects inheriting courses but not explicit course overrides', () => {
    expect(resolveConfiguredCoursePaymentMethod({
      coursePaymentMethod: null,
      categoryPaymentMethod: 'INVOICE',
      tenantDefault: 'wallee',
    }).paymentMethod).toBe('INVOICE')
    expect(resolveConfiguredCoursePaymentMethod({
      coursePaymentMethod: 'WALLEE',
      categoryPaymentMethod: 'INVOICE',
      tenantDefault: 'wallee',
    }).paymentMethod).toBe('WALLEE')
  })
})

describe('applyCoursePaymentAvailability', () => {
  it('does not enable Wallee when the tenant gate is off', () => {
    expect(applyCoursePaymentAvailability({
      configured: 'WALLEE',
      walleeEnabled: false,
      invoiceEnabled: true,
      city: 'Zürich',
    })).toBe('CASH_ON_SITE')
  })

  it('does not enable invoice when the tenant gate is off', () => {
    expect(applyCoursePaymentAvailability({
      configured: 'INVOICE',
      walleeEnabled: true,
      invoiceEnabled: false,
      city: 'Zürich',
    })).toBe('WALLEE')
  })

  it('keeps Einsiedeln as the invoice-disabled degrade path', () => {
    expect(applyCoursePaymentAvailability({
      configured: 'INVOICE',
      walleeEnabled: true,
      invoiceEnabled: false,
      city: 'Einsiedeln',
    })).toBe('CASH_ON_SITE')
  })
})

describe('course booking uses the stored course method', () => {
  it('honors an explicit course payment_method', () => {
    expect(getCoursePaymentMethod({ payment_method: 'CASH_ON_SITE', city: 'Zürich' }, true, true)).toBe('CASH_ON_SITE')
    expect(getCoursePaymentMethod({ payment_method: 'INVOICE', city: 'Zürich' }, true, true)).toBe('INVOICE')
    expect(getCoursePaymentMethod({ payment_method: 'WALLEE', city: 'Einsiedeln' }, true, true)).toBe('WALLEE')
  })

  it('inherits category then tenant when course is NULL', () => {
    expect(getCoursePaymentMethod({
      payment_method: null,
      course_category: { payment_method: 'CASH_ON_SITE' },
      tenant_default_payment_method: 'wallee',
      city: 'Zürich',
    }, true, true)).toBe('CASH_ON_SITE')
    expect(getCoursePaymentMethod({
      payment_method: null,
      course_category: { payment_method: null },
      tenant_default_payment_method: 'invoice',
      city: 'Zürich',
    }, true, true)).toBe('INVOICE')
  })
})

describe('defaultAdminEnrollmentPaymentOption', () => {
  it('preselects invoice for company-collective courses', () => {
    expect(defaultAdminEnrollmentPaymentOption({
      payment_method: 'WALLEE',
      billing_mode: 'company_collective',
      company_id: 'co-1',
    }, true, true)).toBe('invoice')
  })

  it('maps course methods onto admin enroll options', () => {
    expect(coursePaymentMethodToAdminEnrollmentOption('INVOICE', true)).toBe('invoice')
    expect(coursePaymentMethodToAdminEnrollmentOption('CASH_ON_SITE', true)).toBe('cash')
    expect(coursePaymentMethodToAdminEnrollmentOption('WALLEE', true)).toBe('online_link')
    expect(coursePaymentMethodToAdminEnrollmentOption('WALLEE', false)).toBe('cash')
  })
})
