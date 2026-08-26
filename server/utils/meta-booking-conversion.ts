import type { SupabaseClient } from '@supabase/supabase-js'
import { hasMetaClickId, recordAndSendCapiEvent } from '~/server/utils/meta-capi'
import { logger } from '~/utils/logger'

const EXCLUDED_STATUSES = ['cancelled', 'aborted', 'rejected'] as const

export function shouldSendMetaBookingConversion(input: {
  isFirstCustomerBooking: boolean
  fbclid?: string | null
  fbc?: string | null
}): boolean {
  return input.isFirstCustomerBooking === true && hasMetaClickId(input)
}

/**
 * True when this appointment is the customer's first non-cancelled lesson
 * (count includes the row just inserted).
 */
export async function isFirstCustomerBooking(
  supabase: SupabaseClient,
  params: { userId: string; tenantId: string },
): Promise<boolean> {
  let query = supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', params.userId)
    .eq('tenant_id', params.tenantId)
    .eq('event_type_code', 'lesson')

  for (const status of EXCLUDED_STATUSES) {
    query = query.neq('status', status)
  }

  const { count, error } = await query
  if (error) {
    logger.warn('meta-booking: first-booking count failed', error.message)
    return false
  }
  return (count ?? 0) <= 1
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
  /** Pay-before-confirm hold — wait for Wallee, do not send yet. */
  deferUntilPaid?: boolean
}): Promise<boolean> {
  if (params.deferUntilPaid) return false

  const firstBooking = await isFirstCustomerBooking(params.supabase, {
    userId: params.userId,
    tenantId: params.tenantId,
  })
  if (!shouldSendMetaBookingConversion({
    isFirstCustomerBooking: firstBooking,
    fbclid: params.fbclid,
    fbc: params.fbc,
  })) {
    return false
  }

  await recordAndSendCapiEvent({
    appointment_id: params.appointmentId,
    tenant_id: params.tenantId,
    event_name: 'Purchase',
    conversion_value_chf: params.conversionValueChf,
    conversion_date_time: new Date(),
    fbclid: params.fbclid ?? null,
    fbc: params.fbc ?? null,
    fbp: params.fbp ?? null,
    hashed_email: params.hashedEmail ?? null,
    hashed_phone: params.hashedPhone ?? null,
    client_ip: params.clientIp ?? null,
    user_agent: params.userAgent ?? null,
    event_source_url: params.eventSourceUrl ?? null,
  })
  return true
}
