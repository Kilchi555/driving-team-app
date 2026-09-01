/**
 * Shared email conflict checks for staff invites / registration.
 * Checks public.users and Supabase Auth (auth.users).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { isPlaceholderStaffInviteEmail } from '~/server/utils/staff-invite-email'
import { findAuthUserByEmail } from '~/server/utils/auth-email-claim'

export type EmailConflictReason =
  | 'invalid'
  | 'admin_login'
  | 'user_exists'
  | 'auth_exists'
  | 'lookup_failed'
  | 'pending_invite'

export interface EmailConflictResult {
  available: boolean
  reason?: EmailConflictReason
  /** Existing public.users role when reason is user_exists */
  existingRole?: string | null
}

export async function checkEmailAvailableForStaff(opts: {
  supabase: SupabaseClient
  email: string
  /** Block if equal to this admin email */
  adminEmail?: string | null
  /** When set, ignore a pending invite with this id (e.g. resend of same invite) */
  ignoreInvitationId?: string | null
  tenantId?: string | null
}): Promise<EmailConflictResult> {
  const email = String(opts.email || '').trim().toLowerCase()
  if (!email || !email.includes('@')) {
    return { available: false, reason: 'invalid' }
  }

  const adminEmail = opts.adminEmail?.trim().toLowerCase() || null
  if (adminEmail && email === adminEmail) {
    return { available: false, reason: 'admin_login' }
  }

  let existingQuery = opts.supabase
    .from('users')
    .select('id, role')
    .eq('email', email)
    .eq('is_active', true)

  if (opts.tenantId) {
    existingQuery = existingQuery.eq('tenant_id', opts.tenantId)
  }

  const { data: existingRows } = await existingQuery.limit(2)
  if (existingRows?.length) {
    return {
      available: false,
      reason: 'user_exists',
      existingRole: existingRows[0].role || null,
    }
  }

  const authLookup = await findAuthUserByEmail(opts.supabase, email)
  if (!authLookup.ok) {
    // Never treat lookup failures as "already registered" — that blocked every invite
    // when getUserByEmail (missing in supabase-js v2) threw.
    return { available: false, reason: 'lookup_failed' }
  }
  if (authLookup.user) {
    return { available: false, reason: 'auth_exists' }
  }

  if (opts.tenantId) {
    let q = opts.supabase
      .from('staff_invitations')
      .select('id, email')
      .eq('tenant_id', opts.tenantId)
      .eq('email', email)
      .eq('status', 'pending')

    if (opts.ignoreInvitationId) {
      q = q.neq('id', opts.ignoreInvitationId)
    }

    const { data: pending } = await q.maybeSingle()
    if (pending) {
      return { available: false, reason: 'pending_invite' }
    }
  }

  return { available: true }
}

export function emailConflictMessage(
  result: EmailConflictResult,
  staffLabel = 'Mitarbeiter',
): string {
  switch (result.reason) {
    case 'invalid':
      return 'Ungültige E-Mail-Adresse'
    case 'admin_login':
      return `Die Admin-E-Mail kann nicht für den ${staffLabel}-Login verwendet werden. Bitte eine andere E-Mail angeben.`
    case 'user_exists':
      return result.existingRole === 'admin'
        ? `Diese E-Mail ist bereits als Admin registriert. Für den ${staffLabel}-Login eine andere Adresse wählen.`
        : 'Diese E-Mail ist bereits registriert. Bitte eine andere Adresse wählen.'
    case 'auth_exists':
      return 'Diese E-Mail ist bereits in Auth registriert. Bitte eine andere Adresse wählen.'
    case 'lookup_failed':
      return 'Die E-Mail konnte gerade nicht geprüft werden. Bitte versuche es erneut.'
    case 'pending_invite':
      return 'Für diese E-Mail existiert bereits eine offene Einladung. Bitte «E-Mail erneut» nutzen.'
    default:
      return 'Diese E-Mail ist nicht verfügbar.'
  }
}

export function displayStaffInviteEmail(email: string | null | undefined): string {
  if (!email || isPlaceholderStaffInviteEmail(email)) return ''
  return email
}

export { findAuthUserByEmail } from '~/server/utils/auth-email-claim'
