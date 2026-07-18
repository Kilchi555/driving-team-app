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
//  - pending account   -> their onboarding/activation link (token
//    refreshed + extended if missing/expired, so the link always works)
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '~/utils/logger'

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
}

const ONBOARDING_TOKEN_VALID_DAYS = 30

/**
 * Resolves the correct "manage your account" link for a user, refreshing
 * their onboarding token in the DB if it's missing/expired and they're
 * still pending. Safe to call for completed users too (no-op, just returns
 * the plain login link).
 */
export async function getAccountAccessLink(
  supabase: SupabaseClient,
  user: AccountAccessUser,
  tenantSlug: string
): Promise<AccountAccessLink> {
  const loginUrl = tenantSlug ? `https://app.simy.ch/${tenantSlug}` : 'https://app.simy.ch'

  if (user.onboarding_status !== 'pending') {
    return { url: loginUrl, isActivationLink: false }
  }

  const expiresAt = user.onboarding_token_expires ? new Date(user.onboarding_token_expires) : null
  const isValid = user.onboarding_token && expiresAt && expiresAt.getTime() > Date.now()

  if (isValid) {
    return { url: `https://app.simy.ch/onboarding/${user.onboarding_token}`, isActivationLink: true }
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
    return { url: loginUrl, isActivationLink: false }
  }

  return { url: `https://app.simy.ch/onboarding/${freshToken}`, isActivationLink: true }
}
