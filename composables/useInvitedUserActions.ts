export type InvitedUserTarget = {
  id: string
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  role?: string | null
  is_invitation?: boolean
  onboarding_status?: string | null
}

export type InviteResendResult = {
  success?: boolean
  sentVia?: string
  email?: string
  inviteLink?: string
  message?: string
}

export function isPendingClientInvite(user: {
  role?: string | null
  onboarding_status?: string | null
  is_invitation?: boolean
}): boolean {
  return !user.is_invitation && user.role === 'client' && user.onboarding_status === 'pending'
}

export function isPlaceholderInviteEmail(email?: string | null): boolean {
  if (!email) return true
  const value = email.toLowerCase()
  return value.includes('@onboarding.simy.ch') || (value.startsWith('pending_') && value.includes('@invite.simy.ch'))
}

export function displayInviteEmail(email?: string | null): string {
  if (!email || isPlaceholderInviteEmail(email)) return ''
  return email
}

/**
 * Resend uses the stored invitation email. The browser does not choose the recipient.
 */
export async function resendInvitedUser(user: InvitedUserTarget): Promise<InviteResendResult> {
  if (user.is_invitation) {
    return await $fetch<InviteResendResult>('/api/staff/resend-invite', {
      method: 'POST',
      body: { invitationId: user.id },
    })
  }

  if (isPendingClientInvite(user)) {
    return await $fetch<InviteResendResult>('/api/admin/invited-clients/resend', {
      method: 'POST',
      body: { userId: user.id },
    })
  }

  throw new Error('Diese Einladung kann nicht erneut gesendet werden')
}
