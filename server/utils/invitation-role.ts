import { createError } from 'h3'

export type InvitationRole = 'admin' | 'staff'

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Omitted role is staff. Only `admin` and `staff` are valid.
 * Any other value, including nested objects, is rejected.
 */
export function parseInvitationRole(value: unknown): InvitationRole {
  if (value === undefined || value === null || value === '') return 'staff'
  if (value === 'admin' || value === 'staff') return value
  throw createError({
    statusCode: 400,
    statusMessage: 'Ungültige Rolle. Erlaubt sind admin oder staff.',
  })
}

/**
 * Invitation is the authoritative role source at accept time.
 * Anything other than the exact value `admin` becomes staff.
 */
export function roleFromInvitation(role: unknown): InvitationRole {
  return role === 'admin' ? 'admin' : 'staff'
}

/**
 * Legacy POST /api/auth/register action=register-staff.
 * Only an invitation whose stored role is exactly `staff` may continue.
 * Admin invitations must not be accepted or consumed on this path.
 */
export function legacyAcceptsInvitationRole(role: unknown): boolean {
  return role === 'staff'
}

/**
 * Staff operational rows (hours, locations, calendar, availability)
 * belong to staff invitations only.
 */
export function createsStaffOperationalRecords(role: InvitationRole): boolean {
  return role === 'staff'
}

/**
 * Whitelist for POST /api/staff/invite.
 * Accepts the existing staff-form aliases firstName / lastName.
 * tenant_id and every other privileged field are dropped, including nested copies.
 */
export function pickStaffInviteFields(body: unknown): {
  first_name: string
  last_name: string
  email: string
  phone: string
  role: InvitationRole
} {
  const source = body && typeof body === 'object' && !Array.isArray(body)
    ? body as Record<string, unknown>
    : {}

  const first_name = asTrimmedString(source.first_name) || asTrimmedString(source.firstName)
  const last_name = asTrimmedString(source.last_name) || asTrimmedString(source.lastName)
  const email = asTrimmedString(source.email).toLowerCase()
  const phone = asTrimmedString(source.phone)
  const role = parseInvitationRole(source.role)

  return { first_name, last_name, email, phone, role }
}
