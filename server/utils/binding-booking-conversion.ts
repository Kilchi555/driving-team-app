/**
 * BINDING BOOKING CONVERSION reporter.
 *
 * Fires Google Primary / Meta Purchase only when a binding booking is
 * established (confirmed appointment or confirmed course registration),
 * the customer is new for this tenant, and valid click attribution exists.
 *
 * Payment completion is settlement state — not a second conversion.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { hasMetaClickId, recordAndSendCapiEvent, sha256Hex } from '~/server/utils/meta-capi'
import { recordAndUploadConversion, recordAndUploadCourseConversion } from '~/server/utils/google-ads-conversion'
import { resolveBookingConversionValue } from '~/server/utils/conversion-value'
import {
  BINDING_HISTORY_APPOINTMENT_STATUSES,
  BINDING_HISTORY_REGISTRATION_STATUSES,
  appointmentMetaEventId,
  becameBindingConfirmed,
  courseConversionOrderId,
  courseMetaEventId,
  hasGoogleClickId,
  isBindingConfirmedAppointment,
  isBindingConfirmedRegistration,
  isEligibleForGooglePrimaryBookingConversion,
  isEligibleForMetaPurchaseConversion,
  isProductiveEventTypeCode,
} from '~/server/utils/binding-booking'
import { ECONOMICS_SKIP_EVENT_CODES } from '~/utils/unit-economics'

export type NewCustomerState = 'new' | 'existing' | 'unknown'

export type BindingConversionAttempt = 'uploaded' | 'sent' | 'skipped' | 'failed' | 'not_attempted'

export type BindingConversionReport = {
  google: BindingConversionAttempt
  meta: BindingConversionAttempt
  newCustomerState: NewCustomerState
  reason?: string
}

const SKIP_EVENT_IN_FILTER = `(${[...ECONOMICS_SKIP_EVENT_CODES].join(',')})`

export async function resolveNewCustomerState(
  supabase: SupabaseClient,
  params: {
    tenantId: string
    userId: string
    excludeAppointmentId?: string | null
    excludeRegistrationId?: string | null
  },
): Promise<NewCustomerState> {
  if (!params.tenantId || !params.userId) return 'unknown'

  try {
    let appointmentQuery = supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', params.tenantId)
      .eq('user_id', params.userId)
      .in('status', [...BINDING_HISTORY_APPOINTMENT_STATUSES])
      .is('deleted_at', null)
      .or(`event_type_code.is.null,event_type_code.not.in.${SKIP_EVENT_IN_FILTER}`)

    if (params.excludeAppointmentId) {
      appointmentQuery = appointmentQuery.neq('id', params.excludeAppointmentId)
    }

    const appointments = await appointmentQuery
    if (appointments.error) {
      logger.warn('binding-booking-conversion: appointment history lookup failed', appointments.error.message)
      return 'unknown'
    }
    if ((appointments.count ?? 0) > 0) return 'existing'

    let registrationQuery = supabase
      .from('course_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', params.tenantId)
      .eq('user_id', params.userId)
      .in('status', [...BINDING_HISTORY_REGISTRATION_STATUSES])
      .is('deleted_at', null)

    if (params.excludeRegistrationId) {
      registrationQuery = registrationQuery.neq('id', params.excludeRegistrationId)
    }

    const registrations = await registrationQuery
    if (registrations.error) {
      logger.warn('binding-booking-conversion: registration history lookup failed', registrations.error.message)
      return 'unknown'
    }
    if ((registrations.count ?? 0) > 0) return 'existing'

    return 'new'
  } catch (err: any) {
    logger.warn('binding-booking-conversion: history lookup exception', err?.message ?? err)
    return 'unknown'
  }
}

export async function hashCustomerIdentifiers(input: {
  email?: string | null
  phone?: string | null
}): Promise<{ hashedEmail: string | null; hashedPhone: string | null }> {
  const email = (input.email ?? '').trim().toLowerCase()
  const phone = (input.phone ?? '').replace(/\s+/g, '').replace(/^00/, '+')
  return {
    hashedEmail: email ? await sha256Hex(email) : null,
    hashedPhone: phone.startsWith('+') ? await sha256Hex(phone) : null,
  }
}

export async function reportBindingAppointmentConversion(input: {
  supabase?: SupabaseClient
  appointmentId: string
  userId?: string | null
  tenantId?: string | null
  status: string | null | undefined
  previousStatus?: string | null
  eventTypeCode?: string | null
  categoryCode?: string | null
  gclid?: string | null
  gbraid?: string | null
  wbraid?: string | null
  fbclid?: string | null
  fbc?: string | null
  fbp?: string | null
  conversionValueChf: number
  hashedEmail?: string | null
  hashedPhone?: string | null
  clientIp?: string | null
  userAgent?: string | null
  eventSourceUrl?: string | null
}): Promise<BindingConversionReport> {
  if (!isProductiveEventTypeCode(input.eventTypeCode)) {
    return { google: 'not_attempted', meta: 'not_attempted', newCustomerState: 'unknown', reason: 'not_productive' }
  }

  if (!becameBindingConfirmed(input.previousStatus ?? null, input.status)) {
    return {
      google: 'not_attempted',
      meta: 'not_attempted',
      newCustomerState: 'unknown',
      reason: isBindingConfirmedAppointment(input.status) ? 'already_confirmed' : 'not_binding_confirmed',
    }
  }

  if (!input.userId || !input.tenantId) {
    return { google: 'not_attempted', meta: 'not_attempted', newCustomerState: 'unknown', reason: 'missing_identity' }
  }

  const supabase = input.supabase ?? getSupabaseAdmin()
  const newCustomerState = await resolveNewCustomerState(supabase, {
    tenantId: input.tenantId,
    userId: input.userId,
    excludeAppointmentId: input.appointmentId,
  })

  const googleEligible = isEligibleForGooglePrimaryBookingConversion({
    newCustomerState,
    hasGoogleClickId: hasGoogleClickId(input),
  })
  const metaEligible = isEligibleForMetaPurchaseConversion({
    newCustomerState,
    hasMetaClickId: hasMetaClickId(input),
  })

  const report: BindingConversionReport = {
    google: googleEligible ? 'skipped' : 'not_attempted',
    meta: metaEligible ? 'skipped' : 'not_attempted',
    newCustomerState,
    reason: newCustomerState === 'unknown'
      ? 'history_lookup_failed'
      : newCustomerState === 'existing'
        ? 'existing_customer'
        : undefined,
  }

  if (googleEligible) {
    try {
      const conversionValue = await resolveBookingConversionValue({
        tenantId: input.tenantId,
        categoryCode: input.categoryCode,
        eventTypeCode: input.eventTypeCode,
        isNewCustomer: true,
        lessonPriceChf: input.conversionValueChf,
        supabase,
      })
      await recordAndUploadConversion({
        appointment_id: input.appointmentId,
        tenant_id: input.tenantId,
        gclid: input.gclid ?? null,
        gbraid: input.gbraid ?? null,
        wbraid: input.wbraid ?? null,
        conversion_value_chf: conversionValue.value_chf,
        conversion_date_time: new Date(),
        hashed_email: input.hashedEmail ?? null,
        hashed_phone: input.hashedPhone ?? null,
      })
      report.google = 'uploaded'
    } catch (err: any) {
      logger.warn('binding-booking-conversion: Google upload failed (non-critical)', err?.message ?? err)
      report.google = 'failed'
    }
  }

  if (metaEligible) {
    try {
      await recordAndSendCapiEvent({
        appointment_id: input.appointmentId,
        event_id: appointmentMetaEventId(input.appointmentId),
        tenant_id: input.tenantId,
        event_name: 'Purchase',
        conversion_value_chf: input.conversionValueChf,
        conversion_date_time: new Date(),
        fbclid: input.fbclid ?? null,
        fbc: input.fbc ?? null,
        fbp: input.fbp ?? null,
        hashed_email: input.hashedEmail ?? null,
        hashed_phone: input.hashedPhone ?? null,
        client_ip: input.clientIp ?? null,
        user_agent: input.userAgent ?? null,
        event_source_url: input.eventSourceUrl ?? null,
      })
      report.meta = 'sent'
    } catch (err: any) {
      logger.warn('binding-booking-conversion: Meta CAPI failed (non-critical)', err?.message ?? err)
      report.meta = 'failed'
    }
  }

  return report
}

export async function reportBindingCourseConversion(input: {
  supabase?: SupabaseClient
  registrationId: string
  userId?: string | null
  tenantId?: string | null
  status: string | null | undefined
  gclid?: string | null
  gbraid?: string | null
  wbraid?: string | null
  fbclid?: string | null
  fbc?: string | null
  fbp?: string | null
  conversionValueChf: number
  hashedEmail?: string | null
  hashedPhone?: string | null
  clientIp?: string | null
  userAgent?: string | null
}): Promise<BindingConversionReport> {
  if (!isBindingConfirmedRegistration(input.status)) {
    return { google: 'not_attempted', meta: 'not_attempted', newCustomerState: 'unknown', reason: 'not_binding_confirmed' }
  }

  if (!input.userId || !input.tenantId) {
    return { google: 'not_attempted', meta: 'not_attempted', newCustomerState: 'unknown', reason: 'missing_identity' }
  }

  const supabase = input.supabase ?? getSupabaseAdmin()
  const newCustomerState = await resolveNewCustomerState(supabase, {
    tenantId: input.tenantId,
    userId: input.userId,
    excludeRegistrationId: input.registrationId,
  })

  const googleEligible = isEligibleForGooglePrimaryBookingConversion({
    newCustomerState,
    hasGoogleClickId: hasGoogleClickId(input),
  })
  const metaEligible = isEligibleForMetaPurchaseConversion({
    newCustomerState,
    hasMetaClickId: hasMetaClickId(input),
  })

  const report: BindingConversionReport = {
    google: googleEligible ? 'skipped' : 'not_attempted',
    meta: metaEligible ? 'skipped' : 'not_attempted',
    newCustomerState,
    reason: newCustomerState === 'unknown'
      ? 'history_lookup_failed'
      : newCustomerState === 'existing'
        ? 'existing_customer'
        : undefined,
  }

  const orderId = courseConversionOrderId(input.registrationId)
  const eventId = courseMetaEventId(input.registrationId)

  if (googleEligible) {
    try {
      await recordAndUploadCourseConversion({
        registration_id: input.registrationId,
        tenant_id: input.tenantId,
        gclid: input.gclid ?? null,
        gbraid: input.gbraid ?? null,
        wbraid: input.wbraid ?? null,
        conversion_value_chf: input.conversionValueChf,
        conversion_date_time: new Date(),
        hashed_email: input.hashedEmail ?? null,
        hashed_phone: input.hashedPhone ?? null,
      })
      report.google = 'uploaded'
    } catch (err: any) {
      logger.warn('binding-booking-conversion: course Google upload failed (non-critical)', err?.message ?? err)
      report.google = 'failed'
    }
  }

  if (metaEligible) {
    try {
      await recordAndSendCapiEvent({
        appointment_id: orderId,
        event_id: eventId,
        tenant_id: input.tenantId,
        event_name: 'Purchase',
        conversion_value_chf: input.conversionValueChf,
        conversion_date_time: new Date(),
        fbclid: input.fbclid ?? null,
        fbc: input.fbc ?? null,
        fbp: input.fbp ?? null,
        hashed_email: input.hashedEmail ?? null,
        hashed_phone: input.hashedPhone ?? null,
        client_ip: input.clientIp ?? null,
        user_agent: input.userAgent ?? null,
      })
      report.meta = 'sent'
    } catch (err: any) {
      logger.warn('binding-booking-conversion: course Meta CAPI failed (non-critical)', err?.message ?? err)
      report.meta = 'failed'
    }
  }

  return report
}

export async function reportBindingAppointmentConversionSafely(
  input: Parameters<typeof reportBindingAppointmentConversion>[0],
): Promise<BindingConversionReport> {
  try {
    return await reportBindingAppointmentConversion(input)
  } catch (err: any) {
    logger.warn('binding-booking-conversion: appointment reporter exception (non-critical)', err?.message ?? err)
    return { google: 'failed', meta: 'failed', newCustomerState: 'unknown', reason: 'exception' }
  }
}

export async function reportBindingCourseConversionSafely(
  input: Parameters<typeof reportBindingCourseConversion>[0],
): Promise<BindingConversionReport> {
  try {
    return await reportBindingCourseConversion(input)
  } catch (err: any) {
    logger.warn('binding-booking-conversion: course reporter exception (non-critical)', err?.message ?? err)
    return { google: 'failed', meta: 'failed', newCustomerState: 'unknown', reason: 'exception' }
  }
}
