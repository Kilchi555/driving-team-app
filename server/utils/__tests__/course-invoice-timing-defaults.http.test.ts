import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { normalizeCourseInvoiceTimingForSave, resolveCourseInvoiceTiming } from '../course-invoice-timing'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  getAuthenticatedUser: vi.fn(),
  requireAdminProfile: vi.fn(),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
  }
})

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
  requireAdminProfile: mocks.requireAdminProfile,
}))

vi.mock('~/server/utils/rate-limiter', () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
}))

vi.mock('~/server/utils/auto-category-waitlist', () => ({
  syncAutoCategoryWaitlists: vi.fn(async () => undefined),
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const TENANT = '64259d68-195a-4c68-8875-f1b44d962830'
const OTHER = '11111111-1111-1111-1111-111111111111'

type TenantRow = { id: string; default_invoice_timing_mode: string }
type CategoryRow = { id: string; tenant_id: string; name: string; invoice_timing_mode: string }
type Write = { table: string; payload: Record<string, unknown>; filters: Record<string, string> }

function freshDb() {
  return {
    tenants: [
      { id: TENANT, default_invoice_timing_mode: 'off' },
      { id: OTHER, default_invoice_timing_mode: 'off' },
    ] as TenantRow[],
    categories: [
      { id: 'cat-own', tenant_id: TENANT, name: 'VKU', invoice_timing_mode: 'inherit' },
      { id: 'cat-foreign', tenant_id: OTHER, name: 'Fremd', invoice_timing_mode: 'inherit' },
    ] as CategoryRow[],
    writes: [] as Write[],
  }
}

let db = freshDb()

function tenantQuery() {
  let action: 'select' | 'update' = 'select'
  let payload: Record<string, unknown> | null = null
  const filters: Record<string, string> = {}
  const query = {
    select() { return query },
    update(next: Record<string, unknown>) {
      action = 'update'
      payload = next
      return query
    },
    eq(column: string, value: string) {
      filters[column] = value
      return query
    },
    async single() {
      const row = db.tenants.find((item) => item.id === filters.id)
      if (!row) return { data: null, error: { code: 'PGRST116', message: 'missing tenant' } }
      if (action === 'update' && payload) {
        db.writes.push({ table: 'tenants', payload: { ...payload }, filters: { ...filters } })
        Object.assign(row, payload)
      }
      return { data: { ...row }, error: null }
    },
  }
  return query
}

function categoryQuery() {
  let action: 'select' | 'update' | 'insert' = 'select'
  let payload: Record<string, unknown> | null = null
  const filters: Record<string, string> = {}
  const query = {
    select() { return query },
    update(next: Record<string, unknown>) {
      action = 'update'
      payload = next
      return query
    },
    insert(next: Record<string, unknown>) {
      action = 'insert'
      payload = next
      return query
    },
    eq(column: string, value: string) {
      filters[column] = value
      return query
    },
    async single() {
      if (action === 'insert' && payload) {
        const row: CategoryRow = {
          id: 'cat-new',
          tenant_id: String(payload.tenant_id),
          name: String(payload.name),
          invoice_timing_mode: String(payload.invoice_timing_mode ?? 'inherit'),
        }
        db.categories.push(row)
        db.writes.push({ table: 'course_categories', payload: { ...payload }, filters: { ...filters } })
        return { data: { ...row }, error: null }
      }
      const row = db.categories.find((item) => item.id === filters.id && item.tenant_id === filters.tenant_id)
      if (!row) return { data: null, error: { code: 'PGRST116', message: 'missing category' } }
      if (action === 'update' && payload) {
        db.writes.push({ table: 'course_categories', payload: { ...payload }, filters: { ...filters } })
        Object.assign(row, payload)
      }
      return { data: { ...row }, error: null }
    },
  }
  return query
}

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('PUT /api/admin/tenant/course-invoice-timing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    db = freshDb()
    mocks.requireAdminProfile.mockResolvedValue({
      id: 'admin-1',
      tenant_id: TENANT,
      role: 'admin',
    })
    mocks.getSupabaseAdmin.mockReturnValue({
      from: (table: string) => {
        if (table === 'tenants') return tenantQuery()
        throw new Error(`unexpected table ${table}`)
      },
    })
  })

  async function put(body: unknown) {
    mocks.readBody.mockResolvedValue(body)
    const handler = (await import('~/server/api/admin/tenant/course-invoice-timing.put')).default as (event: unknown) => Promise<{ default_invoice_timing_mode: string }>
    return handler({})
  }

  async function get() {
    const handler = (await import('~/server/api/admin/tenant/course-invoice-timing.get')).default as (event: unknown) => Promise<{ default_invoice_timing_mode: string }>
    return handler({})
  }

  it('accepts off and writes only the authenticated tenant column', async () => {
    const result = await put({ default_invoice_timing_mode: 'off', tenant_id: OTHER })
    expect(result.default_invoice_timing_mode).toBe('off')
    expect(db.tenants.find((row) => row.id === TENANT)?.default_invoice_timing_mode).toBe('off')
    expect(db.tenants.find((row) => row.id === OTHER)?.default_invoice_timing_mode).toBe('off')
    expect(db.writes[0]).toMatchObject({
      table: 'tenants',
      payload: { default_invoice_timing_mode: 'off' },
      filters: { id: TENANT },
    })
    expect(Object.keys(db.writes[0].payload)).toEqual(['default_invoice_timing_mode'])
  })

  it('accepts immediate', async () => {
    const result = await put({ default_invoice_timing_mode: 'immediate' })
    expect(result.default_invoice_timing_mode).toBe('immediate')
    expect(db.tenants.find((row) => row.id === TENANT)?.default_invoice_timing_mode).toBe('immediate')
    expect(await get()).toEqual({ default_invoice_timing_mode: 'immediate' })
  })

  it.each(['days_before_start', 'on_confirmed', 'inherit', 'later', 'IMMEDIATE', '', null])(
    'rejects %j and does not write',
    async (mode) => {
      await expect(put({ default_invoice_timing_mode: mode, tenant_id: OTHER })).rejects.toMatchObject({ statusCode: 400 })
      expect(db.writes).toEqual([])
      expect(db.tenants.every((row) => row.default_invoice_timing_mode === 'off')).toBe(true)
    },
  )

  it('prevents a cross-tenant write even when the body names another tenant', async () => {
    await put({ tenant_id: OTHER, default_invoice_timing_mode: 'immediate' })
    expect(db.writes[0].filters.id).toBe(TENANT)
    expect(db.tenants.find((row) => row.id === OTHER)?.default_invoice_timing_mode).toBe('off')
    expect(db.tenants.find((row) => row.id === TENANT)?.default_invoice_timing_mode).toBe('immediate')
  })

  it('does not write when the admin has no tenant', async () => {
    mocks.requireAdminProfile.mockResolvedValue({ id: 'admin-1', tenant_id: '', role: 'admin' })
    await expect(put({ default_invoice_timing_mode: 'immediate', tenant_id: OTHER })).rejects.toMatchObject({ statusCode: 400 })
    expect(db.writes).toEqual([])
  })
})

