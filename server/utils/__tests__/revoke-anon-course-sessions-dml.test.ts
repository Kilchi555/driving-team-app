/**
 * course_sessions: revoke anonymous INSERT, UPDATE, DELETE, TRUNCATE.
 * LIMITATION: no live privilege catalog in CI. This asserts the migration SQL.
 * Production still requires applying the REVOKE.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { policiesForTable } from '../rls-policy-parser'

const sql = readFileSync(
  resolve(process.cwd(), 'migrations/20260924_revoke_anon_course_sessions_dml.sql'),
  'utf8',
)
const executable = sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ')
const policies = policiesForTable(sql, 'course_sessions')

describe('course_sessions revoke anon DML', () => {
  it('revokes INSERT, UPDATE, DELETE and TRUNCATE from anon only', () => {
    expect(executable).toMatch(
      /REVOKE\s+INSERT\s*,\s*UPDATE\s*,\s*DELETE\s*,\s*TRUNCATE\s+ON\s+TABLE\s+public\.course_sessions\s+FROM\s+anon\s*;/i,
    )
    expect(executable).not.toMatch(/REVOKE\s+SELECT/i)
    expect(executable).not.toMatch(/REVOKE\s+ALL/i)
    expect(executable).not.toMatch(/FROM\s+authenticated/i)
    expect(executable).not.toMatch(/FROM\s+service_role/i)
    expect(executable).not.toMatch(/TO\s+authenticated/i)
    expect(executable).not.toMatch(/TO\s+service_role/i)
    expect(executable).not.toMatch(/GRANT\s+/i)
  })

  it('does not alter RLS, policies, or schema', () => {
    expect(policies).toHaveLength(0)
    expect(executable).not.toMatch(/CREATE\s+POLICY/i)
    expect(executable).not.toMatch(/DROP\s+POLICY/i)
    expect(executable).not.toMatch(/ALTER\s+POLICY/i)
    expect(executable).not.toMatch(/ALTER\s+TABLE/i)
    expect(executable).not.toMatch(/ENABLE\s+ROW\s+LEVEL\s+SECURITY/i)
    expect(executable).not.toMatch(/DISABLE\s+ROW\s+LEVEL\s+SECURITY/i)
  })
})
