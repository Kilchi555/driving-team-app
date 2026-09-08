import type { SupabaseClient } from '@supabase/supabase-js'
import { hasMetaClickId } from '~/server/utils/meta-capi'
import { isEligibleForMetaPurchaseConversion } from '~/server/utils/binding-booking'
import {
  reportBindingAppointmentConversionSafely,
  resolveNewCustomerState,
} from '~/server/utils/binding-booking-conversion'

export function shouldSendMetaBookingConversion(input: {
  isFirstCustomerBooking: boolean
  fbclid?: string | null
  fbc?: string | null
}): boolean {
  return isEligibleForMetaPurchaseConversion({
    newCustomerState: input.isFirstCustomerBooking ? 'new' : 'existing',
    hasMetaClickId: hasMetaClickId(input),
  })
}

/**
 * True when this customer has no prior confirmed productive booking/registration
 * in this tenant (excluding the current appointment).
 * Lookup failure fails closed (returns false — do not claim new customer).
 */
export async function isFirstCustomerBooking(
  supabase: SupabaseClient,
  params: { userId: string; tenantId: string; excludeAppointmentId?: string | null },
): Promise<boolean> {
  const state = await resolveNewCustomerState(supabase, {
    userId: params.userId,
    tenantId: params.tenantId,
    excludeAppointmentId: params.excludeAppointmentId,
  })
  return state === 'new'
}

export async function maybeSendMetaBookingPurchase(params: {
  supabase: SupabaseClient
  appointmentId: string
  userId: string
  tenantId: string
  fbclid?: string | null
  fbc?: string | null
  fbp?: string | null
  conversionValueChf: number
  hashedEmail?: string | null
  hashedPhone?: string | null
  clientIp?: string | null
  userAgent?: string | null
  eventSourceUrl?: string | null
  eventTypeCode?: string | null
  categoryCode?: string | null
  gclid?: string | null
  gbraid?: string | null
  wbraid?: string | null
  status?: string | null
  previousStatus?: string | null
  /** Pay-before-confirm hold — wait until the appointment becomes confirmed. */
  deferUntilPaid?: boolean
}): Promise<boolean> {
  if (params.deferUntilPaid) return false

  const report = await reportBindingAppointmentConversionSafely({
    supabase: params.supabase,
    appointmentId: params.appointmentId,
    userId: params.userId,
    tenantId: params.tenantId,
    status: params.status ?? 'confirmed',
    previousStatus: params.previousStatus ?? null,
    eventTypeCode: params.eventTypeCode,
    categoryCode: params.categoryCode,
    gclid: params.gclid,
    gbraid: params.gbraid,
    wbraid: params.wbraid,
    fbclid: params.fbclid,
    fbc: params.fbc,
    fbp: params.fbp,
    conversionValueChf: params.conversionValueChf,
    hashedEmail: params.hashedEmail,
    hashedPhone: params.hashedPhone,
    clientIp: params.clientIp,
    userAgent: params.userAgent,
    eventSourceUrl: params.eventSourceUrl,
  })
  return report.meta === 'sent'
}
