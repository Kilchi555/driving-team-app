/**
 * Category default_payment_method save/upsert validation (mocked Supabase).
 * Does not touch Production.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

type SettingRow = { tenant_id: string; setting_value: Record<string, unknown> }
type CategoryRow = Record<string, unknown>
type CourseRow = Record<string, unknown>
type AuthUser = { id: string; tenant_id: string; role: string; db_user_id?: string }

const TENANT = 'tenant-a'
const OTHER = 'tenant-b'

function createDb() {
  return {
    settings: [
      {
        tenant_id: TENANT,
        setting_value: { invoice_payments_enabled: false, default_payment_method: 'wallee' },
      },
      {
        tenant_id: OTHER,
        setting_value: { invoice_payments_enabled: true, default_payment_method: 'invoice' },
      },
    ] as SettingRow[],
    categories: [] as CategoryRow[],
    courses: [] as CourseRow[],
  }
}

let db = createDb()
let auth: AuthUser | null = {
  id: 'user-a',
  tenant_id: TENANT,
  role: 'admin',
  db_user_id: 'profile-a',
}

function paymentSettingsQuery() {
  const filters: Record<string, string> = {}
  const api = {
    eq(col: string, val: string) {
      filters[col] = val
      return api
    },
    maybeSingle: async () => {
      const tenantId = filters.tenant_id
      const row = db.settings.find((s) => s.tenant_id === tenantId)
      return { data: row ? { setting_value: row.setting_value } : null, error: null }
    },
  }
  return {
    select() {
      return api
    },
  }
}

vi.mock('~/server/utils/assert-tenant-subscription-writable', () => ({
  assertTenantSubscriptionWritable: vi.fn(async () => ({ reasonCode: 'writable' })),
  SAAS_SUBSCRIPTION_REQUIRED_CODE: 'saas_subscription_required',
}))

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUser: async () => auth,
  requireAdminProfile: async () => {
    if (!auth) throw Object.assign(new Error('Unauthorized'), { statusCode: 401 })
    if (auth.role !== 'admin') throw Object.assign(new Error('Forbidden'), { statusCode: 403 })
    return { id: auth.db_user_id || auth.id, tenant_id: auth.tenant_id, role: auth.role }
  },
}))

vi.mock('~/server/utils/rate-limiter', () => ({
  checkRateLimit: async () => ({ allowed: true }),
}))

vi.mock('~/server/utils/auto-category-waitlist', () => ({
  syncAutoCategoryWaitlists: vi.fn(async () => undefined),
}))

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: () => ({
    from(table: string) {
      if (table === 'tenant_settings') return paymentSettingsQuery()

      if (table === 'course_categories') {
        return {
          insert(payload: Record<string, unknown>) {
            return {
              select() {
                return {
                  single: async () => {
                    const row: CategoryRow = {
                      id: `cat-${db.categories.length + 1}`,
                      tenant_id: payload.tenant_id,
                      ...payload,
                    }
                    db.categories.push(row)
                    return { data: row, error: null }
                  },
                }
              },
            }
          },
          update(fields: Record<string, unknown>) {
            return {
              eq(_col: string, val: string) {
                return {
                  eq() {
                    return {
                      select() {
                        return {
                          single: async () => {
                            const row = db.categories.find(
                              (c) => c.id === val && c.tenant_id === auth!.tenant_id,
                            )
                            if (!row) return { data: null, error: { code: 'PGRST116' } }
                            Object.assign(row, fields)
                            return { data: row, error: null }
                          },
                        }
                      },
                    }
                  },
                }
              },
            }
          },
          select() {
            const filters: Record<string, string> = {}
            const api = {
              eq(col: string, val: string) {
                filters[col] = val
                return api
              },
              maybeSingle: async () => {
                const row = db.categories.find(
                  (c) =>
                    (!filters.id || c.id === filters.id)
                    && (!filters.tenant_id || c.tenant_id === filters.tenant_id),
                )
                return { data: row || null, error: null }
              },
              single: async () => {
                const row = db.categories.find(
                  (c) =>
                    (!filters.id || c.id === filters.id)
                    && (!filters.tenant_id || c.tenant_id === filters.tenant_id),
                )
                return { data: row || null, error: row ? null : { code: 'PGRST116' } }
              },
            }
            return api
          },
        }
      }

      if (table === 'courses') {
        return {
          insert(payload: Record<string, unknown>) {
            return {
              select() {
                return {
                  single: async () => {
                    const row: CourseRow = { id: `course-${db.courses.length + 1}`, ...payload }
                    db.courses.push(row)
                    return { data: row, error: null }
                  },
                }
              },
            }
          },
          update(fields: Record<string, unknown>) {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      select() {
                        return {
                          single: async () => {
                            const row = db.courses[0]
                            if (!row) return { data: null, error: { message: 'missing' } }
                            Object.assign(row, fields)
                            return { data: row, error: null }
                          },
                        }
                      },
                    }
                  },
                }
              },
            }
          },
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      single: async () => ({ data: db.courses[0] || null, error: null }),
                      maybeSingle: async () => ({ data: db.courses[0] || null, error: null }),
                    }
                  },
                  single: async () => ({ data: { require_instructor_confirmation: false }, error: null }),
                }
              },
            }
          },
        }
      }

      if (table === 'tenants') {
        return {
          select() {
            return {
              eq() {
                return {
                  single: async () => ({
                    data: { require_instructor_confirmation: false },
                    error: null,
                  }),
                }
              },
            }
          },
        }
      }

      if (table === 'rooms') {
        return {
          select() {
            return {
              eq() {
                return {
                  in: async () => ({ data: [], error: null }),
                  maybeSingle: async () => ({ data: null, error: null }),
                }
              },
            }
          },
        }
      }

      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      }
    },
  }),
}))

vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')
  return {
    ...actual,
    readBody: async (event: { _body: Record<string, unknown> }) => event._body,
    createError: (opts: { statusCode?: number; statusMessage?: string }) =>
      Object.assign(new Error(opts.statusMessage || 'error'), opts),
  }
})

function event(body: Record<string, unknown>) {
  return { _body: body }
}

type CategorySaveHandler = (event: { _body: Record<string, unknown> }) => Promise<{
  data: CategoryRow
}>
type CourseUpsertHandler = (event: { _body: Record<string, unknown> }) => Promise<unknown>

describe('category default_payment_method HTTP save', () => {
  beforeEach(() => {
    db = createDb()
    auth = {
      id: 'user-a',
      tenant_id: TENANT,
      role: 'admin',
      db_user_id: 'profile-a',
    }
    vi.resetModules()
  })

  it('persists NULL and explicit defaults on create', async () => {
    const handler = (await import('~/server/api/admin/course-categories/save.post')).default as CategorySaveHandler

    const createdNull = await handler(event({
      name: 'VKU Null',
      code: 'VKUN',
      default_payment_method: null,
      session_structure: { sessions: [{ duration_hours: 8 }] },
    }))
    expect(createdNull.data.default_payment_method).toBeNull()

    const createdWallee = await handler(event({
      name: 'VKU Online',
      code: 'VKUO',
      default_payment_method: 'WALLEE',
      session_structure: { sessions: [{ duration_hours: 8 }] },
    }))
    expect(createdWallee.data.default_payment_method).toBe('WALLEE')
  })

  it('allows INVOICE category override when tenant invoice payment option is disabled', async () => {
    const handler = (await import('~/server/api/admin/course-categories/save.post')).default as CategorySaveHandler
    const created = await handler(event({
      name: 'VKU Invoice Override',
      code: 'VKUI',
      default_payment_method: 'INVOICE',
      session_structure: { sessions: [{ duration_hours: 8 }] },
    }))
    expect(created.data.default_payment_method).toBe('INVOICE')
    expect(created.data.tenant_id).toBe(TENANT)
    expect(db.categories).toHaveLength(1)
  })

  it('allows INVOICE when tenant invoice payments are enabled', async () => {
    auth = { id: 'user-b', tenant_id: OTHER, role: 'admin', db_user_id: 'profile-b' }
    const handler = (await import('~/server/api/admin/course-categories/save.post')).default as CategorySaveHandler
    const created = await handler(event({
      name: 'VKU Invoice OK',
      code: 'VKUIOK',
      default_payment_method: 'INVOICE',
      session_structure: { sessions: [{ duration_hours: 8 }] },
    }))
    expect(created.data.default_payment_method).toBe('INVOICE')
    expect(created.data.tenant_id).toBe(OTHER)
  })

  it('rejects invalid enum values', async () => {
    const handler = (await import('~/server/api/admin/course-categories/save.post')).default as CategorySaveHandler
    await expect(handler(event({
      name: 'Bad',
      code: 'BAD',
      default_payment_method: 'wallee',
      session_structure: { sessions: [{ duration_hours: 8 }] },
    }))).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('course upsert INVOICE admin override', () => {
  beforeEach(() => {
    db = createDb()
    auth = {
      id: 'user-a',
      tenant_id: TENANT,
      role: 'admin',
      db_user_id: 'profile-a',
    }
    vi.resetModules()
  })

  it('allows creating a course with INVOICE when customer invoice option is disabled', async () => {
    const handler = (await import('~/server/api/admin/courses/upsert.post')).default as CourseUpsertHandler
    await handler(event({
      courseData: {
        name: 'Course',
        city: 'Zürich',
        payment_method: 'INVOICE',
        status: 'draft',
      },
      sessions: [],
    }))
    expect(db.courses).toHaveLength(1)
    expect(db.courses[0]?.payment_method).toBe('INVOICE')
    expect(db.courses[0]?.tenant_id).toBe(TENANT)
  })

  it('inherits INVOICE from category override when customer invoice option is disabled', async () => {
    db.categories.push({
      id: 'cat-invoice-disabled',
      tenant_id: TENANT,
      default_payment_method: 'INVOICE',
    })
    const handler = (await import('~/server/api/admin/courses/upsert.post')).default as CourseUpsertHandler
    await handler(event({
      courseData: {
        name: 'Inherited invoice',
        city: 'Zürich',
        course_category_id: 'cat-invoice-disabled',
        status: 'draft',
      },
      sessions: [],
    }))
    expect(db.courses[0]?.payment_method).toBe('INVOICE')
  })
})

describe('course upsert category → payment_method inheritance', () => {
  beforeEach(() => {
    db = createDb()
    auth = {
      id: 'user-a',
      tenant_id: TENANT,
      role: 'admin',
      db_user_id: 'profile-a',
    }
    vi.resetModules()
  })

  async function seedCategory(defaultPaymentMethod: string | null) {
    const row: CategoryRow = {
      id: `cat-${db.categories.length + 1}`,
      tenant_id: TENANT,
      name: 'Cat',
      code: `C${db.categories.length + 1}`,
      default_payment_method: defaultPaymentMethod,
    }
    db.categories.push(row)
    return row
  }

  it('inherits WALLEE / CASH_ON_SITE / INVOICE from category when payment_method is omitted', async () => {
    const handler = (await import('~/server/api/admin/courses/upsert.post')).default as CourseUpsertHandler

    // TENANT has invoice_payments_enabled=false; INVOICE still inherits as admin override.
    for (const method of ['WALLEE', 'CASH_ON_SITE', 'INVOICE'] as const) {
      db.courses = []
      const cat = await seedCategory(method)
      await handler(event({
        courseData: {
          name: `Course ${method}`,
          city: 'Zürich',
          course_category_id: cat.id,
          status: 'draft',
        },
        sessions: [],
      }))
      expect(db.courses[0]?.payment_method).toBe(method)
      expect(db.courses[0]?.tenant_id).toBe(TENANT)
    }
  })

  it('inherits tenant default when category default is NULL', async () => {
    const cat = await seedCategory(null)
    const handler = (await import('~/server/api/admin/courses/upsert.post')).default as CourseUpsertHandler
    await handler(event({
      courseData: {
        name: 'Tenant default course',
        city: 'Zürich',
        course_category_id: cat.id,
        status: 'draft',
      },
      sessions: [],
    }))
    // TENANT settings default_payment_method = wallee
    expect(db.courses[0]?.payment_method).toBe('WALLEE')
  })

  it('keeps an explicit course payment_method and does not overwrite from category', async () => {
    const cat = await seedCategory('CASH_ON_SITE')
    const handler = (await import('~/server/api/admin/courses/upsert.post')).default as CourseUpsertHandler
    await handler(event({
      courseData: {
        name: 'Explicit',
        city: 'Zürich',
        course_category_id: cat.id,
        payment_method: 'WALLEE',
        status: 'draft',
      },
      sessions: [],
    }))
    expect(db.courses[0]?.payment_method).toBe('WALLEE')
  })

  it('does not change an existing course payment_method when category default differs', async () => {
    const cat = await seedCategory('CASH_ON_SITE')
    db.courses.push({
      id: 'course-existing',
      tenant_id: TENANT,
      name: 'Existing',
      payment_method: 'WALLEE',
      status: 'draft',
    })
    const handler = (await import('~/server/api/admin/courses/upsert.post')).default as CourseUpsertHandler
    await handler(event({
      courseId: 'course-existing',
      courseData: {
        name: 'Existing',
        city: 'Zürich',
        course_category_id: cat.id,
        payment_method: 'WALLEE',
        status: 'draft',
      },
      sessions: [],
    }))
    expect(db.courses[0]?.payment_method).toBe('WALLEE')
  })

  it('preserves existing payment_method when update omits the field', async () => {
    const handler = (await import('~/server/api/admin/courses/upsert.post')).default as CourseUpsertHandler
    for (const method of ['WALLEE', 'CASH_ON_SITE', 'INVOICE'] as const) {
      db.courses = [{
        id: `course-${method}`,
        tenant_id: method === 'INVOICE' ? OTHER : TENANT,
        name: `Existing ${method}`,
        payment_method: method,
        status: 'draft',
        invoice_timing_mode: method === 'INVOICE' ? 'immediate' : null,
      }]
      if (method === 'INVOICE') {
        auth = { id: 'user-b', tenant_id: OTHER, role: 'admin', db_user_id: 'profile-b' }
      } else {
        auth = { id: 'user-a', tenant_id: TENANT, role: 'admin', db_user_id: 'profile-a' }
      }
      await handler(event({
        courseId: `course-${method}`,
        courseData: {
          name: `Renamed ${method}`,
          city: 'Zürich',
          status: 'draft',
          // payment_method intentionally omitted
        },
        sessions: [],
      }))
      expect(db.courses[0]?.payment_method).toBe(method)
      expect(db.courses[0]?.name).toBe(`Renamed ${method}`)
      if (method === 'INVOICE') {
        expect(db.courses[0]?.invoice_timing_mode).toBe('immediate')
      }
    }
  })

  it('applies an explicit payment_method on update', async () => {
    db.courses.push({
      id: 'course-flip',
      tenant_id: TENANT,
      name: 'Flip',
      payment_method: 'WALLEE',
      status: 'draft',
    })
    const handler = (await import('~/server/api/admin/courses/upsert.post')).default as CourseUpsertHandler
    await handler(event({
      courseId: 'course-flip',
      courseData: {
        name: 'Flip',
        city: 'Zürich',
        payment_method: 'CASH_ON_SITE',
        status: 'draft',
      },
      sessions: [],
    }))
    expect(db.courses[0]?.payment_method).toBe('CASH_ON_SITE')
  })

  it('rejects foreign category ids and invalid payment methods', async () => {
    const handler = (await import('~/server/api/admin/courses/upsert.post')).default as CourseUpsertHandler
    db.categories.push({
      id: 'cat-other',
      tenant_id: OTHER,
      default_payment_method: 'CASH_ON_SITE',
    })
    await expect(handler(event({
      courseData: {
        name: 'Cross tenant',
        course_category_id: 'cat-other',
        status: 'draft',
      },
      sessions: [],
    }))).rejects.toMatchObject({ statusCode: 400 })
    expect(db.courses).toHaveLength(0)

    await expect(handler(event({
      courseData: {
        name: 'Bad method',
        payment_method: 'wallee',
        status: 'draft',
      },
      sessions: [],
    }))).rejects.toMatchObject({ statusCode: 400 })
    expect(db.courses).toHaveLength(0)
  })
})
