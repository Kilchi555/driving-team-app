import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  expectedHardDeleteConfirmation,
  isHardDeleteConfirmationValid,
  isTenantUuid,
  EXPLICIT_DELETE_ORDER,
  previewCountTables,
} from '../tenant-hard-delete-inventory'

describe('tenant-hard-delete inventory invariants', () => {
  it('accepts only UUID tenant ids', () => {
    expect(isTenantUuid('cc5a8972-4d6c-41fe-800d-5d8d0cd127b5')).toBe(true)
    expect(isTenantUuid('Sara Lussi')).toBe(false)
    expect(isTenantUuid('sara-lussi-ag')).toBe(false)
    expect(isTenantUuid('info@saralussi.com')).toBe(false)
    expect(isTenantUuid('')).toBe(false)
  })

  it('requires confirmation DELETE <exact tenant name>', () => {
    expect(expectedHardDeleteConfirmation('Sara Lussi AG')).toBe('DELETE Sara Lussi AG')
    expect(isHardDeleteConfirmationValid('DELETE Sara Lussi AG', 'Sara Lussi AG')).toBe(true)
    expect(isHardDeleteConfirmationValid('DELETE', 'Sara Lussi AG')).toBe(false)
    expect(isHardDeleteConfirmationValid('DELETE FAHRSCHULE Sara', 'Sara Lussi AG')).toBe(false)
    expect(isHardDeleteConfirmationValid(true as any, 'Sara Lussi AG')).toBe(false)
    expect(isHardDeleteConfirmationValid('DELETE Fahrschule-Schlittler', 'Fahrschule-Schlittler')).toBe(true)
  })

  it('deletes booking_events / leads / payments before tenant root order', () => {
    expect(EXPLICIT_DELETE_ORDER.indexOf('booking_events')).toBeGreaterThanOrEqual(0)
    expect(EXPLICIT_DELETE_ORDER.indexOf('leads')).toBeGreaterThan(EXPLICIT_DELETE_ORDER.indexOf('booking_events'))
    expect(EXPLICIT_DELETE_ORDER.indexOf('payments')).toBeGreaterThan(EXPLICIT_DELETE_ORDER.indexOf('leads'))
    expect(EXPLICIT_DELETE_ORDER.includes('meta_capi_uploads')).toBe(true)
  })

  it('preview inventory includes no-FK and cascade tables', () => {
    const tables = previewCountTables()
    expect(tables).toContain('leads')
    expect(tables).toContain('booking_events')
    expect(tables).toContain('payments')
    expect(tables).toContain('users')
  })
})

