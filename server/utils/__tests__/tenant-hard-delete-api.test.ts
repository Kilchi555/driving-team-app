import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createError } from 'h3'
import type { Mock } from 'vitest'

type EventHandler = (event: unknown) => Promise<unknown> | unknown

type SuperAdminProfile = {
  id: string
  email: string
  role: string
}

type QueryBuilder = {
  from: Mock<(table?: string) => QueryBuilder>
  select: Mock<(cols?: string) => QueryBuilder>
  eq: Mock<(col?: string, val?: unknown) => QueryBuilder>
  maybeSingle: Mock<() => Promise<{ data: SuperAdminProfile | null; error: null }>>
}

const mocks = vi.hoisted(() => ({
  requireSuperAdmin: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  getRouterParam: vi.fn(),
  readBody: vi.fn(),
  getHeader: vi.fn(() => undefined as string | undefined),
  previewTenantHardDelete: vi.fn(),
  executeTenantHardDelete: vi.fn(),
  logAudit: vi.fn(async () => {}),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    getRouterParam: mocks.getRouterParam,
    readBody: mocks.readBody,
    getHeader: mocks.getHeader,
  }
})

vi.mock('~/server/utils/require-super-admin', () => ({
  requireSuperAdmin: mocks.requireSuperAdmin,
}))

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/server/utils/tenant-hard-delete', () => ({
  previewTenantHardDelete: mocks.previewTenantHardDelete,
  executeTenantHardDelete: mocks.executeTenantHardDelete,
}))

vi.mock('~/server/utils/audit', () => ({
  logAudit: mocks.logAudit,
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

function chainMaybeSingle(row: SuperAdminProfile): QueryBuilder {
  const builder = {} as QueryBuilder
  const chain = () => builder
  builder.from = vi.fn(chain)
  builder.select = vi.fn(chain)
  builder.eq = vi.fn(chain)
  builder.maybeSingle = vi.fn(async () => ({ data: row, error: null }))
  return builder
}

async function loadPreviewHandler(): Promise<EventHandler> {
  const mod = await import('../../api/admin/tenants/[id]/hard-delete/preview.get')
  return mod.default as EventHandler
}

async function loadExecuteHandler(): Promise<EventHandler> {
  const mod = await import('../../api/admin/tenants/[id]/hard-delete/execute.post')
  return mod.default as EventHandler
}

describe('hard-delete preview API authz', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.requireSuperAdmin.mockReset()
    mocks.getSupabaseAdmin.mockReset()
    mocks.getRouterParam.mockReset()
    mocks.previewTenantHardDelete.mockReset()
  })

  it('returns 401 for unauthorized callers before DB access', async () => {
    mocks.requireSuperAdmin.mockRejectedValue(createError({ statusCode: 401, statusMessage: 'Unauthorized' }))
    const handler = await loadPreviewHandler()
    await expect(handler({})).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled()
  })

  it('returns 403 for non-superadmin / tenant admin', async () => {
    mocks.requireSuperAdmin.mockRejectedValue(
      createError({ statusCode: 403, statusMessage: 'Super admin access required' })
    )
    const handler = await loadPreviewHandler()
    await expect(handler({})).rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled()
  })

  it('rejects non-UUID tenant id (name/slug collision safety)', async () => {
    mocks.requireSuperAdmin.mockResolvedValue({ id: 'auth-1', role: 'super_admin' })
    mocks.getRouterParam.mockReturnValue('sara-lussi-ag')
    const handler = await loadPreviewHandler()
    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.previewTenantHardDelete).not.toHaveBeenCalled()
  })

  it('superadmin can preview by UUID', async () => {
    const tid = 'b9ca9ac4-b093-4244-b372-0f0e206bfcbf'
    mocks.requireSuperAdmin.mockResolvedValue({ id: 'auth-1', role: 'super_admin' })
    mocks.getRouterParam.mockReturnValue(tid)
    mocks.getSupabaseAdmin.mockReturnValue({})
    mocks.previewTenantHardDelete.mockResolvedValue({
      tenantId: tid,
      tenantName: 'Sara Lussi AG',
      slug: 'sara-lussi-ag',
      counts: { users: 2 },
      totalRecords: 2,
      financialRecords: 0,
      pendingPayments: 0,
      warnings: ['Financial records will be permanently deleted.'],
    })
    const handler = await loadPreviewHandler()
    const res = (await handler({})) as {
      tenantId: string
      confirmationPhrase: string
      warnings?: string[]
    }
    expect(res.tenantId).toBe(tid)
    expect(res.confirmationPhrase).toBe('DELETE Sara Lussi AG')
    expect(res.warnings?.length).toBeGreaterThan(0)
    expect(mocks.previewTenantHardDelete).toHaveBeenCalledWith({}, tid)
  })
})