describe('POST /api/admin/course-categories/save invoice timing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    db = freshDb()
    mocks.getAuthenticatedUser.mockResolvedValue({
      id: 'admin-1',
      role: 'admin',
      tenant_id: TENANT,
      db_user_id: 'db-admin-1',
    })
    mocks.getSupabaseAdmin.mockReturnValue({
      from: (table: string) => {
        if (table === 'course_categories') return categoryQuery()
        throw new Error(`unexpected table ${table}`)
      },
    })
  })

  async function save(body: unknown) {
    mocks.readBody.mockResolvedValue(body)
    const handler = (await import('~/server/api/admin/course-categories/save.post')).default as (event: unknown) => Promise<{ success: boolean; data: CategoryRow }>
    return handler({})
  }

  it.each(['inherit', 'off', 'immediate'] as const)('accepts %s', async (mode) => {
    const result = await save({
      categoryId: 'cat-own',
      name: 'VKU',
      tenant_id: OTHER,
      invoice_timing_mode: mode,
    })
    expect(result.data.invoice_timing_mode).toBe(mode)
    expect(db.categories.find((row) => row.id === 'cat-own')?.invoice_timing_mode).toBe(mode)
    expect(db.categories.find((row) => row.id === 'cat-foreign')?.invoice_timing_mode).toBe('inherit')
    expect(db.writes[0].filters).toMatchObject({ id: 'cat-own', tenant_id: TENANT })
    expect(db.writes[0].payload.tenant_id).toBeUndefined()
  })

  it.each(['days_before_start', 'on_confirmed', 'later', 'IMMEDIATE', ''])(
    'rejects %j and does not write',
    async (mode) => {
      await expect(save({
        categoryId: 'cat-own',
        name: 'VKU',
        invoice_timing_mode: mode,
      })).rejects.toMatchObject({ statusCode: 400 })
      expect(db.writes).toEqual([])
      expect(db.categories.every((row) => row.invoice_timing_mode === 'inherit')).toBe(true)
    },
  )

  it('prevents a cross-tenant category write', async () => {
    await expect(save({
      categoryId: 'cat-foreign',
      name: 'Fremd',
      tenant_id: OTHER,
      invoice_timing_mode: 'immediate',
    })).rejects.toMatchObject({ statusCode: 404 })
    expect(db.categories.find((row) => row.id === 'cat-foreign')?.invoice_timing_mode).toBe('inherit')
    expect(db.categories.find((row) => row.id === 'cat-own')?.invoice_timing_mode).toBe('inherit')
    expect(db.writes).toEqual([])
  })

  it('keeps an omitted timing value unchanged', async () => {
    const result = await save({ categoryId: 'cat-own', name: 'VKU neu' })
    expect(result.data.invoice_timing_mode).toBe('inherit')
    expect(db.writes[0].payload.invoice_timing_mode).toBeUndefined()
  })

  it('creates a category on the authenticated tenant', async () => {
    const result = await save({
      name: 'Neue Kursart',
      tenant_id: OTHER,
      invoice_timing_mode: 'immediate',
    })
    expect(result.data.tenant_id).toBe(TENANT)
    expect(result.data.invoice_timing_mode).toBe('immediate')
    expect(db.categories.find((row) => row.id === 'cat-foreign')?.tenant_id).toBe(OTHER)
  })
})