describe('hard-delete API source contracts', () => {
  const previewSrc = readFileSync(
    resolve(process.cwd(), 'server/api/admin/tenants/[id]/hard-delete/preview.get.ts'),
    'utf8'
  )
  const executeSrc = readFileSync(
    resolve(process.cwd(), 'server/api/admin/tenants/[id]/hard-delete/execute.post.ts'),
    'utf8'
  )

  it('preview requires super_admin before service-role access', () => {
    const authAt = previewSrc.indexOf('requireSuperAdmin(event)')
    const dbAt = previewSrc.indexOf('getSupabaseAdmin()')
    expect(authAt).toBeGreaterThan(0)
    expect(dbAt).toBeGreaterThan(authAt)
  })

  it('execute requires super_admin before service-role access', () => {
    const authAt = executeSrc.indexOf('requireSuperAdmin(event)')
    const dbAt = executeSrc.indexOf('getSupabaseAdmin()')
    expect(authAt).toBeGreaterThan(0)
    expect(dbAt).toBeGreaterThan(authAt)
  })

  it('execute validates UUID and typed confirmation', () => {
    expect(executeSrc).toContain('isTenantUuid')
    expect(executeSrc).toContain('confirmation')
    expect(executeSrc).toContain('DELETE <exact tenant name>')
  })

  it('does not delete by tenant name/slug', () => {
    expect(executeSrc).not.toMatch(/\.eq\(['"]name['"]/)
    expect(executeSrc).not.toMatch(/\.eq\(['"]slug['"]/)
    expect(previewSrc).not.toMatch(/\.eq\(['"]name['"]/)
  })
})

describe('hard-delete service behavior (mocked supabase)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  function makeCountBuilder(count = 0) {
    const b: any = {}
    b.select = vi.fn(() => b)
    b.eq = vi.fn(() => b)
    b.in = vi.fn(() => b)
    b.maybeSingle = vi.fn(async () => ({ data: null, error: null }))
    b.single = vi.fn(async () => ({ data: null, error: null }))
    b.then = (resolve: any, reject: any) =>
      Promise.resolve({ data: [], error: null, count }).then(resolve, reject)
    b.delete = vi.fn(() => {
      throw new Error('preview must not delete')
    })
    b.update = vi.fn(() => {
      throw new Error('preview must not update')
    })
    b.insert = vi.fn(() => {
      throw new Error('preview must not insert')
    })
    return b
  }

  it('preview is read-only (no delete/update/insert on tenant tables)', async () => {
    const tenant = {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Test Delete Tenant',
      slug: 'test-delete-tenant',
      contact_email: 'test@example.com',
      from_email: null,
      logo_url: null,
      logo_square_url: null,
      logo_wide_url: null,
      logo_dark_url: null,
      favicon_url: null,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      stripe_connect_account_id: null,
      wallee_space_id: null,
      wallee_enabled: false,
      resend_domain_id: null,
      sari_enabled: false,
    }

    const supabase: any = {
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          const b = makeCountBuilder(0)
          b.maybeSingle = vi.fn(async () => ({ data: tenant, error: null }))
          return b
        }
        if (table === 'users') {
          const b = makeCountBuilder(0)
          b.then = (resolve: any, reject: any) =>
            Promise.resolve({ data: [], error: null, count: 0 }).then(resolve, reject)
          return b
        }
        return makeCountBuilder(0)
      }),
      storage: {
        from: vi.fn(() => ({
          list: vi.fn(async () => ({ data: [], error: null })),
        })),
      },
    }

    const { previewTenantHardDelete } = await import('../tenant-hard-delete')
    const preview = await previewTenantHardDelete(supabase, tenant.id)
    expect(preview.tenantName).toBe('Test Delete Tenant')
    expect(preview.tenantId).toBe(tenant.id)
    expect(preview.warnings.length).toBeGreaterThan(0)
  })

  it('execute rejects wrong confirmation without calling RPC', async () => {
    const tenant = {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Isolation Tenant A',
      slug: 'isolation-a',
      contact_email: 'a@example.com',
      from_email: null,
      logo_url: null,
      logo_square_url: null,
      logo_wide_url: null,
      logo_dark_url: null,
      favicon_url: null,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      stripe_connect_account_id: null,
      wallee_space_id: null,
      wallee_enabled: false,
      resend_domain_id: null,
      sari_enabled: false,
    }

    const supabase: any = {
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          const b = makeCountBuilder(0)
          b.maybeSingle = vi.fn(async () => ({ data: tenant, error: null }))
          return b
        }
        return makeCountBuilder(0)
      }),
      storage: { from: vi.fn(() => ({ list: async () => ({ data: [] }) })) },
      rpc: vi.fn(),
      auth: { admin: { deleteUser: vi.fn() } },
    }

    const { executeTenantHardDelete } = await import('../tenant-hard-delete')
    await expect(
      executeTenantHardDelete(supabase, {
        tenantId: tenant.id,
        confirmation: 'DELETE Wrong Name',
        requestedByUserId: 'u1',
        requestedByAuthUserId: 'a1',
      })
    ).rejects.toMatchObject({ statusCode: 400 })
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('financial warnings appear when payments exist', async () => {
    const tenant = {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Finance Tenant',
      slug: 'finance-tenant',
      contact_email: 'fin@example.com',
      from_email: null,
      logo_url: null,
      logo_square_url: null,
      logo_wide_url: null,
      logo_dark_url: null,
      favicon_url: null,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      stripe_connect_account_id: null,
      wallee_space_id: null,
      wallee_enabled: false,
      resend_domain_id: null,
      sari_enabled: false,
    }

    const supabase: any = {
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          const b = makeCountBuilder(0)
          b.maybeSingle = vi.fn(async () => ({ data: tenant, error: null }))
          return b
        }
        if (table === 'payments') {
          const b = makeCountBuilder(2)
          // payment ids select for audit logs
          b.then = (resolve: any, reject: any) =>
            Promise.resolve({
              data: [{ id: 'p1' }, { id: 'p2' }],
              error: null,
              count: 2,
            }).then(resolve, reject)
          return b
        }
        return makeCountBuilder(0)
      }),
      storage: { from: vi.fn(() => ({ list: async () => ({ data: [] }) })) },
    }

    const { previewTenantHardDelete } = await import('../tenant-hard-delete')
    const preview = await previewTenantHardDelete(supabase, tenant.id)
    expect(preview.financialRecords).toBeGreaterThan(0)
    expect(preview.warnings.some((w) => /financial records/i.test(w))).toBe(true)
  })
})

describe('migration SQL contract', () => {
  const sql = readFileSync(resolve(process.cwd(), 'migrations/20261007_tenant_hard_delete.sql'), 'utf8')

  it('creates transactional RPC and jobs table', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.hard_delete_tenant_data')
    expect(sql).toContain('tenant_hard_delete_jobs')
    expect(sql).toContain('DELETE FROM public.booking_events')
    expect(sql).toContain('DELETE FROM public.leads')
    expect(sql).toContain('DELETE FROM public.payments')
    expect(sql).toContain('DELETE FROM public.tenants WHERE id = p_tenant_id')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.hard_delete_tenant_data(uuid) TO service_role')
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.hard_delete_tenant_data(uuid) FROM authenticated')
  })

  it('clears payments before relying on appointment cascade', () => {
    const paymentsAt = sql.indexOf('DELETE FROM public.payments WHERE tenant_id = p_tenant_id')
    const tenantsAt = sql.lastIndexOf('DELETE FROM public.tenants WHERE id = p_tenant_id')
    expect(paymentsAt).toBeGreaterThan(0)
    expect(tenantsAt).toBeGreaterThan(paymentsAt)
  })
})
