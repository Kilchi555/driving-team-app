import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  assertTombstoneReadyForAudit,
  buildAccountSelfDeletedAuditInsert,
  selfDeleteAuditSatisfiesIdentifierCheck,
} from '../delete-account-self-delete'

const TOMBSTONE_ID = 'a0466021-6b16-433b-b317-02ba8090e348'
const TENANT_ID = '4e68a15c-0b20-4812-9759-59acb87966a2'

describe('buildAccountSelfDeletedAuditInsert', () => {
  it('attributes the audit row to the anonymized tombstone users.id', () => {
    const insert = buildAccountSelfDeletedAuditInsert({
      tombstoneUserId: TOMBSTONE_ID,
      tenantId: TENANT_ID,
      originalEmail: 'client@example.com',
      deletedAtIso: '2026-10-09T17:00:00.000Z',
    })

    expect(insert.user_id).toBe(TOMBSTONE_ID)
    expect(insert.user_id).not.toBeNull()
    expect(insert.tenant_id).toBe(TENANT_ID)
    expect(insert.action).toBe('account_self_deleted')
    expect(insert.status).toBe('success')
    expect(insert.details).toEqual({
      deleted_user_id: TOMBSTONE_ID,
      deleted_email: 'client@example.com',
      deleted_at: '2026-10-09T17:00:00.000Z',
      method: 'in_app_self_service',
    })
    expect(insert).not.toHaveProperty('auth_user_id')
    expect(insert).not.toHaveProperty('ip_address')
  })

  it('satisfies audit_logs_has_identifier via tombstone user_id alone', () => {
    const insert = buildAccountSelfDeletedAuditInsert({
      tombstoneUserId: TOMBSTONE_ID,
      tenantId: TENANT_ID,
      originalEmail: null,
    })
    expect(selfDeleteAuditSatisfiesIdentifierCheck(insert)).toBe(true)
    expect(selfDeleteAuditSatisfiesIdentifierCheck({ user_id: null as unknown as string })).toBe(false)
    expect(selfDeleteAuditSatisfiesIdentifierCheck({ user_id: '', auth_user_id: null, ip_address: null })).toBe(false)
  })

  it('rejects missing tombstone id instead of fabricating identifiers', () => {
    expect(() =>
      buildAccountSelfDeletedAuditInsert({
        tombstoneUserId: '',
        tenantId: TENANT_ID,
        originalEmail: null,
      }),
    ).toThrow(/tombstoneUserId is required/)
  })
})

describe('assertTombstoneReadyForAudit', () => {
  it('accepts an anonymized inactive tombstone with cleared auth_user_id', () => {
    expect(() =>
      assertTombstoneReadyForAudit(
        {
          id: TOMBSTONE_ID,
          auth_user_id: null,
          is_active: false,
          email: `deleted_${TOMBSTONE_ID}@simy.local`,
        },
        TOMBSTONE_ID,
      ),
    ).not.toThrow()
  })

  it('rejects missing tombstone, lingering auth link, or still-active row', () => {
    expect(() => assertTombstoneReadyForAudit(null, TOMBSTONE_ID)).toThrow(/not found/)
    expect(() =>
      assertTombstoneReadyForAudit(
        { id: TOMBSTONE_ID, auth_user_id: 'auth-still-linked', is_active: false, email: 'x' },
        TOMBSTONE_ID,
      ),
    ).toThrow(/still linked/)
    expect(() =>
      assertTombstoneReadyForAudit(
        { id: TOMBSTONE_ID, auth_user_id: null, is_active: true, email: 'x' },
        TOMBSTONE_ID,
      ),
    ).toThrow(/still active/)
  })
})

describe('delete-account.post.ts wiring (static)', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'server/api/customer/delete-account.post.ts'),
    'utf8',
  )

  it('uses tombstone helpers and does not insert user_id: null for self-delete audit', () => {
    expect(source).toContain('buildAccountSelfDeletedAuditInsert')
    expect(source).toContain('assertTombstoneReadyForAudit')
    expect(source).toContain('tombstoneUserId: userId')
    expect(source).not.toMatch(/audit_logs['"]\)\s*\.insert\(\s*\{[^}]*user_id:\s*null/s)
    expect(source).not.toMatch(/Audit log insert failed \(non-fatal\)/)
  })

  it('requires anonymization + tombstone verify + audit before Auth deletion', () => {
    const anonIdx = source.indexOf("logger.debug('🗑️ [delete-account] Anonymizing user data")
    const tombstoneIdx = source.indexOf('assertTombstoneReadyForAudit(tombstone, userId)')
    const auditIdx = source.indexOf('buildAccountSelfDeletedAuditInsert({')
    const authIdx = source.indexOf('serviceSupabase.auth.admin.deleteUser(user.id)')
    expect(anonIdx).toBeGreaterThan(-1)
    expect(tombstoneIdx).toBeGreaterThan(anonIdx)
    expect(auditIdx).toBeGreaterThan(tombstoneIdx)
    expect(authIdx).toBeGreaterThan(auditIdx)
  })

  it('treats audit insert error as fatal (observes supabase error object)', () => {
    expect(source).toMatch(/const \{ error: auditError \} = await serviceSupabase/)
    expect(source).toMatch(/if \(auditError\)/)
    expect(source).toMatch(/Audit-Protokollierung fehlgeschlagen/)
  })

  it('does not alter admin soft-delete path', () => {
    const manage = readFileSync(
      resolve(process.cwd(), 'server/api/admin/users/manage.post.ts'),
      'utf8',
    )
    expect(manage).toContain("action === 'soft_delete'")
    expect(manage).toContain("rpc('soft_delete_user'")
    expect(manage).not.toContain('buildAccountSelfDeletedAuditInsert')
  })
})

describe('partial-failure semantics (documented, separate round-trips)', () => {
  it('documents that anonymization and audit are not one atomic DB transaction', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'server/api/customer/delete-account.post.ts'),
      'utf8',
    )
    expect(source).toMatch(/not one DB txn|separate Supabase round-trips/i)
    expect(source).toMatch(/auth_user_id cleared/)
  })
})
