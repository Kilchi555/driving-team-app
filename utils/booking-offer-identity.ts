/**
 * Public booking identity: event_type_code and category_code are separate fields.
 * Never overload one field so it ambiguously means either an event type or a category.
 */

export type BookingOfferIdentity = {
  eventTypeCode: string | null
  categoryCode: string | null
  inferredFrom:
    | 'explicit'
    | 'legacy_category_as_event_type'
    | 'legacy_category_plus_appointment'
    | 'slot_event_type'
    | 'slot_category_lesson'
    | 'unresolved'
}

export type InferBookingOfferIdentityInput = {
  eventTypeCode?: string | null
  categoryCode?: string | null
  appointmentType?: string | null
  tenantEventTypeCodes: Iterable<string>
}

function trimCode(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function inferBookingOfferIdentity(
  input: InferBookingOfferIdentityInput
): BookingOfferIdentity {
  const eventCodes = new Set(
    [...input.tenantEventTypeCodes].map((code) => String(code).trim()).filter(Boolean)
  )
  const explicitEt = trimCode(input.eventTypeCode)
  const category = trimCode(input.categoryCode)
  const appointment = trimCode(input.appointmentType)

  if (explicitEt && eventCodes.has(explicitEt)) {
    const categoryIsEventTypeAlias = !!category && category === explicitEt && eventCodes.has(category)
    return {
      eventTypeCode: explicitEt,
      categoryCode: categoryIsEventTypeAlias ? null : category,
      inferredFrom: 'explicit',
    }
  }

  // Old clients sent only category_code. Infer as event type ONLY if that code
  // actually exists as an event type for this tenant.
  if (category && eventCodes.has(category)) {
    return {
      eventTypeCode: category,
      categoryCode: null,
      inferredFrom: 'legacy_category_as_event_type',
    }
  }

  const eventFromAppointment = appointment && eventCodes.has(appointment) ? appointment : null
  // Do not invent "lesson" unless this tenant actually has that event type.
  const lessonIfExists = eventCodes.has('lesson') ? 'lesson' : null

  if (category) {
    return {
      eventTypeCode: eventFromAppointment || lessonIfExists,
      categoryCode: category,
      inferredFrom: eventFromAppointment || lessonIfExists
        ? 'legacy_category_plus_appointment'
        : 'unresolved',
    }
  }

  if (eventFromAppointment) {
    return {
      eventTypeCode: eventFromAppointment,
      categoryCode: null,
      inferredFrom: 'legacy_category_plus_appointment',
    }
  }

  return {
    eventTypeCode: null,
    categoryCode: null,
    inferredFrom: 'unresolved',
  }
}

export type PublicCatalogSelection = {
  code?: string | null
  _source?: string | null
  event_type_code?: string | null
  category_code?: string | null
}

export type PublicBookingPayload = {
  event_type_code: string | null
  category_code: string | null
}

/**
 * Client payload for preview / guest / authenticated booking.
 * Event-type catalog rows keep event_type_code; license classes keep category_code.
 */
export function publicBookingPayloadFromSelection(
  selected: PublicCatalogSelection | null | undefined
): PublicBookingPayload {
  if (!selected) return { event_type_code: null, category_code: null }

  const source = selected._source || null
  const explicitEvent = trimCode(selected.event_type_code)
  const explicitCategory = trimCode(selected.category_code)
  const code = trimCode(selected.code)

  if (source === 'event_type' || explicitEvent) {
    return {
      event_type_code: explicitEvent || code,
      category_code: explicitCategory,
    }
  }

  return {
    event_type_code: explicitEvent,
    category_code: explicitCategory || code,
  }
}

/** Slot / user.category identity code: category when present, else event type. */
export function bookingIdentityCode(identity: BookingOfferIdentity): string | null {
  return identity.categoryCode || identity.eventTypeCode
}

function eventTypeCodeSet(codes: Iterable<string>): Set<string> {
  return new Set([...codes].map((code) => String(code).trim()).filter(Boolean))
}

/**
 * availability_slots stores only category_code (no event_type_code column).
 * That field is overloaded:
 *   - license-class slots: category_code = B / B Automatik / …
 *   - event-type tenants: category_code = the public event type code
 *
 * Category slots generated for public checkout are Fahrstunden, so the
 * canonical event type is `lesson` when that tenant event type exists.
 */
export function deriveCanonicalSlotOfferIdentity(input: {
  slotCategoryCode?: string | null
  tenantEventTypeCodes: Iterable<string>
}): BookingOfferIdentity {
  const eventCodes = eventTypeCodeSet(input.tenantEventTypeCodes)
  const slotCat = trimCode(input.slotCategoryCode)

  if (!slotCat) {
    return { eventTypeCode: null, categoryCode: null, inferredFrom: 'unresolved' }
  }

  if (eventCodes.has(slotCat)) {
    return {
      eventTypeCode: slotCat,
      categoryCode: null,
      inferredFrom: 'slot_event_type',
    }
  }

  const lessonIfExists = eventCodes.has('lesson') ? 'lesson' : null
  return {
    eventTypeCode: lessonIfExists,
    categoryCode: slotCat,
    inferredFrom: lessonIfExists ? 'slot_category_lesson' : 'unresolved',
  }
}

export function offerIdentityCodesEqual(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  return trimCode(a) === trimCode(b)
}

/**
 * Slot-bound public booking: client identity must equal the reserved slot.
 * Unlike guestSlotCategoryMismatchReason, empty/null is not a skip — null
 * must match null (event-type slots have no category).
 */
export function slotOfferIdentityMismatchReason(
  slotIdentity: BookingOfferIdentity,
  clientIdentity: BookingOfferIdentity
): 'event_type_unresolved' | 'category_slot_mismatch' | null {
  if (!trimCode(slotIdentity.eventTypeCode)) return 'event_type_unresolved'
  if (!offerIdentityCodesEqual(slotIdentity.eventTypeCode, clientIdentity.eventTypeCode)) {
    return 'category_slot_mismatch'
  }
  if (!offerIdentityCodesEqual(slotIdentity.categoryCode, clientIdentity.categoryCode)) {
    return 'category_slot_mismatch'
  }
  return null
}
