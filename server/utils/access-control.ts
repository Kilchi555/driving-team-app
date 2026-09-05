import { createError } from 'h3'

export const STAFF_ADMIN_ROLES = ['admin', 'staff', 'super_admin', 'tenant_admin'] as const

export type AccessDecision =
  | { allow: true }
  | { allow: false; status: 400 | 401 | 403 | 404; reason: string }

export function isStaffAdminRole(role: string | null | undefined): boolean {
  return !!role && (STAFF_ADMIN_ROLES as readonly string[]).includes(role)
}

export function canAccessUserDocument(opts: {
  callerId?: string | null
  callerRole?: string | null
  callerTenantId?: string | null
  owner?: { id?: string | null; tenant_id?: string | null } | null
  pathBelongsToOwner: boolean
}): AccessDecision {
  if (!opts.callerId || !opts.callerRole) {
    return { allow: false, status: 401, reason: 'unauthenticated' }
  }
  if (!opts.owner?.id || !opts.pathBelongsToOwner) {
    return { allow: false, status: 403, reason: 'document owner mismatch' }
  }
  if (opts.owner.id === opts.callerId) {
    return { allow: true }
  }
  if (!isStaffAdminRole(opts.callerRole)) {
    return { allow: false, status: 403, reason: 'insufficient role' }
  }
  if (opts.callerRole === 'super_admin') {
    return { allow: true }
  }
  if (!opts.callerTenantId || !opts.owner.tenant_id || opts.owner.tenant_id !== opts.callerTenantId) {
    return { allow: false, status: 403, reason: 'tenant mismatch' }
  }
  return { allow: true }
}

export function throwAccess(decision: AccessDecision): never {
  throw createError({
    statusCode: decision.status,
    statusMessage: decision.reason,
    message: decision.reason,
  })
}
