import { createError } from 'h3'
import {
  hashWebsiteClaimToken,
  mintedClaimFields,
  mintWebsiteClaimToken,
  parseWebsiteClaimToken,
  verifyWebsiteClaimToken,
} from '~/server/utils/website-claim-token'

/**
 * Website Factory lifecycle as implemented on existing fields.
 *
 * Prospect.status:
 *   scored → review (generated site) → claimed → skipped/rejected
 *
 * tenants.website_status (QA / publish, not a second machine):
 *   pending_review = QA_PENDING
 *   approved       = QA_APPROVED
 *   live           = PUBLISHED
 *   disabled       = REVOKED / cancelled hosting
 *
 * Paid is orthogonal: website_setup_paid_at + website_hosting_plan.
 * payment != publication.
 */
export const WEBSITE_FACTORY_STATES = {
  PROSPECT: 'scored',
  GENERATED: 'review',
  CLAIMED: 'claimed',
  QA_PENDING: 'pending_review',
  QA_APPROVED: 'approved',
  PUBLISHED: 'live',
  REVOKED: 'disabled',
} as const

export type WebsiteCheckoutBindingInput = {
  stripeCustomerId: string | null | undefined
  tenantIdByCustomer: string | null | undefined
  metadataTenantId?: string | null
  metadataProspectId?: string | null
  metadataWebsiteId?: string | null
  metadataProduct?: string | null
  prospect?: { id: string; tenant_id: string | null; website_id: string | null } | null
  website?: { id: string; tenant_id: string | null } | null
  expectedTenantId?: string | null
}

export type WebsiteCheckoutBindingResult =
  | { ok: true; tenantId: string }
  | {
      ok: false
      reason:
        | 'missing_customer'
        | 'unbound_customer'
        | 'tampered_metadata'
        | 'foreign_tenant'
        | 'foreign_prospect'
        | 'foreign_website'
        | 'wrong_product'
    }

export type ClaimProspectResult =
  | { ok: true; idempotent: boolean; prospectId: string; tenantId: string; websiteId: string }
  | {
      ok: false
      reason:
        | 'missing_token'
        | 'malformed'
        | 'mismatch'
        | 'expired'
        | 'revoked'
        | 'foreign_tenant'
        | 'not_generated'
        | 'already_claimed'
        | 'race'
    }

export function websiteStatusAfterPayment(
  current: string | null | undefined,
): 'pending_review' | 'approved' | 'live' | 'disabled' {
  if (current === 'approved' || current === 'live' || current === 'disabled') return current
  return 'pending_review'
}

export function resolveTrustedWebsiteCheckoutBinding(
  input: WebsiteCheckoutBindingInput,
): WebsiteCheckoutBindingResult {
  if (input.metadataProduct && input.metadataProduct !== 'website') {
    return { ok: false, reason: 'wrong_product' }
  }
  if (!input.stripeCustomerId) return { ok: false, reason: 'missing_customer' }
  if (!input.tenantIdByCustomer) return { ok: false, reason: 'unbound_customer' }

  const tenantId = input.tenantIdByCustomer
  if (input.metadataTenantId && input.metadataTenantId !== tenantId) {
    return { ok: false, reason: 'tampered_metadata' }
  }
  if (input.expectedTenantId && input.expectedTenantId !== tenantId) {
    return { ok: false, reason: 'foreign_tenant' }
  }
  if (input.metadataProspectId) {
    if (!input.prospect || input.prospect.id !== input.metadataProspectId) {
      return { ok: false, reason: 'foreign_prospect' }
    }
    if (input.prospect.tenant_id !== tenantId) {
      return { ok: false, reason: 'foreign_prospect' }
    }
  }
  if (input.metadataWebsiteId) {
    if (!input.website || input.website.id !== input.metadataWebsiteId) {
      return { ok: false, reason: 'foreign_website' }
    }
    if (input.website.tenant_id !== tenantId) {
      return { ok: false, reason: 'foreign_website' }
    }
  }
  return { ok: true, tenantId }
}

export function websiteProspectGenerateBindingFields(input: {
  tenantId: string
  websiteId: string
  previewUrl: string
  analysis: unknown
  emailDraft: unknown
  place: unknown
  now: string
  claim: { hash: string; expiresAt: Date }
  remintClaim: boolean
}) {
  const fields: Record<string, unknown> = {
    tenant_id: input.tenantId,
    website_id: input.websiteId,
    preview_url: input.previewUrl,
    analysis: input.analysis,
    email_draft: input.emailDraft,
    place: input.place,
    status: 'review',
    updated_at: input.now,
  }
  if (input.remintClaim) {
    Object.assign(fields, mintedClaimFields(input.claim))
  }
  return fields
}

