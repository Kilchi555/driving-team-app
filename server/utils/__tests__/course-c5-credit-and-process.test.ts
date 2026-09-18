/**
 * C5 / C4-01 / C4-02.
 *
 * These tests are contract, helper-behavioral, and in-memory routing checks.
 * They do NOT prove PostgreSQL transaction atomicity, FOR UPDATE locking,
 * or concurrent wallet deduction. Live SQL is gated on COURSE_ISOLATED_DB_URL
 * (never Production) and is not run in the default suite.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  decideProcessPostCourseCapture,
  paymentHasCourseId,
  isSuccessfulCourseFulfillment,
  ensureGuestUserForCoursePayment,
} from '../fulfill-course-wallee-payment'
import {
  enrollCourseWithCredit,
  isSuccessfulCreditEnrollment,
  throwIfCreditEnrollmentFailed,
} from '../enroll-course-with-credit'
import { capturedAmountChfFromWalleeTx } from '../wallee-remaining-amount'

const root = process.cwd()
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

const creditSql = read('migrations/20260917_enroll_course_with_credit.sql')
const processSrc = read('server/api/payments/process.post.ts')
const enrollSrc = read('server/api/courses/enroll-wallee.post.ts')

describe('C4-01 atomic credit enrollment SQL (contract — not a live TX test)', () => {
  it('1-5. seat, wallet, giftcard, discount, and ledger share one function / one exception block', () => {
    const insertAt = creditSql.indexOf('INSERT INTO public.course_registrations')
    const deductAt = creditSql.indexOf('public.deduct_student_credit')
    const giftAt = creditSql.indexOf('public.consume_gift_card_for_payment')
    const ledgerAt = creditSql.indexOf('INSERT INTO public.credit_transactions')
    const discAt = creditSql.indexOf('public.increment_discount_usage')
    expect(insertAt).toBeGreaterThan(0)
    expect(deductAt).toBeGreaterThan(insertAt)
    expect(giftAt).toBeGreaterThan(deductAt)
    expect(discAt).toBeGreaterThan(giftAt)
    expect(ledgerAt).toBeGreaterThan(discAt)
    expect(creditSql).toContain('EXCEPTION')
    expect(creditSql).not.toMatch(/[^a-z]increment_balance\s*\(/)
    expect(creditSql).not.toContain('CREATE OR REPLACE FUNCTION public.deduct_student_credit')
    expect(creditSql).not.toContain('CREATE OR REPLACE FUNCTION public.consume_gift_card_for_payment')
  })

  it('capacity trigger is not replaced; course row is locked FOR UPDATE', () => {
    expect(creditSql).toContain('FOR UPDATE')
    expect(creditSql).toContain('course_capacity_exceeded')
    expect(creditSql).not.toContain('DROP TRIGGER')
    expect(creditSql).not.toContain('DROP FUNCTION IF EXISTS public.enforce_course_registration_capacity')
  })

  it('6-8. idempotency: same credit user is already_enrolled; other identity is payment_conflict; cancelled is not treated as fulfilled', () => {
    expect(creditSql).toContain("'already_enrolled'")
    expect(creditSql).toContain("'payment_conflict'")
    expect(creditSql).toContain("r.status IS DISTINCT FROM 'cancelled'")
    expect(creditSql).toContain("r.deleted_at IS NULL")
    expect(creditSql).toContain("v_exist.payment_method = 'credit'")
    expect(creditSql).toContain('v_exist.user_id = p_user_id')
  })

  it('security: SECURITY DEFINER, search_path, revoke anon/authenticated', () => {
    expect(creditSql).toContain('SECURITY DEFINER')
    expect(creditSql).toContain('SET search_path = pg_catalog, public')
    expect(creditSql).toContain('REVOKE ALL ON FUNCTION public.enroll_course_with_credit(uuid, uuid, uuid, integer, jsonb) FROM PUBLIC')
    expect(creditSql).toContain('REVOKE ALL ON FUNCTION public.enroll_course_with_credit(uuid, uuid, uuid, integer, jsonb) FROM anon, authenticated')
    expect(creditSql).toContain('GRANT EXECUTE ON FUNCTION public.enroll_course_with_credit(uuid, uuid, uuid, integer, jsonb) TO postgres, service_role')
  })

  it('rejects non-positive and oversized amounts before mutation', () => {
    expect(creditSql).toContain('p_amount_rappen <= 0 OR p_amount_rappen > 100000000')
    expect(creditSql).toContain('v_payload_user IS DISTINCT FROM p_user_id')
    expect(creditSql).toContain('v_course.tenant_id IS DISTINCT FROM p_tenant_id')
  })

  it('giftcard/discount failure raises inside the mutation block (rolls back prior INSERT/deduct)', () => {
    expect(creditSql).toContain("RAISE EXCEPTION 'giftcard_unavailable'")
    expect(creditSql).toContain("RAISE EXCEPTION 'discount_unavailable'")
    expect(creditSql).toContain("SQLERRM LIKE '%insufficient_available_credit%'")
  })

  it('does not persist discount_code onto course_registrations; JSON handling stays for giftcard/voucher', () => {
    const insertStart = creditSql.indexOf('INSERT INTO public.course_registrations')
    const insertEnd = creditSql.indexOf('RETURNING id INTO v_reg_id', insertStart)
    const insertSql = creditSql.slice(insertStart, insertEnd)
    const colsMatch = insertSql.match(/INSERT INTO public\.course_registrations\s*\(([\s\S]*?)\)\s*VALUES/)
    expect(colsMatch).not.toBeNull()
    const cols = (colsMatch?.[1] ?? '').split(',').map(s => s.trim()).filter(Boolean)
    expect(cols).toContain('discount_applied_rappen')
    expect(cols).not.toContain('discount_code')
    expect(insertSql).not.toMatch(/\bv_discount_code\b/)

    expect(creditSql).toContain("p_registration->>'discount_code'")
    expect(creditSql).toContain("p_registration->>'discount_applied_rappen'")
    expect(creditSql).toContain('v_discount_code')
    expect(creditSql).toContain('public.consume_gift_card_for_payment')
    expect(creditSql).toContain('public.increment_discount_usage')
    expect(creditSql).toContain('public.increment_voucher_code_redemption')
    expect(creditSql).not.toMatch(/ALTER TABLE[\s\S]{0,80}course_registrations[\s\S]{0,80}discount_code/)
  })

  it('credit INSERT matches fulfill on discount_applied_rappen and omits discount_code like fulfill', () => {
    const fulfillSql = read('migrations/20260916_fulfill_course_wallee_payment.sql')
    const fulfillStart = fulfillSql.indexOf('INSERT INTO public.course_registrations')
    const fulfillInsert = fulfillSql.slice(
      fulfillStart,
      fulfillSql.indexOf('RETURNING id INTO v_reg_id', fulfillStart),
    )
    const fulfillCols = (fulfillInsert.match(/INSERT INTO public\.course_registrations\s*\(([\s\S]*?)\)\s*VALUES/)?.[1] ?? '')
      .split(',').map(s => s.trim()).filter(Boolean)
    expect(fulfillCols).toContain('discount_applied_rappen')
    expect(fulfillCols).not.toContain('discount_code')
  })
})

describe('C4-01 caller (contract)', () => {
  it('enroll-wallee credit path only calls the RPC; SARI stays after the DB result', () => {
    expect(enrollSrc).toContain('enrollCourseWithCredit')
    expect(enrollSrc).toContain('throwIfCreditEnrollmentFailed')
    expect(enrollSrc.indexOf('enrollCourseWithCredit')).toBeLessThan(enrollSrc.indexOf('sari.enrollStudent'))
    expect(enrollSrc).not.toContain('rollbackCreditSeat')
  })

  it('helper treats enrolled and already_enrolled as success; invalid args fail closed', async () => {
    expect(isSuccessfulCreditEnrollment('enrolled')).toBe(true)
    expect(isSuccessfulCreditEnrollment('already_enrolled')).toBe(true)
    expect(isSuccessfulCreditEnrollment('insufficient_credit')).toBe(false)
    const invalid = await enrollCourseWithCredit({
      supabase: { rpc: async () => ({ data: null, error: null }) },
      userId: '',
      tenantId: 't',
      courseId: 'c',
      amountRappen: 100,
      registration: { course_id: 'c', tenant_id: 't', user_id: '' },
    })
    expect(invalid.status).toBe('invalid_args')
  })

  it('throwIfCreditEnrollmentFailed maps capacity and giftcard to 409, insufficient to 400', () => {
    expect(() => throwIfCreditEnrollmentFailed({ status: 'enrolled' })).not.toThrow()
    expect(() => throwIfCreditEnrollmentFailed({ status: 'already_enrolled' })).not.toThrow()
    try {
      throwIfCreditEnrollmentFailed({ status: 'capacity_exceeded' })
      throw new Error('expected throw')
    } catch (e: unknown) {
      expect(e).toMatchObject({ statusCode: 409 })
    }
    try {
      throwIfCreditEnrollmentFailed({ status: 'insufficient_credit' })
      throw new Error('expected throw')
    } catch (e: unknown) {
      expect(e).toMatchObject({ statusCode: 400 })
    }
    try {
      throwIfCreditEnrollmentFailed({ status: 'giftcard_unavailable' })
      throw new Error('expected throw')
    } catch (e: unknown) {
      expect(e).toMatchObject({ statusCode: 409 })
    }
  })
})

describe('C4-01 concurrency (not live Postgres)', () => {
  it('9-11. default suite cannot prove last-seat or wallet FOR UPDATE; document the SQL serialization points', () => {
    expect(creditSql).toContain('FROM public.courses')
    expect(creditSql).toContain('FOR UPDATE')
    expect(creditSql).toContain('public.deduct_student_credit')
    expect(process.env.COURSE_ISOLATED_DB_URL || '').not.toMatch(/prod/i)
  })
})

describe('C4-02 payments/process course capture routing (behavioral + contract)', () => {
  const coursePayment = {
    metadata: { course_id: 'c1' },
    total_amount_rappen: 10000,
    credit_used_rappen: 2000,
  }
  const appointment = {
    metadata: { appointment_id: 'a1' },
    total_amount_rappen: 10000,
    credit_used_rappen: 0,
  }

  it('12. course + already FULFILL must not use the generic complete shortcut', () => {
    const completedAt = processSrc.indexOf('COMPLETED_STATES.includes(existingTx.state)')
    const fulfillAt = processSrc.indexOf('fulfillOrThrowExistingCourseWalleeCapture', completedAt)
    const genericAt = processSrc.indexOf('completeCapturedWalleePayment', completedAt)
    expect(completedAt).toBeGreaterThan(0)
    expect(fulfillAt).toBeGreaterThan(completedAt)
    expect(genericAt).toBeGreaterThan(fulfillAt)
    expect(processSrc).toContain('tryFulfillCourseFromCapturedWalleeTx')
    expect(processSrc).toContain('fulfillOrThrowExistingCourseWalleeCapture')
  })

  it('13. matching remaining capture is fulfill', () => {
    expect(decideProcessPostCourseCapture(coursePayment, 80)).toBe('fulfill')
    expect(capturedAmountChfFromWalleeTx({ completedAmount: 80 })).toBe(80)
  })

  it('14. capture mismatch is not completion', () => {
    expect(decideProcessPostCourseCapture(coursePayment, 100)).toBe('amount_mismatch')
    expect(decideProcessPostCourseCapture(coursePayment, 60)).toBe('amount_mismatch')
  })

  it('15. missing/NaN capture is not a completion shortcut', () => {
    expect(decideProcessPostCourseCapture(coursePayment, Number.NaN)).toBe('invalid_capture')
    expect(decideProcessPostCourseCapture(coursePayment, Number('nope'))).toBe('invalid_capture')
  })

  it('16. non-course payments stay on the generic path', () => {
    expect(paymentHasCourseId(appointment)).toBe(false)
    expect(decideProcessPostCourseCapture(appointment, 100)).toBe('not_course')
    expect(decideProcessPostCourseCapture(appointment, Number.NaN)).toBe('not_course')
  })

  it('course wallet shortcut in LAYER 9 cannot mark a course payment completed', () => {
    expect(processSrc).toContain("if (paymentHasCourseId(payment))")
    expect(processSrc).toContain('Kurszahlungen können hier nicht über Guthaben abgeschlossen werden')
    const layer9 = processSrc.indexOf('LAYER 9')
    const courseGuard = processSrc.indexOf('paymentHasCourseId(payment)', layer9)
    const completeAssign = processSrc.indexOf("payment_status: 'completed'", layer9)
    expect(courseGuard).toBeGreaterThan(layer9)
    expect(courseGuard).toBeLessThan(completeAssign)
  })

  it('successful course fulfillment statuses still include already_fulfilled', () => {
    expect(isSuccessfulCourseFulfillment('fulfilled')).toBe(true)
    expect(isSuccessfulCourseFulfillment('already_fulfilled')).toBe(true)
    expect(isSuccessfulCourseFulfillment('amount_mismatch')).toBe(false)
  })
})

describe('C5 regression contracts', () => {
  it('17. #219 top-up completion path is unchanged for non-course payments', () => {
    expect(processSrc).toContain('completeCapturedWalleePayment')
    expect(creditSql).toContain('Does NOT touch apply_wallee_topup_deposit')
    expect(creditSql).not.toContain('CREATE OR REPLACE FUNCTION public.apply_wallee_topup_deposit')
    expect(read('migrations/20260916_fulfill_course_wallee_payment.sql')).toContain('Does not touch apply_wallee_topup_deposit')
  })

  it('18. #224 remaining still uses total minus credit_used', () => {
    expect(processSrc).toContain('tryFulfillCourseFromCapturedWalleeTx')
    const remaining = read('server/utils/wallee-remaining-amount.ts')
    const fulfill = read('server/utils/fulfill-course-wallee-payment.ts')
    expect(remaining).toContain('remainingDueRappen')
    expect(remaining).toContain('credit_used_rappen')
    expect(fulfill).toContain('capturedAmountChfFromWalleeTx')
    expect(fulfill).toContain('decideProcessPostCourseCapture')
  })

  it('19. capacity trigger migration is untouched by C5', () => {
    expect(read('migrations/20260916_course_atomic_capacity.sql')).toContain('enforce_course_registration_capacity')
    expect(creditSql).not.toContain('CREATE OR REPLACE FUNCTION public.enforce_course_registration_capacity')
  })

  it('20. tenant isolation: payload user/course/tenant cannot override locked args', () => {
    expect(creditSql).toContain('v_payload_course IS DISTINCT FROM p_course_id')
    expect(creditSql).toContain('v_payload_tenant IS DISTINCT FROM p_tenant_id')
    expect(creditSql).toContain('v_payload_user IS DISTINCT FROM p_user_id')
  })
})

describe('Identity: contact match is discovery, not authorization', () => {
  it('enroll-wallee credits only a same-tenant session principal', () => {
    expect(enrollSrc).toContain('getAuthenticatedUserWithDbId')
    expect(enrollSrc).toContain('sessionPrincipalId')
    expect(enrollSrc).toContain('userId: sessionPrincipalId')
    expect(enrollSrc).not.toContain('guestUserId = existingUser.id')
    expect(enrollSrc).not.toMatch(/\.\.\.\(guestUserId \? \{ userId: guestUserId \}/)
    expect(enrollSrc).toContain("getHeader(event, 'cookie')")
    expect(enrollSrc).toContain("getHeader(event, 'authorization')")
    expect(enrollSrc).toContain('findStaffOrAdminByEmail')
    expect(enrollSrc).toContain('findStaffOrAdminByPhone')
  })

  it('enroll-cash does not attach an existing customer from contact match', () => {
    const cash = read('server/api/courses/enroll-cash.post.ts')
    expect(cash).toContain('getAuthenticatedUserWithDbId')
    expect(cash).not.toContain('guestUserId = existingUser.id')
    expect(cash).toContain('discovery only; not attaching')
    expect(cash).toContain("userError?.code === '23505'")
    expect(cash).toContain('findStaffOrAdminByEmail')
    expect(cash).toContain('resolveNonWalleeEnrollmentMethod')
  })

  it('process-public public path ignores body userId; enrollmentId path keeps it', () => {
    const pay = read('server/api/payments/process-public.post.ts')
    expect(pay).toContain('getAuthenticatedUserWithDbId')
    expect(pay).toContain('body userId is untrusted')
    const resolveAt = pay.indexOf('let actualUserId')
    const enrollmentBranch = pay.slice(resolveAt, pay.indexOf('} else {', resolveAt))
    const publicBranch = pay.slice(pay.indexOf('} else {', resolveAt), pay.indexOf('const paymentInsertData', resolveAt))
    expect(enrollmentBranch).toContain('actualUserId = passedUserId')
    expect(publicBranch).toContain('getAuthenticatedUserWithDbId')
    expect(publicBranch).not.toContain('passedUserId')
  })

  it('fulfill and webhook do not convert contact/unique collision into account attach', () => {
    const fulfill = read('server/utils/fulfill-course-wallee-payment.ts')
    const hook = read('server/api/wallee/webhook.post.ts')
    expect(fulfill).not.toContain('if (existingUser) return existingUser.id')
    expect(fulfill).not.toContain('if (fallbackUser) return fallbackUser.id')
    expect(fulfill).toContain('fulfilling without account attach')
    expect(hook).toContain('ensureGuestUserForCoursePayment')
    expect(hook).not.toContain('findExistingUserByContact')
  })
})

describe('ensureGuestUserForCoursePayment identity', () => {
  const TENANT = 'tenant-a'
  const VICTIM = 'victim-user'
  const SESSION = 'session-user'

  function usersClient(opts: {
    owned?: { id: string, tenant_id: string } | null
    contact?: { id: string, role: string } | null
    insert?: { data: { id: string } | null, error: { code?: string, message?: string } | null }
    onInsert?: () => void
  }) {
    return {
      from(table: string) {
        const state: { byId?: string, byEmail?: boolean, byPhone?: boolean, inserting?: boolean } = {}
        interface UsersQueryMock {
          select: () => UsersQueryMock
          eq: (col: string, val: string) => UsersQueryMock
          ilike: () => UsersQueryMock
          in: (col: string) => UsersQueryMock
          limit: () => UsersQueryMock
          maybeSingle: () => Promise<{
            data: { id: string, tenant_id?: string, role?: string } | null
            error: null
          }>
          insert: () => UsersQueryMock
          single: () => Promise<{
            data: { id: string } | null
            error: { code?: string, message?: string } | null
          }>
        }
        const q: UsersQueryMock = {
          select() { return q },
          eq(col: string, val: string) {
            if (col === 'id') state.byId = val
            return q
          },
          ilike() { state.byEmail = true; return q },
          in(col: string) { if (col === 'phone') state.byPhone = true; return q },
          limit() { return q },
          maybeSingle: async () => {
            if (state.byId) return { data: opts.owned ?? null, error: null }
            if (state.byEmail || state.byPhone) return { data: opts.contact ?? null, error: null }
            return { data: null, error: null }
          },
          insert() {
            state.inserting = true
            opts.onInsert?.()
            return q
          },
          single: async () => opts.insert ?? { data: { id: 'new-guest' }, error: null },
        }
        expect(table).toBe('users')
        return q
      },
    }
  }

  it('Attack 1/2: contact match does not return the existing users.id', async () => {
    let inserted = false
    const id = await ensureGuestUserForCoursePayment(
      usersClient({
        contact: { id: VICTIM, role: 'student' },
        onInsert: () => { inserted = true },
      }),
      { id: 'pay-1', tenant_id: TENANT, metadata: { email: 'victim@example.com', phone: '+41790000000' } },
      TENANT,
    )
    expect(id).toBeUndefined()
    expect(inserted).toBe(false)
  })

  it('Attack 3: trusted payment.user_id is used only when tenant matches', async () => {
    const ok = await ensureGuestUserForCoursePayment(
      usersClient({ owned: { id: SESSION, tenant_id: TENANT } }),
      { id: 'pay-2', user_id: SESSION, tenant_id: TENANT, metadata: { email: 'b@example.com' } },
      TENANT,
    )
    expect(ok).toBe(SESSION)

    const cross = await ensureGuestUserForCoursePayment(
      usersClient({
        owned: { id: SESSION, tenant_id: 'other-tenant' },
        contact: { id: VICTIM, role: 'student' },
      }),
      { id: 'pay-3', user_id: SESSION, tenant_id: TENANT, metadata: { email: 'victim@example.com' } },
      TENANT,
    )
    expect(cross).toBeUndefined()
  })

  it('unused contact still creates a new guest user', async () => {
    const id = await ensureGuestUserForCoursePayment(
      usersClient({
        contact: null,
        insert: { data: { id: 'new-guest' }, error: null },
      }),
      { id: 'pay-4', tenant_id: TENANT, metadata: { email: 'new@example.com', firstname: 'New' } },
      TENANT,
    )
    expect(id).toBe('new-guest')
  })

  it('unique collision does not fallback-attach the existing user', async () => {
    const id = await ensureGuestUserForCoursePayment(
      usersClient({
        contact: null,
        insert: { data: null, error: { code: '23505', message: 'duplicate key' } },
      }),
      { id: 'pay-5', tenant_id: TENANT, metadata: { email: 'victim@example.com' } },
      TENANT,
    )
    expect(id).toBeUndefined()
  })
})
