// server/utils/account-access-link.ts
// ============================================================
// Shared helper for any customer-facing email/SMS that wants to link the
// user to "their account" (login or pay now etc.).
//
// Guest bookings create a "pending" shadow account with NO password/login
// at all (see server/api/booking/guest-book.post.ts) — only
// onboarding_status === 'completed' users can actually use a login link.
// Linking a still-pending user to the plain tenant login page is a dead
// end: they have no password to enter there.
//
// This resolves the correct CTA link per user:
//  - completed account -> plain tenant login page
//  - pending account + tenant allows activation -> onboarding link
//    (token refreshed + extended if missing/expired)
//  - pending account + tenant disabled customer accounts -> no CTA
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '~/utils/logger'
import { allowsCustomerAccountActivation } from '~/server/utils/customer-account-activation'

export interface AccountAccessUser {
  id: string
  onboarding_status?: string | null
  onboarding_token?: string | null
  onboarding_token_expires?: string | null
}

export interface AccountAccessLink {
  url: string
  /** true if this links to the onboarding/activation flow rather than a plain login */
  isActivationLink: boolean
  /** false when the tenant disabled customer accounts and this user has no login */
  canAccessAccount: boolean
}

const ONBOARDING_TOKEN_VALID_DAYS = 30

export interface AccountAccessOptions {
  policy?: Record<string, any> | null
  allowActivation?: boolean
}

async function resolveAllowActivation(
  supabase: SupabaseClient,
  tenantSlug: string,
  options?: AccountAccessOptions
): Promise<boolean> {
  if (typeof options?.allowActivation === 'boolean') return options.allowActivation
  if (options?.policy !== undefined) return allowsCustomerAccountActivation(options.policy)
  if (!tenantSlug) return true
  const { data } = await supabase
    .from('tenants')
    .select('booking_policy')
    .eq('slug', tenantSlug)
    .maybeSingle()
  return allowsCustomerAccountActivation(data?.booking_policy)
}

/**
 * Resolves the correct "manage your account" link for a user, refreshing
 * their onboarding token in the DB if it's missing/expired and they're
 * still pending — but only when the tenant still allows customer accounts.
 */
export async function getAccountAccessLink(
  supabase: SupabaseClient,
  user: AccountAccessUser,
  tenantSlug: string,
  options?: AccountAccessOptions
): Promise<AccountAccessLink> {
  const loginUrl = tenantSlug ? `https://app.simy.ch/${tenantSlug}` : 'https://app.simy.ch'

  if (user.onboarding_status !== 'pending') {
    return { url: loginUrl, isActivationLink: false, canAccessAccount: true }
  }

  const allowActivation = await resolveAllowActivation(supabase, tenantSlug, options)
  if (!allowActivation) {
    return { url: loginUrl, isActivationLink: false, canAccessAccount: false }
  }

  const expiresAt = user.onboarding_token_expires ? new Date(user.onboarding_token_expires) : null
  const isValid = user.onboarding_token && expiresAt && expiresAt.getTime() > Date.now()

  if (isValid) {
    return { url: `https://app.simy.ch/onboarding/${user.onboarding_token}`, isActivationLink: true, canAccessAccount: true }
  }

  // Token missing or expired — mint + persist a fresh one so the link we're
  // about to send actually works.
  const freshToken = uuidv4()
  const freshExpiry = new Date()
  freshExpiry.setDate(freshExpiry.getDate() + ONBOARDING_TOKEN_VALID_DAYS)

  const { error } = await supabase
    .from('users')
    .update({ onboarding_token: freshToken, onboarding_token_expires: freshExpiry.toISOString() })
    .eq('id', user.id)

  if (error) {
    logger.warn('⚠️ Could not refresh onboarding token, falling back to login link:', user.id, error.message)
    return { url: loginUrl, isActivationLink: false, canAccessAccount: true }
  }

  return { url: `https://app.simy.ch/onboarding/${freshToken}`, isActivationLink: true, canAccessAccount: true }
}
