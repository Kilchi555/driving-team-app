import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createError } from 'h3'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  requireTenantStaff: vi.fn(),
  requireStaffOrInternal: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  sendEmail: vi.fn(async () => ({ id: 'msg_test' })),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
  }
})

vi.mock('~/server/utils/require-tenant-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/server/utils/require-tenant-auth')>()
  return {
    ...actual,
    requireTenantStaff: mocks.requireTenantStaff,
  }
})

vi.mock('~/server/utils/require-staff-or-internal', () => ({
  requireStaffOrInternal: mocks.requireStaffOrInternal,
  internalSecretHeaders: () => ({ 'x-internal-secret': 'test-secret' }),
}))

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/server/utils/email', () => ({
  sendEmail: mocks.sendEmail,
}))

vi.mock('~/server/utils/tenant-terminology', () => ({
  getTenantTerminology: vi.fn(async () => ({ appointment: 'Termin', businessNoun: 'Fahrschule' })),
}))

vi.mock('~/server/utils/branded-email', () => ({
  buildBrandedEmailShell: () => '<html></html>',
  displayName: (name: string) => name,
  emailAppointmentAppStoreBlock: () => '',
  emailDetailBox: () => '',
  emailDetailRow: () => '',
  emailSignature: () => '',
  emailStatusBox: () => '',
  escapeHtml: (value: string) => value,
}))

vi.mock('~/server/utils/email-templates', () => ({
  generateAdminEnrollmentNotificationEmail: () => ({ subject: 'admin', html: '<p></p>' }),
}))

vi.mock('~/server/utils/customer-account-activation', () => ({
  allowsCustomerAccountActivation: () => false,
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

type EventHandler = (event: object) => Promise<unknown>

const staffActor = {
  id: 'staff-a',
  tenant_id: 'tenant-a',
  role: 'staff',
  email: 'staff@example.com',
  auth_user_id: 'auth-staff-a',
}

function thenable(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  builder.select = vi.fn(chain)
  builder.eq = vi.fn(chain)
  builder.maybeSingle = vi.fn(async () => result)
  builder.single = vi.fn(async () => result)
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return builder as { eq: ReturnType<typeof vi.fn>; single: ReturnType<typeof vi.fn> }
}

const inviteSrc = readFileSync(resolve(process.cwd(), 'server/api/send-invite-email.post.ts'), 'utf8')
const enrollSrc = readFileSync(
  resolve(process.cwd(), 'server/api/emails/send-course-enrollment-confirmation.post.ts'),
  'utf8',
)

describe('P0-05 email source contract', () => {
  it('authenticates invite sending before reading the body', () => {
    const handlerStart = inviteSrc.indexOf('export default defineEventHandler')
    expect(inviteSrc.indexOf('requireTenantStaff(event)', handlerStart)).toBeGreaterThan(handlerStart)
    expect(inviteSrc.indexOf('readBody', handlerStart)).toBeGreaterThan(
      inviteSrc.indexOf('requireTenantStaff(event)', handlerStart),
    )
    expect(inviteSrc).toContain("eq('tenant_id', actor.tenant_id)")
  })

  it('requires staff or internal secret for enrollment confirmation and ignores testEmail', () => {
    expect(enrollSrc).toContain('requireStaffOrInternal(event)')
    expect(enrollSrc).not.toContain('testEmail')
    expect(enrollSrc).toContain('to: enrollment.email')
  })

  it('forwards the internal secret from trusted enrollment callers', () => {
    const callers = [
      'server/api/courses/enroll-cash.post.ts',
      'server/api/courses/enroll/post.ts',
      'server/api/wallee/webhook.post.ts',
      'server/api/admin/courses/enroll-user.post.ts',
      'server/api/admin/courses/add-participant.post.ts',
      'server/utils/admin-course-enroll.ts',
    ]
    for (const file of callers) {
      const src = readFileSync(resolve(process.cwd(), file), 'utf8')
      expect(src).toContain('internalSecretHeaders()')
      expect(src).toContain('/api/emails/send-course-enrollment-confirmation')
    }
  })
})

describe('P0-05 send-invite-email', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.readBody.mockReset()
    mocks.requireTenantStaff.mockReset()
    mocks.getSupabaseAdmin.mockReset()
    mocks.sendEmail.mockClear()
  })

  async function handler(): Promise<EventHandler> {
    return (await import('../../api/send-invite-email.post')).default as EventHandler
  }

  it('returns 401 for anonymous callers before sending mail', async () => {
    mocks.requireTenantStaff.mockRejectedValue(createError({ statusCode: 401, statusMessage: 'Unauthorized' }))
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.readBody).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it('returns 403 for an appointment outside the session tenant', async () => {
    mocks.requireTenantStaff.mockResolvedValue(staffActor)
    mocks.readBody.mockResolvedValue({
      to: 'victim@example.com',
      appointment_id: 'apt-foreign',
      tenant_id: 'tenant-b',
    })
    const appointments = thenable({ data: null, error: null })
    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'appointments') return appointments
        throw new Error(`unexpected ${table}`)
      }),
    })
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
    expect(appointments.eq).toHaveBeenCalledWith('tenant_id', 'tenant-a')
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it('sends mail for the assigned instructor after tenant binding', async () => {
    mocks.requireTenantStaff.mockResolvedValue(staffActor)
    mocks.readBody.mockResolvedValue({
      to: 'guest@example.com',
      name: 'Guest',
      appointment_id: 'apt-1',
    })
    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'appointments') {
          return thenable({
            data: {
              id: 'apt-1',
              start_time: '2026-09-09T08:00:00Z',
              end_time: '2026-09-09T09:00:00Z',
              event_type_code: 'meeting',
              custom_event_name: null,
              staff_id: 'staff-a',
              tenant_id: 'tenant-a',
              locations: { name: 'Office', address: 'Street 1' },
            },
            error: null,
          })
        }
        if (table === 'tenants') {
          return thenable({
            data: { name: 'School', slug: 'school', primary_color: '#000', logo_url: null },
            error: null,
          })
        }
        return thenable({
          data: { first_name: 'Staff', last_name: 'A', phone: null },
          error: null,
        })
      }),
    })
    await expect((await handler())({})).resolves.toEqual({ success: true })
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'guest@example.com' }),
    )
  })
})

