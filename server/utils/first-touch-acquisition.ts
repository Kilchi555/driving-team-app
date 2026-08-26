/**
 * First-touch acquisition on users.
 *
 * Writes users.acquisition_* once (acquisition_at IS NULL). Never overwrites.
 * Used by online booking, guest book, inquiries, staff add-student, and
 * staff-created appointments so LTV-per-channel is not limited to self-service.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import {
  hasAnyAttribution,
  mergeAttributionFields,
  type AttributionFields,
} from '~/server/utils/marketing-attribution-merge'
import { resolveMarketingAttribution } from '~/server/utils/resolve-marketing-attribution'

const PLACEHOLDER_RE = /^\{[a-z0-9_.]+\}$/i
const EMPTY_TOKENS = new Set(['', '(none)', 'none', '(not set)', 'not set', 'null', 'undefined', '-'])
const PAID_MEDIUMS = new Set(['cpc', 'ppc', 'paid', 'paid_social', 'paid-social', 'paidsocial'])
const META_SOURCES = new Set(['facebook', 'instagram', 'meta', 'fb', 'ig'])
const GOOGLE_SOURCES = new Set(['google', 'google ads', 'googleads'])
const NEW_CLIENT_WINDOW_MS = 24 * 60 * 60 * 1000

export type DerivedAcquisition = {
  source: string | null
  medium: string | null
  campaign: string | null
  term: string | null
  gclid: string | null
  referrerPage: string | null
}

export type StampFirstTouchResult =
  | 'stamped'
  | 'skipped_already_set'
  | 'skipped_existing_client'
  | 'skipped_no_signal'
  | 'failed'

export function hasAdsAcquisitionSignal(derived: DerivedAcquisition): boolean {
  return isPaidAcquisition(derived.source, derived.medium, derived.gclid)
}

/** Staff fallback stamps stay first-lesson only. Ads click IDs stamp even later. */
export function shouldApplyNewClientGate(params: {
  onlyIfNewClient?: boolean
  hasAdsSignal: boolean
}): boolean {
  return !!params.onlyIfNewClient && !params.hasAdsSignal
}

export function cleanTrackingValue(value: string | null | undefined): string | null {
  if (value == null) return null
  const v = String(value).trim()
  if (!v) return null
  if (PLACEHOLDER_RE.test(v)) return null
  if (EMPTY_TOKENS.has(v.toLowerCase())) return null
  return v
}

export function deriveAcquisitionFields(
  attr: AttributionFields | null | undefined,
  referrerPage?: string | null,
): DerivedAcquisition {
  const gclid = cleanTrackingValue(attr?.gclid)
  const gbraid = cleanTrackingValue(attr?.gbraid)
  const wbraid = cleanTrackingValue(attr?.wbraid)
  const fbclid = cleanTrackingValue(attr?.fbclid)
  const utmSource = cleanTrackingValue(attr?.utm_source)
  const utmMedium = cleanTrackingValue(attr?.utm_medium)
  const campaign = cleanTrackingValue(attr?.utm_campaign)
  const term = cleanTrackingValue(attr?.utm_term)
  const referrer = cleanTrackingValue(referrerPage)

  const source =
    utmSource
    || (gclid || gbraid || wbraid ? 'google' : null)
    || (fbclid ? 'facebook' : null)
    || (referrer ? 'organic/direct' : null)

  const medium =
    utmMedium
    || (gclid || gbraid || wbraid ? 'cpc' : null)
    || (fbclid ? 'paid_social' : null)
    || (referrer ? 'organic' : null)

  return {
    source,
    medium,
    campaign,
    term,
    gclid,
    referrerPage: referrer,
  }
}

export function isPaidAcquisition(
  source: string | null | undefined,
  medium: string | null | undefined,
  gclid?: string | null,
): boolean {
  const m = (medium || '').toLowerCase()
  if (m === 'self_reported') return false
  if (cleanTrackingValue(gclid)) return true
  const s = (source || '').toLowerCase()
  if (PAID_MEDIUMS.has(m)) return true
  if (META_SOURCES.has(s) && m !== 'organic') return true
  if (GOOGLE_SOURCES.has(s) && (m === 'cpc' || m === 'ppc' || m === 'paid')) return true
  return false
}

export function acquisitionChannelLabel(
  source: string,
  medium: string,
  campaign: string | null,
): string {
  if (campaign) return `${source} · ${campaign}`
  if (isPaidAcquisition(source, medium)) {
    const s = source.toLowerCase()
    if (META_SOURCES.has(s) || medium.toLowerCase().includes('social')) return 'Meta Ads'
    return 'Google Ads'
  }
  if (source === 'organic/direct' || (source === 'direct' && (medium === 'none' || medium === 'organic'))) {
    return 'Organisch / Direkt'
  }
  if (source === 'offline' && medium === 'staff') return 'Team / vor Ort'
  if (medium === 'self_reported') {
    const labels: Record<string, string> = {
      google_ads: 'Google-Werbung',
      google_organic: 'Google-Suche',
      google_maps: 'Google Maps',
      instagram: 'Instagram',
      facebook: 'Facebook',
      tiktok: 'TikTok',
      recommendation: 'Empfehlung',
      flyer: 'Flyer / Plakat',
      passing_by: 'Vorbeigefahren',
      school: 'Schule / Betrieb',
      other: 'Anderes',
    }
    return labels[source] ?? source
  }
  return source
}