describe('course invoice timing default resolution', () => {
  it('tenant immediate + category inherit + course null is immediate', () => {
    expect(resolveCourseInvoiceTiming({
      courseMode: null,
      categoryMode: 'inherit',
      tenantMode: 'immediate',
    })).toBe('immediate')
  })

  it('tenant off + category immediate + course null is immediate', () => {
    expect(resolveCourseInvoiceTiming({
      courseMode: null,
      categoryMode: 'immediate',
      tenantMode: 'off',
    })).toBe('immediate')
  })

  it('tenant immediate + category off + course null is off', () => {
    expect(resolveCourseInvoiceTiming({
      courseMode: null,
      categoryMode: 'off',
      tenantMode: 'immediate',
    })).toBe('off')
  })

  it('tenant immediate + category inherit + course immediate is immediate', () => {
    expect(resolveCourseInvoiceTiming({
      courseMode: 'immediate',
      categoryMode: 'inherit',
      tenantMode: 'immediate',
    })).toBe('immediate')
  })
})

describe('course invoice timing persistence stays untouched', () => {
  it('keeps course null and course immediate', () => {
    expect(normalizeCourseInvoiceTimingForSave({
      paymentMethod: 'INVOICE',
      invoiceTimingMode: null,
    })).toEqual({ invoice_timing_mode: null })
    expect(normalizeCourseInvoiceTimingForSave({
      paymentMethod: 'INVOICE',
      invoiceTimingMode: 'immediate',
    })).toEqual({ invoice_timing_mode: 'immediate' })
  })

  it('does not backfill existing course rows', () => {
    const sql = read('migrations/20261003_courses_invoice_timing_mode.sql')
    expect(sql).not.toMatch(/\bUPDATE\b/i)
    expect(sql).not.toMatch(/\bINSERT\s+INTO\b/i)
    expect(sql).toContain("invoice_timing_mode IS NULL OR invoice_timing_mode = 'immediate'")
  })

  it('keeps the new admin APIs off the billing and course-override paths', () => {
    const tenantPut = read('server/api/admin/tenant/course-invoice-timing.put.ts')
    const categorySave = read('server/api/admin/course-categories/save.post.ts')
    const resolver = read('server/utils/course-invoice-timing.ts')
    const billing = read('server/utils/public-course-invoice.ts')
    expect(tenantPut).toContain(".eq('id', profile.tenant_id)")
    expect(tenantPut).toContain('default_invoice_timing_mode')
    expect(tenantPut).not.toContain('tenant_settings')
    expect(tenantPut).not.toContain("from('courses')")
    expect(tenantPut).not.toContain("from('course_categories')")
    expect(categorySave).toContain("'invoice_timing_mode'")
    expect(categorySave).toContain(".eq('tenant_id', tenantId)")
    expect(categorySave).not.toContain("from('courses')")
    expect(resolver).toContain("if (course === 'immediate') return 'immediate'")
    expect(billing).toContain('resolveCourseInvoiceTiming')
  })

  it('exposes tenant and category controls without replacing the course override', () => {
    const profile = read('pages/admin/profile.vue')
    const courses = read('pages/admin/courses.vue')
    expect(profile).toContain('Standard-Rechnungsstellung für Kurse')
    expect(profile).toContain('/api/admin/tenant/course-invoice-timing')
    expect(profile).toContain('courseInvoiceTimingDefault')
    expect(profile).toContain('invoice_payments_enabled')
    expect(profile).toContain('autoInvoiceOnComplete')
    expect(profile).toContain('Keine automatische Rechnungsstellung als Default.')
    expect(profile).toContain('ohne abweichenden Override können sofort abrechnen.')

    const categoryAt = courses.indexOf('v-model="categoryForm.invoice_timing_mode"')
    const categoryBlock = courses.slice(categoryAt, categoryAt + 1600)
    expect(categoryBlock).toContain('value="inherit">Standard')
    expect(categoryBlock).toContain('value="off">Aus')
    expect(categoryBlock).toContain('value="immediate">Sofort')
    expect(categoryBlock).toContain('Übernimmt die Standard-Rechnungsstellung der Fahrschule.')
    expect(categoryBlock).toContain('Keine automatische Rechnungsstellung für diese Kursart.')
    expect(categoryBlock).toContain('sofort erstellt und verschickt.')

    const courseAt = courses.indexOf('v-model="newCourse.invoice_timing_mode"')
    const courseBlock = courses.slice(courseAt, courseAt + 500)
    expect(courseBlock).toContain(':value="null">Standard')
    expect(courseBlock).toContain('value="immediate">Sofort')
    expect(courseBlock).not.toContain('value="off"')
    expect(courseBlock).not.toContain('value="inherit"')
  })
})
