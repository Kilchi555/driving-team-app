import { describe, expect, it } from 'vitest'
import {
  bookingIdentityCode,
  deriveCanonicalSlotOfferIdentity,
  inferBookingOfferIdentity,
  publicBookingPayloadFromSelection,
  slotOfferIdentityMismatchReason,
} from '~/utils/booking-offer-identity'

describe('inferBookingOfferIdentity', () => {
  const fsCodes = ['lesson', 'exam', 'theory']
  const consultingCodes = ['consulting', 'discovery']

  it('18. event type code is passed separately (generic identity, not a reserved slot)', () => {
    // A consulting offer may carry a category in non-slot contexts (staff, quotes).
    // Slot-bound public booking must still reject this pair against a B+lesson slot.
    expect(inferBookingOfferIdentity({
      eventTypeCode: 'consulting',
      categoryCode: 'B',
      tenantEventTypeCodes: ['consulting', 'lesson'],
    })).toEqual({
      eventTypeCode: 'consulting',
      categoryCode: 'B',
      inferredFrom: 'explicit',
    })
  })

  it('19. category code remains category code', () => {
    expect(inferBookingOfferIdentity({
      eventTypeCode: 'lesson',
      categoryCode: 'B',
      tenantEventTypeCodes: fsCodes,
    })).toEqual({
      eventTypeCode: 'lesson',
      categoryCode: 'B',
      inferredFrom: 'explicit',
    })
  })

  it('20. old category-only booking remains compatible where unambiguous', () => {
    expect(inferBookingOfferIdentity({
      categoryCode: 'consulting',
      tenantEventTypeCodes: consultingCodes,
    })).toEqual({
      eventTypeCode: 'consulting',
      categoryCode: null,
      inferredFrom: 'legacy_category_as_event_type',
    })

    expect(inferBookingOfferIdentity({
      categoryCode: 'B',
      appointmentType: 'lesson',
      tenantEventTypeCodes: fsCodes,
    })).toEqual({
      eventTypeCode: 'lesson',
      categoryCode: 'B',
      inferredFrom: 'legacy_category_plus_appointment',
    })
  })

  it('does not treat an unknown category code as an event type', () => {
    expect(inferBookingOfferIdentity({
      categoryCode: 'consulting',
      tenantEventTypeCodes: fsCodes,
    })).toEqual({
      eventTypeCode: 'lesson',
      categoryCode: 'consulting',
      inferredFrom: 'legacy_category_plus_appointment',
    })
  })

  it('does not invent lesson unless that tenant event type exists', () => {
    expect(inferBookingOfferIdentity({
      categoryCode: 'B',
      appointmentType: 'lesson',
      tenantEventTypeCodes: [],
    })).toEqual({
      eventTypeCode: null,
      categoryCode: 'B',
      inferredFrom: 'unresolved',
    })
  })

  it('explicit event_type_code that is not a tenant type is not trusted', () => {
    expect(inferBookingOfferIdentity({
      eventTypeCode: 'lesson',
      categoryCode: 'consulting',
      tenantEventTypeCodes: consultingCodes,
    })).toEqual({
      eventTypeCode: 'consulting',
      categoryCode: null,
      inferredFrom: 'legacy_category_as_event_type',
    })
  })
})

describe('publicBookingPayloadFromSelection', () => {
  it('sends event_type_code separately for event-type catalog rows', () => {
    expect(publicBookingPayloadFromSelection({
      code: 'consulting',
      _source: 'event_type',
      event_type_code: 'consulting',
      category_code: null,
    })).toEqual({
      event_type_code: 'consulting',
      category_code: null,
    })
  })

  it('keeps category_code for license-class catalog rows', () => {
    expect(publicBookingPayloadFromSelection({
      code: 'B Automatik',
      _source: 'category',
      category_code: 'B Automatik',
    })).toEqual({
      event_type_code: null,
      category_code: 'B Automatik',
    })
  })
})

describe('bookingIdentityCode', () => {
  it('prefers category when both are present', () => {
    expect(bookingIdentityCode({
      eventTypeCode: 'lesson',
      categoryCode: 'B',
      inferredFrom: 'explicit',
    })).toBe('B')
  })
})

describe('deriveCanonicalSlotOfferIdentity — slot is the authority', () => {
  const fsCodes = ['lesson', 'exam', 'theory', 'consulting']

  it('category B slot is lesson + B, not client-chosen consulting', () => {
    expect(deriveCanonicalSlotOfferIdentity({
      slotCategoryCode: 'B',
      tenantEventTypeCodes: fsCodes,
    })).toEqual({
      eventTypeCode: 'lesson',
      categoryCode: 'B',
      inferredFrom: 'slot_category_lesson',
    })
  })

  it('event-type slot uses the stored code as eventTypeCode', () => {
    expect(deriveCanonicalSlotOfferIdentity({
      slotCategoryCode: 'consulting',
      tenantEventTypeCodes: fsCodes,
    })).toEqual({
      eventTypeCode: 'consulting',
      categoryCode: null,
      inferredFrom: 'slot_event_type',
    })
  })

  it('empty slot category cannot bind', () => {
    expect(deriveCanonicalSlotOfferIdentity({
      slotCategoryCode: '',
      tenantEventTypeCodes: fsCodes,
    }).inferredFrom).toBe('unresolved')
  })
})

describe('slotOfferIdentityMismatchReason — public checkout bind', () => {
  const fsCodes = ['lesson', 'exam', 'theory', 'consulting']
  const slotBLesson = deriveCanonicalSlotOfferIdentity({
    slotCategoryCode: 'B',
    tenantEventTypeCodes: fsCodes,
  })

  it('Attack 1/2/3: B lesson slot rejects consulting + B', () => {
    const client = inferBookingOfferIdentity({
      eventTypeCode: 'consulting',
      categoryCode: 'B',
      appointmentType: 'consulting',
      tenantEventTypeCodes: fsCodes,
    })
    expect(slotOfferIdentityMismatchReason(slotBLesson, client)).toBe('category_slot_mismatch')
  })

  it('Attack 4: B lesson slot rejects a non-public event type code', () => {
    const client = inferBookingOfferIdentity({
      eventTypeCode: 'internal_consulting',
      categoryCode: 'B',
      tenantEventTypeCodes: [...fsCodes, 'internal_consulting'],
    })
    expect(slotOfferIdentityMismatchReason(slotBLesson, client)).toBe('category_slot_mismatch')
  })

  it('Attack 5: honest B + lesson matches the slot', () => {
    const client = inferBookingOfferIdentity({
      eventTypeCode: 'lesson',
      categoryCode: 'B',
      appointmentType: 'lesson',
      tenantEventTypeCodes: fsCodes,
    })
    expect(slotOfferIdentityMismatchReason(slotBLesson, client)).toBeNull()
  })

  it('legacy category-only B + appointment_type lesson still matches', () => {
    const client = inferBookingOfferIdentity({
      categoryCode: 'B',
      appointmentType: 'lesson',
      tenantEventTypeCodes: fsCodes,
    })
    expect(slotOfferIdentityMismatchReason(slotBLesson, client)).toBeNull()
  })

  it('does not skip when client omits category on a category slot', () => {
    const client = inferBookingOfferIdentity({
      eventTypeCode: 'lesson',
      tenantEventTypeCodes: fsCodes,
    })
    expect(slotOfferIdentityMismatchReason(slotBLesson, client)).toBe('category_slot_mismatch')
  })
})
