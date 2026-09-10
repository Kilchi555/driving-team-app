/**
 * Atomic staff-invitation consume.
 *
 * Auth user creation (GoTrue) is not in the same Postgres transaction as
 * `staff_invitations`. We therefore claim the invitation FIRST with a
 * compare-and-swap. The loser never creates an Auth user or staff row.
 *
 * If later steps fail, `releaseStaffInvitationClaim` restores pending
 * only for this claim (id + accepted_at).
 */
export type ConsumedStaffInvitation = {
  id: string
  tenant_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  link_to_admin: boolean | null
  invited_by: string | null
  accepted_at: string
}

type InvitationWriter = {
  from: (table: string) => any
}

const CONSUME_COLUMNS =
  'id, tenant_id, first_name, last_name, email, phone, link_to_admin, invited_by, accepted_at'

export async function consumePendingStaffInvitation(
  supabase: InvitationWriter,
  token: string,
  claimedAt: string,
): Promise<ConsumedStaffInvitation | null> {
  const { data, error } = await supabase
    .from('staff_invitations')
    .update({
      status: 'accepted',
      accepted_at: claimedAt,
    })
    .eq('invitation_token', token)
    .eq('status', 'pending')
    .gt('expires_at', claimedAt)
    .select(CONSUME_COLUMNS)
    .maybeSingle()

  if (error || !data) return null
  return data as ConsumedStaffInvitation
}

export async function releaseStaffInvitationClaim(
  supabase: InvitationWriter,
  invitationId: string,
  claimedAt: string,
): Promise<void> {
  await supabase
    .from('staff_invitations')
    .update({
      status: 'pending',
      accepted_at: null,
    })
    .eq('id', invitationId)
    .eq('status', 'accepted')
    .eq('accepted_at', claimedAt)
}
