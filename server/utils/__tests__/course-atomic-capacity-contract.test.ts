/**
 * Contract tests for the ported atomic capacity trigger (C-P1-01).
 * RLS write-lock assertions from the source worktree are intentionally
 * omitted: those policies collide with main P0-09 / #209.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const sql = readFileSync(resolve(root, 'migrations/20260916_course_atomic_capacity.sql'), 'utf8')

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('C-P1-01 — atomic seat claim SQL', () => {
  it('locks the course row FOR UPDATE then counts occupying registrations', () => {
    expect(sql).toContain('FOR UPDATE')
    expect(sql).toContain('enforce_course_registration_capacity')
    expect(sql).toContain('BEFORE INSERT OR UPDATE OF course_id, status, deleted_at')
    expect(sql).toContain("r.deleted_at IS NULL")
    expect(sql).toContain("r.status IS DISTINCT FROM 'cancelled'")
    expect(sql).toContain('course_capacity_exceeded')
    expect(sql).toContain("HINT = 'COURSE_FULL'")
  })

  it('sets search_path and revokes PUBLIC execute on the SECURITY DEFINER function', () => {
    expect(sql).toContain('SECURITY DEFINER')
    expect(sql).toContain('SET search_path = pg_catalog, public')
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.enforce_course_registration_capacity() FROM PUBLIC')
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.enforce_course_registration_capacity() FROM anon, authenticated')
  })

  it('documents that admin capacity override does not exist', () => {
    expect(sql).toContain('ADMIN CAPACITY OVERRIDE: DOES NOT EXIST')
  })

  it('does not re-grant anon SELECT on course_sessions', () => {
    expect(sql).not.toContain('GRANT SELECT ON TABLE public.course_sessions TO anon')
  })

  it('does not drop staff JWT write policies from P0-09', () => {
    expect(sql).not.toContain('DROP POLICY IF EXISTS "course_registrations_staff_insert"')
    expect(sql).not.toContain('prevent_client_course_registration_mutation')
  })
})

describe('enrollment flows map COURSE_FULL', () => {
  it('cash enrollment creates a confirmed registration and maps COURSE_FULL', () => {
    const src = read('server/api/courses/enroll-cash.post.ts')
    expect(src).toContain("status: 'confirmed'")
    expect(src).toContain('.from(\'course_registrations\')')
    expect(src).toContain('throwIfCourseCapacityExceeded')
  })

  it('admin enrollment keeps tenant-scoped course load and maps COURSE_FULL on insert', () => {
    const src = read('server/utils/admin-course-enroll.ts')
    expect(src).toContain('.eq(\'tenant_id\', opts.tenantId)')
    expect(src).toContain('throwIfCourseCapacityExceeded')
  })

  it('add-participant and enroll-user map COURSE_FULL', () => {
    expect(read('server/api/admin/courses/add-participant.post.ts')).toContain('throwIfCourseCapacityExceeded')
    expect(read('server/api/admin/courses/enroll-user.post.ts')).toContain('throwIfCourseCapacityExceeded')
  })

  it('SARI transfer restores the source row before mapping COURSE_FULL', () => {
    const src = read('server/api/sari/transfer-enrollment.post.ts')
    const restoreAt = src.indexOf('restoreTransferredSource')
    const throwAt = src.lastIndexOf('throwIfCourseCapacityExceeded(newRegError)')
    expect(restoreAt).toBeGreaterThan(0)
    expect(throwAt).toBeGreaterThan(restoreAt)
    expect(src).toContain('TRANSFER_SOURCE_RESTORE_FATAL')
  })

  it('restore maps COURSE_FULL so a full course cannot silently overbook', () => {
    expect(read('server/api/admin/courses/restore-participant.post.ts')).toContain('throwIfCourseCapacityExceeded')
    expect(read('server/api/admin/courses/restore-participant.post.ts')).toContain('deleted_at: null')
  })

  it('Wallee checkout defers registration until payment; credit path uses the atomic RPC', () => {
    const src = read('server/api/courses/enroll-wallee.post.ts')
    expect(src).toContain('/api/payments/process-public')
    expect(src).toContain('enrollCourseWithCredit')
    expect(src).toContain('throwIfCreditEnrollmentFailed')
    const insertCount = src.split(".from('course_registrations').insert").length - 1
    expect(insertCount).toBe(0)
  })

  it('webhook does not merge a capacity failure as a unique-violation', () => {
    const src = read('server/api/wallee/webhook.post.ts')
    expect(src).toContain('isCourseCapacityExceeded(insertError)')
    expect(src).toContain('fulfillCourseWalleePayment')
    expect(src).toContain('!isCourseCapacityExceeded(insertError) && (')
    expect(src).not.toContain('payment completed without seat')
  })
})
