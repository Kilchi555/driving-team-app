import type { SupabaseClient } from '@supabase/supabase-js'
import {
  mergeAttributionFields,
  type AttributionFields,
} from '~/server/utils/marketing-attribution-merge'
import { normalizePhoneNumber } from '~/server/utils/sms'

const LOOKBACK_DAYS = 14

export function phoneLookupKeys(phone: string | null | undefined): string[] {
  const normalized = phone ? normalizePhoneNumber(phone) : null
  if (!normalized) return []
  const keys = new Set<string>([normalized])
  if (normalized.startsWith('+41')) keys.add(`0${normalized.slice(3)}`)
  return [...keys]
}

/**
 * Last tel: tap for this customer (same tenant, 14 days).
 * Used when staff books after a Meta/Google ad → phone call.
 */
export async function lookupPhoneClickAttribution(
  supabase: SupabaseClient,
  params: { tenantId: string; phone?: string | null },
): Promise<(AttributionFields & { marketing_session_id?: string | null }) | null> {
  const keys = phoneLookupKeys(params.phone)
  if (keys.length === 0) return null

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('booking_redirects')
    .select('gclid, gbraid, wbraid, fbclid, fbc, fbp, utm_source, utm_medium, utm_campaign, utm_content, utm_term, session_id, created_at')
    .eq('tenant_id', params.tenantId)
    .eq('category', 'phone_call')
    .in('phone_normalized', keys)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error || !data?.length) return null

  let merged: AttributionFields & { marketing_session_id?: string | null } = {}
  // Oldest first so the newest tap wins. tel: stores the school number, not the
  // caller — this lookup only matches if we later store the customer phone.
  for (const row of [...data].reverse()) {
    merged = {
      ...mergeAttributionFields(merged, row),
      marketing_session_id: row.session_id || merged.marketing_session_id || null,
    }
  }

  const hasId = !!(merged.gclid || merged.gbraid || merged.wbraid || merged.fbclid || merged.fbc)
  return hasId ? merged : null
}

export async function stampAppointmentFromPhoneClick(
  supabase: SupabaseClient,
  appointmentId: string,
  attr: AttributionFields & { marketing_session_id?: string | null },
): Promise<void> {
  const { data: appt } = await supabase
    .from('appointments')
    .select('id, gclid, gbraid, wbraid, fbclid, marketing_session_id')
    .eq('id', appointmentId)
    .maybeSingle()

  if (!appt) return

  const patch: Record<string, string | null> = {}
  if (!appt.gclid && attr.gclid) patch.gclid = attr.gclid
  if (!appt.gbraid && attr.gbraid) patch.gbraid = attr.gbraid
  if (!appt.wbraid && attr.wbraid) patch.wbraid = attr.wbraid
  if (!appt.fbclid && attr.fbclid) {
    patch.fbclid = attr.fbclid
    if (attr.fbc) patch.fbc = attr.fbc
    if (attr.fbp) patch.fbp = attr.fbp
  }
  if (!appt.marketing_session_id && attr.marketing_session_id) {
    patch.marketing_session_id = attr.marketing_session_id
  }
  if (attr.utm_source) patch.utm_source = attr.utm_source
  if (attr.utm_medium) patch.utm_medium = attr.utm_medium
  if (attr.utm_campaign) patch.utm_campaign = attr.utm_campaign

  if (Object.keys(patch).length === 0) return
  await supabase.from('appointments').update(patch).eq('id', appointmentId)
}
