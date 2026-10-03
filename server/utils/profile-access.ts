/**
 * Fail-closed profile gates.
 * Deactivated and deleted public.users rows are never an authenticated profile.
 * Login additionally requires an active, non-deleted row (missing profile denies).
 */

export function isDeactivatedOrDeleted(dbUser: {
  is_active?: boolean | null
  deleted_at?: unknown
} | null | undefined): boolean {
  if (!dbUser) return false
  return dbUser.is_active === false || dbUser.deleted_at != null
}

/** Active login profile: row exists, is_active is true, deleted_at is null. */
export function hasActiveLoginProfile(dbUser: {
  is_active?: boolean | null
  deleted_at?: unknown
} | null | undefined): boolean {
  if (!dbUser) return false
  return dbUser.is_active === true && dbUser.deleted_at == null
}
