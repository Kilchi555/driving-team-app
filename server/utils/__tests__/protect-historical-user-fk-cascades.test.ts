import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const MIGRATION = 'migrations/20261006_protect_historical_user_fk_cascades.sql'

function readMigration(): string {
  return readFileSync(resolve(process.cwd(), MIGRATION), 'utf8')
}

/** Extract the ADD CONSTRAINT block for a named FK. */
function constraintBlock(sql: string, constraintName: string): string {
  const marker = `ADD CONSTRAINT ${constraintName}`
  const start = sql.indexOf(marker)
  expect(start, `missing ${constraintName}`).toBeGreaterThanOrEqual(0)
  const end = sql.indexOf(';', start)
  expect(end).toBeGreaterThan(start)
  return sql.slice(start, end)
}

describe('PR#1 protect historical user FK cascades — migration contract', () => {
  const sql = readMigration()

  it('is scoped to FK hardening only (no deletion / auth wipe / lifecycle DDL)', () => {
    expect(sql).toMatch(/PR #1/i)
    expect(sql).toMatch(/historical/i)
    expect(sql.toLowerCase()).not.toMatch(/delete from\s+public\.users/)
    expect(sql.toLowerCase()).not.toMatch(/auth\.admin\.deleteuser/)
    expect(sql.toLowerCase()).not.toMatch(/update\s+public\.users\s+set/)
    expect(sql).not.toMatch(/DELETION_REQUESTED|ANONYMIZED|PURGED/)
    expect(sql.toLowerCase()).not.toMatch(/create policy|drop policy|alter policy/)
  })

  it('hardens appointments.user_id to ON DELETE SET NULL (already nullable)', () => {
    const block = constraintBlock(sql, 'appointments_user_id_fkey')
    expect(block).toContain('FOREIGN KEY (user_id)')
    expect(block).toContain('REFERENCES public.users(id)')
    expect(block).toMatch(/ON DELETE SET NULL/)
    expect(block).not.toMatch(/ON DELETE CASCADE/)
  })

  it('hardens appointments.staff_id to ON DELETE RESTRICT (NOT NULL — no nullability change)', () => {
    const block = constraintBlock(sql, 'appointments_staff_id_fkey')
    expect(block).toContain('FOREIGN KEY (staff_id)')
    expect(block).toContain('REFERENCES public.users(id)')
    expect(block).toMatch(/ON DELETE RESTRICT/)
    expect(block).not.toMatch(/ON DELETE CASCADE/)
    expect(sql).not.toMatch(/ALTER COLUMN staff_id DROP NOT NULL/)
  })

  it('reconciles audit_logs.user_id to ON DELETE SET NULL', () => {
    const block = constraintBlock(sql, 'audit_logs_user_id_fkey')
    expect(block).toContain('FOREIGN KEY (user_id)')
    expect(block).toMatch(/ON DELETE SET NULL/)
    expect(block).not.toMatch(/ON DELETE CASCADE/)
  })

  it('hardens student_credits.user_id to ON DELETE RESTRICT (ledger tombstone)', () => {
    const block = constraintBlock(sql, 'student_credits_user_id_fkey')
    expect(block).toContain('FOREIGN KEY (user_id)')
    expect(block).toMatch(/ON DELETE RESTRICT/)
    expect(block).not.toMatch(/ON DELETE CASCADE/)
  })

  it('hardens credit_transactions.user_id to ON DELETE RESTRICT (ledger tombstone)', () => {
    const block = constraintBlock(sql, 'credit_transactions_user_id_fkey')
    expect(block).toContain('FOREIGN KEY (user_id)')
    expect(block).toMatch(/ON DELETE RESTRICT/)
    expect(block).not.toMatch(/ON DELETE CASCADE/)
  })

  it('drops and recreates only the five confirmed dangerous historical FKs', () => {
    const drops = [...sql.matchAll(/DROP CONSTRAINT IF EXISTS (\w+)/g)].map((m) => m[1])
    expect(drops.sort()).toEqual([
      'appointments_staff_id_fkey',
      'appointments_user_id_fkey',
      'audit_logs_user_id_fkey',
      'credit_transactions_user_id_fkey',
      'student_credits_user_id_fkey',
    ].sort())
  })

  it('does not mutate operational / security credential cascades (MFA, passkeys, slots, etc.)', () => {
    expect(sql).not.toMatch(/webauthn_|mfa_|push_tokens|availability_slots|staff_working_hours/)
    expect(sql).not.toMatch(/account_switch_grants|impersonation_sessions|password_reset/)
  })
})

describe('PR#1 cascade-chain safety narrative (static)', () => {
  it('documents why appointments.user_id SET NULL breaks the appointment→children cascade chain', () => {
    const sql = readMigration()
    expect(sql).toMatch(/secondary CASCADE/i)
    expect(sql).toMatch(/notes/)
  })

  it('documents why appointments.staff_id uses RESTRICT instead of SET NULL', () => {
    const sql = readMigration()
    expect(sql).toMatch(/NOT NULL/)
    expect(sql).toMatch(/tombstone/i)
    expect(sql).not.toMatch(/ALTER COLUMN staff_id DROP NOT NULL/)
  })
})

/**
 * Destructive hard-delete footguns must not be wired into product code.
 * Quarantine/removal is a separate follow-up; this PR only asserts the scripts
 * remain standalone SQL (not applied by this migration).
 */
describe('PR#1 destructive script footgun review', () => {
  it('hard_delete_user scripts remain standalone and are not invoked by this migration', () => {
    const simple = readFileSync(resolve(process.cwd(), 'migrations/hard_delete_user_simple.sql'), 'utf8')
    const data = readFileSync(resolve(process.cwd(), 'migrations/hard_delete_user_data.sql'), 'utf8')
    expect(simple).toMatch(/DELETE FROM users/)
    expect(data).toMatch(/DELETE FROM/i)

    const hardening = readMigration()
    expect(hardening).not.toContain('hard_delete_user_simple')
    expect(hardening).not.toContain('hard_delete_user_data')
    expect(hardening.toLowerCase()).not.toMatch(/delete from\s+payments/)
    expect(hardening.toLowerCase()).not.toMatch(/delete from\s+appointments/)
  })
})
