/**
 * Record one marketing_conversions row for a binding event.
 * customer_state comes from resolveNewCustomerState. This file does not redefine it.
 * Existing customers are stored as follow_up, never as a new booking/course conversion.
 * Inquiry stays inquiry and is not a paid new-customer booking.
 * The credited touch is the earliest identifiable touch in the session, not the latest.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import {
  describeMarketingConversion,
  pickConversionTouch,
  type CustomerState,
  type ConversionEvent,
  type MarketingTouchClass,
} from '~/server/utils/marketing-touch-class'

type TouchRow = {
  id: string
  attribution_class: MarketingTouchClass
  touch_at: string
  tenant_id: string
}

export async function recordMarketingConversion(
  supabase: SupabaseClient,
  input: {
    tenantId: string
    userId?: string | null
    customerState: CustomerState
    event: ConversionEvent
    conversionAt?: string
    appointmentId?: string | null
    registrationId?: string | null
    proposalId?: string | null
    sessionId?: string | null
  },
): Promise<{ ok: boolean; reason?: string; conversionId?: string }> {
  if (!input.tenantId) return { ok: false, reason: 'missing_tenant' }

  const existingId = await findExistingConversion(supabase, input)
  if (existingId) {
    await linkKnownConversion(supabase, input, existingId)
    return { ok: true, conversionId: existingId, reason: 'duplicate' }
  }

  const conversionAt = input.conversionAt || new Date().toISOString()
  const chosen = await chooseTouch(supabase, {
    tenantId: input.tenantId,
    sessionId: input.sessionId,
    conversionAt,
  })
  const described = describeMarketingConversion({
    event: input.event,
    customerState: input.customerState,
    touchClass: chosen.touchClass,
  })

  const inserted = await supabase
    .from('marketing_conversions')
    .insert({
      tenant_id: input.tenantId,
      touch_id: described.credit_touch ? chosen.touchId : null,
      signal_state: described.signal_state,
      conversion_at: conversionAt,
      conversion_type: described.conversion_type,
      customer_state: described.customer_state,
      user_id: input.userId || null,
      appointment_id: input.appointmentId || null,
      registration_id: input.registrationId || null,
      proposal_id: input.proposalId || null,
      match_method: input.userId ? 'user_id' : null,
    })
    .select('id')
    .maybeSingle()

  let conversionId = inserted.data?.id as string | undefined
  if (!conversionId) {
    const unique = inserted.error?.code === '23505' || /duplicate key/i.test(inserted.error?.message || '')
    if (!unique && inserted.error) {
      logger.warn('marketing conversion insert failed', inserted.error.message)
      return { ok: false, reason: 'db_error' }
    }
    conversionId = await findExistingConversion(supabase, input) || undefined
  }
  if (!conversionId) return { ok: false, reason: 'conversion_not_stored' }

  await linkKnownConversion(supabase, input, conversionId, chosen.touchId)

  if (input.appointmentId) {
    await supabase
      .from('appointments')
      .update({ conversion_id: conversionId })
      .eq('id', input.appointmentId)
      .eq('tenant_id', input.tenantId)
      .is('conversion_id', null)
    await supabase
      .from('payments')
      .update({ conversion_id: conversionId })
      .eq('appointment_id', input.appointmentId)
      .eq('tenant_id', input.tenantId)
      .is('conversion_id', null)
  }
  if (input.registrationId) {
    await supabase
      .from('course_registrations')
      .update({ conversion_id: conversionId })
      .eq('id', input.registrationId)
      .eq('tenant_id', input.tenantId)
      .is('conversion_id', null)
    await supabase
      .from('payments')
      .update({ conversion_id: conversionId })
      .eq('course_registration_id', input.registrationId)
      .eq('tenant_id', input.tenantId)
      .is('conversion_id', null)
  }

  return { ok: true, conversionId }
}

async function findExistingConversion(
  supabase: SupabaseClient,
  input: { appointmentId?: string | null; registrationId?: string | null; proposalId?: string | null },
): Promise<string | null> {
  if (input.appointmentId) {
    const { data } = await supabase
      .from('marketing_conversions')
      .select('id')
      .eq('appointment_id', input.appointmentId)
      .maybeSingle()
    if (data?.id) return data.id as string
  }
  if (input.registrationId) {
    const { data } = await supabase
      .from('marketing_conversions')
      .select('id')
      .eq('registration_id', input.registrationId)
      .maybeSingle()
    if (data?.id) return data.id as string
  }
  if (input.proposalId) {
    const { data } = await supabase
      .from('marketing_conversions')
      .select('id')
      .eq('proposal_id', input.proposalId)
      .maybeSingle()
    if (data?.id) return data.id as string
  }
  return null
}

async function chooseTouch(
  supabase: SupabaseClient,
  input: {
    tenantId: string
    sessionId?: string | null
    conversionAt: string
  },
): Promise<{ touchId: string | null; touchClass: MarketingTouchClass | null }> {
  if (!input.sessionId) return { touchId: null, touchClass: null }

  const { data, error } = await supabase
    .from('marketing_touches')
    .select('id, attribution_class, touch_at, tenant_id')
    .eq('tenant_id', input.tenantId)
    .eq('session_id', input.sessionId)
    .order('touch_at', { ascending: true })
    .limit(50)

  if (error || !data?.length) return { touchId: null, touchClass: null }

  const picked = pickConversionTouch(data as TouchRow[], input.tenantId, input.conversionAt)
  return { touchId: picked.touch?.id ?? null, touchClass: picked.touchClass }
}

async function linkKnownConversion(
  supabase: SupabaseClient,
  input: {
    tenantId: string
    userId?: string | null
    customerState: CustomerState
    sessionId?: string | null
  },
  conversionId: string,
  knownTouchId?: string | null,
): Promise<void> {
  await linkSessionTouchesToUser(supabase, input)
  if (input.customerState !== 'new') return
  let touchId = knownTouchId || null
  if (!touchId) {
    const { data } = await supabase
      .from('marketing_conversions')
      .select('touch_id, tenant_id')
      .eq('id', conversionId)
      .maybeSingle()
    if (!data || data.tenant_id !== input.tenantId) return
    touchId = (data.touch_id as string | null) || null
  }
  if (!touchId) return
  await setAcquisitionTouchOnce(supabase, {
    tenantId: input.tenantId,
    userId: input.userId,
    touchId,
  })
}

async function linkSessionTouchesToUser(
  supabase: SupabaseClient,
  input: { tenantId: string; userId?: string | null; sessionId?: string | null },
): Promise<void> {
  if (!input.userId || !input.sessionId) return
  const { data: user } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('id', input.userId)
    .maybeSingle()
  if (!user || user.tenant_id !== input.tenantId) return

  await supabase
    .from('marketing_touches')
    .update({ user_id: input.userId })
    .eq('tenant_id', input.tenantId)
    .eq('session_id', input.sessionId)
    .is('user_id', null)
}

async function setAcquisitionTouchOnce(
  supabase: SupabaseClient,
  input: { tenantId: string; userId?: string | null; touchId: string },
): Promise<void> {
  if (!input.userId) return
  const { data: user } = await supabase
    .from('users')
    .select('id, tenant_id, acquisition_touch_id')
    .eq('id', input.userId)
    .eq('tenant_id', input.tenantId)
    .maybeSingle()
  if (!user || user.tenant_id !== input.tenantId || user.acquisition_touch_id) return

  await supabase
    .from('users')
    .update({ acquisition_touch_id: input.touchId })
    .eq('id', input.userId)
    .eq('tenant_id', input.tenantId)
    .is('acquisition_touch_id', null)
}
