import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  expectedHardDeleteConfirmation,
  isHardDeleteConfirmationValid,
  isTenantUuid,
  EXPLICIT_DELETE_ORDER,
  previewCountTables,
  PAYMENT_NO_ACTION_DEPENDENTS,
  APPOINTMENT_NO_ACTION_DEPENDENTS,
  mergeLiveTenantTables,
  classifyDeleteRule,
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

  it('static inventory covers full production tenant_id snapshot (~184)', () => {
    const tables = previewCountTables()
    expect(tables.length).toBeGreaterThanOrEqual(180)
    expect(tables).toContain('leads')
    expect(tables).toContain('booking_events')
    expect(tables).toContain('payments')
    expect(tables).toContain('users')
    expect(tables).toContain('affiliate_codes')
    expect(tables).toContain('vouchers')
    expect(tables).toContain('payroll_runs')
    expect(tables).toContain('reminder_logs')
    expect(tables).toContain('vehicle_rentals')
  })

  it('documents payment and appointment NO ACTION clears', () => {
    expect(PAYMENT_NO_ACTION_DEPENDENTS.map((d) => d.table)).toEqual(
      expect.arrayContaining(['discounts', 'reminder_logs', 'course_registrations'])
    )
    expect(APPOINTMENT_NO_ACTION_DEPENDENTS.map((d) => `${d.table}.${d.column}`)).toEqual(
      expect.arrayContaining([
        'cash_transactions.appointment_id',
        'invoice_items.appointment_id',
        'discounts.redeemed_for',
      ])
    )
  })

  it('mergeLiveTenantTables unions live RPC rows with static snapshot', () => {
    const merged = mergeLiveTenantTables([
      { table: 'leads', delete_rule: 'NO FK' },
      { table: 'brand_new_tenant_table', delete_rule: 'CASCADE' },
    ])
    expect(merged.some((t) => t.table === 'brand_new_tenant_table' && t.classification === 'cascade')).toBe(true)
    expect(merged.some((t) => t.table === 'leads' && t.classification === 'no_fk')).toBe(true)
    expect(classifyDeleteRule('RESTRICT')).toBe('restrict')
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
  const serviceSrc = readFileSync(resolve(process.cwd(), 'server/utils/tenant-hard-delete.ts'), 'utf8')

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

  it('service fail-closes: no executeOrderedClientDeletes / no slug filename prefix delete', () => {
    expect(serviceSrc).not.toContain('executeOrderedClientDeletes')
    expect(serviceSrc).not.toContain("source: 'slug-prefix-list'")
    expect(serviceSrc).not.toMatch(/startsWith\(`\$\{tenant\.slug\}/)
    expect(serviceSrc).toContain('fail-closed')
    expect(serviceSrc).toContain('list_tenant_hard_delete_tables')
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
    b.neq = vi.fn(() => b)
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

  const baseTenant = (over: Record<string, unknown> = {}) => ({
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
    ...over,
  })

  it('preview is read-only (no delete/update/insert on tenant tables)', async () => {
    const tenant = baseTenant()
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
      rpc: vi.fn(async () => ({ data: null, error: { message: 'rpc missing' } })),
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
    expect(preview.inventoryTableCount).toBeGreaterThanOrEqual(180)
    expect(preview.deletionStrategy).toMatch(/RPC/i)
  })

  it('execute rejects wrong confirmation without calling RPC', async () => {
    const tenant = baseTenant({
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Isolation Tenant A',
      slug: 'isolation-a',
      contact_email: 'a@example.com',
    })

    const rpc = vi.fn(async (name: string) => {
      if (name === 'list_tenant_hard_delete_tables') {
        return { data: null, error: { message: 'missing' } }
      }
      return { data: null, error: null }
    })
    const supabase: any = {
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          const b = makeCountBuilder(0)
          b.maybeSingle = vi.fn(async () => ({ data: tenant, error: null }))
          return b
        }
        return makeCountBuilder(0)
      }),
      rpc,
      storage: { from: vi.fn(() => ({ list: async () => ({ data: [] }) })) },
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
    expect(rpc).not.toHaveBeenCalledWith('hard_delete_tenant_data', expect.anything())
  })

  it('RPC failure does NOT trigger destructive client fallback and returns FAILED', async () => {
    const tenant = baseTenant({
      id: '44444444-4444-4444-8444-444444444444',
      name: 'Fail Closed Tenant',
      slug: 'fail-closed',
    })

    let deleteCalls = 0
    const supabase: any = {
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          const b = makeCountBuilder(0)
          b.maybeSingle = vi.fn(async () => ({ data: tenant, error: null }))
          return b
        }
        if (table === 'tenant_hard_delete_jobs') {
          const b = makeCountBuilder(0)
          b.insert = vi.fn(() => b)
          b.update = vi.fn(() => b)
          b.select = vi.fn(() => b)
          b.single = vi.fn(async () => ({ data: { id: 'job-1' }, error: null }))
          b.eq = vi.fn(() => b)
          b.then = (resolve: any, reject: any) =>
            Promise.resolve({ data: { id: 'job-1' }, error: null }).then(resolve, reject)
          return b
        }
        const b = makeCountBuilder(0)
        b.delete = vi.fn(() => {
          deleteCalls += 1
          throw new Error('client delete must not run')
        })
        return b
      }),
      rpc: vi.fn(async (name: string) => {
        if (name === 'list_tenant_hard_delete_tables') {
          return { data: null, error: { message: 'missing' } }
        }
        if (name === 'hard_delete_tenant_data') {
          return { data: null, error: { message: 'simulated FK failure' } }
        }
        return { data: null, error: { message: 'unknown rpc' } }
      }),
      storage: { from: vi.fn(() => ({ list: async () => ({ data: [] }), remove: vi.fn() })) },
      auth: { admin: { deleteUser: vi.fn(), getUserById: vi.fn() } },
    }

    const { executeTenantHardDelete } = await import('../tenant-hard-delete')
    const result = await executeTenantHardDelete(supabase, {
      tenantId: tenant.id,
      confirmation: 'DELETE Fail Closed Tenant',
      requestedByUserId: 'u1',
      requestedByAuthUserId: 'a1',
    })

    expect(result.status).toBe('FAILED')
    expect(result.emailSent).toBe(false)
    expect(result.error).toMatch(/fail-closed|RPC failed/i)
    expect(deleteCalls).toBe(0)
    expect(supabase.auth.admin.deleteUser).not.toHaveBeenCalled()
    // hard_delete called once; list may be called during preview
    expect(supabase.rpc).toHaveBeenCalledWith('hard_delete_tenant_data', { p_tenant_id: tenant.id })
  })

  it('financial warnings appear when payments exist', async () => {
    const tenant = baseTenant({
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Finance Tenant',
      slug: 'finance-tenant',
      contact_email: 'fin@example.com',
    })

    const supabase: any = {
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          const b = makeCountBuilder(0)
          b.maybeSingle = vi.fn(async () => ({ data: tenant, error: null }))
          return b
        }
        if (table === 'payments') {
          const b = makeCountBuilder(2)
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
      rpc: vi.fn(async () => ({ data: null, error: { message: 'missing' } })),
      storage: { from: vi.fn(() => ({ list: async () => ({ data: [] }) })) },
    }

    const { previewTenantHardDelete } = await import('../tenant-hard-delete')
    const preview = await previewTenantHardDelete(supabase, tenant.id)
    expect(preview.financialRecords).toBeGreaterThan(0)
    expect(preview.warnings.some((w) => /financial records/i.test(w))).toBe(true)
  })

  it('storage resolver never deletes by colliding slug prefix', async () => {
    const tenantA = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      slug: 'test',
      logo_url: null,
      logo_square_url: null,
      logo_wide_url: null,
      logo_dark_url: null,
      favicon_url: null,
    }

    const listedRoot: any[] = [
      { name: 'test-school-logo.png' }, // belongs to tenant with slug test-school
      { name: 'test-logo.png' },
    ]

    const supabase: any = {
      from: vi.fn((table: string) => {
        if (table === 'tenant_assets') {
          const b: any = {}
          b.select = vi.fn(() => b)
          b.eq = vi.fn(() => b)
          b.then = (resolve: any, reject: any) =>
            Promise.resolve({ data: [], error: null }).then(resolve, reject)
          return b
        }
        return makeCountBuilder(0)
      }),
      storage: {
        from: vi.fn(() => ({
          list: vi.fn(async (path: string) => {
            // root slug search must not be used; only tenant_id prefix list
            if (!path || path === '') {
              return { data: listedRoot, error: null }
            }
            if (path === tenantA.id) {
              return { data: [{ name: 'owned.png' }], error: null }
            }
            return { data: [], error: null }
          }),
        })),
      },
    }

    const { resolveStorageObjects } = await import('../tenant-hard-delete')
    const objs = await resolveStorageObjects(supabase, tenantA)
    const paths = objs.map((o) => o.path)
    expect(paths).toContain(`${tenantA.id}/owned.png`)
    expect(paths).not.toContain('test-school-logo.png')
    expect(paths).not.toContain('test-logo.png')
    expect(objs.every((o) => o.source === 'tenant-id-prefix' || o.source.startsWith('tenants.') || o.source === 'tenant_assets')).toBe(true)
  })

  it('verification reports leftovers when tenant_id rows remain', async () => {
    const tenantId = '55555555-5555-4555-8555-555555555555'
    const supabase: any = {
      from: vi.fn((table: string) => {
        const b = makeCountBuilder(table === 'leads' ? 3 : 0)
        if (table === 'tenants') {
          b.maybeSingle = vi.fn(async () => ({ data: null, error: null }))
        }
        if (table === 'website_tenants' || table === 'platform_referrals' || table === 'website_prospects' || table === 'users') {
          b.then = (resolve: any, reject: any) =>
            Promise.resolve({ data: [], error: null, count: 0 }).then(resolve, reject)
        }
        return b
      }),
      rpc: vi.fn(async () => ({ data: null, error: { message: 'missing' } })),
      storage: { from: vi.fn(() => ({ list: async () => ({ data: [] }) })) },
      auth: { admin: { getUserById: vi.fn(async () => ({ data: { user: null }, error: { message: 'gone' } })) } },
    }
    const { verifyTenantHardDelete } = await import('../tenant-hard-delete')
    const result = await verifyTenantHardDelete(supabase, tenantId, {})
    expect(result.ok).toBe(false)
    expect(result.leftovers.some((l) => l.table === 'leads' && l.remaining === 3)).toBe(true)
  })

  it('successful RPC path never issues client table deletes', async () => {
    const tenant = baseTenant({
      id: '66666666-6666-4666-8666-666666666666',
      name: 'Rpc Only Tenant',
      slug: 'rpc-only',
      contact_email: null,
    })
    let clientDeletes = 0
    let tenantLookups = 0
    let rpcDeleted = false
    const supabase: any = {
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          const b = makeCountBuilder(0)
          b.maybeSingle = vi.fn(async () => {
            tenantLookups += 1
            // Before RPC: tenant exists for preview; after RPC success: gone
            if (!rpcDeleted) return { data: tenant, error: null }
            return { data: null, error: null }
          })
          return b
        }
        if (table === 'tenant_hard_delete_jobs') {
          const b = makeCountBuilder(0)
          b.insert = vi.fn(() => b)
          b.update = vi.fn(() => b)
          b.select = vi.fn(() => b)
          b.eq = vi.fn(() => b)
          b.single = vi.fn(async () => ({ data: { id: 'job-ok' }, error: null }))
          b.then = (resolve: any, reject: any) =>
            Promise.resolve({ data: { id: 'job-ok' }, error: null }).then(resolve, reject)
          return b
        }
        const b = makeCountBuilder(0)
        b.delete = vi.fn(() => {
          clientDeletes += 1
          const chain: any = {
            eq: () => chain,
            in: () => chain,
            then: (resolve: any, reject: any) =>
              Promise.resolve({ data: null, error: null, count: 0 }).then(resolve, reject),
          }
          return chain
        })
        return b
      }),
      rpc: vi.fn(async (name: string) => {
        if (name === 'list_tenant_hard_delete_tables') return { data: null, error: { message: 'missing' } }
        if (name === 'hard_delete_tenant_data') {
          rpcDeleted = true
          return { data: { tenant_id: tenant.id, deleted: { payments: 0 } }, error: null }
        }
        return { data: null, error: null }
      }),
      storage: {
        from: vi.fn(() => ({
          list: async () => ({ data: [] }),
          remove: vi.fn(async () => ({ data: null, error: null })),
        })),
      },
      auth: {
        admin: {
          deleteUser: vi.fn(async () => ({ data: null, error: null })),
          getUserById: vi.fn(async () => ({ data: { user: null }, error: { message: 'not found' } })),
        },
      },
    }

    const { executeTenantHardDelete } = await import('../tenant-hard-delete')
    const result = await executeTenantHardDelete(supabase, {
      tenantId: tenant.id,
      confirmation: 'DELETE Rpc Only Tenant',
      requestedByUserId: 'u1',
      requestedByAuthUserId: 'a1',
    })
    expect(clientDeletes).toBe(0)
    expect(tenantLookups).toBeGreaterThan(0)
    expect(supabase.rpc).toHaveBeenCalledWith('hard_delete_tenant_data', { p_tenant_id: tenant.id })
    expect(result.status).not.toBe('FAILED')
    expect(['COMPLETED', 'PARTIAL_FAILURE']).toContain(result.status)
    expect(result.emailSent).toBe(false)
  })

  it('storage resolver includes logo URL metadata and tenant_assets', async () => {
    const tenantId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    const supabase: any = {
      from: vi.fn((table: string) => {
        if (table === 'tenant_assets') {
          const b: any = {}
          b.select = vi.fn(() => b)
          b.eq = vi.fn(() => b)
          b.then = (resolve: any, reject: any) =>
            Promise.resolve({
              data: [{ storage_bucket: 'tenant-logos', storage_path: `${tenantId}/asset.webp`, file_path: null }],
              error: null,
            }).then(resolve, reject)
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

    const { resolveStorageObjects } = await import('../tenant-hard-delete')
    const objs = await resolveStorageObjects(supabase, {
      id: tenantId,
      slug: 'whatever',
      logo_url: `https://xyz.supabase.co/storage/v1/object/public/tenant-logos/${tenantId}/logo.png`,
    })
    expect(objs.map((o) => o.path)).toEqual(
      expect.arrayContaining([`${tenantId}/logo.png`, `${tenantId}/asset.webp`])
    )
  })
})

