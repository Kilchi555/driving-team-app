import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const mocks = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
}))

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const cashSrc = readFileSync(resolve(process.cwd(), 'server/api/courses/enroll-cash.post.ts'), 'utf8')
const walleeSrc = readFileSync(resolve(process.cwd(), 'server/api/courses/enroll-wallee.post.ts'), 'utf8')
const billingSrc = readFileSync(resolve(process.cwd(), 'server/utils/course-enrollment-billing.ts'), 'utf8')
const adminSrc = readFileSync(resolve(process.cwd(), 'server/utils/admin-course-enroll.ts'), 'utf8')

type Row = { data: unknown; error: unknown }

function scriptedClient(steps: Array<{ table: string; result: Row }>) {
  const inserts: Array<{ table: string; payload: unknown }> = []
  let cursor = 0
  const from = vi.fn((table: string) => {
    const step = steps[cursor]
    cursor += 1
    if (!step || step.table !== table) {
      throw new Error(`supabase step ${cursor}: expected ${step?.table ?? 'end'}, got ${table}`)
    }
    const builder: Record<string, unknown> = {}
    const chain = () => builder
    for (const method of ['select', 'eq', 'is', 'limit', 'order']) builder[method] = vi.fn(chain)
    builder.insert = vi.fn((payload: unknown) => {
      inserts.push({ table, payload })
      return builder
    })
    builder.update = vi.fn(chain)
    builder.delete = vi.fn(chain)
    builder.maybeSingle = vi.fn(async () => step.result)
    builder.single = vi.fn(async () => step.result)
    builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(step.result).then(resolve, reject)
    return builder
  })
  return {
    from,
    rpc: vi.fn(async () => ({ data: 'RE-100', error: null })),
    inserts,
  }
}

describe('public course invoice source contract', () => {
  it('bills only the invoice branch and keeps cash, Wallee, and phase 1 out', () => {
    expect(cashSrc).toContain("if (finalPaymentMethod === 'invoice')")
    expect(cashSrc).toContain('createEnrollmentPayment')
    expect(cashSrc).toContain('createIndividualCourseInvoice')
    expect(cashSrc).toContain('adminUserId: null')
    expect(cashSrc).toContain('payableTotalRappen: totals.totalAmountRappen')
    expect(cashSrc).toContain('rollbackNewInvoiceEnrollment')
    expect(cashSrc).toContain('Rechnung konnte nicht erstellt werden.')
    expect(cashSrc).toContain('completeExistingInvoiceEnrollment')
    expect(cashSrc).toContain('if (existing.invoice_id)')
    expect(cashSrc).not.toContain('issue_course_invoice')
    expect(cashSrc).not.toContain('agreed_net_rappen')
    expect(cashSrc).not.toContain('course_invoice_bindings')
    expect(cashSrc).not.toContain('Rechnung in Kürze')
    const billAt = cashSrc.indexOf('await billInvoiceEnrollment(enrollment.id')
    const mailAt = cashSrc.indexOf('await sendEnrollmentConfirmation(\n      enrollment.id')
    expect(billAt).toBeGreaterThan(0)
    expect(mailAt).toBeGreaterThan(billAt)
    expect(walleeSrc).not.toContain('createIndividualCourseInvoice')
    expect(walleeSrc).not.toContain('createEnrollmentPayment')
    expect(billingSrc).not.toContain('issue_course_invoice')
    expect(adminSrc).toContain('adminUserId: opts.adminUserId')
    expect(adminSrc).not.toContain('payableTotalRappen')
  })

  it('keeps a logged-in customer id and does not mint an auth user', () => {
    expect(cashSrc).toContain('let guestUserId: string | null = sessionPrincipalId')
    expect(cashSrc).toContain('auth_user_id: null')
    expect(cashSrc).not.toContain('.auth.admin')
    expect(cashSrc).not.toContain('signUp(')
  })

  it('sends the confirmation only as a non-fatal step after billing', () => {
    expect(cashSrc).toContain('Email send failed (non-critical)')
    const rollbackAt = cashSrc.indexOf('await rollbackNewInvoiceEnrollment(supabase, tenantId, enrollment.id')
    const confirmAt = cashSrc.indexOf('await sendEnrollmentConfirmation(\n      enrollment.id')
    expect(rollbackAt).toBeGreaterThan(0)
    expect(confirmAt).toBeGreaterThan(rollbackAt)
  })
})

