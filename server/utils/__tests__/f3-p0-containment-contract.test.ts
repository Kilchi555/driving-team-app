import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8')

function executable(sql: string) {
  return sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
}

describe('F-3 P0 containment contract', () => {
  const validate = read('server/api/discounts/validate.post.ts')
  const lookup = read('server/api/vouchers/lookup.post.ts')
  const redeem = read('server/api/vouchers/redeem.post.ts')
  const publicCourses = read('server/api/courses/public.get.ts')
  const categoryPage = read('pages/courses/category/[category].vue')
  const reserveSlot = read('server/api/booking/reserve-slot.post.ts')
  const waitlist = read('server/api/courses/waitlist-signup.post.ts')
  const categoryWaitlist = read('server/api/courses/category-waitlist-signup.post.ts')
  const migration = read('migrations/20260908_f3_p0_containment.sql')
  const body = executable(migration)
  const availableSessions = read('server/api/courses/available-sessions.get.ts')
  const enrollmentModal = read('components/customer/CourseEnrollmentModal.vue')

  // ── TEST E: sari_session_id must never reach a browser payload ────────────
  it('TEST E: no public endpoint returns sari_session_id to the browser', () => {
    // /api/courses/public sanitises via the allowlist.
    expect(publicCourses).toContain('sanitizePublicCourseSessions')
    expect(publicCourses).not.toContain('sari_session_id')

    // /api/courses/available-sessions is unauthenticated and must not echo it.
    expect(availableSessions).not.toMatch(/sariSessionId\s*:/)
    expect(availableSessions).not.toMatch(/sariSessionId:\s*session\.sari_session_id/)

    // It still exposes the public reference the swap flow needs.
    expect(availableSessions).toContain('sessionId: session.id')
  })

  it('TEST E: the customer enrollment modal never handles internal SARI ids', () => {
    expect(enrollmentModal).not.toContain('sari_session_id')
    expect(enrollmentModal).not.toContain('sariSessionId')
    expect(enrollmentModal).not.toContain('sariSessionIds')
    expect(enrollmentModal).not.toContain('originalSariIds')

    // It uses public course_sessions.id references instead.
    expect(enrollmentModal).toContain('originalSessionIds')
    expect(enrollmentModal).toContain('sessionIds')
  })

  it('SARI swaps are resolved server-side by value in every consumer', () => {
    for (const rel of [
      'server/api/courses/enroll-cash.post.ts',
      'server/api/courses/enroll-wallee.post.ts',
      'server/api/wallee/webhook.post.ts',
    ]) {
      const src = read(rel)
      expect(src, rel).toContain('applySariSessionSwaps')
      expect(src, rel).toContain('loadSariSessionMap')
      // The triplicated inline positional heuristic is gone.
      expect(src, rel).not.toContain('Using legacy position-based replacement')
      expect(src, rel).not.toContain('Assume VKU pattern')
    }
  })

  it('the swap resolver is tenant-scoped', () => {
    const util = read('server/utils/sari-custom-sessions.ts')
    expect(util).toContain(".eq('tenant_id', tenantId)")
    // Originals are located by value, never by index.
    expect(util).toContain('findIndex(id => id === from)')
  })

  it('voucher validation is rate limited before any code lookup', () => {
    expect(validate).toContain('checkRateLimit')
    expect(validate).toContain("'discount_validate'")
    expect(validate).toContain('statusCode: 429')

    // The budget must be checked before the first code lookup, otherwise the
    // endpoint stays an unlimited promo/gift-card oracle.
    const rateLimitAt = validate.indexOf('checkRateLimit(')
    const firstLookupAt = validate.indexOf(".from('voucher_codes')")
    expect(rateLimitAt).toBeGreaterThan(-1)
    expect(firstLookupAt).toBeGreaterThan(-1)
    expect(rateLimitAt).toBeLessThan(firstLookupAt)

    // Generic message — must not reveal whether the code exists.
    expect(validate).toContain('Zu viele Anfragen. Bitte versuchen Sie es in einer Minute erneut.')
  })

  it('voucher validation stays on the admin client and does not select *', () => {
    expect(validate).toContain('getSupabaseAdmin()')
    expect(validate).toContain('toPublicDiscountPayload')
    expect(validate).not.toMatch(/\.select\('\*'\)/)
    expect(validate).toContain("error: 'Gutschein ist nicht gültig'")
    expect(validate).toContain("error: 'Dieser Gutschein wurde bereits eingelöst'")
    expect(validate).toContain("error: 'Dieser Gutschein ist abgelaufen'")
    expect(validate).toContain("error: 'Gutscheincode nicht gefunden'")
  })

  it('lookup and redeem stay on server-side admin, not the Data API', () => {
    expect(lookup).toContain('getSupabaseAdmin()')
    expect(redeem).toContain('getSupabaseAdmin()')
    expect(lookup).not.toContain("select('*')")
  })

  it('public course API no longer exposes sari_session_id', () => {
    expect(publicCourses).toContain('getSupabaseAdmin()')
    expect(publicCourses).not.toContain('sari_session_id')
    expect(publicCourses).toContain('sanitizePublicCourseSessions')
  })

  it('legacy category page uses the public course API instead of PostgREST', () => {
    expect(categoryPage).toContain("/api/courses/public")
    expect(categoryPage).not.toContain(".from('course_sessions')")
    expect(categoryPage).not.toContain(".from('courses')")
    expect(categoryPage).not.toContain(".from('course_categories')")
  })

  it('reserve-slot claims atomically through the admin client', () => {
    expect(reserveSlot).toContain('getSupabaseAdmin()')
    expect(reserveSlot).toContain('claimAvailabilitySlot')
    expect(reserveSlot).toContain('if (!claimed)')
    expect(reserveSlot).toContain('statusCode: 409')
  })

  it('public waitlist signup stays on service_role and is rate-limited', () => {
    expect(waitlist).toContain('getSupabaseAdmin()')
    expect(waitlist).toContain('checkRateLimit')
    expect(categoryWaitlist).toContain('getSupabaseAdmin()')
    expect(categoryWaitlist).toContain('checkRateLimit')
  })

  it('migration closes the four F-3 holes without touching default privileges or slot SELECT', () => {
    expect(body).toContain('DROP POLICY IF EXISTS "Anon can lookup active vouchers"')
    expect(body).toContain('DROP POLICY IF EXISTS "Anon can lookup active voucher codes"')
    expect(body).toContain('DROP POLICY IF EXISTS course_sessions_public_read')
    expect(body).toContain('DROP POLICY IF EXISTS update_available_slots')
    expect(body).toContain('DROP POLICY IF EXISTS release_own_reservation')
    expect(body).toContain('DROP POLICY IF EXISTS course_waitlist_public_insert')
    expect(body).toContain('REVOKE ALL ON TABLE public.vouchers FROM anon')
    expect(body).toContain('REVOKE ALL ON TABLE public.voucher_codes FROM anon')
    expect(body).toContain('REVOKE ALL ON TABLE public.course_sessions FROM anon')
    expect(body).toContain('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.availability_slots FROM anon')
    expect(body).toContain('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.course_waitlist FROM anon')
    expect(body).not.toMatch(/ALTER DEFAULT PRIVILEGES/i)
    expect(body).not.toContain('REVOKE SELECT ON TABLE public.availability_slots FROM anon')
    expect(body).not.toContain('DROP POLICY IF EXISTS select_available_slots_for_listing')
    expect(migration).toContain('select_available_slots_for_listing')
  })

  it('does not put public booking back on the Data API', () => {
    const getSlots = read('server/api/booking/get-available-slots.get.ts')
    const guestBook = read('server/api/booking/guest-book.post.ts')
    const createAppointment = read('server/api/booking/create-appointment.post.ts')
    expect(getSlots).toContain('getSupabaseAdmin()')
    expect(guestBook).toContain('getSupabaseAdmin()')
    expect(createAppointment).toContain('getSupabaseAdmin()')
    expect(reserveSlot).toContain('getSupabaseAdmin()')
  })
})
