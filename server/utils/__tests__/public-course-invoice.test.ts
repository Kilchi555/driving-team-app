import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeCourseInvoiceTimingForSave, resolveCourseInvoiceTiming } from '../course-invoice-timing'
import {
  courseInvoiceSnapshotAmounts,
  publicCourseEnrollmentMessage,
  resolvePublicEnrollmentPriceRappen,
  runPublicCourseInvoiceBilling,
  toPublicBillingResponse,
} from '../public-course-invoice'

const sendTenantEmail = vi.hoisted(() => vi.fn(async () => ({ messageId: 'mail-1' })))
const buildInvoiceEmailHtml = vi.hoisted(() => vi.fn(() => '<p>invoice</p>'))
const generateInvoicePdf = vi.hoisted(() => vi.fn(async () => Buffer.from('pdf')))

vi.mock('~/server/utils/email', () => ({ sendTenantEmail }))
vi.mock('~/server/utils/invoice-email', () => ({ buildInvoiceEmailHtml }))
vi.mock('~/server/utils/invoice-pdf', () => ({
  generateInvoicePdf,
  formatTenantContactPerson: () => 'Ada Admin',
}))
vi.mock('~/server/utils/tenant-logo-for-pdf', () => ({
  loadTenantLogoForPdf: vi.fn(async () => null),
  resolveTenantWideLogoUrl: () => null,
}))
vi.mock('~/utils/logger', () => ({
  logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
}))

type Row = Record<string, unknown>
type Filter = { type: 'eq' | 'in' | 'is'; col: string; val: unknown }

function isPublicCourseInvoicePayment(row: Row) {
  const metadata = row.metadata
  if (!metadata || typeof metadata !== 'object') return false
  return (metadata as { public_course_invoice?: unknown }).public_course_invoice === true
}

function createMemorySupabase(tables: Record<string, Row[]>, hooks: {
  rpcInvoiceId?: string | null
  staleFirstPaymentRead?: boolean
  blockSentUpdate?: boolean
  paymentSelects?: number
  sentUpdates?: number
  throwOn?: string
  claimUnavailable?: boolean
} = {}) {
  function matches(row: Row, filters: Filter[]) {
    return filters.every((filter) => {
      if (filter.type === 'eq') return row[filter.col] === filter.val
      if (filter.type === 'in') return (filter.val as unknown[]).includes(row[filter.col])
      if (filter.type === 'is') return filter.val === null ? row[filter.col] == null : row[filter.col] === filter.val
      return false
    })
  }

  async function rpc(_name: string, args: Record<string, unknown>) {
    if (args.p_actor_user_id != null) return { data: null, error: { message: 'actor_must_be_null' } }
    const tenantId = args.p_tenant_id
    const registrationId = args.p_registration_ids?.[0]
    const registrations = tables.course_registrations || []
    const reg = registrations.find((row) => row.id === registrationId && row.tenant_id === tenantId)
    if (!reg) return { data: null, error: { message: 'registration_not_found' } }

    if (hooks?.rpcInvoiceId) {
      return {
        data: [{ invoice_id: hooks.rpcInvoiceId, invoice_number: 'RE-FORCED', created: true }],
        error: null,
      }
    }

    const links = new Set<string>()
    if (reg.invoice_id) links.add(reg.invoice_id)
    for (const payment of tables.payments || []) {
      if (payment.course_registration_id === registrationId && payment.tenant_id === tenantId && payment.invoice_id) {
        links.add(payment.invoice_id)
      }
      if (payment.course_registration_id === registrationId && payment.tenant_id && payment.tenant_id !== tenantId) {
        return { data: null, error: { message: 'registration_not_billable' } }
      }
    }
    for (const binding of tables.course_invoice_bindings || []) {
      if (binding.registration_id === registrationId && binding.tenant_id === tenantId) links.add(binding.invoice_id)
    }
    if (links.size > 1) return { data: null, error: { message: 'binding_conflict' } }
    if (links.size === 1) {
      const invoiceId = [...links][0]
      const invoice = (tables.invoices || []).find((row) => row.id === invoiceId && row.tenant_id === tenantId)
      if (!invoice) return { data: null, error: { message: 'registration_not_billable' } }
      return { data: [{ invoice_id: invoiceId, invoice_number: invoice.invoice_number, created: false }], error: null }
    }

    if (!reg.user_id || reg.payment_method !== 'invoice' || reg.agreed_payment_method !== 'invoice' || !reg.price_snapshot_at) {
      return { data: null, error: { message: 'registration_not_billable' } }
    }

    const invoiceId = crypto.randomUUID()
    const invoice = {
      id: invoiceId,
      tenant_id: tenantId,
      user_id: reg.user_id,
      invoice_number: `RE-${(tables.invoices || []).length + 1}`,
      invoice_date: '2026-10-03',
      due_date: '2026-11-02',
      status: 'draft',
      sent_at: null,
      subtotal_rappen: reg.agreed_net_rappen,
      vat_rate: reg.agreed_vat_rate,
      vat_amount_rappen: reg.agreed_vat_rappen,
      discount_amount_rappen: 0,
      total_amount_rappen: reg.agreed_gross_rappen,
      billing_contact_person: `${reg.first_name || ''} ${reg.last_name || ''}`.trim(),
      billing_email: reg.email,
      billing_street: '',
      billing_zip: '',
      billing_city: '',
    }
    tables.invoices = tables.invoices || []
    tables.invoice_items = tables.invoice_items || []
    tables.course_invoice_bindings = tables.course_invoice_bindings || []
    tables.invoices.push(invoice)
    tables.invoice_items.push({
      id: crypto.randomUUID(),
      invoice_id: invoiceId,
      tenant_id: tenantId,
      product_name: 'Kurs',
      product_description: 'Teilnehmer',
      quantity: 1,
      unit_price_rappen: reg.agreed_net_rappen,
      total_price_rappen: reg.agreed_net_rappen,
    })
    tables.course_invoice_bindings.push({
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      registration_id: registrationId,
      invoice_id: invoiceId,
    })
    return { data: [{ invoice_id: invoiceId, invoice_number: invoice.invoice_number, created: true }], error: null }
  }

  return {
    tables,
    rpc,
    from(table: string) {
      if (!tables[table]) tables[table] = []
      const state: { filters: Filter[]; op: 'select' | 'insert' | 'update'; payload: Row | null } = {
        filters: [],
        op: 'select',
        payload: null,
      }
      const execute = () => {
        const rows = tables[table]
        if (hooks.throwOn === table && state.op === 'select') {
          throw new Error(`forced ${table} failure`)
        }
        if (state.op === 'select' && table === 'payments' && hooks.staleFirstPaymentRead) {
          hooks.paymentSelects = (hooks.paymentSelects || 0) + 1
          if (hooks.paymentSelects === 1) return { data: [] as Row[], error: null as { code?: string; message?: string } | null }
        }
        if (state.op === 'insert') {
          const stored = { id: state.payload?.id || crypto.randomUUID(), ...(state.payload || {}) }
          if (table === 'public_course_invoice_mail_claims' && state.op === 'insert' && hooks.claimUnavailable) {
            return {
              data: [] as Row[],
              error: { code: '42P01', message: 'relation "public_course_invoice_mail_claims" does not exist' },
            }
          }
          if (table === 'public_course_invoice_mail_claims') {
            const claimClash = rows.some((row) =>
              row.tenant_id === stored.tenant_id && row.invoice_id === stored.invoice_id,
            )
            if (claimClash) {
              return {
                data: [] as Row[],
                error: {
                  code: '23505',
                  message: 'duplicate key value violates unique constraint "public_course_invoice_mail_claims_pkey"',
                },
              }
            }
          }
          if (table === 'payments' && isPublicCourseInvoicePayment(stored)) {
            const clash = rows.some((row) =>
              row.tenant_id === stored.tenant_id
              && row.course_registration_id === stored.course_registration_id
              && stored.tenant_id != null
              && stored.course_registration_id != null
              && isPublicCourseInvoicePayment(row),
            )
            if (clash) {
              return {
                data: [] as Row[],
                error: {
                  code: '23505',
                  message: 'duplicate key value violates unique constraint "payments_public_course_invoice_registration_uidx"',
                },
              }
            }
          }
          rows.push(stored)
          return { data: [{ ...stored }], error: null as { code?: string; message?: string } | null }
        }
        const matched = rows.filter((row) => matches(row, state.filters))
        if (state.op === 'update' && state.payload) {
          if (table === 'invoices' && state.payload.status === 'sent') {
            hooks.sentUpdates = (hooks.sentUpdates || 0) + 1
            if (hooks.blockSentUpdate) return { data: [] as Row[], error: null as { code?: string; message?: string } | null }
          }
          for (const row of matched) Object.assign(row, state.payload)
        }
        return { data: matched.map((row) => ({ ...row })), error: null as { code?: string; message?: string } | null }
      }
      const chain = {
        select: () => chain,
        insert: (payload: Row) => { state.op = 'insert'; state.payload = payload; return chain },
        update: (payload: Row) => { state.op = 'update'; state.payload = payload; return chain },
        eq: (col: string, val: unknown) => { state.filters.push({ type: 'eq', col, val }); return chain },
        in: (col: string, val: unknown) => { state.filters.push({ type: 'in', col, val }); return chain },
        is: (col: string, val: unknown) => { state.filters.push({ type: 'is', col, val }); return chain },
        maybeSingle: async () => {
          const result = execute()
          return { data: result.data[0] || null, error: null }
        },
        single: async () => {
          const result = execute()
          return { data: result.data[0] || null, error: result.data[0] ? null : { message: 'missing' } }
        },
        then: (onFulfilled: (value: { data: Row[]; error: { code?: string; message?: string } | null }) => unknown, onRejected?: (reason: unknown) => unknown) =>
          Promise.resolve(execute()).then(onFulfilled, onRejected),
      }
      return chain
    },
  }
}

