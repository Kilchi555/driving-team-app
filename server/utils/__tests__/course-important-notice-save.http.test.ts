/**
 * Category email_important_notice save/reload contract (mocked Supabase).
 * Does not touch Production / send real emails / create enrollments.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

// h3 helpers used by the handler
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

describe('POST /api/admin/course-categories/save email_important_notice', () => {
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

  it('persists add → reload → remove → reload for multiple hints', async () => {
    const handler = (await import('~/server/api/admin/course-categories/save.post'))
      .default as CategorySaveHandler

    const created = await handler(event({
      name: 'Audit Category',
      code: 'AUDIT',
      email_important_notice: 'AUDIT_HINT_ONE\nAUDIT_HINT_TWO',
      session_structure: { sessions: [{ duration_hours: 8 }] },
    }))

    expect(created.success).toBe(true)
    expect(created.data.email_important_notice).toBe('AUDIT_HINT_ONE\nAUDIT_HINT_TWO')
    expect(created.data.tenant_id).toBe(TENANT)

    // Simulate admin page reload: row still in DB with same order
    const reloaded = db.categories.find((c) => c.id === created.data.id)
    expect(reloaded?.email_important_notice).toBe('AUDIT_HINT_ONE\nAUDIT_HINT_TWO')

    // Remove one hint and save again
    const updated = await handler(event({
      categoryId: created.data.id,
      name: 'Audit Category',
      code: 'AUDIT',
      email_important_notice: 'AUDIT_HINT_TWO',
      session_structure: { sessions: [{ duration_hours: 8 }] },
    }))

    expect(updated.data.email_important_notice).toBe('AUDIT_HINT_TWO')
    expect(db.categories.find((c) => c.id === created.data.id)?.email_important_notice)
      .toBe('AUDIT_HINT_TWO')

    // Clear all hints
    const cleared = await handler(event({
      categoryId: created.data.id,
      name: 'Audit Category',
      code: 'AUDIT',
      email_important_notice: '',
      session_structure: { sessions: [{ duration_hours: 8 }] },
    }))
    expect(cleared.data.email_important_notice).toBe('')
  })

  it('does not silently drop email_important_notice on update of unrelated fields when provided', async () => {
    const handler = (await import('~/server/api/admin/course-categories/save.post'))
      .default as CategorySaveHandler

    const created = await handler(event({
      name: 'Keep Hints',
      code: 'KEEP',
      email_important_notice: 'Stay\nHere',
      session_structure: { sessions: [{ duration_hours: 8 }] },
    }))

    const updated = await handler(event({
      categoryId: created.data.id,
      name: 'Keep Hints Renamed',
      code: 'KEEP',
      email_important_notice: 'Stay\nHere',
      description: 'only description change',
      session_structure: { sessions: [{ duration_hours: 8 }] },
    }))

    expect(updated.data.name).toBe('Keep Hints Renamed')
    expect(updated.data.email_important_notice).toBe('Stay\nHere')
  })

  it('omitting email_important_notice does not wipe an existing value', async () => {
    const handler = (await import('~/server/api/admin/course-categories/save.post'))
      .default as CategorySaveHandler

    const created = await handler(event({
      name: 'Partial',
      code: 'PART',
      email_important_notice: 'Keep me',
      session_structure: { sessions: [{ duration_hours: 8 }] },
    }))

    const updated = await handler(event({
      categoryId: created.data.id,
      name: 'Partial Renamed',
      code: 'PART',
      // email_important_notice intentionally omitted
      session_structure: { sessions: [{ duration_hours: 8 }] },
    }))

    expect(updated.data.name).toBe('Partial Renamed')
    expect(updated.data.email_important_notice).toBe('Keep me')
  })

  it('enforces tenant isolation on update', async () => {
    const handler = (await import('~/server/api/admin/course-categories/save.post'))
      .default as CategorySaveHandler

    const created = await handler(event({
      name: 'Tenant A',
      code: 'TENA',
      email_important_notice: 'A only',
      session_structure: { sessions: [{ duration_hours: 8 }] },
    }))

    auth = {
      id: 'user-b',
      tenant_id: OTHER,
      role: 'admin',
      db_user_id: 'profile-b',
    }

    await expect(handler(event({
      categoryId: created.data.id,
      name: 'Hijack',
      code: 'TENA',
      email_important_notice: 'stolen',
      session_structure: { sessions: [{ duration_hours: 8 }] },
    }))).rejects.toMatchObject({ statusCode: 404 })

    // Original row untouched
    auth = {
      id: 'user-a',
      tenant_id: TENANT,
      role: 'admin',
      db_user_id: 'profile-a',
    }
    expect(db.categories.find((c) => c.id === created.data.id)?.email_important_notice)
      .toBe('A only')
    expect(db.categories.find((c) => c.id === created.data.id)?.tenant_id).toBe(TENANT)
  })
})
