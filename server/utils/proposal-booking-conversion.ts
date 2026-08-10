/**
 * Bridge Ads attribution from booking_proposals → staff-confirmed bookings.
 *
 * LKW (and other inquiry-only categories) often convert as:
 *   Ads click → inquiry form → phone/manual → staff marks booking_confirmed
 *   or staff creates the first appointment manually.
 *
 * Online self-service already uploads on create-appointment/guest-book.
 * This util covers the offline follow-up so Google Ads still learns.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  readFallbackBookingValueChf,
  normalizeConversionValueChf,
  sha256Hex,
  uploadClickConversion,
} from '~/server/utils/google-ads-conversion'
import { normalizePhoneNumber } from '~/server/utils/sms'
import { logger } from '~/utils/logger'

const PROPOSAL_LOOKBACK_DAYS = 90
export const proposalBookingOrderId = (proposalId: string) => `proposal-booking-${proposalId}`

export type ProposalAttributionRow = {
  id: string
  tenant_id: string
  email: string | null
  phone: string | null
  category_code: string | null
  created_by_user_id: string | null
  gclid: string | null
  gbraid: string | null
  wbraid: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  fbclid: string | null
  fbc: string | null
  fbp: string | null
  marketing_session_id: string | null
  status: string | null
  outcome_type: string | null
  created_at: string
}

function hasClickId(row: { gclid?: string | null; gbraid?: string | null; wbraid?: string | null }): boolean {
  return !!(row.gclid || row.gbraid || row.wbraid)
}

function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const na = normalizePhoneNumber(a) || a.replace(/\s+/g, '')
  const nb = normalizePhoneNumber(b) || b.replace(/\s+/g, '')
  if (!na || !nb) return false
  if (na === nb) return true
  const la = na.replace(/^\+41/, '0')
  const lb = nb.replace(/^\+41/, '0')
  return la === lb
}

/**
 * Find the newest attributed proposal for this customer (user / email / phone).
 */