export async function stampFirstTouchAcquisition(params: {
  userId: string
  tenantId: string
  email?: string | null
  phone?: string | null
  attribution?: AttributionFields | null
  marketingSessionId?: string | null
  referrerPage?: string | null
  fallbackSource?: string
  fallbackMedium?: string
  lookupAttributedProposal?: boolean
  /** When true, only stamp brand-new clients (created < 24h or first appointment). */
  onlyIfNewClient?: boolean
  supabase?: SupabaseClient
}): Promise<StampFirstTouchResult> {
  const supabase = params.supabase ?? getSupabaseAdmin()

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, acquisition_at, created_at')
    .eq('id', params.userId)
    .eq('tenant_id', params.tenantId)
    .maybeSingle()

  if (userError || !user) {
    logger.warn('first-touch: user lookup failed', userError?.message)
    return 'failed'
  }
  if (user.acquisition_at) return 'skipped_already_set'

  let attr = mergeAttributionFields(null, params.attribution)
  let referrerPage = params.referrerPage ?? null

  if (params.marketingSessionId) {
    try {
      const resolved = await resolveMarketingAttribution(
        supabase,
        params.marketingSessionId,
        attr,
      )
      attr = mergeAttributionFields(attr, resolved)
      if (!referrerPage) {
        const { data: redirect } = await supabase
          .from('booking_redirects')
          .select('referrer_page, utm_term')
          .eq('session_id', params.marketingSessionId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        referrerPage = redirect?.referrer_page ?? null
        if (redirect?.utm_term && !attr.utm_term) attr.utm_term = redirect.utm_term
      }
    } catch (err: any) {
      logger.warn('first-touch: session resolve failed', err?.message ?? err)
    }
  }

  if (params.lookupAttributedProposal && !hasAnyAttribution(attr)) {
    try {
      const { findAttributedProposalForCustomer } = await import(
        '~/server/utils/proposal-booking-conversion'
      )
      const proposal = await findAttributedProposalForCustomer(supabase, {
        tenantId: params.tenantId,
        userId: params.userId,
        email: params.email,
        phone: params.phone,
      })
      if (proposal) {
        attr = mergeAttributionFields(attr, {
          gclid: proposal.gclid,
          gbraid: proposal.gbraid,
          wbraid: proposal.wbraid,
          fbclid: proposal.fbclid,
          fbc: proposal.fbc,
          fbp: proposal.fbp,
          utm_source: proposal.utm_source,
          utm_medium: proposal.utm_medium,
          utm_campaign: proposal.utm_campaign,
          utm_content: proposal.utm_content,
          utm_term: proposal.utm_term,
        })
      }
    } catch (err: any) {
      logger.warn('first-touch: proposal lookup failed', err?.message ?? err)
    }
  }

  const derived = deriveAcquisitionFields(attr, referrerPage)
  if (shouldApplyNewClientGate({
    onlyIfNewClient: params.onlyIfNewClient,
    hasAdsSignal: hasAdsAcquisitionSignal(derived),
  })) {
    const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0
    const isRecent = createdAt > 0 && Date.now() - createdAt < NEW_CLIENT_WINDOW_MS
    if (!isRecent) {
      const { count } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', params.userId)
        .eq('tenant_id', params.tenantId)
      if ((count ?? 0) > 1) return 'skipped_existing_client'
    }
  }

  const source = derived.source ?? cleanTrackingValue(params.fallbackSource)
  const medium = derived.medium ?? cleanTrackingValue(params.fallbackMedium)

  if (!source && !medium && !derived.gclid) return 'skipped_no_signal'

  const { error: updateError } = await supabase
    .from('users')
    .update({
      acquisition_source: source,
      acquisition_medium: medium,
      acquisition_campaign: derived.campaign,
      acquisition_term: derived.term,
      acquisition_referrer_page: derived.referrerPage,
      acquisition_gclid: derived.gclid,
      acquisition_at: new Date().toISOString(),
    })
    .eq('id', params.userId)
    .eq('tenant_id', params.tenantId)
    .is('acquisition_at', null)

  if (updateError) {
    logger.warn('first-touch: update failed', updateError.message)
    return 'failed'
  }

  logger.debug(`first-touch: stamped ${params.userId} as ${source}/${medium}`)
  return 'stamped'
}