export function assertNoPlaintextLifecycleSecrets(fields: Record<string, unknown>) {
  if ('preview_token' in fields || 'claim_token' in fields) {
    throw new Error('plaintext lifecycle token must not be persisted')
  }
}

export async function claimWebsiteProspect(opts: {
  supabase: {
    from: (table: string) => any
  }
  token: unknown
  actorTenantId: string
  now?: Date
}): Promise<ClaimProspectResult> {
  const now = opts.now || new Date()
  const token = parseWebsiteClaimToken(opts.token)
  if (!opts.token) return { ok: false, reason: 'missing_token' }
  if (!token) return { ok: false, reason: 'malformed' }

  const hash = hashWebsiteClaimToken(token)
  const { data: prospect, error } = await opts.supabase
    .from('website_prospects')
    .select('id, tenant_id, website_id, claimed_at, status, claim_token_hash, claim_expires_at, claim_revoked_at')
    .eq('claim_token_hash', hash)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!prospect) return { ok: false, reason: 'mismatch' }

  if (prospect.claimed_at && prospect.tenant_id === opts.actorTenantId) {
    return {
      ok: true,
      idempotent: true,
      prospectId: prospect.id,
      tenantId: prospect.tenant_id,
      websiteId: prospect.website_id,
    }
  }

  const verified = verifyWebsiteClaimToken(token, prospect, now)
  if (!verified.ok) return { ok: false, reason: verified.reason }

  if (!prospect.tenant_id || !prospect.website_id) {
    return { ok: false, reason: 'not_generated' }
  }
  if (prospect.tenant_id !== opts.actorTenantId) {
    return { ok: false, reason: 'foreign_tenant' }
  }
  if (prospect.claimed_at && prospect.tenant_id !== opts.actorTenantId) {
    return { ok: false, reason: 'already_claimed' }
  }

  const claimedAt = prospect.claimed_at || now.toISOString()
  const { data: updated, error: updateError } = await opts.supabase
    .from('website_prospects')
    .update({
      claimed_at: claimedAt,
      status: 'claimed',
      updated_at: now.toISOString(),
    })
    .eq('id', prospect.id)
    .eq('tenant_id', opts.actorTenantId)
    .select('id, tenant_id, website_id, claimed_at')
    .maybeSingle()

  if (updateError) throw createError({ statusCode: 500, statusMessage: updateError.message })
  if (!updated) {
    const { data: raced } = await opts.supabase
      .from('website_prospects')
      .select('id, tenant_id, website_id, claimed_at')
      .eq('id', prospect.id)
      .maybeSingle()
    if (raced?.claimed_at && raced.tenant_id === opts.actorTenantId) {
      return {
        ok: true,
        idempotent: true,
        prospectId: raced.id,
        tenantId: raced.tenant_id,
        websiteId: raced.website_id,
      }
    }
    return { ok: false, reason: 'race' }
  }

  return {
    ok: true,
    idempotent: !!prospect.claimed_at,
    prospectId: updated.id,
    tenantId: updated.tenant_id,
    websiteId: updated.website_id,
  }
}

export function mintClaimForGenerate(now = new Date()) {
  return mintWebsiteClaimToken(now)
}

export async function rememberWebsiteCheckoutEvent(opts: {
  supabase: { from: (table: string) => any }
  sessionId: string
  tenantId: string
  eventType?: string
}): Promise<{ duplicate: boolean }> {
  const { error } = await opts.supabase.from('website_checkout_events').insert({
    stripe_session_id: opts.sessionId,
    tenant_id: opts.tenantId,
    event_type: opts.eventType || 'checkout.session.completed',
  })
  if (!error) return { duplicate: false }
  const code = String(error.code || error.message || '')
  if (code === '23505' || /duplicate|unique/i.test(code + String(error.message || ''))) {
    return { duplicate: true }
  }
  throw new Error(error.message || 'website checkout idempotency insert failed')
}

export function applyWebsiteQaDecision(input: {
  decision: 'approved' | 'rejected' | 'disabled'
  actorId: string
  now?: Date
}) {
  const now = (input.now || new Date()).toISOString()
  if (input.decision === 'approved') {
    return {
      website_status: 'approved' as const,
      website_approved_at: now,
      website_approved_by: input.actorId,
    }
  }
  if (input.decision === 'disabled') {
    return {
      website_status: 'disabled' as const,
      website_approved_at: null,
      website_approved_by: null,
    }
  }
  return {
    website_status: 'pending_review' as const,
    website_approved_at: null,
    website_approved_by: null,
  }
}
