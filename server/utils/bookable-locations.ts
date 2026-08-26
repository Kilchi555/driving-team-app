export type BookableStaffInput = {
  id: string
  category?: unknown
}

export type BookableLocationInput = {
  id: string
  available_categories?: unknown
  staff_ids?: unknown
}

export type StaffLocationInput = {
  staff_id: string
  location_id: string
  available_categories?: unknown
}

export function bookableUserRoles(isEventTypeBooking: boolean): Array<'staff' | 'admin' | 'tenant_admin'> {
  return isEventTypeBooking ? ['staff', 'admin', 'tenant_admin'] : ['staff']
}

export function parseIdList(raw: unknown): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : []
    } catch {
      return []
    }
  }
  return []
}

export function parseCategoryList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : []
    } catch {
      return []
    }
  }
  return []
}

/**
 * Location → staff IDs that may appear on the public booking page.
 * Driving school stays strict (staff_locations + location.staff_ids + category).
 * Event-type tenants fall back to every bookable person at every location when
 * online-bookable staff_locations were never configured (typical solo admin).
 */
export function resolveLocationStaffAssignments(input: {
  categoryCode: string
  isEventTypeBooking: boolean
  locations: BookableLocationInput[]
  staff: BookableStaffInput[]
  staffLocations: StaffLocationInput[]
}): Map<string, string[]> {
  const staffIds = new Set(input.staff.map(s => s.id))
  const staffCategoryMap = new Map<string, string[]>()
  for (const staff of input.staff) {
    staffCategoryMap.set(staff.id, parseCategoryList(staff.category))
  }

  const locationById = new Map(input.locations.map(loc => [loc.id, loc]))
  const staffLocCategoryMap = new Map<string, string[] | null>()
  for (const sl of input.staffLocations) {
    const cats = Array.isArray(sl.available_categories) ? sl.available_categories.map(String) : null
    staffLocCategoryMap.set(`${sl.staff_id}:${sl.location_id}`, cats)
  }

  const getEffectiveCategories = (staffId: string, locationId: string): string[] => {
    const perStaff = staffLocCategoryMap.get(`${staffId}:${locationId}`)
    if (Array.isArray(perStaff)) return perStaff
    const staffCats = staffCategoryMap.get(staffId) || []
    const loc = locationById.get(locationId)
    const locCats = parseCategoryList(loc?.available_categories)
    if (locCats.length === 0) return staffCats
    return staffCats.filter(c => locCats.includes(c))
  }

  const assignments = new Map<string, string[]>()
  const add = (locationId: string, staffId: string) => {
    if (!staffIds.has(staffId)) return
    const current = assignments.get(locationId) || []
    if (!current.includes(staffId)) current.push(staffId)
    assignments.set(locationId, current)
  }

  if (input.isEventTypeBooking && input.staffLocations.length === 0) {
    for (const loc of input.locations) {
      for (const staff of input.staff) add(loc.id, staff.id)
    }
    return assignments
  }

  for (const sl of input.staffLocations) {
    const loc = locationById.get(sl.location_id)
    if (!loc) continue
    const listed = parseIdList(loc.staff_ids)
    if (listed.length > 0 && !listed.includes(sl.staff_id)) continue
    if (!input.isEventTypeBooking) {
      const effective = getEffectiveCategories(sl.staff_id, sl.location_id)
      if (!effective.includes(input.categoryCode)) continue
    }
    add(sl.location_id, sl.staff_id)
  }

  return assignments
}