const TENANT = 'tenant-a'
const OTHER = 'tenant-b'

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

function tenant(mode = 'immediate', vat = 0) {
  return {
    id: TENANT,
    name: 'Fahrschule',
    default_invoice_timing_mode: mode,
    default_vat_rate: vat,
    primary_color: '#1E40AF',
    legal_company_name: 'Fahrschule AG',
  }
}

function category(mode = 'inherit', partial = 0) {
  return {
    id: 'cat-1',
    tenant_id: TENANT,
    invoice_timing_mode: mode,
    partial_price_rappen: partial,
  }
}

function course(partial: Partial<Row> = {}) {
  return {
    id: 'course-1',
    tenant_id: TENANT,
    name: 'VKU',
    billing_mode: 'individual',
    price_per_participant_rappen: 15000,
    is_partial_only: false,
    course_category_id: 'cat-1',
    ...partial,
  }
}

function registration(partial: Partial<Row> = {}) {
  return {
    id: 'reg-new',
    tenant_id: TENANT,
    user_id: 'user-1',
    course_id: 'course-1',
    email: 'ada@example.com',
    first_name: 'Ada',
    last_name: 'Kundin',
    payment_method: 'invoice',
    payment_status: 'pending',
    status: 'confirmed',
    invoice_id: null,
    payment_id: null,
    is_partial_enrollment: false,
    individual_session_number: null,
    agreed_net_rappen: null,
    agreed_vat_rate: null,
    agreed_vat_rappen: null,
    agreed_gross_rappen: null,
    discount_rappen: null,
    voucher_rappen: null,
    credit_applied_rappen: null,
    agreed_payment_method: null,
    price_snapshot_at: null,
    ...partial,
  }
}

function baseTables(partial: {
  tenantMode?: string
  categoryMode?: string
  vat?: number
  registration?: Partial<Row>
  course?: Partial<Row>
  sessions?: Row[]
  payments?: Row[]
  extraRegistrations?: Row[]
  partialPrice?: number
} = {}) {
  return {
    tenants: [tenant(partial.tenantMode ?? 'immediate', partial.vat ?? 0)],
    course_categories: [category(partial.categoryMode ?? 'inherit', partial.partialPrice ?? 0)],
    courses: [course(partial.course)],
    course_sessions: partial.sessions || [],
    users: [{ id: 'user-1', tenant_id: TENANT, email: 'ada@example.com' }],
    course_registrations: [
      registration(partial.registration),
      ...(partial.extraRegistrations || []),
    ],
    payments: partial.payments || [],
    invoices: [],
    invoice_items: [],
    course_invoice_bindings: [],
    public_course_invoice_mail_claims: [],
  }
}

function asClient(db: ReturnType<typeof createMemorySupabase>) {
  return db as unknown as SupabaseClient
}

function seedCommittedPublicInvoice(db: ReturnType<typeof createMemorySupabase>, partial: {
  paymentGross?: number
  invoiceStatus?: string
  sentAt?: string | null
} = {}) {
  const invoiceId = 'inv-winner'
  const paymentId = 'pay-winner'
  const gross = partial.paymentGross ?? 15000
  db.tables.invoices.push({
    id: invoiceId,
    tenant_id: TENANT,
    user_id: 'user-1',
    invoice_number: 'RE-WIN',
    invoice_date: '2026-10-03',
    due_date: '2026-11-02',
    status: partial.invoiceStatus ?? 'draft',
    sent_at: partial.sentAt ?? null,
    subtotal_rappen: 15000,
    vat_rate: 0,
    vat_amount_rappen: 0,
    discount_amount_rappen: 0,
    total_amount_rappen: 15000,
    billing_contact_person: 'Ada Kundin',
    billing_email: 'ada@example.com',
    billing_street: '',
    billing_zip: '',
    billing_city: '',
  })
  db.tables.invoice_items.push({
    id: 'item-winner',
    invoice_id: invoiceId,
    tenant_id: TENANT,
    product_name: 'Kurs',
    product_description: 'Teilnehmer',
    quantity: 1,
    unit_price_rappen: 15000,
    total_price_rappen: 15000,
  })
  db.tables.course_invoice_bindings.push({
    id: 'bind-winner',
    tenant_id: TENANT,
    registration_id: 'reg-new',
    invoice_id: invoiceId,
  })
  db.tables.payments.push({
    id: paymentId,
    tenant_id: TENANT,
    user_id: 'user-1',
    course_registration_id: 'reg-new',
    invoice_id: invoiceId,
    payment_method: 'invoice',
    payment_status: 'invoiced',
    total_amount_rappen: gross,
    lesson_price_rappen: gross,
    metadata: { public_course_invoice: true, course_id: 'course-1', course_registration_id: 'reg-new' },
  })
  Object.assign(db.tables.course_registrations[0], {
    invoice_id: invoiceId,
    payment_id: paymentId,
    agreed_net_rappen: 15000,
    agreed_vat_rate: 0,
    agreed_vat_rappen: 0,
    agreed_gross_rappen: 15000,
    discount_rappen: 0,
    voucher_rappen: 0,
    credit_applied_rappen: 0,
    agreed_payment_method: 'invoice',
    price_snapshot_at: '2026-10-03T00:00:00.000Z',
  })
}

function seedMailClaim(db: ReturnType<typeof createMemorySupabase>, partial: Partial<Row> = {}) {
  db.tables.public_course_invoice_mail_claims.push({
    tenant_id: TENANT,
    invoice_id: 'inv-winner',
    registration_id: 'reg-new',
    claim_token: 'token-held',
    outcome: 'claimed',
    claimed_at: '2026-10-03T00:00:00.000Z',
    ...partial,
  })
}

