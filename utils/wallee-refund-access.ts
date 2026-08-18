/** Temporary allowlist: only this staff may initiate Wallee refunds. */
export const WALLEE_REFUND_ALLOWED_EMAILS = ['kilchi@drivingteam.ch'] as const

export function canInitiateWalleeRefund(email?: string | null): boolean {
  if (!email) return false
  return WALLEE_REFUND_ALLOWED_EMAILS.includes(email.trim().toLowerCase() as typeof WALLEE_REFUND_ALLOWED_EMAILS[number])
}

export function actorEmailFromAuth(authUser: {
  email?: string | null
  profile?: { email?: string | null } | null
} | null | undefined): string | null {
  return authUser?.profile?.email || authUser?.email || null
}