describe('hard-delete execute API authz + confirmation', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.requireSuperAdmin.mockReset()
    mocks.getSupabaseAdmin.mockReset()
    mocks.getRouterParam.mockReset()
    mocks.readBody.mockReset()
    mocks.executeTenantHardDelete.mockReset()
    mocks.logAudit.mockClear()
    mocks.getHeader.mockReturnValue('127.0.0.1')
  })

  it('blocks tenant admin (non super_admin)', async () => {
    mocks.requireSuperAdmin.mockRejectedValue(
      createError({ statusCode: 403, statusMessage: 'Super admin access required' })
    )
    const handler = await loadExecuteHandler()
    await expect(handler({})).rejects.toMatchObject({ statusCode: 403 })
  })

  it('rejects confirmation that names a different tenant (collision)', async () => {
    const tid = 'b9ca9ac4-b093-4244-b372-0f0e206bfcbf'
    mocks.requireSuperAdmin.mockResolvedValue({ id: 'auth-sa', role: 'super_admin' })
    mocks.getRouterParam.mockReturnValue(tid)
    mocks.readBody.mockResolvedValue({ confirmation: 'DELETE FAHRSCHULE Sara' })
    const sb = chainMaybeSingle({ id: 'u1', email: 'admin@simy.ch', role: 'super_admin' })
    mocks.getSupabaseAdmin.mockReturnValue(sb)
    mocks.executeTenantHardDelete.mockRejectedValue(
      Object.assign(new Error('Confirmation mismatch. Type exactly: DELETE Sara Lussi AG'), { statusCode: 400 })
    )
    const handler = await loadExecuteHandler()
    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rejects bare DELETE confirmation', async () => {
    mocks.requireSuperAdmin.mockResolvedValue({ id: 'auth-sa', role: 'super_admin' })
    mocks.getRouterParam.mockReturnValue('cc5a8972-4d6c-41fe-800d-5d8d0cd127b5')
    mocks.readBody.mockResolvedValue({ confirmation: 'DELETE', confirmed: true })
    const handler = await loadExecuteHandler()
    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.executeTenantHardDelete).not.toHaveBeenCalled()
  })

  it('executes only with matching confirmation for the UUID tenant', async () => {
    const tid = 'cc5a8972-4d6c-41fe-800d-5d8d0cd127b5'
    mocks.requireSuperAdmin.mockResolvedValue({ id: 'auth-sa', role: 'super_admin' })
    mocks.getRouterParam.mockReturnValue(tid)
    mocks.readBody.mockResolvedValue({ confirmation: 'DELETE Fahrschule-Schlittler' })
    const sb = chainMaybeSingle({ id: 'u1', email: 'admin@simy.ch', role: 'super_admin' })
    mocks.getSupabaseAdmin.mockReturnValue(sb)
    mocks.executeTenantHardDelete.mockResolvedValue({
      status: 'COMPLETED',
      tenantId: tid,
      tenantName: 'Fahrschule-Schlittler',
      jobId: 'job-1',
      deletedCounts: {},
      authDeleted: [],
      authSkipped: [],
      storageDeleted: [],
      storageFailed: [],
      verification: { ok: true, leftovers: [] },
      emailSent: true,
    })
    const handler = await loadExecuteHandler()
    const res = (await handler({})) as { status: string; emailSent: boolean }
    expect(res.status).toBe('COMPLETED')
    expect(res.emailSent).toBe(true)
    expect(mocks.executeTenantHardDelete).toHaveBeenCalledWith(
      sb,
      expect.objectContaining({
        tenantId: tid,
        confirmation: 'DELETE Fahrschule-Schlittler',
      })
    )
  })

  it('does not treat PARTIAL_FAILURE as silent success email path in handler data', async () => {
    const tid = '11111111-1111-4111-8111-111111111111'
    mocks.requireSuperAdmin.mockResolvedValue({ id: 'auth-sa', role: 'super_admin' })
    mocks.getRouterParam.mockReturnValue(tid)
    mocks.readBody.mockResolvedValue({ confirmation: 'DELETE Test Tenant' })
    const sb = chainMaybeSingle({ id: 'u1', email: 'admin@simy.ch', role: 'super_admin' })
    mocks.getSupabaseAdmin.mockReturnValue(sb)
    mocks.executeTenantHardDelete.mockResolvedValue({
      status: 'PARTIAL_FAILURE',
      tenantId: tid,
      tenantName: 'Test Tenant',
      jobId: 'job-2',
      deletedCounts: {},
      authDeleted: [],
      authSkipped: [],
      storageDeleted: [],
      storageFailed: ['tenant-logos/x.webp: fail'],
      verification: { ok: false, leftovers: [{ table: 'leads', remaining: 1, reason: 'tenant_id rows remain' }] },
      emailSent: false,
    })
    const handler = await loadExecuteHandler()
    const res = (await handler({})) as { status: string; emailSent: boolean }
    expect(res.status).toBe('PARTIAL_FAILURE')
    expect(res.emailSent).toBe(false)
  })
})
