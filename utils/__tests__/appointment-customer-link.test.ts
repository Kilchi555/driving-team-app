import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  customerIdToRestore,
  persistedAppointmentUserId,
  selectorValueForLoadedCustomer,
  shouldApplyLinkedCustomerAutoDiscount,
} from '~/utils/appointment-customer-link'

const STAFF = '11111111-1111-4111-8111-111111111111'
const CUSTOMER = '22222222-2222-4222-8222-222222222222'
const OTHER_CUSTOMER = '33333333-3333-4333-8333-333333333333'
const TENANT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const OTHER_TENANT = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

const ada = {
  id: CUSTOMER,
  first_name: 'Ada',
  last_name: 'Keller',
  email: 'ada@example.test',
  phone: '+41790000000',
  category: 'B',
  tenant_id: TENANT,
}

describe('Andere Terminart customer link', () => {
  it('persists the selected customer on create and restores that same customer on reopen', () => {
    const savedUserId = persistedAppointmentUserId({
      selectedCustomerId: CUSTOMER,
      staffId: STAFF,
      fallbackUserId: STAFF,
    })
    expect(savedUserId).toBe(CUSTOMER)

    const restoreId = customerIdToRestore({
      userId: savedUserId,
      staffId: STAFF,
      eventType: 'meeting',
    })
    expect(restoreId).toBe(CUSTOMER)

    const selected = selectorValueForLoadedCustomer(restoreId, ada, { callerTenantId: TENANT })
    expect(selected).toEqual(ada)
    expect(selected?.id).toBe(CUSTOMER)
    expect(selected?.first_name).toBe('Ada')
  })

  it('keeps the same customer when an edit is saved without changing the selection', () => {
    const reopened = selectorValueForLoadedCustomer(CUSTOMER, ada, { callerTenantId: TENANT })
    const savedAgain = persistedAppointmentUserId({
      selectedCustomerId: reopened?.id,
      staffId: STAFF,
      fallbackUserId: STAFF,
    })
    expect(savedAgain).toBe(CUSTOMER)
    expect(customerIdToRestore({
      userId: savedAgain,
      staffId: STAFF,
      eventType: 'training',
    })).toBe(CUSTOMER)
  })

  it('persists a changed customer and restores the new selection', () => {
    const savedUserId = persistedAppointmentUserId({
      selectedCustomerId: OTHER_CUSTOMER,
      staffId: STAFF,
      fallbackUserId: STAFF,
    })
    expect(savedUserId).toBe(OTHER_CUSTOMER)
    const bea = { ...ada, id: OTHER_CUSTOMER, first_name: 'Bea', last_name: 'Meier' }
    const selected = selectorValueForLoadedCustomer(
      customerIdToRestore({ userId: savedUserId, staffId: STAFF, eventType: 'admin' }),
      bea,
      { callerTenantId: TENANT }
    )
    expect(selected?.id).toBe(OTHER_CUSTOMER)
    expect(selected?.first_name).toBe('Bea')
  })

  it('reopens an appointment created without a customer as an empty selector', () => {
    const savedUserId = persistedAppointmentUserId({
      selectedCustomerId: '',
      staffId: STAFF,
      fallbackUserId: 'auth-user',
    })
    expect(savedUserId).toBe(STAFF)
    expect(customerIdToRestore({
      userId: savedUserId,
      staffId: STAFF,
      eventType: 'meeting',
    })).toBeNull()
    expect(selectorValueForLoadedCustomer(null, ada, { callerTenantId: TENANT })).toBeNull()
  })

  it('does not change lesson restore behavior', () => {
    expect(persistedAppointmentUserId({
      selectedCustomerId: CUSTOMER,
      staffId: STAFF,
      fallbackUserId: STAFF,
    })).toBe(CUSTOMER)
    expect(customerIdToRestore({
      userId: CUSTOMER,
      staffId: STAFF,
      eventType: 'lesson',
    })).toBe(CUSTOMER)
    // Lessons still restore user_id even when it matches staff (historical rule).
    expect(customerIdToRestore({
      userId: STAFF,
      staffId: STAFF,
      eventType: 'lesson',
    })).toBe(STAFF)
    expect(shouldApplyLinkedCustomerAutoDiscount(true, 0)).toBe(true)
    expect(shouldApplyLinkedCustomerAutoDiscount(false, 0)).toBe(false)
  })

  it('does not select a deleted, missing, mismatched, or cross-tenant customer', () => {
    expect(selectorValueForLoadedCustomer(CUSTOMER, null, { callerTenantId: TENANT })).toBeNull()
    expect(selectorValueForLoadedCustomer(CUSTOMER, undefined, { callerTenantId: TENANT })).toBeNull()
    expect(selectorValueForLoadedCustomer(
      CUSTOMER,
      { ...ada, id: OTHER_CUSTOMER },
      { callerTenantId: TENANT }
    )).toBeNull()
    expect(selectorValueForLoadedCustomer(
      CUSTOMER,
      { ...ada, tenant_id: OTHER_TENANT },
      { callerTenantId: TENANT }
    )).toBeNull()
    // A failed load must not replace the stored id with someone else.
    expect(persistedAppointmentUserId({
      selectedCustomerId: CUSTOMER,
      staffId: STAFF,
      fallbackUserId: STAFF,
    })).toBe(CUSTOMER)
  })
})

describe('appointment customer wiring', () => {
  it('reopen and save use the shared customer-link helpers', () => {
    const form = readFileSync(resolve(process.cwd(), 'composables/useEventModalForm.ts'), 'utf8')
    expect(form).toContain('customerIdToRestore')
    expect(form).toContain('selectorValueForLoadedCustomer')
    expect(form).toContain('persistedAppointmentUserId')
    expect(form).toContain('shouldApplyLinkedCustomerAutoDiscount')
    expect(form).not.toContain('Not loading student for other event type')
  })

  it('edit and paste initialization no longer drop other-terminart customers', () => {
    const modal = readFileSync(resolve(process.cwd(), 'components/EventModal.vue'), 'utf8')
    expect(modal).toContain('customerIdToRestore')
    expect(modal).toContain('selectorValueForLoadedCustomer')
    expect(modal).not.toContain('Not loading student for other event type')
  })

  it('customer reload stays tenant-scoped and does not return another tenant', () => {
    const api = readFileSync(resolve(process.cwd(), 'server/api/admin/get-user-for-edit.get.ts'), 'utf8')
    expect(api).toContain(".eq('tenant_id', requestingUser.tenant_id)")
    expect(api).toContain('User not found')
  })
})
