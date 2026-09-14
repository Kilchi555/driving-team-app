import { describe, expect, it } from 'vitest'
import {
  hasUsableBookingCategories,
  selectPublicBookingCatalog,
} from '../select-public-booking-catalog'

const consulting = {
  id: 'et-1',
  code: 'consulting',
  name: 'Erstgespräch',
  default_duration_minutes: 30,
  require_payment: false,
  public_bookable: true,
}

const catB = {
  id: 'c-b',
  code: 'B',
  name: 'Auto',
  parent_category_id: null,
}

const catBAuto = {
  id: 'c-ba',
  code: 'B Automatik',
  name: 'B Automatik',
  parent_category_id: 'c-b',
}

describe('selectPublicBookingCatalog', () => {
  it('13. driving school + categories → categories', () => {
    const result = selectPublicBookingCatalog({
      tenantId: 'fs',
      categories: [catB, catBAuto],
      publicEventTypes: [consulting],
    })
    expect(result.source).toBe('categories')
    expect(result.categories.map((c) => c.code)).toEqual(['B'])
    expect(result.categories[0]._source).toBe('category')
    expect(result.categories[0].category_code).toBe('B')
    expect(result.categories[0].event_type_code).toBeNull()
    expect(result.categories[0].children[0].code).toBe('B Automatik')
  })

  it('14. driving school + zero categories + public event types → event types', () => {
    const result = selectPublicBookingCatalog({
      tenantId: 'fs',
      categories: [],
      publicEventTypes: [consulting],
    })
    expect(result.source).toBe('event_types')
    expect(result.categories).toHaveLength(1)
    expect(result.categories[0]).toMatchObject({
      _source: 'event_type',
      event_type_code: 'consulting',
      category_code: null,
      code: 'consulting',
    })
  })

  it('15. non-driving tenant + zero categories + public event types → event types', () => {
    const result = selectPublicBookingCatalog({
      tenantId: 'coach',
      categories: [],
      publicEventTypes: [consulting],
    })
    expect(result.source).toBe('event_types')
    expect(result.categories[0].event_type_code).toBe('consulting')
    expect(result.categories[0]._source).toBe('event_type')
  })

  it('16. zero categories + zero public event types → empty', () => {
    const result = selectPublicBookingCatalog({
      tenantId: 'empty',
      categories: [],
      publicEventTypes: [],
    })
    expect(result.source).toBe('empty')
    expect(result.categories).toEqual([])
  })

  it('does not turn an event type into a fake category_code', () => {
    const result = selectPublicBookingCatalog({
      tenantId: 'coach',
      categories: [],
      publicEventTypes: [consulting],
    })
    expect(result.categories[0].category_code).toBeNull()
    expect(result.categories[0].event_type_code).toBe('consulting')
  })

  it('hasUsableBookingCategories is false for []', () => {
    expect(hasUsableBookingCategories([])).toBe(false)
    expect(hasUsableBookingCategories([catB])).toBe(true)
  })
})
