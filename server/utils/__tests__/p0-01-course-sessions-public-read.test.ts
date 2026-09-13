/**
 * P0-01 course_sessions anonymous SELECT containment.
 * LIMITATION: no live JWT/RLS database in CI. This asserts the migration SQL.
 * Production still requires applying the SQL.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { policiesForTable } from '../rls-policy-parser'

const sql = readFileSync(
  resolve(process.cwd(), 'migrations/20260913_p0_course_sessions_public_read.sql'),
  'utf8',
)
const policies = policiesForTable(sql, 'course_sessions')
const publicRead = policies.find((policy) => policy.name === 'course_sessions_public_read')

describe('P0-01 course_sessions public SELECT', () => {
  it('replaces only course_sessions_public_read', () => {
    expect(sql).toContain('DROP POLICY IF EXISTS "course_sessions_public_read"')
    expect(sql).toContain('ON public.course_sessions')
    expect(policies).toHaveLength(1)
    expect(publicRead).toBeDefined()
  })

  it('is SELECT to public with an EXISTS is_public parent-course predicate', () => {
    expect(publicRead?.command).toBe('SELECT')
    expect(publicRead?.roles).toEqual(['public'])
    expect(publicRead?.using).toContain('EXISTS')
    expect(publicRead?.using).toContain('public.courses')
    expect(publicRead?.using).toContain('course_sessions.course_id')
    expect(publicRead?.using).toContain('c.is_public = true')
    expect(publicRead?.withCheck).toBeNull()
  })

  it('does not restore USING (true) for this policy', () => {
    const executable = sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ')
    expect(publicRead?.using).not.toMatch(/^\s*true\s*$/i)
    expect(executable).not.toMatch(/USING\s*\(\s*true\s*\)/i)
  })
})
