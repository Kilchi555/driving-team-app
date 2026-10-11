/**
 * Category enrollment_fields save/reload + tenant isolation (mocked Supabase).
 * Does not touch Production / create real enrollments.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_CATEGORY_ENROLLMENT_FIELDS,
  resolveCategoryEnrollmentFields,
} from '~/utils/category-enrollment-fields'

type CategoryRow = Record<string, unknown>
type AuthUser = { id: string; tenant_id: string; role: string; db_user_id?: string }

const TENANT = 'tenant-a'
const OTHER = 'tenant-b'

function createDb() {
  return {
    categories: [] as CategoryRow[],
  }
}

let db = createDb()
let auth: AuthUser | null = {
  id: 'user-a',
  tenant_id: TENANT,
  role: 'admin',
  db_user_id: 'profile-a',
}

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUser: async () => auth,
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
      if (table !== 'course_categories') {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({ data: null, error: null }),
                }
              },
            }
          },
        }
      }

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
            eq(col1: string, val1: string) {
              return {
                eq(col2: string, val2: string) {
                  return {
                    select() {
                      return {
                        single: async () => {
                          const id = col1 === 'id' ? val1 : val2
                          const tenantId = col1 === 'tenant_id' ? val1 : val2
                          const row = db.categories.find(
                            (c) => c.id === id && c.tenant_id === tenantId,
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
    },
  }),
}))

function event(body: Record<string, unknown>) {
  return { _body: body }
}

vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')
  return {
    ...actual,
    readBody: async (e: { _body: Record<string, unknown> }) => e._body,
    createError: (opts: { statusCode: number; statusMessage: string }) =>
      Object.assign(new Error(opts.statusMessage), opts),
  }
})

type CategorySaveHandler = (event: { _body: Record<string, unknown> }) => Promise<{
  success: boolean
  data: CategoryRow
}>

describe('POST /api/admin/course-categories/save enrollment_fields', () => {
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

  it('persists Nothelfer-like license_number=hidden and reloads', async () => {
    const handler = (await import('~/server/api/admin/course-categories/save.post'))
      .default as CategorySaveHandler

    const created = await handler(event({
      name: 'Nothelfer',
      code: 'NH',
      enrollment_fields: {
        ...DEFAULT_CATEGORY_ENROLLMENT_FIELDS,
        license_number: 'hidden',
      },
      session_structure: { sessions: [{ duration_hours: 8 }] },
    }))

    expect(created.success).toBe(true)
    expect(created.data.tenant_id).toBe(TENANT)
    expect(created.data.enrollment_fields).toMatchObject({
      license_number: 'hidden',
      street: 'required',
    })

    const updated = await handler(event({
      categoryId: created.data.id,
      name: 'Nothelfer',
      code: 'NH',
      enrollment_fields: {
        ...DEFAULT_CATEGORY_ENROLLMENT_FIELDS,
        license_number: 'hidden',
        birthdate: 'optional',
      },
    }))

    expect(updated.data.enrollment_fields).toMatchObject({
      license_number: 'hidden',
      birthdate: 'optional',
    })
    expect(resolveCategoryEnrollmentFields(updated.data.enrollment_fields).license_number).toBe(
      'hidden',
    )
  })

  it('rejects invalid enrollment_fields modes', async () => {
    const handler = (await import('~/server/api/admin/course-categories/save.post'))
      .default as CategorySaveHandler

    await expect(
      handler(event({
        name: 'Bad',
        code: 'BAD',
        enrollment_fields: { street: 'maybe' },
        session_structure: { sessions: [{ duration_hours: 8 }] },
      })),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('cannot update another tenant category by id (tenant isolation)', async () => {
    const handler = (await import('~/server/api/admin/course-categories/save.post'))
      .default as CategorySaveHandler

    // Seed foreign category directly in mock DB
    db.categories.push({
      id: 'foreign-cat',
      tenant_id: OTHER,
      name: 'Other',
      code: 'OTH',
      enrollment_fields: DEFAULT_CATEGORY_ENROLLMENT_FIELDS,
    })

    await expect(
      handler(event({
        categoryId: 'foreign-cat',
        name: 'Hijack',
        code: 'HJK',
        enrollment_fields: {
          ...DEFAULT_CATEGORY_ENROLLMENT_FIELDS,
          street: 'hidden',
        },
      })),
    ).rejects.toMatchObject({ statusCode: 404 })

    const foreign = db.categories.find((c) => c.id === 'foreign-cat')
    expect(foreign?.name).toBe('Other')
    expect(foreign?.enrollment_fields).toEqual(DEFAULT_CATEGORY_ENROLLMENT_FIELDS)
  })

  it('omitted enrollment_fields on create does not invent invalid config', async () => {
    const handler = (await import('~/server/api/admin/course-categories/save.post'))
      .default as CategorySaveHandler

    const created = await handler(event({
      name: 'Default Cat',
      code: 'DEF',
      session_structure: { sessions: [{ duration_hours: 8 }] },
    }))

    // Column default applied by DB in production; here field simply absent unless sent.
    // Resolver still yields all-required when null/undefined.
    expect(
      resolveCategoryEnrollmentFields(created.data.enrollment_fields ?? null),
    ).toEqual(DEFAULT_CATEGORY_ENROLLMENT_FIELDS)
  })
})