export async function findAttributedProposalForCustomer(
  supabase: SupabaseClient,
  params: {
    tenantId: string
    userId?: string | null
    email?: string | null
    phone?: string | null
  },
): Promise<ProposalAttributionRow | null> {
  const since = new Date(Date.now() - PROPOSAL_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const email = params.email?.trim().toLowerCase() || null
  const phone = params.phone?.trim() || null

  let query = supabase
    .from('booking_proposals')
    .select(`
      id, tenant_id, email, phone, category_code, created_by_user_id,
      gclid, gbraid, wbraid, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      fbclid, fbc, fbp, marketing_session_id, status, outcome_type, created_at
    `)
    .eq('tenant_id', params.tenantId)
    .gte('created_at', since)
    .not('status', 'eq', 'rejected')
    .or('gclid.not.is.null,gbraid.not.is.null,wbraid.not.is.null')
    .order('created_at', { ascending: false })
    .limit(40)

  const { data, error } = await query
  if (error) {
    logger.warn('proposal-booking-conversion: proposal lookup failed', error.message)
    return null
  }

  const rows = (data || []) as ProposalAttributionRow[]
  if (!rows.length) return null

  const matched = rows.find((p) => {
    if (params.userId && p.created_by_user_id === params.userId) return true
    if (email && p.email?.trim().toLowerCase() === email) return true
    if (phone && phonesMatch(phone, p.phone)) return true
    return false
  })

  return matched && hasClickId(matched) ? matched : null
}

async function alreadyUploadedProposalBooking(proposalId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin()
  const orderId = proposalBookingOrderId(proposalId)
  const { data } = await supabase
    .from('google_ads_conversion_uploads')
    .select('id, upload_status')
    .eq('order_id', orderId)
    .in('upload_status', ['success', 'pending'])
    .limit(1)
  return (data?.length ?? 0) > 0
}

/**
 * Upload a Booking Completed conversion derived from an attributed proposal.
 * Deduped via order_id `proposal-booking-<proposalId>` so booking_confirmed
 * and later staff appointment create do not double-count.
 */
export async function uploadProposalDerivedBookingConversion(input: {
  proposal: Pick<
    ProposalAttributionRow,
    'id' | 'tenant_id' | 'gclid' | 'gbraid' | 'wbraid' | 'email' | 'phone'
  >
  appointmentId?: string | null
  conversionValueChf?: number | null
}): Promise<'uploaded' | 'skipped_already' | 'skipped_no_click_id' | 'failed'> {
  if (!hasClickId(input.proposal)) return 'skipped_no_click_id'

  if (await alreadyUploadedProposalBooking(input.proposal.id)) {
    return 'skipped_already'
  }

  const value = normalizeConversionValueChf(
    input.conversionValueChf && input.conversionValueChf > 0
      ? input.conversionValueChf
      : readFallbackBookingValueChf(),
  )

  const email = (input.proposal.email || '').trim().toLowerCase()
  const phoneRaw = (input.proposal.phone || '').replace(/\s+/g, '').replace(/^00/, '+')
  const hashedEmail = email ? await sha256Hex(email) : null
  const hashedPhone = phoneRaw.startsWith('+') ? await sha256Hex(phoneRaw) : null

  const supabase = getSupabaseAdmin()
  const orderId = proposalBookingOrderId(input.proposal.id)
  const conversionActionId = (process.env.GOOGLE_ADS_CONVERSION_ACTION_ID || '').trim() || 'unknown'

  // Audit row first (appointment_id optional — FK only when real appointment exists).
  const { data: row, error: insertError } = await supabase
    .from('google_ads_conversion_uploads')
    .insert({
      appointment_id: input.appointmentId || null,
      proposal_id: input.proposal.id,
      order_id: orderId,
      tenant_id: input.proposal.tenant_id,
      conversion_action_id: conversionActionId,
      gclid: input.proposal.gclid,
      gbraid: input.proposal.gbraid,
      wbraid: input.proposal.wbraid,
      conversion_value_chf: value,
      conversion_date_time: new Date().toISOString(),
      upload_status: 'pending',
      upload_attempts: 0,
    })
    .select('id')
    .single()

  if (insertError) {
    // Unique race / duplicate: treat as already handled.
    if (await alreadyUploadedProposalBooking(input.proposal.id)) {
      return 'skipped_already'
    }
    logger.warn('proposal-booking-conversion: audit insert failed', insertError.message)
  }

  try {
    const result = await uploadClickConversion({
      appointment_id: input.appointmentId || undefined,
      order_id: orderId,
      conversion_action_id: conversionActionId === 'unknown' ? undefined : conversionActionId,
      gclid: input.proposal.gclid,
      gbraid: input.proposal.gbraid,
      wbraid: input.proposal.wbraid,
      conversion_value_chf: value,
      conversion_date_time: new Date(),
      hashed_email: hashedEmail,
      hashed_phone: hashedPhone,
    })

    if (row?.id) {
      await supabase
        .from('google_ads_conversion_uploads')
        .update({
          upload_status: result.uploaded
            ? 'success'
            : result.reason === 'no_click_id'
              ? 'skipped_no_click_id'
              : 'failed',
          upload_attempts: 1,
          last_attempt_at: new Date().toISOString(),
          error_message: result.error || result.reason || null,
          google_response: result.google_response ?? null,
        })
        .eq('id', row.id)
    }

    if (result.uploaded) {
      logger.info(`proposal-booking-conversion: uploaded booking for proposal ${input.proposal.id} (CHF ${value})`)
      return 'uploaded'
    }

    logger.warn(
      `proposal-booking-conversion: upload failed for proposal ${input.proposal.id} — ${result.reason}${result.error ? `: ${result.error.slice(0, 160)}` : ''}`,
    )
    return 'failed'
  } catch (err: any) {
    logger.warn('proposal-booking-conversion: exception', err?.message ?? err)
    return 'failed'
  }
}

/**
 * Copy proposal click IDs / UTMs onto a staff-created appointment when missing.
 */
export async function stampAppointmentFromProposal(
  supabase: SupabaseClient,
  appointmentId: string,
  proposal: ProposalAttributionRow,
): Promise<void> {
  if (!hasClickId(proposal)) return

  const { data: appt } = await supabase
    .from('appointments')
    .select('id, gclid, gbraid, wbraid')
    .eq('id', appointmentId)
    .maybeSingle()

  if (!appt) return
  if (appt.gclid || appt.gbraid || appt.wbraid) return

  const { error } = await supabase
    .from('appointments')
    .update({
      gclid: proposal.gclid,
      gbraid: proposal.gbraid,
      wbraid: proposal.wbraid,
      utm_source: proposal.utm_source,
      utm_medium: proposal.utm_medium,
      utm_campaign: proposal.utm_campaign,
      utm_content: proposal.utm_content,
      utm_term: proposal.utm_term,
      fbclid: proposal.fbclid,
      fbc: proposal.fbc,
      fbp: proposal.fbp,
      marketing_session_id: proposal.marketing_session_id,
    })
    .eq('id', appointmentId)

  if (error) {
    logger.warn('proposal-booking-conversion: stamp appointment failed', error.message)
  }
}

/**
 * Staff appointment create: match attributed proposal → stamp + upload (once).
 */
export async function attachProposalAttributionToStaffAppointment(input: {
  tenantId: string
  appointmentId: string
  userId?: string | null
  conversionValueChf?: number | null
}): Promise<void> {
  const supabase = getSupabaseAdmin()

  let email: string | null = null
  let phone: string | null = null
  if (input.userId) {
    const { data: user } = await supabase
      .from('users')
      .select('email, phone')
      .eq('id', input.userId)
      .maybeSingle()
    email = user?.email ?? null
    phone = user?.phone ?? null
  }

  const proposal = await findAttributedProposalForCustomer(supabase, {
    tenantId: input.tenantId,
    userId: input.userId,
    email,
    phone,
  })
  if (!proposal) return

  await stampAppointmentFromProposal(supabase, input.appointmentId, proposal)

  const result = await uploadProposalDerivedBookingConversion({
    proposal,
    appointmentId: input.appointmentId,
    conversionValueChf: input.conversionValueChf,
  })

  logger.info(
    `proposal-booking-conversion: staff appointment ${input.appointmentId} ← proposal ${proposal.id} → ${result}`,
  )
}
