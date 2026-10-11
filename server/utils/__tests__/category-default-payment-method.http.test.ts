/**
 * Category default_payment_method save/upsert validation (mocked Supabase).
 * Does not touch Production.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { INVOICE_PAYMENT_DISABLED_MESSAGE } from '~/utils/category-default-payment-method'

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

  it('rejects INVOICE when tenant invoice payments are disabled', async () => {
    const handler = (await import('~/server/api/admin/course-categories/save.post')).default as CategorySaveHandler
    await expect(handler(event({
      name: 'VKU Invoice',
      code: 'VKUI',
      default_payment_method: 'INVOICE',
      session_structure: { sessions: [{ duration_hours: 8 }] },
    }))).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: INVOICE_PAYMENT_DISABLED_MESSAGE,
    })
    expect(db.categories).toHaveLength(0)
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

describe('course upsert INVOICE gate', () => {
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

  it('rejects creating a course with INVOICE when invoices are disabled', async () => {
    const handler = (await import('~/server/api/admin/courses/upsert.post')).default as CourseUpsertHandler
    await expect(handler(event({
      courseData: {
        name: 'Course',
        city: 'Zürich',
        payment_method: 'INVOICE',
        status: 'draft',
      },
      sessions: [],
    }))).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: INVOICE_PAYMENT_DISABLED_MESSAGE,
    })
    expect(db.courses).toHaveLength(0)
  })
})
