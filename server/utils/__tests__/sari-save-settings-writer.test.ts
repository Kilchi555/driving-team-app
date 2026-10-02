import { beforeEach, describe, expect, it, vi } from 'vitest'

const TENANT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const OTHER_TENANT = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getHeader: vi.fn(() => null),
  getUser: vi.fn(),
  logAudit: vi.fn(async () => undefined),
  encryptSecret: vi.fn((value: string) => `enc:${value}`),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
    getHeader: mocks.getHeader,
  }
})

vi.mock('~/utils/supabase', () => ({
  getSupabaseServerWithSession: () => ({
    auth: { getUser: mocks.getUser },
  }),
}))

vi.mock('~/server/utils/encryption', () => ({
  encryptSecret: mocks.encryptSecret,
}))

vi.mock('~/server/utils/audit', () => ({
  logAudit: mocks.logAudit,
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

type SecretRow = {
  tenant_id: string
  secret_type: string
  secret_name: string
  secret_value: string
  updated_by?: string
}

const state = {
  secretError: null as { message: string } | null,
  order: [] as string[],
  upserts: [] as Array<{ rows: SecretRow[]; onConflict: string }>,
  tenantUpdates: [] as Array<{ tablePayload: unknown; tenantId: string }>,
}

function adminClient() {
  return {
    from(table: string) {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: 'user-1', tenant_id: TENANT, role: 'admin' },
                error: null,
              }),
            }),
          }),
        }
      }

      if (table === 'tenant_secrets') {
        return {
          upsert: async (rows: SecretRow[], options: { onConflict?: string }) => {
            state.order.push('secrets')
            state.upserts.push({
              rows,
              onConflict: options?.onConflict ?? '',
            })
            return { error: state.secretError }
          },
        }
      }

      if (table === 'tenants') {
        return {
          update: (tablePayload: unknown) => ({
            eq: async (_column: string, tenantId: string) => {
              state.order.push('tenants')
              state.tenantUpdates.push({ tablePayload, tenantId })
              return { error: null }
            },
          }),
        }
      }

      throw new Error(`unexpected table ${table}`)
    },
  }
}

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: () => adminClient(),
}))

type Handler = (event: unknown) => Promise<unknown>

async function postProfile(body: unknown) {
  mocks.readBody.mockResolvedValue(body)
  const handler = (await import('~/server/api/sari/save-settings.post')).default as Handler
  return handler({})
}

async function postCzv(body: unknown) {
  mocks.readBody.mockResolvedValue(body)
  const handler = (await import('~/server/api/sari/czv/save-settings.post')).default as Handler
  return handler({})
}

const profileCredentials = {
  sari_enabled: true,
  sari_environment: 'production',
  sari_client_id: 'id-a',
  sari_client_secret: 'secret-a',
  sari_username: 'user-a',
  sari_password: 'pass-a',
  tenant_id: OTHER_TENANT,
}

