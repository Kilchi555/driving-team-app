/**
 * Customer self-delete helpers (tombstone attribution).
 *
 * Product self-delete anonymizes public.users and keeps the row (tombstone).
 * Audit rows must reference that tombstone id so audit_logs_has_identifier
 * is satisfied without inventing IP/auth identifiers.
 *
 * Supabase JS client calls are separate round-trips (not one DB transaction).
 */

export type SelfDeleteAuditDetails = {
  deleted_user_id: string
  deleted_email: string | null
  deleted_at: string
  method: 'in_app_self_service'
}

export type SelfDeleteAuditInsert = {
  user_id: string
  tenant_id: string | null
  action: 'account_self_deleted'
  status: 'success'
  details: SelfDeleteAuditDetails
}

export function buildAccountSelfDeletedAuditInsert(args: {
  tombstoneUserId: string
  tenantId: string | null
  originalEmail: string | null
  deletedAtIso?: string
}): SelfDeleteAuditInsert {
  if (!args.tombstoneUserId) {
    throw new Error('tombstoneUserId is required for self-delete audit attribution')
  }

  return {
    user_id: args.tombstoneUserId,
    tenant_id: args.tenantId,
    action: 'account_self_deleted',
    status: 'success',
    details: {
      deleted_user_id: args.tombstoneUserId,
      deleted_email: args.originalEmail,
      deleted_at: args.deletedAtIso || new Date().toISOString(),
      method: 'in_app_self_service',
    },
  }
}

/** Satisfies audit_logs_has_identifier via user_id alone (no IP / auth_user_id). */
export function selfDeleteAuditSatisfiesIdentifierCheck(
  insert: Pick<SelfDeleteAuditInsert, 'user_id'> & {
    auth_user_id?: string | null
    ip_address?: string | null
  },
): boolean {
  return Boolean(insert.user_id || insert.auth_user_id || insert.ip_address)
}

export type TombstoneRow = {
  id: string
  auth_user_id: string | null
  is_active: boolean | null
  email: string | null
}

/**
 * Confirm the anonymized tombstone still exists before writing audit / deleting Auth.
 * Lookup is by users.id (not auth_user_id), because anonymization clears auth_user_id.
 */
export function assertTombstoneReadyForAudit(row: TombstoneRow | null | undefined, expectedUserId: string): asserts row is TombstoneRow {
  if (!row || row.id !== expectedUserId) {
    throw Object.assign(new Error('Anonymized user tombstone not found'), {
      code: 'TOMBSTONE_MISSING',
    })
  }
  if (row.auth_user_id !== null) {
    throw Object.assign(new Error('Tombstone still linked to Auth; anonymization incomplete'), {
      code: 'TOMBSTONE_AUTH_LINK_PRESENT',
    })
  }
  if (row.is_active !== false) {
    throw Object.assign(new Error('Tombstone is still active; anonymization incomplete'), {
      code: 'TOMBSTONE_STILL_ACTIVE',
    })
  }
}
