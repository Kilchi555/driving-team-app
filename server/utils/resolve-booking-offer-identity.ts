import { createError } from 'h3'
import { logger } from '~/utils/logger'
import type { OfferPriceClient } from '~/server/utils/resolve-offer-price'
import {
  deriveCanonicalSlotOfferIdentity,
  inferBookingOfferIdentity,
  slotOfferIdentityMismatchReason,
  type BookingOfferIdentity,
} from '~/utils/booking-offer-identity'

export async function loadTenantEventTypeCodes(
  supabase: OfferPriceClient,
  tenantId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('event_types')
    .select('code')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  if (error || !data) return []
  return (Array.isArray(data) ? data : [data])
    .map((row: { code?: string | null }) => String(row?.code || '').trim())
    .filter(Boolean)
}

export async function loadPublicBookableEventType(
  supabase: OfferPriceClient,
  tenantId: string,
  eventTypeCode: string
): Promise<{ code: string; public_bookable: boolean } | null> {
  const code = String(eventTypeCode || '').trim()
  if (!code || !tenantId) return null

  const { data, error } = await supabase
    .from('event_types')
    .select('code, public_bookable, is_active')
    .eq('tenant_id', tenantId)
    .eq('code', code)
    .eq('is_active', true)
    .eq('public_bookable', true)
    .maybeSingle()

  if (error || !data) return null
  return { code: data.code, public_bookable: data.public_bookable === true }
}

export async function resolveRequestOfferIdentity(
  supabase: OfferPriceClient,
  input: {
    tenantId: string
    eventTypeCode?: string | null
    categoryCode?: string | null
    appointmentType?: string | null
  }
): Promise<BookingOfferIdentity> {
  const tenantEventTypeCodes = await loadTenantEventTypeCodes(supabase, input.tenantId)
  return inferBookingOfferIdentity({
    eventTypeCode: input.eventTypeCode,
    categoryCode: input.categoryCode,
    appointmentType: input.appointmentType,
    tenantEventTypeCodes,
  })
}

/**
 * Public preview / guest / authenticated slot checkout.
 * Canonical identity comes from the reserved slot, not the client.
 * Client codes are a consistency assertion — mismatch is rejected, not overwritten.
 */
export async function bindPublicSlotOfferIdentity(
  supabase: OfferPriceClient,
  input: {
    tenantId: string
    slotCategoryCode?: string | null
    clientEventTypeCode?: string | null
    clientCategoryCode?: string | null
    clientAppointmentType?: string | null
    slotId?: string | null
  }
): Promise<BookingOfferIdentity> {
  const tenantEventTypeCodes = await loadTenantEventTypeCodes(supabase, input.tenantId)
  const slotIdentity = deriveCanonicalSlotOfferIdentity({
    slotCategoryCode: input.slotCategoryCode,
    tenantEventTypeCodes,
  })

  if (!slotIdentity.eventTypeCode) {
    logger.warn('❌ Public booking aborted: slot offer identity unresolved', {
      tenant_id: input.tenantId,
      slot_id: input.slotId,
      slot_category_code: input.slotCategoryCode,
    })
    throw createError({
      statusCode: 400,
      statusMessage: 'Die Terminart für diese Buchung konnte nicht ermittelt werden.',
      data: { code: 'EVENT_TYPE_UNRESOLVED' },
    })
  }

  const clientIdentity = inferBookingOfferIdentity({
    eventTypeCode: input.clientEventTypeCode,
    categoryCode: input.clientCategoryCode,
    appointmentType: input.clientAppointmentType,
    tenantEventTypeCodes,
  })

  const mismatch = slotOfferIdentityMismatchReason(slotIdentity, clientIdentity)
  if (mismatch === 'event_type_unresolved') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Die Terminart für diese Buchung konnte nicht ermittelt werden.',
      data: { code: 'EVENT_TYPE_UNRESOLVED' },
    })
  }
  if (mismatch) {
    logger.warn('❌ Public booking rejected: client offer does not match reserved slot', {
      reason: mismatch,
      tenant_id: input.tenantId,
      slot_id: input.slotId,
      slot_category_code: input.slotCategoryCode,
      slot_event_type_code: slotIdentity.eventTypeCode,
      slot_identity_category: slotIdentity.categoryCode,
      client_event_type_code: clientIdentity.eventTypeCode,
      client_category_code: clientIdentity.categoryCode,
    })
    throw createError({
      statusCode: 400,
      statusMessage: 'Die gewählte Kategorie passt nicht zum reservierten Zeitslot.',
      data: { code: 'CATEGORY_SLOT_MISMATCH' },
    })
  }

  const publicEventType = await loadPublicBookableEventType(
    supabase,
    input.tenantId,
    slotIdentity.eventTypeCode
  )
  if (!publicEventType) {
    logger.warn('❌ Public booking rejected: event type is not public_bookable', {
      tenant_id: input.tenantId,
      slot_id: input.slotId,
      event_type_code: slotIdentity.eventTypeCode,
    })
    throw createError({
      statusCode: 400,
      statusMessage: 'Diese Terminart kann nicht online gebucht werden.',
      data: { code: 'EVENT_TYPE_NOT_PUBLIC' },
    })
  }

  return slotIdentity
}
