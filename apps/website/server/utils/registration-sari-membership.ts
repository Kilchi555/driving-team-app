import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Website-local copy of the deletion guard in
 * server/utils/registration-sari-membership.ts.
 * The Driving Team Vercel project only uploads apps/website, so this file
 * has to live inside that root. Keep the query and the error text aligned
 * with assertRegistrationsDeletable there.
 */
class SariMembershipWriteError extends Error {
  readonly code: 'persist_failed' | 'membership_exists'

  constructor(code: 'persist_failed' | 'membership_exists', message: string) {
    super(message)
    this.name = 'SariMembershipWriteError'
    this.code = code
  }
}

export async function assertRegistrationsDeletable(
  supabase: SupabaseClient,
  registrationIds: string[],
): Promise<void> {
  const ids = registrationIds.filter(Boolean)
  if (ids.length === 0) return
  const { data, error } = await supabase
    .from('registration_sari_memberships')
    .select('registration_id')
    .in('registration_id', ids)
    .limit(1)

  if (error) throw new SariMembershipWriteError('persist_failed', error.message)
  if (data && data.length > 0) {
    throw new SariMembershipWriteError(
      'membership_exists',
      'Registration cannot be deleted while a SARI membership exists',
    )
  }
}
