/**
 * Guest / no-login customer identity boundary.
 *
 * Auth-backed customers (`auth_user_id` set) must authenticate.
 * Application-only shadows (`auth_user_id` null) — including public course/VKU
 * rows whose `onboarding_status` defaulted to `completed` — may be reused on
 * guest booking and pending-only public registration.
 *
 * Do not treat `onboarding_status === 'completed'` alone as proof of a login.
 */

export type GuestIdentityRow = {
  id: string
  auth_user_id?: string | null
  onboarding_status?: string | null
  category?: string[] | null
  phone?: string | null
  email?: string | null
  onboarding_token?: string | null
  onboarding_token_expires?: string | null
}

export function isAuthBackedCustomer(
  user: { auth_user_id?: string | null } | null | undefined,
): boolean {
  return Boolean(user?.auth_user_id)
}

export function isReusableGuestCustomer<T extends { id: string; auth_user_id?: string | null }>(
  user: T | null | undefined,
): user is T {
  return Boolean(user) && !isAuthBackedCustomer(user)
}

/**
 * Prefer email match over phone when both resolve to reusable no-Auth shadows.
 * Matches the historical guest-book preference for the email-tied identity.
 */
export function pickReusableGuestCustomer<T extends GuestIdentityRow>(opts: {
  emailMatch: T | null | undefined
  phoneMatch: T | null | undefined
}): T | null {
  if (isReusableGuestCustomer(opts.emailMatch)) return opts.emailMatch
  if (isReusableGuestCustomer(opts.phoneMatch)) return opts.phoneMatch
  return null
}
