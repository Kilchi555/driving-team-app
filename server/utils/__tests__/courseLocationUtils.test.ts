import { describe, expect, it } from 'vitest'
import {
  coursePaymentMethodToAdminEnrollmentOption,
  defaultAdminEnrollmentPaymentOption,
  getCoursePaymentMethod,
  mapTenantDefaultToCoursePaymentMethod,
} from '~/utils/courseLocationUtils'

describe('mapTenantDefaultToCoursePaymentMethod', () => {
  it('maps tenant payment settings onto the course enum', () => {
    expect(mapTenantDefaultToCoursePaymentMethod('cash')).toBe('CASH_ON_SITE')
    expect(mapTenantDefaultToCoursePaymentMethod('invoice')).toBe('INVOICE')
    expect(mapTenantDefaultToCoursePaymentMethod('wallee')).toBe('WALLEE')
    expect(mapTenantDefaultToCoursePaymentMethod(null)).toBe('WALLEE')
  })
})

describe('course booking uses the stored course method', () => {
  it('honors an explicit course payment_method', () => {
    expect(getCoursePaymentMethod({ payment_method: 'CASH_ON_SITE', city: 'Zürich' }, true, true)).toBe('CASH_ON_SITE')
    expect(getCoursePaymentMethod({ payment_method: 'INVOICE', city: 'Zürich' }, true, true)).toBe('INVOICE')
    expect(getCoursePaymentMethod({ payment_method: 'WALLEE', city: 'Einsiedeln' }, true, true)).toBe('WALLEE')
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
