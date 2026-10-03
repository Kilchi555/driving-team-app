/**
 * Fail closed when the multi-admin migrations are not applied yet.
 * This does not create schema and does not fall back to the old write shape.
 */

export const STAFF_INVITATION_ROLE_UNAVAILABLE =
  'Migration 20261002_staff_invitations_role ist nicht angewendet. Einladungen sind gestoppt.'

export const TRANSFER_PRIMARY_UNAVAILABLE =
  'Migration 20261002_transfer_primary_admin ist nicht angewendet. Übertragung ist gestoppt.'

export function missingStaffInvitationRole(error: { message?: string | null } | null | undefined): boolean {
  const message = error?.message || ''
  return /staff_invitations/i.test(message)
    && /role/i.test(message)
    && /schema cache|does not exist|column/i.test(message)
}

export function missingTransferPrimaryAdmin(error: { message?: string | null } | null | undefined): boolean {
  const message = error?.message || ''
  return /transfer_primary_admin/i.test(message)
    && /schema cache|could not find the function|does not exist/i.test(message)
}