describe('resolveCourseInvoiceTiming', () => {
  it('1. category off stays off', () => {
    expect(resolveCourseInvoiceTiming({ categoryMode: 'off', tenantMode: 'immediate' })).toBe('off')
  })

  it('2. category off overrides tenant immediate', () => {
    expect(resolveCourseInvoiceTiming({ categoryMode: 'off', tenantMode: 'immediate' })).toBe('off')
    expect(resolveCourseInvoiceTiming({ categoryMode: 'OFF', tenantMode: 'immediate' })).toBe('off')
  })

  it('3. inherit plus tenant immediate is immediate', () => {
    expect(resolveCourseInvoiceTiming({ categoryMode: 'inherit', tenantMode: 'immediate' })).toBe('immediate')
    expect(resolveCourseInvoiceTiming({ categoryMode: 'inherit', tenantMode: 'off' })).toBe('off')
  })

  it('4. unsupported modes fail closed', () => {
    expect(resolveCourseInvoiceTiming({ categoryMode: 'inherit', tenantMode: 'days_before_start' })).toBe('unsupported')
    expect(resolveCourseInvoiceTiming({ categoryMode: 'inherit', tenantMode: 'on_confirmed' })).toBe('unsupported')
    expect(resolveCourseInvoiceTiming({ categoryMode: 'days_before_start', tenantMode: 'immediate' })).toBe('unsupported')
    expect(resolveCourseInvoiceTiming({ categoryMode: 'on_confirmed', tenantMode: 'immediate' })).toBe('unsupported')
    expect(resolveCourseInvoiceTiming({ categoryMode: null, tenantMode: 'immediate' })).toBe('unsupported')
    expect(resolveCourseInvoiceTiming({ categoryMode: 'inherit', tenantMode: null })).toBe('unsupported')
    expect(resolveCourseInvoiceTiming({ categoryMode: 'later', tenantMode: 'immediate' })).toBe('unsupported')
    expect(resolveCourseInvoiceTiming({ categoryMode: '', tenantMode: 'immediate' })).toBe('unsupported')
  })

  it('category immediate wins over tenant off', () => {
    expect(resolveCourseInvoiceTiming({ categoryMode: 'immediate', tenantMode: 'off' })).toBe('immediate')
  })

  it('course immediate overrides category and tenant', () => {
    expect(resolveCourseInvoiceTiming({ courseMode: 'immediate', categoryMode: 'inherit', tenantMode: 'off' })).toBe('immediate')
    expect(resolveCourseInvoiceTiming({ courseMode: 'immediate', categoryMode: 'off', tenantMode: 'off' })).toBe('immediate')
    expect(resolveCourseInvoiceTiming({ courseMode: 'IMMEDIATE', categoryMode: 'inherit', tenantMode: 'off' })).toBe('immediate')
  })

  it('a null course mode keeps the category and tenant resolution', () => {
    expect(resolveCourseInvoiceTiming({ courseMode: null, categoryMode: 'immediate', tenantMode: 'off' })).toBe('immediate')
    expect(resolveCourseInvoiceTiming({ courseMode: null, categoryMode: 'inherit', tenantMode: 'immediate' })).toBe('immediate')
    expect(resolveCourseInvoiceTiming({ courseMode: null, categoryMode: 'inherit', tenantMode: 'off' })).toBe('off')
    expect(resolveCourseInvoiceTiming({ courseMode: undefined, categoryMode: 'off', tenantMode: 'immediate' })).toBe('off')
    expect(resolveCourseInvoiceTiming({ courseMode: '', categoryMode: 'inherit', tenantMode: 'off' })).toBe('off')
  })

  it('an invalid course mode fails closed', () => {
    expect(resolveCourseInvoiceTiming({ courseMode: 'off', categoryMode: 'inherit', tenantMode: 'immediate' })).toBe('unsupported')
    expect(resolveCourseInvoiceTiming({ courseMode: 'inherit', categoryMode: 'immediate', tenantMode: 'off' })).toBe('unsupported')
    expect(resolveCourseInvoiceTiming({ courseMode: 'days_before_start', categoryMode: 'inherit', tenantMode: 'immediate' })).toBe('unsupported')
  })

  it('has no database access', () => {
    const src = read('server/utils/course-invoice-timing.ts')
    expect(src).not.toMatch(/supabase|\.from\(|\.rpc\(/)
  })
})

describe('normalizeCourseInvoiceTimingForSave', () => {
  it('persists immediate only for an invoice course', () => {
    expect(normalizeCourseInvoiceTimingForSave({
      paymentMethod: 'INVOICE',
      invoiceTimingMode: 'immediate',
    })).toEqual({ invoice_timing_mode: 'immediate' })
    expect(normalizeCourseInvoiceTimingForSave({
      paymentMethod: 'INVOICE',
      invoiceTimingMode: null,
    })).toEqual({ invoice_timing_mode: null })
  })

  it('rejects an invalid timing value on an invoice course', () => {
    expect(normalizeCourseInvoiceTimingForSave({
      paymentMethod: 'INVOICE',
      invoiceTimingMode: 'off',
    })).toEqual({ error: 'Ungültige Rechnungsstellung. Erlaubt sind Standard oder Sofort.' })
    expect(normalizeCourseInvoiceTimingForSave({
      paymentMethod: 'INVOICE',
      invoiceTimingMode: 'days_before_start',
    })).toHaveProperty('error')
  })

  it('clears course timing unless the payment method is invoice', () => {
    for (const paymentMethod of ['WALLEE', 'CASH_ON_SITE', null, '']) {
      expect(normalizeCourseInvoiceTimingForSave({
        paymentMethod,
        invoiceTimingMode: 'immediate',
      })).toEqual({ invoice_timing_mode: null })
    }
  })

  it('upsert stores the normalized value before insert and update', () => {
    const src = read('server/api/admin/courses/upsert.post.ts')
    const normalized = src.indexOf('const courseTiming = normalizeCourseInvoiceTimingForSave')
    const payload = src.indexOf('const payload')
    const insert = src.indexOf(".insert(")
    const update = src.indexOf('.update(payload)')
    expect(normalized).toBeGreaterThan(0)
    expect(payload).toBeGreaterThan(normalized)
    expect(update).toBeGreaterThan(payload)
    expect(insert).toBeGreaterThan(payload)
    expect(src).toContain('courseData.invoice_timing_mode = courseTiming.invoice_timing_mode')
  })
})

describe('courses.invoice_timing_mode migration', () => {
  const sql = read('migrations/20261003_courses_invoice_timing_mode.sql')

  it('adds a nullable column with no immediate default and does not rewrite rows', () => {
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS invoice_timing_mode text')
    expect(sql).not.toMatch(/invoice_timing_mode\s+text\s+NOT\s+NULL/i)
    expect(sql).not.toMatch(/invoice_timing_mode[^;\n]*DEFAULT/i)
    expect(sql).toContain("invoice_timing_mode IS NULL OR invoice_timing_mode = 'immediate'")
    expect(sql).not.toMatch(/\bUPDATE\b/i)
    expect(sql).not.toMatch(/\bINSERT\s+INTO\b/i)
    expect(sql).not.toMatch(/ROW LEVEL SECURITY|CREATE\s+POLICY/i)
    expect(sql).not.toMatch(/payment_method\s*=/i)
  })
})

describe('resolvePublicEnrollmentPriceRappen', () => {
  const sessions = [
    { session_number: 1, allow_individual_booking: true, individual_price_rappen: 4000 },
    { session_number: 2, allow_individual_booking: false, individual_price_rappen: 9000 },
  ]

  it('5. uses the course price for a normal enrollment', () => {
    expect(resolvePublicEnrollmentPriceRappen({
      pricePerParticipantRappen: 15000,
      isPartialOnly: false,
      isPartialEnrollment: false,
      individualSessionNumber: null,
      partialPriceRappen: 8000,
      sessions,
    })).toBe(15000)
  })

  it('6. uses the partial price for a partial booking that is not partial-only', () => {
    expect(resolvePublicEnrollmentPriceRappen({
      pricePerParticipantRappen: 15000,
      isPartialOnly: false,
      isPartialEnrollment: true,
      individualSessionNumber: null,
      partialPriceRappen: 8000,
      sessions,
    })).toBe(8000)
  })

  it('keeps the course price for is_partial_only', () => {
    expect(resolvePublicEnrollmentPriceRappen({
      pricePerParticipantRappen: 15000,
      isPartialOnly: true,
      isPartialEnrollment: false,
      individualSessionNumber: null,
      partialPriceRappen: 8000,
      sessions,
    })).toBe(15000)
  })

  it('7. uses the individual session price', () => {
    expect(resolvePublicEnrollmentPriceRappen({
      pricePerParticipantRappen: 15000,
      isPartialOnly: false,
      isPartialEnrollment: true,
      individualSessionNumber: 1,
      partialPriceRappen: 8000,
      sessions,
    })).toBe(4000)
  })

  it('falls back to the course price when the individual price is null', () => {
    expect(resolvePublicEnrollmentPriceRappen({
      pricePerParticipantRappen: 15000,
      isPartialOnly: false,
      isPartialEnrollment: true,
      individualSessionNumber: 1,
      partialPriceRappen: 8000,
      sessions: [{ session_number: 1, allow_individual_booking: true, individual_price_rappen: null }],
    })).toBe(15000)
  })

  it('keeps a stored individual price of zero', () => {
    expect(resolvePublicEnrollmentPriceRappen({
      pricePerParticipantRappen: 15000,
      isPartialOnly: true,
      isPartialEnrollment: false,
      individualSessionNumber: 1,
      partialPriceRappen: 8000,
      sessions: [{ session_number: 1, allow_individual_booking: true, individual_price_rappen: 0 }],
    })).toBe(0)
  })
})

describe('courseInvoiceSnapshotAmounts', () => {
  it('8. VAT 0 keeps gross equal to net', () => {
    expect(courseInvoiceSnapshotAmounts(15000, 0)).toMatchObject({
      agreed_net_rappen: 15000,
      agreed_vat_rate: 0,
      agreed_vat_rappen: 0,
      agreed_gross_rappen: 15000,
    })
  })

  it('9. VAT 8.1 uses round(net * rate / 100)', () => {
    expect(courseInvoiceSnapshotAmounts(10000, 8.1)).toMatchObject({
      agreed_net_rappen: 10000,
      agreed_vat_rate: 8.1,
      agreed_vat_rappen: 810,
      agreed_gross_rappen: 10810,
    })
  })

  it('10-12. discount, voucher and credit are zero', () => {
    const amounts = courseInvoiceSnapshotAmounts(15000, 8.1)
    expect(amounts.discount_rappen).toBe(0)
    expect(amounts.voucher_rappen).toBe(0)
    expect(amounts.credit_applied_rappen).toBe(0)
    expect(amounts.agreed_payment_method).toBe('invoice')
  })

  it('treats an invalid VAT rate as 0', () => {
    expect(courseInvoiceSnapshotAmounts(15000, Number.NaN).agreed_vat_rate).toBe(0)
    expect(courseInvoiceSnapshotAmounts(15000, -1).agreed_gross_rappen).toBe(15000)
  })
})

describe('runPublicCourseInvoiceBilling', () => {
  beforeEach(() => {
    sendTenantEmail.mockReset()
    sendTenantEmail.mockResolvedValue({ messageId: 'mail-1' })
    buildInvoiceEmailHtml.mockClear()
    generateInvoicePdf.mockClear()
    generateInvoicePdf.mockResolvedValue(Buffer.from('pdf'))
  })

  it('course immediate bills when the tenant and category stay off', async () => {
    const db = createMemorySupabase(baseTables({
      tenantMode: 'off',
      categoryMode: 'inherit',
      course: { invoice_timing_mode: 'immediate' },
    }))
    const result = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(result.status).toBe('sent')
    expect(db.tables.invoices).toHaveLength(1)
    expect(db.tables.payments).toHaveLength(1)
    expect(sendTenantEmail).toHaveBeenCalledTimes(1)
  })

  it('1. off creates no billing', async () => {
    const db = createMemorySupabase(baseTables({ tenantMode: 'off', categoryMode: 'inherit' }))
    const result = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(result).toMatchObject({ status: 'skipped', reason: 'timing_off', emailed: false })
    expect(db.tables.invoices).toEqual([])
    expect(db.tables.payments).toEqual([])
    expect(db.tables.course_registrations[0].price_snapshot_at).toBeNull()
    expect(sendTenantEmail).not.toHaveBeenCalled()
  })

  it('2. category off overrides tenant immediate', async () => {
    const db = createMemorySupabase(baseTables({ tenantMode: 'immediate', categoryMode: 'off' }))
    const result = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(result).toMatchObject({ status: 'skipped', reason: 'timing_off' })
    expect(db.tables.invoices).toEqual([])
    expect(db.tables.course_registrations[0].invoice_id).toBeNull()
  })

  it('3. inherit plus tenant immediate creates one invoice', async () => {
    const db = createMemorySupabase(baseTables({ tenantMode: 'immediate', categoryMode: 'inherit' }))
    const result = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(result.status).toBe('sent')
    expect(db.tables.invoices).toHaveLength(1)
    expect(result.invoiceId).toBe(db.tables.invoices[0].id)
  })

  it('4. unsupported timing creates nothing', async () => {
    const db = createMemorySupabase(baseTables({ tenantMode: 'days_before_start', categoryMode: 'inherit' }))
    const result = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(result).toMatchObject({ status: 'skipped', reason: 'unsupported_timing', emailed: false })
    expect(db.tables.invoices).toEqual([])
    expect(db.tables.payments).toEqual([])
    expect(sendTenantEmail).not.toHaveBeenCalled()
  })

  it('5-7. prices follow the public enrollment rules', async () => {
    const full = createMemorySupabase(baseTables())
    await runPublicCourseInvoiceBilling({ supabase: asClient(full), registrationId: 'reg-new' })
    expect(full.tables.course_registrations[0].agreed_net_rappen).toBe(15000)

    const partialDb = createMemorySupabase(baseTables({
      partialPrice: 8000,
      registration: { is_partial_enrollment: true },
    }))
    await runPublicCourseInvoiceBilling({ supabase: asClient(partialDb), registrationId: 'reg-new' })
    expect(partialDb.tables.course_registrations[0].agreed_net_rappen).toBe(8000)

    const individual = createMemorySupabase(baseTables({
      partialPrice: 8000,
      registration: { is_partial_enrollment: true, individual_session_number: 1 },
      sessions: [{ session_number: 1, allow_individual_booking: true, individual_price_rappen: 4000, tenant_id: TENANT, course_id: 'course-1' }],
    }))
    await runPublicCourseInvoiceBilling({ supabase: asClient(individual), registrationId: 'reg-new' })
    expect(individual.tables.course_registrations[0].agreed_net_rappen).toBe(4000)
  })

  it('8-12. snapshot uses VAT and zero reductions', async () => {
    const zero = createMemorySupabase(baseTables({ vat: 0 }))
    await runPublicCourseInvoiceBilling({ supabase: asClient(zero), registrationId: 'reg-new' })
    expect(zero.tables.course_registrations[0]).toMatchObject({
      agreed_vat_rate: 0,
      agreed_vat_rappen: 0,
      agreed_gross_rappen: 15000,
      discount_rappen: 0,
      voucher_rappen: 0,
      credit_applied_rappen: 0,
      agreed_payment_method: 'invoice',
    })
    expect(zero.tables.course_registrations[0].price_snapshot_at).toBeTruthy()

    const taxed = createMemorySupabase(baseTables({ vat: 8.1, course: { price_per_participant_rappen: 10000 } }))
    await runPublicCourseInvoiceBilling({ supabase: asClient(taxed), registrationId: 'reg-new' })
    expect(taxed.tables.course_registrations[0]).toMatchObject({
      agreed_net_rappen: 10000,
      agreed_vat_rappen: 810,
      agreed_gross_rappen: 10810,
      discount_rappen: 0,
      voucher_rappen: 0,
      credit_applied_rappen: 0,
    })
    expect(buildInvoiceEmailHtml).toHaveBeenCalledWith(expect.objectContaining({
      vatRate: 8.1,
      vatRappen: 810,
      totalRappen: 10810,
    }))
    expect(generateInvoicePdf).toHaveBeenCalledWith(expect.objectContaining({
      vatRate: 8.1,
      vatAmountRappen: 810,
      totalRappen: 10810,
    }))
  })

  it('13. user_id null skips without a snapshot or payment', async () => {
    const db = createMemorySupabase(baseTables({ registration: { user_id: null } }))
    const result = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(result).toMatchObject({ status: 'skipped', reason: 'user_unassigned', emailed: false })
    expect(db.tables.invoices).toEqual([])
    expect(db.tables.payments).toEqual([])
    expect(db.tables.course_registrations[0].price_snapshot_at).toBeNull()
    expect(db.tables.course_registrations[0].agreed_net_rappen).toBeNull()
  })

  it('14. a company course skips individual billing', async () => {
    const db = createMemorySupabase(baseTables({ course: { billing_mode: 'company_collective' } }))
    const result = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(result).toMatchObject({ status: 'skipped', reason: 'company_collective', emailed: false })
    expect(db.tables.invoices).toEqual([])
    expect(db.tables.payments).toEqual([])
    expect(db.tables.course_registrations[0].invoice_id).toBeNull()
  })

  it('15-20. creates one invoice, one binding and one payment on the same invoice', async () => {
    const db = createMemorySupabase(baseTables({ vat: 8.1, course: { price_per_participant_rappen: 10000 } }))
    const result = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    const invoiceId = db.tables.invoices[0].id
    expect(db.tables.invoices).toHaveLength(1)
    expect(db.tables.course_invoice_bindings).toHaveLength(1)
    expect(db.tables.payments).toHaveLength(1)
    expect(db.tables.payments[0]).toMatchObject({
      invoice_id: invoiceId,
      tenant_id: TENANT,
      user_id: 'user-1',
      course_registration_id: 'reg-new',
      payment_method: 'invoice',
      payment_status: 'invoiced',
      total_amount_rappen: 10810,
      lesson_price_rappen: 10810,
    })
    expect(db.tables.course_invoice_bindings[0]).toMatchObject({
      tenant_id: TENANT,
      registration_id: 'reg-new',
      invoice_id: invoiceId,
    })
    expect(db.tables.course_registrations[0].invoice_id).toBe(invoiceId)
    expect(db.tables.course_registrations[0].payment_id).toBe(db.tables.payments[0].id)
    expect(db.tables.payments[0].total_amount_rappen).toBe(db.tables.course_registrations[0].agreed_gross_rappen)
    expect(result).toMatchObject({ status: 'sent', invoiceId, emailed: true })
    expect(db.tables.invoices[0]).toMatchObject({ status: 'sent' })
    expect(db.tables.invoices[0].sent_at).toBeTruthy()
  })

  it('21. a second orchestration reuses the invoice and does not send a second mail', async () => {
    const db = createMemorySupabase(baseTables())
    const first = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    const second = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(first.invoiceId).toBe(second.invoiceId)
    expect(db.tables.invoices).toHaveLength(1)
    expect(db.tables.course_invoice_bindings).toHaveLength(1)
    expect(db.tables.payments).toHaveLength(1)
    expect(sendTenantEmail).toHaveBeenCalledTimes(1)
    expect(second.status).toBe('sent')
  })

  it('22. an existing payment is never overwritten', async () => {
    const db = createMemorySupabase(baseTables({
      payments: [{
        id: 'pay-existing',
        tenant_id: TENANT,
        user_id: 'user-1',
        course_registration_id: 'reg-new',
        invoice_id: null,
        payment_method: 'cash_on_site',
        payment_status: 'pending',
        total_amount_rappen: 100,
        lesson_price_rappen: 100,
      }],
    }))
    const result = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(result).toMatchObject({ status: 'failed', reason: 'conflict', emailed: false })
    expect(db.tables.payments).toHaveLength(1)
    expect(db.tables.payments[0]).toMatchObject({
      id: 'pay-existing',
      invoice_id: null,
      payment_method: 'cash_on_site',
      payment_status: 'pending',
      total_amount_rappen: 100,
    })
    expect(db.tables.invoices).toEqual([])
    expect(sendTenantEmail).not.toHaveBeenCalled()
  })

  it('23. an existing registration invoice_id is never overwritten', async () => {
    const tables = baseTables({
      registration: { invoice_id: 'inv-keep' },
    })
    const db = createMemorySupabase(tables, { rpcInvoiceId: 'inv-other' })
    const result = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(result).toMatchObject({ status: 'created', reason: 'invoice_id_mismatch', invoiceId: 'inv-other', emailed: false })
    expect(publicCourseEnrollmentMessage('invoice', result)).not.toContain('konnte nicht erstellt')
    expect(publicCourseEnrollmentMessage('invoice', result)).toContain('nicht per E-Mail zugestellt')
    expect(db.tables.course_registrations[0].invoice_id).toBe('inv-keep')
    expect(db.tables.payments).toEqual([])
    expect(sendTenantEmail).not.toHaveBeenCalled()
  })

  it('24. mail success marks the invoice sent', async () => {
    const db = createMemorySupabase(baseTables())
    const result = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(result.status).toBe('sent')
    expect(result.emailed).toBe(true)
    expect(db.tables.invoices[0].status).toBe('sent')
    expect(sendTenantEmail).toHaveBeenCalledTimes(1)
  })

  it('25. mail failure leaves the invoice draft', async () => {
    sendTenantEmail.mockRejectedValueOnce(new Error('smtp down'))
    const db = createMemorySupabase(baseTables())
    const result = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(result).toMatchObject({ status: 'created', reason: 'mail_failed', emailed: false })
    expect(db.tables.invoices[0].status).toBe('draft')
    expect(db.tables.invoices[0].sent_at).toBeNull()
    expect(db.tables.public_course_invoice_mail_claims[0].outcome).toBe('failed')
    expect(db.tables.course_registrations[0].id).toBe('reg-new')

    const retry = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(retry.status).toBe('sent')
    expect(sendTenantEmail).toHaveBeenCalledTimes(2)
    expect(db.tables.payments).toHaveLength(1)
    expect(db.tables.invoices).toHaveLength(1)
    expect(db.tables.public_course_invoice_mail_claims).toHaveLength(1)
    expect(db.tables.public_course_invoice_mail_claims[0].outcome).toBe('sent')
  })

  it('26. a missing email leaves the invoice draft', async () => {
    const db = createMemorySupabase(baseTables({
      registration: { email: '' },
    }))
    db.tables.users[0].email = ''
    const result = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(result).toMatchObject({ status: 'created', reason: 'missing_email', emailed: false })
    expect(db.tables.invoices[0].status).toBe('draft')
    expect(sendTenantEmail).not.toHaveBeenCalled()
  })

  it('27. public responses distinguish created, sent, failed and skipped', () => {
    expect(toPublicBillingResponse({ status: 'skipped', reason: 'timing_off', emailed: false })).toEqual({
      status: 'skipped',
      reason: 'timing_off',
      emailed: false,
    })
    expect(toPublicBillingResponse({ status: 'created', reason: 'mail_failed', invoiceId: 'inv-1', emailed: false })).toEqual({
      status: 'created',
      reason: 'mail_failed',
      invoiceId: 'inv-1',
      emailed: false,
    })
    expect(toPublicBillingResponse({ status: 'sent', invoiceId: 'inv-1', emailed: true }).emailed).toBe(true)
    expect(toPublicBillingResponse({ status: 'failed', reason: 'conflict', emailed: false }).status).toBe('failed')

    expect(publicCourseEnrollmentMessage('invoice', { status: 'sent', emailed: true })).toContain('per E-Mail versendet')
    expect(publicCourseEnrollmentMessage('invoice', { status: 'created', reason: 'mail_failed', emailed: false })).not.toContain('wurde per E-Mail versendet')
    expect(publicCourseEnrollmentMessage('invoice', { status: 'created', reason: 'mail_failed', emailed: false })).toContain('nicht per E-Mail zugestellt')
    expect(publicCourseEnrollmentMessage('invoice', { status: 'failed', reason: 'billing_error', emailed: false })).not.toContain('versendet')
    expect(publicCourseEnrollmentMessage('invoice', { status: 'skipped', reason: 'timing_off', emailed: false })).toContain('keine Rechnung per E-Mail')
    expect(publicCourseEnrollmentMessage('cash', null)).toContain('bar')
  })

  it('28. existing registrations stay untouched', async () => {
    const extras = Array.from({ length: 17 }, (_, index) => registration({
      id: `reg-open-${index + 1}`,
      email: `open-${index + 1}@example.com`,
      user_id: null,
      invoice_id: null,
      payment_id: null,
    }))
    const before = JSON.parse(JSON.stringify(extras))
    const db = createMemorySupabase(baseTables({ extraRegistrations: extras }))
    await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    const after = db.tables.course_registrations.filter((row) => row.id !== 'reg-new')
    expect(after).toEqual(before)
    expect(db.tables.payments.every((row) => row.course_registration_id === 'reg-new')).toBe(true)
    expect(db.tables.course_invoice_bindings.every((row) => row.registration_id === 'reg-new')).toBe(true)
  })

  it('uses the registration email before the user email', async () => {
    const db = createMemorySupabase(baseTables({ registration: { email: 'reg@example.com' } }))
    db.tables.users[0].email = 'user@example.com'
    await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(sendTenantEmail).toHaveBeenCalledWith(TENANT, expect.objectContaining({ to: 'reg@example.com' }))
  })

  it('falls back to the user email', async () => {
    const db = createMemorySupabase(baseTables({ registration: { email: '' } }))
    db.tables.users[0].email = 'user@example.com'
    await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(sendTenantEmail).toHaveBeenCalledWith(TENANT, expect.objectContaining({ to: 'user@example.com' }))
  })

  it('fails closed for a cross-tenant course and does not bill', async () => {
    const db = createMemorySupabase(baseTables())
    db.tables.courses[0].tenant_id = OTHER
    const result = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(result).toMatchObject({ status: 'failed', emailed: false })
    expect(db.tables.invoices).toEqual([])
    expect(db.tables.payments).toEqual([])
  })

  it('B wins the cross-isolate race: A reuses the payment and sends no mail', async () => {
    const hooks = { staleFirstPaymentRead: true, paymentSelects: 0 }
    const db = createMemorySupabase(baseTables(), hooks)
    seedCommittedPublicInvoice(db)
    seedMailClaim(db, { outcome: 'claimed' })
    const result = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(hooks.paymentSelects).toBeGreaterThan(1)
    expect(result).toMatchObject({ status: 'created', reason: 'mail_claim_held', invoiceId: 'inv-winner', emailed: false })
    expect(publicCourseEnrollmentMessage('invoice', result)).not.toContain('konnte nicht erstellt')
    expect(db.tables.invoices).toHaveLength(1)
    expect(db.tables.course_invoice_bindings).toHaveLength(1)
    expect(db.tables.payments).toHaveLength(1)
    expect(db.tables.payments[0].id).toBe('pay-winner')
    expect(sendTenantEmail).not.toHaveBeenCalled()
    expect(db.tables.invoices[0].status).toBe('draft')
  })

  it('A wins the cross-isolate race: B reuses the payment and sends no mail', async () => {
    const hooks = { staleFirstPaymentRead: false, paymentSelects: 0 }
    const db = createMemorySupabase(baseTables(), hooks)
    const winner = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(winner).toMatchObject({ status: 'sent', emailed: true })
    expect(sendTenantEmail).toHaveBeenCalledTimes(1)
    expect(db.tables.payments).toHaveLength(1)
    const winnerPaymentId = db.tables.payments[0].id

    hooks.staleFirstPaymentRead = true
    hooks.paymentSelects = 0
    const loser = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(loser).toMatchObject({ status: 'sent', invoiceId: winner.invoiceId, emailed: true })
    expect(db.tables.invoices).toHaveLength(1)
    expect(db.tables.payments).toHaveLength(1)
    expect(db.tables.payments[0].id).toBe(winnerPaymentId)
    expect(sendTenantEmail).toHaveBeenCalledTimes(1)
  })

  it('a raced payment with a different gross fails closed without a second row or mail', async () => {
    const hooks = { staleFirstPaymentRead: true, paymentSelects: 0 }
    const db = createMemorySupabase(baseTables(), hooks)
    seedCommittedPublicInvoice(db, { paymentGross: 100 })
    const result = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(result).toMatchObject({ status: 'created', reason: 'conflict', invoiceId: 'inv-winner', emailed: false })
    expect(publicCourseEnrollmentMessage('invoice', result)).not.toContain('konnte nicht erstellt')
    expect(db.tables.payments).toHaveLength(1)
    expect(db.tables.payments[0]).toMatchObject({ id: 'pay-winner', total_amount_rappen: 100 })
    expect(sendTenantEmail).not.toHaveBeenCalled()
  })

  it('does not report sent when the draft update matches no row', async () => {
    const hooks = { blockSentUpdate: true, sentUpdates: 0 }
    const db = createMemorySupabase(baseTables(), hooks)
    const result = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(result).toMatchObject({ status: 'created', reason: 'sent_status_unconfirmed', emailed: false })
    expect(publicCourseEnrollmentMessage('invoice', result)).not.toContain('wurde per E-Mail versendet')
    expect(publicCourseEnrollmentMessage('invoice', result)).not.toContain('konnte nicht erstellt')
    expect(db.tables.invoices[0].status).toBe('draft')
    expect(db.tables.invoices[0].sent_at).toBeNull()
    expect(hooks.sentUpdates).toBe(1)
    expect(sendTenantEmail).toHaveBeenCalledTimes(1)
    expect(db.tables.public_course_invoice_mail_claims).toHaveLength(1)
    expect(db.tables.public_course_invoice_mail_claims[0].outcome).toBe('unconfirmed')

    const retry = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(retry).toMatchObject({ status: 'created', reason: 'mail_claim_held', emailed: false })
    expect(sendTenantEmail).toHaveBeenCalledTimes(1)
    expect(db.tables.payments).toHaveLength(1)
    expect(db.tables.invoices[0].status).toBe('draft')
  })

  it('reports sent only after the draft update confirms a row', async () => {
    const hooks = { sentUpdates: 0 }
    const db = createMemorySupabase(baseTables(), hooks)
    const result = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(result).toMatchObject({ status: 'sent', emailed: true })
    expect(hooks.sentUpdates).toBe(1)
    expect(db.tables.invoices[0].status).toBe('sent')
    expect(db.tables.invoices[0].sent_at).toBeTruthy()
  })

  it('a missing category inherits the tenant timing', async () => {
    const immediate = createMemorySupabase(baseTables({ course: { course_category_id: null } }))
    const billed = await runPublicCourseInvoiceBilling({ supabase: asClient(immediate), registrationId: 'reg-new' })
    expect(billed.status).toBe('sent')
    expect(immediate.tables.invoices).toHaveLength(1)

    const off = createMemorySupabase(baseTables({ tenantMode: 'off', course: { course_category_id: null } }))
    const skipped = await runPublicCourseInvoiceBilling({ supabase: asClient(off), registrationId: 'reg-new' })
    expect(skipped).toMatchObject({ status: 'skipped', reason: 'timing_off', emailed: false })
    expect(off.tables.invoices).toEqual([])
  })

  it('a cross-tenant category fails closed before an invoice', async () => {
    const db = createMemorySupabase(baseTables())
    db.tables.course_categories[0].tenant_id = OTHER
    const result = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(result).toMatchObject({ status: 'failed', emailed: false })
    expect(db.tables.invoices).toEqual([])
    expect(db.tables.payments).toEqual([])
    expect(sendTenantEmail).not.toHaveBeenCalled()
  })

  it('uses the course price when the individual session price is null', async () => {
    const db = createMemorySupabase(baseTables({
      partialPrice: 8000,
      registration: { is_partial_enrollment: true, individual_session_number: 1 },
      sessions: [{
        session_number: 1,
        allow_individual_booking: true,
        individual_price_rappen: null,
        tenant_id: TENANT,
        course_id: 'course-1',
      }],
    }))
    await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(db.tables.course_registrations[0].agreed_net_rappen).toBe(15000)
  })

  it('reuses an existing matching invoice and payment without a second mail once sent', async () => {
    const db = createMemorySupabase(baseTables())
    seedCommittedPublicInvoice(db, { invoiceStatus: 'sent', sentAt: '2026-10-03T01:00:00.000Z' })
    const result = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(result).toMatchObject({ status: 'sent', invoiceId: 'inv-winner', emailed: true })
    expect(db.tables.invoices).toHaveLength(1)
    expect(db.tables.payments).toHaveLength(1)
    expect(sendTenantEmail).not.toHaveBeenCalled()
  })

  it('allows other payment types on the same registration', async () => {
    const db = createMemorySupabase(baseTables())
    const wallee = await db.from('payments').insert({
      tenant_id: TENANT,
      course_registration_id: 'reg-other',
      metadata: { source: 'checkout' },
    })
    const sale = await db.from('payments').insert({
      tenant_id: TENANT,
      course_registration_id: 'reg-other',
      metadata: { source: 'staff_product_sale' },
    })
    const first = await db.from('payments').insert({
      tenant_id: TENANT,
      course_registration_id: 'reg-other',
      metadata: { public_course_invoice: true },
    })
    const second = await db.from('payments').insert({
      tenant_id: TENANT,
      course_registration_id: 'reg-other',
      metadata: { public_course_invoice: true },
    })
    const otherTenant = await db.from('payments').insert({
      tenant_id: OTHER,
      course_registration_id: 'reg-other',
      metadata: { public_course_invoice: true },
    })
    expect(wallee.error).toBeNull()
    expect(sale.error).toBeNull()
    expect(first.error).toBeNull()
    expect(second.error?.code).toBe('23505')
    expect(otherTenant.error).toBeNull()
    const publicRows = db.tables.payments.filter((row) => isPublicCourseInvoicePayment(row) && row.tenant_id === TENANT)
    expect(publicRows).toHaveLength(1)
  })

  it('one successful run keeps a single payment and a single mail claim', async () => {
    const db = createMemorySupabase(baseTables())
    const result = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(result.status).toBe('sent')
    expect(db.tables.payments).toHaveLength(1)
    expect(db.tables.public_course_invoice_mail_claims).toHaveLength(1)
    expect(db.tables.public_course_invoice_mail_claims[0]).toMatchObject({
      tenant_id: TENANT,
      invoice_id: result.invoiceId,
      registration_id: 'reg-new',
      outcome: 'sent',
    })
    expect(sendTenantEmail).toHaveBeenCalledTimes(1)
  })

  it('a second caller seeing the same draft payment cannot take the mail claim', async () => {
    const db = createMemorySupabase(baseTables())
    seedCommittedPublicInvoice(db)
    const first = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(first.status).toBe('sent')
    expect(sendTenantEmail).toHaveBeenCalledTimes(1)
    const second = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(second).toMatchObject({ status: 'sent', emailed: true })
    expect(sendTenantEmail).toHaveBeenCalledTimes(1)
    expect(db.tables.payments).toHaveLength(1)
    expect(db.tables.public_course_invoice_mail_claims).toHaveLength(1)
  })

  it('two claim inserts for one tenant invoice allow only the first', async () => {
    const db = createMemorySupabase(baseTables())
    const first = await db.from('public_course_invoice_mail_claims').insert({
      tenant_id: TENANT,
      invoice_id: 'inv-1',
      registration_id: 'reg-new',
      claim_token: 'a',
      outcome: 'claimed',
    })
    const second = await db.from('public_course_invoice_mail_claims').insert({
      tenant_id: TENANT,
      invoice_id: 'inv-1',
      registration_id: 'reg-new',
      claim_token: 'b',
      outcome: 'claimed',
    })
    const otherTenant = await db.from('public_course_invoice_mail_claims').insert({
      tenant_id: OTHER,
      invoice_id: 'inv-1',
      registration_id: 'reg-b',
      claim_token: 'c',
      outcome: 'claimed',
    })
    expect(first.error).toBeNull()
    expect(second.error?.code).toBe('23505')
    expect(otherTenant.error).toBeNull()
    const own = db.tables.public_course_invoice_mail_claims.filter((row) => row.tenant_id === TENANT)
    expect(own).toHaveLength(1)
    expect(own[0].claim_token).toBe('a')
  })

  it('a held claim for another registration does not authorize a send', async () => {
    const db = createMemorySupabase(baseTables())
    seedCommittedPublicInvoice(db)
    seedMailClaim(db, { registration_id: 'reg-other', outcome: 'failed' })
    const result = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(result).toMatchObject({ status: 'created', reason: 'mail_claim_held', emailed: false })
    expect(sendTenantEmail).not.toHaveBeenCalled()
    expect(db.tables.public_course_invoice_mail_claims).toHaveLength(1)
    expect(db.tables.public_course_invoice_mail_claims[0]).toMatchObject({
      registration_id: 'reg-other',
      outcome: 'failed',
    })
  })

  it('does not send when the mail-claim table is unavailable', async () => {
    const db = createMemorySupabase(baseTables(), { claimUnavailable: true })
    const result = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(result).toMatchObject({ status: 'created', reason: 'mail_claim_unavailable', emailed: false })
    expect(sendTenantEmail).not.toHaveBeenCalled()
    expect(db.tables.invoices[0].status).toBe('draft')
    expect(db.tables.payments).toHaveLength(1)
    expect(db.tables.public_course_invoice_mail_claims).toEqual([])
  })

  it('an existing tenant invoice is not described as missing when billing stops', async () => {
    const db = createMemorySupabase(baseTables())
    seedCommittedPublicInvoice(db, { paymentGross: 100 })
    const result = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(result).toMatchObject({ status: 'created', invoiceId: 'inv-winner', emailed: false })
    expect(publicCourseEnrollmentMessage('invoice', result)).not.toContain('konnte nicht erstellt')
    expect(publicCourseEnrollmentMessage('invoice', result)).toContain('nicht per E-Mail zugestellt')
    expect(toPublicBillingResponse(result)).toMatchObject({
      status: 'created',
      invoiceId: 'inv-winner',
      emailed: false,
    })
    expect(db.tables.invoices).toHaveLength(1)
    expect(db.tables.payments).toHaveLength(1)
    expect(db.tables.course_registrations[0].invoice_id).toBe('inv-winner')
    expect(sendTenantEmail).not.toHaveBeenCalled()
  })

  it('does not reveal an invoice id that is not in the registration tenant', async () => {
    const db = createMemorySupabase(baseTables({
      registration: { invoice_id: 'inv-foreign' },
    }))
    db.tables.users[0].tenant_id = OTHER
    const result = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(result).toMatchObject({ status: 'failed', emailed: false })
    expect(result.invoiceId).toBeUndefined()
    expect(sendTenantEmail).not.toHaveBeenCalled()
    expect(db.tables.invoices).toEqual([])
  })

  it('an unexpected error after an invoice exists does not say the invoice is missing', async () => {
    const db = createMemorySupabase(baseTables(), { throwOn: 'payments' })
    seedCommittedPublicInvoice(db)
    const result = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(result).toMatchObject({ status: 'created', invoiceId: 'inv-winner', emailed: false })
    expect(publicCourseEnrollmentMessage('invoice', result)).not.toContain('konnte nicht erstellt')
    expect(sendTenantEmail).not.toHaveBeenCalled()
    expect(db.tables.invoices).toHaveLength(1)
    expect(db.tables.course_registrations[0].invoice_id).toBe('inv-winner')
  })

  it('a throw after a successful stamp still reports the newly linked invoice', async () => {
    const db = createMemorySupabase(baseTables(), { throwOn: 'invoice_items' })
    const result = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    const invoiceId = db.tables.invoices[0]?.id
    expect(invoiceId).toBeTruthy()
    expect(result.status).not.toBe('failed')
    expect(result).toMatchObject({ status: 'created', invoiceId, emailed: false })
    expect(result.invoiceId).toBe(invoiceId)
    expect(publicCourseEnrollmentMessage('invoice', result)).not.toContain('konnte nicht erstellt')
    expect(publicCourseEnrollmentMessage('invoice', result)).toContain('nicht per E-Mail zugestellt')
    expect(db.tables.invoices).toHaveLength(1)
    expect(db.tables.course_registrations[0].invoice_id).toBe(invoiceId)
    expect(db.tables.payments).toHaveLength(1)
    expect(sendTenantEmail).not.toHaveBeenCalled()
  })

  it('a failure before the invoice stamp still reports that no invoice was created', async () => {
    const db = createMemorySupabase(baseTables(), { throwOn: 'payments' })
    const result = await runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' })
    expect(result).toMatchObject({ status: 'failed', emailed: false })
    expect(result.invoiceId).toBeUndefined()
    expect(publicCourseEnrollmentMessage('invoice', result)).toContain('konnte nicht erstellt')
    expect(db.tables.invoices).toEqual([])
    expect(db.tables.course_registrations[0].invoice_id).toBeNull()
    expect(sendTenantEmail).not.toHaveBeenCalled()
  })

  it('same-process parallel calls share one orchestration', async () => {
    const db = createMemorySupabase(baseTables())
    const [first, second] = await Promise.all([
      runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' }),
      runPublicCourseInvoiceBilling({ supabase: asClient(db), registrationId: 'reg-new' }),
    ])
    expect(first.invoiceId).toBe(second.invoiceId)
    expect(db.tables.invoices).toHaveLength(1)
    expect(db.tables.payments).toHaveLength(1)
    expect(db.tables.public_course_invoice_mail_claims).toHaveLength(1)
    expect(sendTenantEmail).toHaveBeenCalledTimes(1)
  })
})

describe('unchanged neighbours', () => {
  it('29. appointment auto-invoice does not use the public course orchestrator', () => {
    const src = read('server/utils/auto-invoice-on-complete.ts')
    expect(src).not.toContain('public-course-invoice')
    expect(src).not.toContain('runPublicCourseInvoiceBilling')
    expect(src).toContain('booking_policy')
  })

  it('30. admin course billing is unchanged', () => {
    const src = read('server/utils/admin-course-enroll.ts')
    expect(src).not.toContain('public-course-invoice')
    expect(src).not.toContain('runPublicCourseInvoiceBilling')
    expect(src).toContain('createIndividualCourseInvoice')
    const billing = read('server/utils/course-enrollment-billing.ts')
    expect(billing).not.toContain('public-course-invoice')
    expect(billing).toContain('sendCourseInvoiceEmail')
    const confirmation = read('server/api/emails/send-course-enrollment-confirmation.post.ts')
    expect(confirmation).toContain('Sie erhalten die Rechnung über CHF ${escapeHtml(price)} in Kürze per separater E-Mail.')
  })

  it('31. company invoice is unchanged', () => {
    const route = read('server/api/admin/courses/company-invoice.post.ts')
    const billing = read('server/utils/course-enrollment-billing.ts')
    expect(route).not.toContain('public-course-invoice')
    expect(billing).toContain('createCompanyCourseInvoice')
    expect(route).toContain('createCompanyCourseInvoice')
  })

  it('duplicate enrollment responses are returned before billing', () => {
    const cash = read('server/api/courses/enroll-cash.post.ts')
    const billingAt = cash.indexOf('billing = await runPublicCourseInvoiceBilling')
    expect(billingAt).toBeGreaterThan(-1)
    let found = 0
    let idx = cash.indexOf('statusCode: 409')
    while (idx !== -1) {
      expect(idx).toBeLessThan(billingAt)
      found += 1
      idx = cash.indexOf('statusCode: 409', idx + 1)
    }
    expect(found).toBeGreaterThanOrEqual(4)
  })

  it('the course-invoice payment index is partial and unapplied', () => {
    const sql = read('migrations/20261003_payments_public_course_invoice_uidx.sql')
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS payments_public_course_invoice_registration_uidx')
    expect(sql).toContain('ON public.payments (tenant_id, course_registration_id)')
    expect(sql).toContain("AND (metadata ->> 'public_course_invoice') = 'true'")
    expect(sql).not.toContain('DROP ')
    expect(sql).not.toContain('ALTER TABLE')
    expect(sql).not.toContain('issue_course_invoice')
    const billing = read('server/utils/course-enrollment-billing.ts')
    const admin = read('server/utils/admin-course-enroll.ts')
    expect(billing).not.toContain('public_course_invoice')
    expect(admin).not.toContain('public_course_invoice')
    const orchestrator = read('server/utils/public-course-invoice.ts')
    expect(orchestrator).toContain('public_course_invoice: true')
    expect(orchestrator).toContain("error.code === '23505'")
    expect(orchestrator).toContain('payments_public_course_invoice_registration_uidx')
    const claims = read('migrations/20261003_public_course_invoice_mail_claims.sql')
    expect(claims).toContain('PRIMARY KEY (tenant_id, invoice_id)')
    expect(claims).toContain("CHECK (outcome IN ('claimed', 'failed', 'sent', 'unconfirmed'))")
    expect(claims).not.toContain('issue_course_invoice')
    expect(claims).not.toContain('DROP ')
    const cash = read('server/api/courses/enroll-cash.post.ts')
    expect(cash).toContain("billing?.status === 'created' ? 'created' : 'none'")
  })

  it('public copy no longer promises an invoice email unconditionally', () => {
    const cash = read('server/api/courses/enroll-cash.post.ts')
    const modal = read('components/customer/CourseEnrollmentModal.vue')
    expect(cash).not.toContain('Sie erhalten die Rechnung in Kürze per E-Mail')
    expect(cash).toContain('runPublicCourseInvoiceBilling')
    expect(cash).toContain('registrationId: enrollment.id')
    expect(cash).not.toContain('stampInvoiceSourceRow')
    expect(modal).not.toContain('du erhältst die Rechnung nach der Anmeldung per E-Mail')
    const orchestrator = read('server/utils/public-course-invoice.ts')
    expect(orchestrator).toContain('stampInvoiceSourceRow')
    expect(orchestrator).not.toContain('sendCourseInvoiceEmail')
    expect(orchestrator).toContain("p_actor_user_id: null")
  })
})
