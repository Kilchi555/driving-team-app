/**
 * HTTP-level contracts for split invoice settings + unauthorized / cross-tenant.
 * Mocked Supabase only — no Production access.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  APPOINTMENT_INVOICE_PAYMENTS_KEY,
  COURSE_INVOICE_PAYMENTS_KEY,
  LEGACY_INVOICE_PAYMENTS_KEY,
} from '../tenant-default-payment-method'
import { paymentPolicyFromTenantSettings } from '../resolve-online-booking-payment-method'

type SettingRow = { tenant_id: string; setting_value: Record<string, unknown> }
type AuthUser = { id: string; tenant_id: string; role: string }
type H3ErrorOpts = { statusCode?: number; statusMessage?: string }
type UpsertRow = {
  tenant_id: string
  setting_value: string | Record<string, unknown>
  category: string
  setting_key: string
}

const TENANT_A = 'tenant-a'
const TENANT_B = 'tenant-b'

function createDb() {
  return {
    settings: [
      {
        tenant_id: TENANT_A,
        setting_value: {
          [LEGACY_INVOICE_PAYMENTS_KEY]: true,
          [COURSE_INVOICE_PAYMENTS_KEY]: false,
          [APPOINTMENT_INVOICE_PAYMENTS_KEY]: true,
          default_payment_method: 'wallee',
        },
      },
      {
        tenant_id: TENANT_B,
        setting_value: {
          [LEGACY_INVOICE_PAYMENTS_KEY]: false,
          default_payment_method: 'wallee',
        },
      },
    ] as SettingRow[],
    tenants: [
      { id: TENANT_A, slug: 'tenant-a' },
      { id: TENANT_B, slug: 'tenant-b' },
    ],
  }
}

let db = createDb()
let auth: AuthUser | null = {
  id: 'user-a',
  tenant_id: TENANT_A,
  role: 'admin',
}
let querySlug: string | undefined

function makeStatusError(opts: H3ErrorOpts): Error & { statusCode?: number } {
  const err = new Error(opts.statusMessage || 'Error') as Error & { statusCode?: number }
  err.statusCode = opts.statusCode
  return err
}

function installMocks() {
  vi.doMock('h3', async () => {
    const actual = await vi.importActual<typeof import('h3')>('h3')
    return {
      ...actual,
      getQuery: () => (querySlug ? { slug: querySlug } : {}),
      readBody: async () => ({
        category: 'payment',
        setting_key: 'payment_settings',
        setting_value: JSON.stringify({
          [LEGACY_INVOICE_PAYMENTS_KEY]: true,
          [COURSE_INVOICE_PAYMENTS_KEY]: true,
          [APPOINTMENT_INVOICE_PAYMENTS_KEY]: false,
          default_payment_method: 'wallee',
        }),
        setting_type: 'json',
      }),
      createError: (opts: H3ErrorOpts) => makeStatusError(opts),
      defineEventHandler: <T>(fn: T) => fn,
    }
  })

  vi.doMock('~/server/utils/auth', () => ({
    getAuthenticatedUser: async () => auth,
    requireAdminProfile: async () => {
      if (!auth) throw makeStatusError({ statusCode: 401, statusMessage: 'Unauthorized' })
      if (auth.role !== 'admin') throw makeStatusError({ statusCode: 403, statusMessage: 'Forbidden' })
      return { id: auth.id, tenant_id: auth.tenant_id, role: auth.role }
    },
  }))

  vi.doMock('~/server/utils/supabase-admin', () => ({
    getSupabaseAdmin: () => ({
      from(table: string) {
        if (table === 'tenants') {
          return {
            select() {
              return {
                eq(_col: string, val: string) {
                  return {
                    single: async () => {
                      const row = db.tenants.find((t) => t.slug === val)
                      return row
                        ? { data: row, error: null }
                        : { data: null, error: { message: 'not found' } }
                    },
                  }
                },
              }
            },
          }
        }
        if (table === 'tenant_settings') {
          const filters: Record<string, string> = {}
          const api = {
            select() {
              return api
            },
            eq(col: string, val: string) {
              filters[col] = val
              return api
            },
            maybeSingle: async () => {
              const row = db.settings.find((s) => s.tenant_id === filters.tenant_id)
              return { data: row ? { setting_value: row.setting_value } : null, error: null }
            },
            upsert: async (rows: UpsertRow[]) => {
              for (const row of rows) {
                const value = typeof row.setting_value === 'string'
                  ? JSON.parse(row.setting_value) as Record<string, unknown>
                  : row.setting_value
                const existing = db.settings.find((s) => s.tenant_id === row.tenant_id)
                if (existing) existing.setting_value = value
                else db.settings.push({ tenant_id: row.tenant_id, setting_value: value })
              }
              return { error: null }
            },
          }
          return api
        }
        throw new Error(`Unexpected table ${table}`)
      },
    }),
  }))
}

type InvoiceSettingsHandler = (event: unknown) => Promise<Record<string, boolean>>
type TenantSettingsPostHandler = (event: unknown) => Promise<{ success: boolean }>

describe('invoice-payment-settings GET', () => {
  beforeEach(() => {
    db = createDb()
    auth = { id: 'user-a', tenant_id: TENANT_A, role: 'admin' }
    querySlug = undefined
    vi.resetModules()
    installMocks()
  })

  it('returns tenant A resolved flags from auth tenant_id', async () => {
    const handler = (await import('~/server/api/settings/invoice-payment-settings.get')).default as InvoiceSettingsHandler
    const result = await handler({})
    expect(result).toEqual({
      [LEGACY_INVOICE_PAYMENTS_KEY]: true,
      [COURSE_INVOICE_PAYMENTS_KEY]: false,
      [APPOINTMENT_INVOICE_PAYMENTS_KEY]: true,
    })
  })

  it('rejects unauthenticated requests without slug', async () => {
    auth = null
    const handler = (await import('~/server/api/settings/invoice-payment-settings.get')).default as InvoiceSettingsHandler
    await expect(handler({})).rejects.toMatchObject({ statusCode: 401 })
  })

  it('slug=tenant-b returns only tenant B flags (no leak from A)', async () => {
    auth = null
    querySlug = 'tenant-b'
    const handler = (await import('~/server/api/settings/invoice-payment-settings.get')).default as InvoiceSettingsHandler
    const result = await handler({})
    expect(result).toEqual({
      [LEGACY_INVOICE_PAYMENTS_KEY]: false,
      [COURSE_INVOICE_PAYMENTS_KEY]: false,
      [APPOINTMENT_INVOICE_PAYMENTS_KEY]: false,
    })
  })

  it('authenticated tenant A cannot read tenant B via foreign slug alone when auth wins', async () => {
    // Auth tenant_id takes precedence over slug when present.
    querySlug = 'tenant-b'
    const handler = (await import('~/server/api/settings/invoice-payment-settings.get')).default as InvoiceSettingsHandler
    const result = await handler({})
    expect(result[COURSE_INVOICE_PAYMENTS_KEY]).toBe(false)
    expect(result[APPOINTMENT_INVOICE_PAYMENTS_KEY]).toBe(true)
    expect(result[LEGACY_INVOICE_PAYMENTS_KEY]).toBe(true)
  })
})

describe('tenant-settings POST', () => {
  beforeEach(() => {
    db = createDb()
    auth = { id: 'user-a', tenant_id: TENANT_A, role: 'admin' }
    querySlug = undefined
    vi.resetModules()
    installMocks()
  })

  it('rejects unauthenticated settings write', async () => {
    auth = null
    const handler = (await import('~/server/api/admin/tenant-settings.post')).default as TenantSettingsPostHandler
    await expect(handler({})).rejects.toMatchObject({ statusCode: 401 })
  })

  it('rejects non-admin settings write', async () => {
    auth = { id: 'staff-a', tenant_id: TENANT_A, role: 'staff' }
    const handler = (await import('~/server/api/admin/tenant-settings.post')).default as TenantSettingsPostHandler
    await expect(handler({})).rejects.toMatchObject({ statusCode: 403 })
  })

  it('save → reload persists scoped keys for auth tenant only (no cross-tenant write)', async () => {
    const postHandler = (await import('~/server/api/admin/tenant-settings.post')).default as TenantSettingsPostHandler
    await expect(postHandler({})).resolves.toEqual({ success: true })

    const savedA = db.settings.find((s) => s.tenant_id === TENANT_A)!.setting_value
    expect(savedA[COURSE_INVOICE_PAYMENTS_KEY]).toBe(true)
    expect(savedA[APPOINTMENT_INVOICE_PAYMENTS_KEY]).toBe(false)
    expect(savedA[LEGACY_INVOICE_PAYMENTS_KEY]).toBe(true)

    const untouchedB = db.settings.find((s) => s.tenant_id === TENANT_B)!.setting_value
    expect(untouchedB[COURSE_INVOICE_PAYMENTS_KEY]).toBeUndefined()
    expect(untouchedB[LEGACY_INVOICE_PAYMENTS_KEY]).toBe(false)

    const getHandler = (await import('~/server/api/settings/invoice-payment-settings.get')).default as InvoiceSettingsHandler
    const reloaded = await getHandler({})
    expect(reloaded).toEqual({
      [LEGACY_INVOICE_PAYMENTS_KEY]: true,
      [COURSE_INVOICE_PAYMENTS_KEY]: true,
      [APPOINTMENT_INVOICE_PAYMENTS_KEY]: false,
    })
  })
})

describe('cross-tenant booking policy isolation', () => {
  beforeEach(() => {
    db = createDb()
  })

  it('tenant B legacy=false does not inherit tenant A appointment invoice', () => {
    const a = db.settings.find((s) => s.tenant_id === TENANT_A)!.setting_value
    const b = db.settings.find((s) => s.tenant_id === TENANT_B)!.setting_value
    expect(paymentPolicyFromTenantSettings({
      settings: a,
      walleeEnabled: true,
    }).invoiceEnabled).toBe(true)
    expect(paymentPolicyFromTenantSettings({
      settings: b,
      walleeEnabled: true,
    }).invoiceEnabled).toBe(false)
  })
})
