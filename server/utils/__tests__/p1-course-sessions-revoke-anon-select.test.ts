/**
 * P1 course_sessions: revoke anonymous table SELECT.
 * LIMITATION: no live JWT/privilege database in CI. This asserts the
 * migration SQL. Production still requires applying the REVOKE.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { policiesForTable } from '../rls-policy-parser'

const sql = readFileSync(
  resolve(process.cwd(), 'migrations/20260913_p1_course_sessions_revoke_anon_select.sql'),
  'utf8',
)
const executable = sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ')
const policies = policiesForTable(sql, 'course_sessions')

describe('P1 course_sessions revoke anon SELECT', () => {
  it('targets public.course_sessions and revokes SELECT from anon only', () => {
    expect(executable).toMatch(/REVOKE\s+SELECT\s+ON\s+TABLE\s+public\.course_sessions\s+FROM\s+anon\s*;/i)
    expect(executable).not.toMatch(/REVOKE[\s\S]*FROM\s+authenticated/i)
    expect(executable).not.toMatch(/REVOKE[\s\S]*FROM\s+service_role/i)
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
    expect(executable).not.toMatch(/CREATE\s+TABLE/i)
    expect(executable).not.toMatch(/DROP\s+TABLE/i)
    expect(executable).not.toMatch(/ADD\s+COLUMN/i)
    expect(executable).not.toMatch(/DROP\s+COLUMN/i)
  })
})
