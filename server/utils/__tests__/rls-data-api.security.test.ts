/**
 * Real Data-API / Storage RLS probes.
 *
 * These tests hit PostgREST with real JWTs. They are NOT helper-unit tests.
 *
 * They cannot run in this workspace today:
 * - no local supabase/config.toml
 * - no isolated test project
 * - production must not receive the Wave 1B.1 migration
 * - vitest.config.ts stubs SUPABASE_URL to localhost:54321
 *
 * Run after an isolated apply:
 *   RLS_SECURITY_TEST=1 \
 *   RLS_TEST_URL=... \
 *   RLS_TEST_ANON_KEY=... \
 *   RLS_TEST_SERVICE_ROLE_KEY=...      # fixture arrange/verify/teardown only
 *   RLS_TEST_CUSTOMER_A_AUTH_ID=...    # auth.users.id of customer A
 *   RLS_TEST_CUSTOMER_A_JWT=... \
 *   RLS_TEST_CUSTOMER_B_JWT=... \
 *   RLS_TEST_STAFF_A_JWT=... \
 *   RLS_TEST_STAFF_B_JWT=... \
 *   RLS_TEST_ADMIN_JWT=... \
 *   RLS_TEST_INVOICE_B=... \
 *   RLS_TEST_USER_B_ID=... \
 *   RLS_TEST_TENANT_A=... \
 *   RLS_TEST_TENANT_B=... \
 *   RLS_TEST_LOCATION_B=...   # id of a standard location owned by tenant B
 *   npx vitest run --config vitest.rls.config.ts
 *
 * Nothing in this file is executed unless RLS_SECURITY_TEST=1. A skipped run
 * is NOT evidence that production is contained.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

const enabled = process.env.RLS_SECURITY_TEST === '1'
const describeRls = enabled ? describe : describe.skip

function clientFor(jwt: string): SupabaseClient {
  const url = process.env.RLS_TEST_URL || ''
  const anon = process.env.RLS_TEST_ANON_KEY || ''
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function anonClient(): SupabaseClient {
  return createClient(process.env.RLS_TEST_URL || '', process.env.RLS_TEST_ANON_KEY || '', {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Isolated-project service role. Used only to arrange and tear down fixture
 * state (and to verify it independently of the role under test), never as
 * evidence that a policy holds.
 */
