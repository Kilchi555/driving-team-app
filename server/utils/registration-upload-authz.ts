/**
 * Authorization for POST /api/auth/upload-document.
 *
 * Path A: existing session (owner, same-tenant staff, or the unchanged
 * unauthenticated registration window).
 * Path B: short-lived registration upload grant for exactly one user and
 * that user's tenant. A privileged session from another tenant is not the
 * document tenant and does not authorize the upload by itself.
 *
 * documentOwner.tenant_id stays the tenant written on the document.
 */

import { STAFF_ADMIN_ROLES } from '~/server/utils/require-staff-or-internal'
import {
  REGISTRATION_UPLOAD_GRANT_PURPOSE,
  verifyRegistrationUploadGrant,
} from '~/server/utils/registration-upload-grant'

const REGISTRATION_WINDOW_MS = 30 * 60 * 1000
const OPEN_ONBOARDING = new Set(['pending', 'pending_documents', 'incomplete'])

export type DocumentOwner = {
  id: string
  tenant_id: string | null
  created_at?: string | null
  onboarding_status?: string | null
}

export type UploadSession = {
  role?: string | null
  tenantId?: string | null
  dbUserId?: string | null
} | null

export type UploadAuthzDecision =
  | { allow: true; via: 'grant' | 'session'; documentTenantId: string | null }
  | { allow: false; statusCode: 401 | 403; statusMessage: string }

export function authorizeRegistrationDocumentUpload(input: {
  documentOwner: DocumentOwner
  requestTenantId?: string | null
  session?: UploadSession
  uploadGrant?: string | null
  now?: number
}): UploadAuthzDecision {
  const { documentOwner } = input
  const now = input.now ?? Date.now()
  const requestTenantId = typeof input.requestTenantId === 'string' ? input.requestTenantId : ''

  if (requestTenantId && requestTenantId !== documentOwner.tenant_id) {
    return {
      allow: false,
      statusCode: 403,
      statusMessage: 'Zugriff verweigert: Tenant-Isolation verletzt',
    }
  }

  const grantToken = typeof input.uploadGrant === 'string' ? input.uploadGrant.trim() : ''
  if (grantToken) {
    const verified = verifyRegistrationUploadGrant(grantToken, now)
    if (verified.status === 'invalid') {
      return { allow: false, statusCode: 403, statusMessage: 'Forbidden' }
    }
    if (verified.status === 'valid') {
      const matchesOwner =
        verified.claims.userId === documentOwner.id &&
        verified.claims.tenantId === documentOwner.tenant_id &&
        verified.claims.purpose === REGISTRATION_UPLOAD_GRANT_PURPOSE
      if (!matchesOwner) {
        return { allow: false, statusCode: 403, statusMessage: 'Forbidden' }
      }
      return { allow: true, via: 'grant', documentTenantId: documentOwner.tenant_id }
    }
  }

  const session = input.session ?? null
  const role = session?.role || ''
  const isPrivileged = (STAFF_ADMIN_ROLES as readonly string[]).includes(role)
  const isOwner = !!session?.dbUserId && session.dbUserId === documentOwner.id

  let allowRegistrationWindow = false
  if (!session) {
    const createdAt = documentOwner.created_at ? new Date(documentOwner.created_at).getTime() : 0
    const ageMs = now - createdAt
    const onboardingOpen =
      !documentOwner.onboarding_status || OPEN_ONBOARDING.has(documentOwner.onboarding_status)
    allowRegistrationWindow = ageMs >= 0 && ageMs <= REGISTRATION_WINDOW_MS && onboardingOpen
  }

  if (isPrivileged) {
    if (role !== 'super_admin' && session?.tenantId && session.tenantId !== documentOwner.tenant_id) {
      return { allow: false, statusCode: 403, statusMessage: 'Forbidden – tenant mismatch' }
    }
    return { allow: true, via: 'session', documentTenantId: documentOwner.tenant_id }
  }

  if (!isOwner && !allowRegistrationWindow) {
    return { allow: false, statusCode: 401, statusMessage: 'Authentication required' }
  }

  return { allow: true, via: 'session', documentTenantId: documentOwner.tenant_id }
}