describe('course enrollment billing idempotency', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.getSupabaseAdmin.mockReset()
  })

  async function billing() {
    return import('../course-enrollment-billing')
  }

  it('reuses a tenant payment and does not insert a second one', async () => {
    const client = scriptedClient([
      {
        table: 'course_registrations',
        result: { data: { id: 'reg-1', user_id: 'user-1', payment_id: 'pay-1', invoice_id: null }, error: null },
      },
      {
        table: 'payments',
        result: { data: { id: 'pay-1' }, error: null },
      },
    ])
    mocks.getSupabaseAdmin.mockReturnValue(client)
    const { createEnrollmentPayment } = await billing()
    const result = await createEnrollmentPayment({
      tenantId: 'tenant-a',
      adminUserId: null,
      userId: 'user-1',
      enrollmentId: 'reg-1',
      courseId: 'course-1',
      courseName: 'Kurs',
      amountRappen: 1000,
      payableTotalRappen: 1081,
      paymentOption: 'invoice',
    })
    expect(result).toEqual({ paymentId: 'pay-1' })
    expect(client.inserts).toEqual([])
  })

  it('rejects a registration that is not in the caller tenant', async () => {
    const client = scriptedClient([
      { table: 'course_registrations', result: { data: null, error: null } },
    ])
    mocks.getSupabaseAdmin.mockReturnValue(client)
    const { createEnrollmentPayment } = await billing()
    await expect(createEnrollmentPayment({
      tenantId: 'tenant-a',
      userId: 'user-1',
      enrollmentId: 'reg-other',
      courseId: 'course-1',
      courseName: 'Kurs',
      amountRappen: 1000,
      paymentOption: 'invoice',
    })).rejects.toMatchObject({ statusCode: 404 })
    expect(client.inserts).toEqual([])
  })

  it('inserts one public payment with null staff and the payable total', async () => {
    const client = scriptedClient([
      {
        table: 'course_registrations',
        result: { data: { id: 'reg-1', user_id: 'user-1', payment_id: null, invoice_id: null }, error: null },
      },
      { table: 'payments', result: { data: null, error: null } },
      { table: 'payments', result: { data: { id: 'pay-new' }, error: null } },
      { table: 'course_registrations', result: { data: [{ id: 'reg-1' }], error: null } },
    ])
    mocks.getSupabaseAdmin.mockReturnValue(client)
    const { createEnrollmentPayment } = await billing()
    const result = await createEnrollmentPayment({
      tenantId: 'tenant-a',
      adminUserId: null,
      userId: 'user-1',
      enrollmentId: 'reg-1',
      courseId: 'course-1',
      courseName: 'Kurs',
      amountRappen: 10000,
      payableTotalRappen: 10310,
      paymentOption: 'invoice',
    })
    expect(result).toEqual({ paymentId: 'pay-new' })
    expect(client.inserts).toHaveLength(1)
    expect(client.inserts[0].payload).toMatchObject({
      tenant_id: 'tenant-a',
      user_id: 'user-1',
      staff_id: null,
      created_by: null,
      total_amount_rappen: 10310,
      lesson_price_rappen: 10000,
      payment_method: 'invoice',
      metadata: { admin_enroll: false },
    })
  })

  it('returns an existing tenant invoice without inserting another', async () => {
    const client = scriptedClient([
      {
        table: 'course_registrations',
        result: { data: { id: 'reg-1', user_id: 'user-1', payment_id: 'pay-1', invoice_id: 'inv-1' }, error: null },
      },
      {
        table: 'invoices',
        result: { data: { id: 'inv-1', invoice_number: 'RE-1', total_amount_rappen: 10810 }, error: null },
      },
    ])
    mocks.getSupabaseAdmin.mockReturnValue(client)
    const { createIndividualCourseInvoice } = await billing()
    const result = await createIndividualCourseInvoice({
      tenantId: 'tenant-a',
      adminUserId: null,
      userId: 'user-1',
      enrollmentId: 'reg-1',
      paymentId: 'pay-1',
      courseName: 'Kurs',
      amountRappen: 10000,
      discountRappen: 0,
      participant: { email: 'ada@example.com' },
      sendEmail: false,
    })
    expect(result).toMatchObject({ invoiceId: 'inv-1', invoiceNumber: 'RE-1', totalAmountRappen: 10810, created: false })
    expect(client.inserts).toEqual([])
  })

  it('writes one invoice and one item using net, VAT, and discount', async () => {
    const client = scriptedClient([
      {
        table: 'course_registrations',
        result: { data: { id: 'reg-1', user_id: 'user-1', payment_id: 'pay-1', invoice_id: null }, error: null },
      },
      { table: 'payments', result: { data: { id: 'pay-1', invoice_id: null }, error: null } },
      { table: 'tenants', result: { data: { invoice_due_days: 30 }, error: null } },
      { table: 'tenants', result: { data: { default_vat_rate: 8.1 }, error: null } },
      { table: 'tenants', result: { data: { id: 'tenant-a', name: 'Simy' }, error: null } },
      {
        table: 'invoices',
        result: { data: { id: 'inv-new', invoice_number: 'RE-100', total_amount_rappen: 10310 }, error: null },
      },
      { table: 'invoice_items', result: { data: null, error: null } },
      { table: 'payments', result: { data: null, error: null } },
      { table: 'course_registrations', result: { data: [{ id: 'reg-1' }], error: null } },
    ])
    mocks.getSupabaseAdmin.mockReturnValue(client)
    const { createIndividualCourseInvoice } = await billing()
    const result = await createIndividualCourseInvoice({
      tenantId: 'tenant-a',
      adminUserId: null,
      userId: 'user-1',
      enrollmentId: 'reg-1',
      paymentId: 'pay-1',
      courseName: 'Kurs',
      amountRappen: 10000,
      discountRappen: 500,
      participant: { first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com' },
      sendEmail: false,
    })
    expect(result.created).toBe(true)
    expect(result.invoiceId).toBe('inv-new')
    expect(result.totalAmountRappen).toBe(10310)
    const invoiceInsert = client.inserts.find((row) => row.table === 'invoices')
    const itemInsert = client.inserts.find((row) => row.table === 'invoice_items')
    expect(invoiceInsert?.payload).toMatchObject({
      tenant_id: 'tenant-a',
      user_id: 'user-1',
      staff_id: null,
      subtotal_rappen: 10000,
      discount_amount_rappen: 500,
      vat_rate: 8.1,
      vat_amount_rappen: 810,
      total_amount_rappen: 10310,
    })
    expect(itemInsert?.payload).toMatchObject({
      invoice_id: 'inv-new',
      tenant_id: 'tenant-a',
      payment_id: 'pay-1',
      quantity: 1,
    })
  })
})
