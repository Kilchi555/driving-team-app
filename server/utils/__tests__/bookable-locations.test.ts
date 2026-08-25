import { describe, expect, it } from 'vitest'
import {
  bookableUserRoles,
  parseCategoryList,
  resolveLocationStaffAssignments,
} from '../bookable-locations'

describe('bookableUserRoles', () => {
  it('keeps driving school on staff only', () => {
    expect(bookableUserRoles(false)).toEqual(['staff'])
  })

  it('lets consulting admins take bookings', () => {
    expect(bookableUserRoles(true)).toEqual(['staff', 'admin', 'tenant_admin'])
  })
})

describe('parseCategoryList', () => {
  it('accepts arrays and JSON strings', () => {
    expect(parseCategoryList(['B', 'A'])).toEqual(['B', 'A'])
    expect(parseCategoryList('["discovery"]')).toEqual(['discovery'])
    expect(parseCategoryList(null)).toEqual([])
  })
})

describe('resolveLocationStaffAssignments', () => {
  const locations = [
    { id: 'loc-1', name: 'Uster', staff_ids: [], available_categories: [] },
    { id: 'loc-2', name: 'Online', staff_ids: [], available_categories: [] },
  ]
  const admin = { id: 'admin-1', category: null }

  it('falls back to admin × all locations for unconfigured event-type tenants', () => {
    const map = resolveLocationStaffAssignments({
      categoryCode: 'discovery',
      isEventTypeBooking: true,
      locations,
      staff: [admin],
      staffLocations: [],
    })
    expect(map.get('loc-1')).toEqual(['admin-1'])
    expect(map.get('loc-2')).toEqual(['admin-1'])
  })

  it('does not invent assignments for driving school without staff_locations', () => {
    const map = resolveLocationStaffAssignments({
      categoryCode: 'B',
      isEventTypeBooking: false,
      locations,
      staff: [{ id: 'staff-1', category: ['B'] }],
      staffLocations: [],
    })
    expect(map.size).toBe(0)
  })

  it('keeps driving school category filtering', () => {
    const map = resolveLocationStaffAssignments({
      categoryCode: 'B',
      isEventTypeBooking: false,
      locations: [{ id: 'loc-1', staff_ids: ['staff-1'], available_categories: [] }],
      staff: [{ id: 'staff-1', category: ['A'] }],
      staffLocations: [{ staff_id: 'staff-1', location_id: 'loc-1', available_categories: null }],
    })
    expect(map.size).toBe(0)
  })

  it('uses configured staff_locations for event types when present', () => {
    const map = resolveLocationStaffAssignments({
      categoryCode: 'discovery',
      isEventTypeBooking: true,
      locations: [{ id: 'loc-1', staff_ids: ['staff-1'], available_categories: [] }],
      staff: [{ id: 'staff-1', category: [] }, admin],
      staffLocations: [{ staff_id: 'staff-1', location_id: 'loc-1' }],
    })
    expect(map.get('loc-1')).toEqual(['staff-1'])
    expect(map.has('loc-2')).toBe(false)
  })
})
