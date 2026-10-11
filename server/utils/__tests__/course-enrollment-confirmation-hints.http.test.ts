/**
 * Confirmation-email «Wichtig!» hints — FK vs legacy category lookup.
 * Mocked Supabase + sendEmail; no real mail / production writes.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  requireStaffOrInternal: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  sendEmail: vi.fn(async () => ({ id: 'msg_test' })),
  capturedStatusBoxes: [] as Array<{ title?: string; bodyHtml?: string }>,
  capturedDetailRows: [] as string[],
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
  }
})

vi.mock('~/server/utils/require-staff-or-internal', () => ({
  requireStaffOrInternal: mocks.requireStaffOrInternal,
}))

vi.mock('~/server/utils/require-tenant-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/server/utils/require-tenant-auth')>()
  return { ...actual }
})

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
  buildBrandedEmailShell: (opts: { bodyHtml: string }) => opts.bodyHtml,
  displayName: (name: string) => name,
  emailAppointmentAppStoreBlock: () => '',
  emailDetailBox: (_primary: string, html: string) => html,
  emailDetailRow: (label: string, value: string) => {
    const row = `${label}:${value}`
    mocks.capturedDetailRows.push(row)
    return row
  },
  emailSignature: () => '',
  emailStatusBox: (opts: { title?: string; bodyHtml?: string }) => {
    mocks.capturedStatusBoxes.push(opts)
    return `<box>${opts.title || ''}${opts.bodyHtml || ''}</box>`
  },
  escapeHtml: (value: string) =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;'),
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

type CategoryRow = {
  id: string
  tenant_id: string
  code: string
  name: string
  email_important_notice: string | null
}

function baseEnrollment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'reg-1',
    email: 'student@example.com',
    first_name: 'Ada',
    last_name: 'Lovelace',
    user_id: null,
    tenant_id: 'tenant-a',
    course_id: 'course-1',
    amount_paid_rappen: 19000,
    discount_applied_rappen: 0,
    is_partial_enrollment: false,
    custom_sessions: null,
    courses: {
      id: 'course-1',
      name: 'Test 2',
      description: 'Test',
      category: null,
      course_category_id: 'cat-a',
      price_per_participant_rappen: 19000,
      course_sessions: [
        {
          id: 's1',
          sari_session_id: null,
          start_time: '2026-10-14T07:00:00Z',
          end_time: '2026-10-14T15:00:00Z',
        },
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
      secondary_color: null,
      business_type: 'driving_school',
      logo_wide_url: null,
      logo_url: null,
      logo_square_url: null,
      booking_policy: {},
    },
    ...overrides,
  }
}

function createCategoryQuery(categories: CategoryRow[], filters: Record<string, string>) {
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  builder.select = vi.fn(chain)
  builder.eq = vi.fn((col: string, val: string) => {
    filters[col] = val
    return builder
  })
  builder.maybeSingle = vi.fn(async () => {
    const match = categories.find((c) => {
      if (filters.tenant_id && c.tenant_id !== filters.tenant_id) return false
      if (filters.id && c.id !== filters.id) return false
      if (filters.code && c.code !== filters.code) return false
      return true
    })
    return { data: match || null, error: null }
  })
  builder.single = builder.maybeSingle
  return builder
}

function mockDb(opts: {
  enrollment: ReturnType<typeof baseEnrollment>
  categories: CategoryRow[]
}) {
  mocks.getSupabaseAdmin.mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === 'course_registrations') {
        const builder: Record<string, unknown> = {}
        const chain = () => builder
        builder.select = vi.fn(chain)
        builder.eq = vi.fn(chain)
        builder.single = vi.fn(async () => ({ data: opts.enrollment, error: null }))
        return builder
      }
      if (table === 'course_categories') {
        return createCategoryQuery(opts.categories, {})
      }
      const empty: Record<string, unknown> = {}
      const chain = () => empty
      empty.select = vi.fn(chain)
      empty.eq = vi.fn(chain)
      empty.single = vi.fn(async () => ({ data: null, error: null }))
      empty.maybeSingle = vi.fn(async () => ({ data: null, error: null }))
      return empty
    }),
  })
}

function wichtigBody(): string {
  const box = mocks.capturedStatusBoxes.find((b) => b.title === 'Wichtig!')
  return box?.bodyHtml || ''
}

describe('send-course-enrollment-confirmation category hints', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.readBody.mockReset()
    mocks.requireStaffOrInternal.mockReset()
    mocks.getSupabaseAdmin.mockReset()
    mocks.sendEmail.mockClear()
    mocks.capturedStatusBoxes.length = 0
    mocks.capturedDetailRows.length = 0
    mocks.requireStaffOrInternal.mockResolvedValue({ mode: 'internal', profile: null })
  })

  async function handler(): Promise<EventHandler> {
    return (await import('../../api/emails/send-course-enrollment-confirmation.post'))
      .default as EventHandler
  }

  it('uses custom hints via course_category_id when legacy category is null (Test 2 regression)', async () => {
    mockDb({
      enrollment: baseEnrollment(),
      categories: [
        {
          id: 'cat-a',
          tenant_id: 'tenant-a',
          code: 'Test',
          name: 'Test',
          email_important_notice: 'CUSTOM_HINT_ALPHA\nCUSTOM_HINT_BETA',
        },
      ],
    })
    mocks.readBody.mockResolvedValue({
      courseRegistrationId: 'reg-1',
      paymentMethod: 'invoice',
      totalAmount: 190,
      invoiceNotice: 'none',
    })

    await expect((await handler())({})).resolves.toMatchObject({ success: true })

    const body = wichtigBody()
    expect(body).toContain('CUSTOM_HINT_ALPHA')
    expect(body).toContain('CUSTOM_HINT_BETA')
    expect(body).not.toContain('Gültiger Lern- und/oder Fahrausweis mitnehmen')

    expect(mocks.capturedDetailRows.some((r) => r.includes('Test 2'))).toBe(true)
    expect(mocks.capturedDetailRows.some((r) => r.includes('Standort') && r.includes('Test'))).toBe(true)
    expect(mocks.capturedDetailRows.some((r) => r.includes('190'))).toBe(true)
    expect(mocks.capturedStatusBoxes.some((b) => b.title === 'Zahlungsmethode: Rechnung')).toBe(true)
  })

  it('falls back to default hints when category notice is empty', async () => {
    mockDb({
      enrollment: baseEnrollment(),
      categories: [
        {
          id: 'cat-a',
          tenant_id: 'tenant-a',
          code: 'Test',
          name: 'Test',
          email_important_notice: '',
        },
      ],
    })
    mocks.readBody.mockResolvedValue({
      courseRegistrationId: 'reg-1',
      paymentMethod: 'cash',
      totalAmount: 190,
    })

    await expect((await handler())({})).resolves.toMatchObject({ success: true })
    const body = wichtigBody()
    expect(body).toContain('Gültiger Lern- und/oder Fahrausweis mitnehmen')
    expect(body).toContain("AGB's")
  })

  it('does not leak course A hints into course B confirmation', async () => {
    const enrollmentB = baseEnrollment({
      id: 'reg-b',
      course_id: 'course-b',
      courses: {
        id: 'course-b',
        name: 'Kurs B',
        description: 'Ort B',
        category: null,
        course_category_id: 'cat-b',
        price_per_participant_rappen: 10000,
        course_sessions: [],
      },
    })
    mockDb({
      enrollment: enrollmentB as ReturnType<typeof baseEnrollment>,
      categories: [
        {
          id: 'cat-a',
          tenant_id: 'tenant-a',
          code: 'A',
          name: 'Cat A',
          email_important_notice: 'HINT_ONLY_FOR_A',
        },
        {
          id: 'cat-b',
          tenant_id: 'tenant-a',
          code: 'B',
          name: 'Cat B',
          email_important_notice: 'HINT_ONLY_FOR_B',
        },
      ],
    })
    mocks.readBody.mockResolvedValue({
      courseRegistrationId: 'reg-b',
      paymentMethod: 'wallee',
    })

    await expect((await handler())({})).resolves.toMatchObject({ success: true })
    const body = wichtigBody()
    expect(body).toContain('HINT_ONLY_FOR_B')
    expect(body).not.toContain('HINT_ONLY_FOR_A')
  })

  it('keeps tenant isolation when another tenant shares the same category id shape', async () => {
    mockDb({
      enrollment: baseEnrollment(),
      categories: [
        {
          id: 'cat-a',
          tenant_id: 'tenant-b',
          code: 'Test',
          name: 'Other tenant cat',
          email_important_notice: 'FOREIGN_TENANT_HINT',
        },
        {
          id: 'cat-a-own',
          tenant_id: 'tenant-a',
          code: 'Test',
          name: 'Own',
          email_important_notice: 'OWN_TENANT_HINT',
        },
      ],
    })
    // Enrollment points at cat-a which only exists for tenant-b → no match under tenant-a
    mocks.readBody.mockResolvedValue({
      courseRegistrationId: 'reg-1',
      paymentMethod: 'invoice',
    })

    await expect((await handler())({})).resolves.toMatchObject({ success: true })
    const body = wichtigBody()
    expect(body).not.toContain('FOREIGN_TENANT_HINT')
    // No own-tenant row for id cat-a → defaults
    expect(body).toContain('Gültiger Lern- und/oder Fahrausweis mitnehmen')
  })

  it('still resolves legacy code-only courses (SARI / older rows)', async () => {
    const enrollment = baseEnrollment({
      courses: {
        id: 'course-vku',
        name: 'VKU Classic',
        description: 'Zug',
        category: 'VKU',
        course_category_id: null,
        price_per_participant_rappen: 15000,
        course_sessions: [],
      },
    })
    mockDb({
      enrollment: enrollment as ReturnType<typeof baseEnrollment>,
      categories: [
        {
          id: 'cat-vku',
          tenant_id: 'tenant-a',
          code: 'VKU',
          name: 'VKU',
          email_important_notice: 'LEGACY_CODE_HINT',
        },
      ],
    })
    mocks.readBody.mockResolvedValue({
      courseRegistrationId: 'reg-1',
      paymentMethod: 'wallee',
    })

    await expect((await handler())({})).resolves.toMatchObject({ success: true })
    expect(wichtigBody()).toContain('LEGACY_CODE_HINT')
  })

  it('escapes plain-text custom hints in HTML output', async () => {
    mockDb({
      enrollment: baseEnrollment(),
      categories: [
        {
          id: 'cat-a',
          tenant_id: 'tenant-a',
          code: 'Test',
          name: 'Test',
          email_important_notice: '<script>alert(1)</script>\nPreis < CHF 100',
        },
      ],
    })
    mocks.readBody.mockResolvedValue({
      courseRegistrationId: 'reg-1',
      paymentMethod: 'invoice',
    })

    await expect((await handler())({})).resolves.toMatchObject({ success: true })
    const body = wichtigBody()
    expect(body).not.toContain('<script>')
    expect(body).toContain('&lt;script&gt;')
    expect(body).toContain('Preis &lt; CHF 100')
  })
})