describe('migration SQL contract', () => {
  const sql = readFileSync(resolve(process.cwd(), 'migrations/20261007_tenant_hard_delete.sql'), 'utf8')

  it('creates transactional RPC, inventory helper, and jobs table', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.hard_delete_tenant_data')
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.list_tenant_hard_delete_tables')
    expect(sql).toContain('tenant_hard_delete_jobs')
    expect(sql).toContain('DELETE FROM public.booking_events')
    expect(sql).toContain('DELETE FROM public.leads')
    expect(sql).toContain('DELETE FROM public.payments')
    expect(sql).toContain('DELETE FROM public.tenants WHERE id = p_tenant_id')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.hard_delete_tenant_data(uuid) TO service_role')
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.hard_delete_tenant_data(uuid) FROM authenticated')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.list_tenant_hard_delete_tables() TO service_role')
  })

  it('clears payments before relying on appointment cascade', () => {
    const paymentsAt = sql.indexOf('DELETE FROM public.payments WHERE tenant_id = p_tenant_id')
    const tenantsAt = sql.lastIndexOf('DELETE FROM public.tenants WHERE id = p_tenant_id')
    expect(paymentsAt).toBeGreaterThan(0)
    expect(tenantsAt).toBeGreaterThan(paymentsAt)
  })

  it('website_prospects: delete owned only; null match-only for other owners', () => {
    expect(sql).toContain('DELETE FROM public.website_prospects WHERE tenant_id = p_tenant_id')
    expect(sql).toContain('SET matched_tenant_id = NULL')
    expect(sql).toContain('AND tenant_id IS DISTINCT FROM p_tenant_id')
    expect(sql).not.toMatch(
      /DELETE FROM public\.website_prospects WHERE tenant_id = p_tenant_id OR matched_tenant_id/
    )
  })

  it('clears payment NO ACTION deps before DELETE payments', () => {
    const discountsPay = sql.indexOf('UPDATE public.discounts')
    const reminderPay = sql.indexOf('UPDATE public.reminder_logs')
    const courseReg = sql.indexOf('UPDATE public.course_registrations')
    const paymentsAt = sql.indexOf('DELETE FROM public.payments WHERE tenant_id = p_tenant_id')
    expect(discountsPay).toBeGreaterThan(0)
    expect(reminderPay).toBeGreaterThan(0)
    expect(courseReg).toBeGreaterThan(0)
    expect(paymentsAt).toBeGreaterThan(discountsPay)
    expect(paymentsAt).toBeGreaterThan(reminderPay)
    expect(paymentsAt).toBeGreaterThan(courseReg)
    expect(sql).toContain('SET payment_id = NULL')
  })

  it('clears appointment NO ACTION deps before DELETE tenants', () => {
    expect(sql).toContain('UPDATE public.cash_transactions')
    expect(sql).toContain('UPDATE public.discount_sales')
    expect(sql).toContain('SET redeemed_for = NULL')
    expect(sql).toContain('UPDATE public.invited_customers')
    expect(sql).toContain('UPDATE public.invoice_items')
    const cashAt = sql.indexOf('UPDATE public.cash_transactions')
    const tenantsAt = sql.lastIndexOf('DELETE FROM public.tenants WHERE id = p_tenant_id')
    expect(tenantsAt).toBeGreaterThan(cashAt)
  })

  it('never deletes NULL-tenant reminder_templates via bare DELETE', () => {
    expect(sql).toContain('DELETE FROM public.reminder_templates WHERE tenant_id = p_tenant_id')
    expect(sql).toContain('tenant_id NULL rows are global')
  })

  it('SECURITY DEFINER with search_path and service_role only', () => {
    expect(sql).toContain('SECURITY DEFINER')
    expect(sql).toContain('SET search_path = public')
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.hard_delete_tenant_data(uuid) FROM PUBLIC')
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.hard_delete_tenant_data(uuid) FROM anon')
  })
})

describe('website_prospects cross-tenant semantics (SQL contract)', () => {
  const sql = readFileSync(resolve(process.cwd(), 'migrations/20261007_tenant_hard_delete.sql'), 'utf8')

  it('tenant A deletion cannot DELETE tenant B owned prospect via matched_tenant_id alone', () => {
    // Owned delete is tenant_id scoped; match-only is UPDATE null, not DELETE
    const deleteOwned = /DELETE FROM public\.website_prospects WHERE tenant_id = p_tenant_id/
    const nullMatch =
      /UPDATE public\.website_prospects[\s\S]*?SET matched_tenant_id = NULL[\s\S]*?matched_tenant_id = p_tenant_id[\s\S]*?tenant_id IS DISTINCT FROM p_tenant_id/
    expect(sql).toMatch(deleteOwned)
    expect(sql).toMatch(nullMatch)
  })
})
