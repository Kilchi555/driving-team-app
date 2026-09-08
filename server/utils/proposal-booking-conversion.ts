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

function hasGoogleClickId(row: { gclid?: string | null; gbraid?: string | null; wbraid?: string | null }): boolean {
  return !!(row.gclid || row.gbraid || row.wbraid)
}

function hasMetaClickId(row: { fbclid?: string | null; fbc?: string | null; fbp?: string | null }): boolean {
  return !!(row.fbclid || row.fbc || row.fbp)
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
    .or('gclid.not.is.null,gbraid.not.is.null,wbraid.not.is.null,fbclid.not.is.null')
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

  return matched && (hasGoogleClickId(matched) || hasMetaClickId(matched)) ? matched : null
}

/**
 * CRM proposal outcome `booking_confirmed` is a staff label, not a binding booking.
 * It must never upload Google Primary or Meta Purchase.
 *
 * Kept as an explicit no-op so leftover call sites cannot reintroduce the bug.
 */
export async function uploadProposalDerivedBookingConversion(_input: {
  proposal: Pick<
    ProposalAttributionRow,
    'id' | 'tenant_id' | 'gclid' | 'gbraid' | 'wbraid' | 'fbclid' | 'fbc' | 'fbp' | 'email' | 'phone'
  >
  appointmentId?: string | null
  conversionValueChf?: number | null
}): Promise<'skipped_crm_outcome_only'> {
  logger.info(
    `proposal-booking-conversion: skipping booking conversion for CRM outcome (proposal ${_input.proposal.id})`,
  )
  return 'skipped_crm_outcome_only'
}

/**
 * Copy proposal click IDs / UTMs onto a staff-created appointment when missing.
 */
export async function stampAppointmentFromProposal(
  supabase: SupabaseClient,
  appointmentId: string,
  proposal: ProposalAttributionRow,
): Promise<void> {
  if (!hasGoogleClickId(proposal) && !hasMetaClickId(proposal)) return

  const { data: appt } = await supabase
    .from('appointments')
    .select('id, gclid, gbraid, wbraid, fbclid')
    .eq('id', appointmentId)
    .maybeSingle()

  if (!appt) return
  const needsGoogle = !(appt.gclid || appt.gbraid || appt.wbraid) && hasGoogleClickId(proposal)
  const needsMeta = !appt.fbclid && hasMetaClickId(proposal)
  if (!needsGoogle && !needsMeta) return

  const { error } = await supabase
    .from('appointments')
    .update({
      ...(needsGoogle ? {
        gclid: proposal.gclid,
        gbraid: proposal.gbraid,
        wbraid: proposal.wbraid,
      } : {}),
      utm_source: proposal.utm_source,
      utm_medium: proposal.utm_medium,
      utm_campaign: proposal.utm_campaign,
      utm_content: proposal.utm_content,
      utm_term: proposal.utm_term,
      ...(needsMeta ? {
        fbclid: proposal.fbclid,
        fbc: proposal.fbc,
        fbp: proposal.fbp,
      } : {}),
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
  email?: string | null
  phone?: string | null
  conversionValueChf?: number | null
}): Promise<void> {
  const supabase = getSupabaseAdmin()

  let email: string | null = input.email?.trim().toLowerCase() || null
  let phone: string | null = input.phone?.trim() || null

  if (input.userId) {
    const { data: user } = await supabase
      .from('users')
      .select('email, phone')
      .eq('id', input.userId)
      .maybeSingle()
    email = email || user?.email || null
    phone = phone || user?.phone || null
  }

  // Walk-in / no user yet: cannot match by appointment contact fields
  // (appointments table has no email/phone — only user_id).
  if (!input.userId && !email && !phone) {
    logger.debug('proposal-booking-conversion: skip staff attach — no user/email/phone to match proposal')
    return
  }

  const proposal = await findAttributedProposalForCustomer(supabase, {
    tenantId: input.tenantId,
    userId: input.userId,
    email,
    phone,
  })
  if (!proposal) return

  await stampAppointmentFromProposal(supabase, input.appointmentId, proposal)

  logger.info(
    `proposal-booking-conversion: stamped appointment ${input.appointmentId} ← proposal ${proposal.id}`,
  )
}