describe('SARI credential writers', () => {
  beforeEach(() => {
    state.secretError = null
    state.order = []
    state.upserts = []
    state.tenantUpdates = []
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null })
    mocks.logAudit.mockResolvedValue(undefined)
    mocks.encryptSecret.mockImplementation((value: string) => `enc:${value}`)
  })

  it('stores the four VKU credentials under sari_credentials and the reader secret names', async () => {
    await postProfile(profileCredentials)

    const rows = state.upserts[0]?.rows ?? []
    expect(rows.map((row) => [row.secret_type, row.secret_name])).toEqual([
      ['sari_credentials', 'sari_client_id'],
      ['sari_credentials', 'sari_client_secret'],
      ['sari_credentials', 'sari_username'],
      ['sari_credentials', 'sari_password'],
    ])
    expect(rows.map((row) => row.secret_value)).toEqual([
      'enc:id-a',
      'enc:secret-a',
      'enc:user-a',
      'enc:pass-a',
    ])
    for (const row of rows) {
      expect(row).not.toHaveProperty('updated_by')
      expect(row.secret_name).toBeTruthy()
    }
  })

  it('upserts on tenant_id, secret_type and secret_name', async () => {
    await postProfile(profileCredentials)
    expect(state.upserts[0]?.onConflict).toBe('tenant_id,secret_type,secret_name')
    expect(state.upserts[0]?.onConflict).not.toBe('tenant_id,secret_type')
  })

  it('uses the authenticated profile tenant and ignores a body tenant id', async () => {
    await postProfile(profileCredentials)
    expect(state.upserts[0]?.rows.every((row) => row.tenant_id === TENANT)).toBe(true)
    expect(state.tenantUpdates[0]?.tenantId).toBe(TENANT)
    expect(JSON.stringify(state.upserts)).not.toContain(OTHER_TENANT)
  })

  it('does not update tenant flags when the secret upsert fails', async () => {
    state.secretError = { message: 'constraint' }
    await expect(postProfile(profileCredentials)).rejects.toMatchObject({ statusCode: 500 })
    expect(state.order).toEqual(['secrets'])
    expect(state.tenantUpdates).toHaveLength(0)
  })

  it('updates tenant flags only after a successful secret upsert', async () => {
    await postProfile(profileCredentials)
    expect(state.order).toEqual(['secrets', 'tenants'])
    expect(state.tenantUpdates[0]?.tablePayload).toEqual({
      sari_enabled: true,
      sari_environment: 'production',
    })
  })

  it('upserts only the supplied VKU credential', async () => {
    await postProfile({
      sari_enabled: true,
      sari_environment: 'test',
      sari_username: 'user-only',
      sari_client_id: '',
      sari_client_secret: null,
      tenant_id: OTHER_TENANT,
    })

    const rows = state.upserts[0]?.rows ?? []
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      tenant_id: TENANT,
      secret_type: 'sari_credentials',
      secret_name: 'sari_username',
      secret_value: 'enc:user-only',
    })
    expect(rows[0]).not.toHaveProperty('updated_by')
    expect(rows.map((row) => row.secret_name)).not.toEqual(
      expect.arrayContaining(['sari_client_id', 'sari_client_secret', 'sari_password']),
    )
  })

  it('stores CZV and FL names under sari_credentials', async () => {
    await postCzv({
      sari_czv_enabled: true,
      sari_czv_environment: 'test',
      sari_fl_enabled: true,
      sari_fl_environment: 'production',
      sari_czv_client_id: 'czv-id',
      sari_czv_client_secret: 'czv-secret',
      sari_czv_username: 'czv-user',
      sari_czv_password: 'czv-pass',
      sari_czv_registration_id: 'czv-reg',
      sari_fl_client_id: 'fl-id',
      sari_fl_client_secret: 'fl-secret',
      sari_fl_username: 'fl-user',
      sari_fl_password: 'fl-pass',
      sari_fl_registration_id: 'fl-reg',
      tenant_id: OTHER_TENANT,
    })

    expect(state.upserts[0]?.onConflict).toBe('tenant_id,secret_type,secret_name')
    expect(state.upserts[0]?.rows.map((row) => [row.secret_type, row.secret_name, row.tenant_id])).toEqual([
      ['sari_credentials', 'sari_czv_client_id', TENANT],
      ['sari_credentials', 'sari_czv_client_secret', TENANT],
      ['sari_credentials', 'sari_czv_username', TENANT],
      ['sari_credentials', 'sari_czv_password', TENANT],
      ['sari_credentials', 'sari_czv_registration_id', TENANT],
      ['sari_credentials', 'sari_fl_client_id', TENANT],
      ['sari_credentials', 'sari_fl_client_secret', TENANT],
      ['sari_credentials', 'sari_fl_username', TENANT],
      ['sari_credentials', 'sari_fl_password', TENANT],
      ['sari_credentials', 'sari_fl_registration_id', TENANT],
    ])
    expect(state.upserts[0]?.rows.every((row) => !('updated_by' in row))).toBe(true)
    expect(state.order).toEqual(['secrets', 'tenants'])
  })

  it('does not update CZV flags when the secret upsert fails', async () => {
    state.secretError = { message: 'constraint' }
    await expect(postCzv({
      sari_czv_enabled: true,
      sari_czv_client_id: 'czv-id',
      tenant_id: OTHER_TENANT,
    })).rejects.toMatchObject({ statusCode: 500 })
    expect(state.order).toEqual(['secrets'])
    expect(state.tenantUpdates).toHaveLength(0)
  })

  it('upserts only the supplied CZV credential and skips blank values', async () => {
    await postCzv({
      sari_fl_enabled: false,
      sari_czv_username: '  czv-user  ',
      sari_czv_client_id: '',
      sari_czv_password: '   ',
      sari_fl_client_id: null,
    })

    const rows = state.upserts[0]?.rows ?? []
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      tenant_id: TENANT,
      secret_type: 'sari_credentials',
      secret_name: 'sari_czv_username',
      secret_value: 'enc:czv-user',
    })
    expect(state.order).toEqual(['secrets', 'tenants'])
  })
})