function serviceClient(): SupabaseClient {
  return createClient(process.env.RLS_TEST_URL || '', process.env.RLS_TEST_SERVICE_ROLE_KEY || '', {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function expectDenied(result: { data: unknown; error: { message?: string } | null }) {
  const rows = Array.isArray(result.data) ? result.data : result.data ? [result.data] : []
  expect(rows.length === 0 || !!result.error).toBe(true)
}

describeRls('Wave 1B.1 live Data API RLS', () => {
  const customerA = () => clientFor(process.env.RLS_TEST_CUSTOMER_A_JWT || '')
  const customerB = () => clientFor(process.env.RLS_TEST_CUSTOMER_B_JWT || '')
  const staffA = () => clientFor(process.env.RLS_TEST_STAFF_A_JWT || '')
  const staffB = () => clientFor(process.env.RLS_TEST_STAFF_B_JWT || '')
  const admin = () => clientFor(process.env.RLS_TEST_ADMIN_JWT || '')
  const invoiceB = process.env.RLS_TEST_INVOICE_B || ''
  const userB = process.env.RLS_TEST_USER_B_ID || ''
  const staffBId = process.env.RLS_TEST_STAFF_B_ID || ''

  it('Customer A cannot read Invoice B', async () => {
    const { data, error } = await customerA().from('invoices').select('*').eq('id', invoiceB)
    await expectDenied({ data, error })
  })

  it('Customer cannot read cash_balances', async () => {
    const { data, error } = await customerA().from('cash_balances').select('*')
    await expectDenied({ data, error })
  })

  it('Staff A cannot read Staff B cash', async () => {
    const { data, error } = await staffA()
      .from('cash_balances')
      .select('*')
      .eq('instructor_id', staffBId)
    await expectDenied({ data, error })
  })

  it('Staff A can read own cash', async () => {
    const { error } = await staffA().from('cash_balances').select('id').limit(1)
    expect(error).toBeNull()
  })

  it('Customer cannot read external_busy_times', async () => {
    const { data, error } = await customerA().from('external_busy_times').select('*')
    await expectDenied({ data, error })
  })

  it('Staff can read own-tenant busy times', async () => {
    const { error } = await staffA().from('external_busy_times').select('id').limit(1)
    expect(error).toBeNull()
  })

  it('anon cannot read tenant_settings', async () => {
    const { data, error } = await anonClient().from('tenant_settings').select('*')
    await expectDenied({ data, error })
  })

  it('Customer/Staff/Admin cannot read payment secrets via Data API', async () => {
    for (const actor of [customerA, staffA, admin]) {
      const { data, error } = await actor()
        .from('tenant_settings')
        .select('setting_key, setting_value')
        .eq('setting_key', 'payment_settings')
      await expectDenied({ data, error })
    }
  })

  it('authenticated roles cannot select onboarding_token', async () => {
    for (const actor of [customerA, staffA, admin]) {
      const { data, error } = await actor().from('users').select('onboarding_token')
      expect(error || !data || (Array.isArray(data) && data.every((row) => row.onboarding_token == null))).toBeTruthy()
    }
  })

  it('Customer A cannot download User B documents or list them', async () => {
    const listed = await customerA().storage.from('user-documents').list(userB)
    const files = listed.data || []
    expect(files.length).toBe(0)
    const downloaded = await customerA().storage.from('user-documents').download(`${userB}/secret.pdf`)
    expect(downloaded.error || !downloaded.data).toBeTruthy()
  })

  it('Anonymous cannot read private documents or receipts', async () => {
    const docs = await anonClient().storage.from('user-documents').list()
    const receipts = await anonClient().storage.from('receipts').list()
    expect((docs.data || []).length).toBe(0)
    expect((receipts.data || []).length).toBe(0)
  })

  it('Customer A cannot read receipt objects', async () => {
    const { data, error } = await customerA().storage.from('receipts').list()
    expect(error || (data || []).length === 0).toBeTruthy()
  })

  it('Staff cannot write invoice_items onto a foreign invoice', async () => {
    const { data, error } = await staffA().from('invoice_items').insert({
      invoice_id: invoiceB,
      tenant_id: process.env.RLS_TEST_TENANT_A || '00000000-0000-0000-0000-000000000000',
      description: 'probe',
      quantity: 1,
      unit_price_rappen: 1,
    }).select('id')
    expect(error || !data?.length).toBeTruthy()
  })

  it('unused customer B client is constructed so cross-tenant env is required', () => {
    expect(customerB()).toBeTruthy()
    expect(staffB()).toBeTruthy()
  })

  it('anon cannot read invitation_token', async () => {
    const { data, error } = await anonClient()
      .from('staff_invitations')
      .select('invitation_token')
      .eq('status', 'pending')
    await expectDenied({ data, error })
  })

  it('anon cannot read sensitive tenant columns', async () => {
    const { data, error } = await anonClient()
      .from('tenants')
      .select('iban, qr_iban, bank_balance_rappen, accounting_inbox_token, wallee_space_id, stripe_customer_id')
    await expectDenied({ data, error })
  })

  it('normal user cannot reactivate itself', async () => {
    // The invariant is the false -> true transition. Sending is_active=true to
    // an already-active row is a no-op UPDATE: `OLD.is_active IS DISTINCT FROM
    // NEW.is_active` is false, the trigger never fires, and PostgREST answers
    // 200. So the row has to be deactivated first or the probe proves nothing.
    const svc = serviceClient()
    const authId = process.env.RLS_TEST_CUSTOMER_A_AUTH_ID || ''
    expect(authId).not.toBe('')

    const { data: fixture, error: fixtureError } = await svc
      .from('users')
      .select('id, tenant_id, is_active')
      .eq('auth_user_id', authId)
      .single()
    expect(fixtureError).toBeNull()
    expect(fixture?.id).toBeTruthy()

    const { error: deactivateError } = await svc
      .from('users')
      .update({ is_active: false })
      .eq('auth_user_id', authId)
    expect(deactivateError).toBeNull()

    try {
      const { data: deactivated } = await svc
        .from('users')
        .select('is_active')
        .eq('auth_user_id', authId)
        .single()
      expect(deactivated?.is_active).toBe(false)

      const { data, error } = await customerA()
        .from('users')
        .update({ is_active: true })
        .eq('auth_user_id', authId)
        .select('id')
      expect(error || !data?.length).toBeTruthy()

      const { data: after } = await svc
        .from('users')
        .select('is_active')
        .eq('auth_user_id', authId)
        .single()
      expect(after?.is_active).toBe(false)
    } finally {
      await svc.from('users').update({ is_active: true }).eq('auth_user_id', authId)
    }
  })

  it('anon cannot upload tenant logo', async () => {
    const uploaded = await anonClient()
      .storage.from('tenant-logos')
      .upload(`probe/${Date.now()}.txt`, new Blob(['x']), { upsert: false })
    expect(uploaded.error || !uploaded.data).toBeTruthy()
  })

  it('customer cannot modify arbitrary discount', async () => {
    const { data, error } = await customerA()
      .from('discounts')
      .insert({
        name: 'probe',
        tenant_id: process.env.RLS_TEST_TENANT_A || '00000000-0000-0000-0000-000000000000',
        discount_type: 'fixed',
        discount_value: 100,
        is_active: true,
      })
      .select('id')
    expect(error || !data?.length).toBeTruthy()
  })

  it('tenant A cannot create location in tenant B', async () => {
    const { data, error } = await customerA()
      .from('locations')
      .insert({
        name: 'probe',
        address: 'probe',
        location_type: 'pickup',
        tenant_id: process.env.RLS_TEST_TENANT_B || '00000000-0000-0000-0000-000000000001',
        is_active: true,
      })
      .select('id')
    expect(error || !data?.length).toBeTruthy()
  })

  it('anon has no write privilege on staff_invitations', async () => {
    const { data, error } = await anonClient()
      .from('staff_invitations')
      .insert({
        tenant_id: '00000000-0000-0000-0000-000000000000',
        invitation_token: 'probe',
        status: 'pending',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      })
      .select('id')
    expect(error || !data?.length).toBeTruthy()
  })
})

/**
 * Behavioural probes for the 2026-09-07 P0 containment migration.
 * These assert the privilege model end-to-end through PostgREST, which the
 * static contract test cannot do.
 */
describeRls('P0 containment live probes (2026-09-07)', () => {
  const customerA = () => clientFor(process.env.RLS_TEST_CUSTOMER_A_JWT || '')
  const adminA = () => clientFor(process.env.RLS_TEST_ADMIN_JWT || '')
  const tenantB = process.env.RLS_TEST_TENANT_B || '00000000-0000-0000-0000-000000000001'
  const locationB = process.env.RLS_TEST_LOCATION_B || ''

  const TENANT_SECRETS = [
    'iban',
    'qr_iban',
    'bank_name',
    'bank_balance_rappen',
    'accounting_inbox_token',
    'wallee_space_id',
    'wallee_user_id',
    'wallee_iban',
    'stripe_customer_id',
    'stripe_subscription_id',
    'unit_economics',
    'license_number',
    'uid_number',
  ]

  // ---- F-2 tenants -------------------------------------------------------

  it.each(TENANT_SECRETS)('anon cannot select tenants.%s', async (column) => {
    const { data, error } = await anonClient().from('tenants').select(column)
    await expectDenied({ data, error })
  })

  it.each(TENANT_SECRETS)('ordinary authenticated user cannot select tenants.%s', async (column) => {
    const { data, error } = await customerA().from('tenants').select(column)
    await expectDenied({ data, error })
  })

  it('anon select(*) on tenants is rejected, proving table-level SELECT is gone', async () => {
    const { error } = await anonClient().from('tenants').select('*').limit(1)
    expect(error).not.toBeNull()
  })

  it('anon can still read public tenant branding', async () => {
    const { data, error } = await anonClient()
      .from('tenants')
      .select('id, name, slug, business_type, logo_url, primary_color, secondary_color')
      .eq('is_active', true)
      .limit(1)
    expect(error).toBeNull()
    expect((data || []).length).toBeGreaterThan(0)
  })

  it('authenticated user can still read public tenant branding', async () => {
    const { data, error } = await customerA()
      .from('tenants')
      .select('id, name, slug, business_type, logo_url, primary_color, secondary_color')
      .eq('is_active', true)
      .limit(1)
    expect(error).toBeNull()
    expect((data || []).length).toBeGreaterThan(0)
  })

  // ---- F-7 locations -----------------------------------------------------

  it('anon cannot enumerate customer pickup/home locations', async () => {
    const { data, error } = await anonClient()
      .from('locations')
      .select('id, name, address')
      .eq('location_type', 'pickup')
    await expectDenied({ data, error })
  })

  it('anon can still read active public standard locations', async () => {
    const { data, error } = await anonClient()
      .from('locations')
      .select('id, name, address, location_type')
      .eq('location_type', 'standard')
      .eq('is_active', true)
      .limit(1)
    expect(error).toBeNull()
    expect((data || []).length).toBeGreaterThan(0)
  })

  it('anon can still read global exam locations', async () => {
    const { error } = await anonClient()
      .from('locations')
      .select('id, name')
      .is('tenant_id', null)
      .eq('location_type', 'exam')
      .limit(1)
    expect(error).toBeNull()
  })

  it('tenant A admin cannot INSERT a location into tenant B', async () => {
    const { data, error } = await adminA()
      .from('locations')
      .insert({
        name: 'probe',
        address: 'probe',
        location_type: 'standard',
        tenant_id: tenantB,
        is_active: true,
      })
      .select('id')
    expect(error || !data?.length).toBeTruthy()
  })

  it('tenant A admin cannot UPDATE a tenant B location', async () => {
    const { data, error } = await adminA()
      .from('locations')
      .update({ name: 'probe-updated' })
      .eq('id', locationB)
      .select('id')
    expect(error || !data?.length).toBeTruthy()
  })

  it('tenant A admin cannot DELETE a tenant B location', async () => {
    const { data, error } = await adminA()
      .from('locations')
      .delete()
      .eq('id', locationB)
      .select('id')
    expect(error || !data?.length).toBeTruthy()
  })

  // ---- F-6 discounts -----------------------------------------------------

  it('anon cannot enumerate voucher rows', async () => {
    const { data, error } = await anonClient()
      .from('discounts')
      .select('code, remaining_amount_rappen, voucher_recipient_email')
      .eq('is_voucher', true)
    await expectDenied({ data, error })
  })

  it('anon cannot insert a discount', async () => {
    const { data, error } = await anonClient()
      .from('discounts')
      .insert({ name: 'probe', is_voucher: true, payment_id: crypto.randomUUID() })
      .select('id')
    expect(error || !data?.length).toBeTruthy()
  })

  it('ordinary customer cannot update an arbitrary discount', async () => {
    const { data, error } = await customerA()
      .from('discounts')
      .update({ discount_value: 999999 })
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id')
    expect(error || !data?.length).toBeTruthy()
  })
})

describe('Wave 1B.1 live RLS harness', () => {
  it('documents that live JWT probes are skipped without RLS_SECURITY_TEST=1', () => {
    if (!enabled) {
      expect(process.env.RLS_SECURITY_TEST || '').not.toBe('1')
    }
  })
})