describe('P0-05 send-course-enrollment-confirmation', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.readBody.mockReset()
    mocks.requireStaffOrInternal.mockReset()
    mocks.getSupabaseAdmin.mockReset()
    mocks.sendEmail.mockClear()
  })

  async function handler(): Promise<EventHandler> {
    return (await import('../../api/emails/send-course-enrollment-confirmation.post')).default as EventHandler
  }

  const enrollment = {
    id: 'reg-1',
    email: 'student@example.com',
    first_name: 'Ada',
    last_name: 'Lovelace',
    user_id: null,
    tenant_id: 'tenant-a',
    course_id: 'course-1',
    amount_paid_rappen: 15000,
    discount_applied_rappen: 0,
    is_partial_enrollment: false,
    custom_sessions: null,
    courses: {
      id: 'course-1',
      name: 'VKU Zürich',
      description: 'Zürich',
      category: 'VKU',
      price_per_participant_rappen: 15000,
      course_sessions: [
        { id: 's1', sari_session_id: null, start_time: '2026-10-01T07:00:00Z', end_time: '2026-10-01T15:00:00Z' },
      ],
    },
    tenants: {
      id: 'tenant-a',
      name: 'School',
      slug: 'school',
      contact_email: 'office@example.com',
      from_email: null,
      resend_domain_verified: false,
      primary_color: '#2563eb',
      booking_policy: {},
    },
  }

  it('returns 401 for anonymous callers before sending mail', async () => {
    mocks.requireStaffOrInternal.mockRejectedValue(createError({ statusCode: 401, statusMessage: 'Unauthorized' }))
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.readBody).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it('returns 403 when staff requests another tenant registration', async () => {
    mocks.requireStaffOrInternal.mockResolvedValue({ mode: 'staff', profile: staffActor })
    mocks.readBody.mockResolvedValue({
      courseRegistrationId: 'reg-foreign',
      paymentMethod: 'cash',
      testEmail: 'attacker@example.com',
    })
    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => thenable({ data: { ...enrollment, tenant_id: 'tenant-b' }, error: null })),
    })
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it('sends to the enrollment email, ignoring testEmail, for internal callers', async () => {
    mocks.requireStaffOrInternal.mockResolvedValue({ mode: 'internal', profile: null })
    mocks.readBody.mockResolvedValue({
      courseRegistrationId: 'reg-1',
      paymentMethod: 'wallee',
      testEmail: 'attacker@example.com',
    })
    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'course_registrations') return thenable({ data: enrollment, error: null })
        return thenable({ data: null, error: null })
      }),
    })
    await expect((await handler())({})).resolves.toMatchObject({ success: true })
    expect(mocks.sendEmail).toHaveBeenCalled()
    const firstCall = mocks.sendEmail.mock.calls[0]?.[0] as { to: string }
    expect(firstCall.to).toBe('student@example.com')
    expect(firstCall.to).not.toBe('attacker@example.com')
  })
})
