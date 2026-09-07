import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'migrations/20260907_p0_incident_containment.sql'),
  'utf8'
)
const getInvitation = readFileSync(
  resolve(process.cwd(), 'server/api/staff/get-invitation.post.ts'),
  'utf8'
)
const getAvailability = readFileSync(
  resolve(process.cwd(), 'server/api/booking/get-availability.post.ts'),
  'utf8'
)

function executable(sql: string) {
  return sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
}

const body = executable(migration)

function statements(sql: string) {
  return sql
    .split(';')
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function parseRoles(raw: string) {
  return raw
    .split(',')
    .map(r => r.trim().toLowerCase().replace(/"/g, ''))
    .filter(Boolean)
}

function parseColumns(raw: string) {
  return raw
    .split(',')
    .map(c => c.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Minimal model of PostgreSQL SELECT-privilege resolution, so this suite tests
 * privilege SEMANTICS rather than the presence of a SQL string.
 *
 * The two rules that matter here, and that a textual assertion cannot express:
 *   1. A table-level GRANT SELECT implicitly covers every column.
 *   2. A column-level REVOKE cannot subtract from a table-level grant — it is
 *      a no-op ("no privileges could be revoked for column ...").
 * The first version of this migration relied on rule 2 being false, which left
 * every tenant secret readable by anon. Encoding the real rules here makes that
 * class of mistake a test failure instead of a green build.
 */
function buildSelectPrivilegeModel(table: string, initialTableSelect: string[]) {
  const tableSelect = new Set(initialTableSelect)
  const columnSelect = new Map<string, Set<string>>()
  const escaped = table.replace('.', '\\.')

  const revokeTable = new RegExp(`^REVOKE (ALL|SELECT)(?: PRIVILEGES)? ON (?:TABLE )?${escaped} FROM (.+)$`, 'i')
  const grantTable = new RegExp(`^GRANT (ALL|SELECT)(?: PRIVILEGES)? ON (?:TABLE )?${escaped} TO (.+)$`, 'i')
  const revokeColumns = new RegExp(`^REVOKE SELECT \\(([^)]*)\\) ON (?:TABLE )?${escaped} FROM (.+)$`, 'i')
  const grantColumns = new RegExp(`^GRANT SELECT \\(([^)]*)\\) ON (?:TABLE )?${escaped} TO (.+)$`, 'i')

  let usedColumnRevokeAsSubtraction = false

  for (const statement of statements(body)) {
    let match = statement.match(revokeColumns)
    if (match) {
      for (const role of parseRoles(match[2])) {
        // Rule 2: ineffective while the role still holds table-level SELECT.
        if (tableSelect.has(role)) {
          usedColumnRevokeAsSubtraction = true
          continue
        }
        columnSelect.get(role)?.clear()
      }
      continue
    }

    match = statement.match(grantColumns)
    if (match) {
      const columns = parseColumns(match[1])
      for (const role of parseRoles(match[2])) {
        const existing = columnSelect.get(role) ?? new Set<string>()
        for (const column of columns) existing.add(column)
        columnSelect.set(role, existing)
      }
      continue
    }

    match = statement.match(revokeTable)
    if (match) {
      for (const role of parseRoles(match[2])) {
        // Revoking a table-level privilege also drops the column privileges.
        tableSelect.delete(role)
        columnSelect.delete(role)
      }
      continue
    }

    match = statement.match(grantTable)
    if (match) {
      for (const role of parseRoles(match[2])) tableSelect.add(role)
    }
  }

  return {
    usedColumnRevokeAsSubtraction,
    hasColumnPrivilege(role: string, column: string) {
      if (tableSelect.has(role) || tableSelect.has('public')) return true
      if (columnSelect.get(role)?.has(column)) return true
      return columnSelect.get('public')?.has(column) === true
    },
    hasTablePrivilege(role: string) {
      return tableSelect.has(role) || tableSelect.has('public')
    },
  }
}

/**
 * Live production baseline captured 2026-09-07 from pg_class.relacl:
 *   public.tenants -> {anon=arwdDxtm/postgres, authenticated=arwdDxtm/postgres,
 *                      service_role=arwdDxtm/postgres}
 * i.e. anon and authenticated hold table-level SELECT before this migration,
 * and no column-level ACL entries exist on any tenants column.
 */
const tenantsPrivileges = buildSelectPrivilegeModel('public.tenants', [
  'anon',
  'authenticated',
  'service_role',
])

type LocationRow = {
  tenant_id: string | null
  location_type: string
  is_active: boolean
}

type SelectPolicy = {
  name: string
  roles: string[]
  usingExpr: string
}

function matchingParen(expr: string): number {
  let depth = 0
  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === '(') depth++
    else if (expr[i] === ')') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

function splitTopLevel(expr: string, keyword: 'AND' | 'OR'): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  const upper = expr.toUpperCase()
  const needle = ` ${keyword} `
  let i = 0
  while (i < expr.length) {
    const ch = expr[i]
    if (ch === '(') depth++
    else if (ch === ')') depth--
    else if (depth === 0 && upper.slice(i, i + needle.length) === needle) {
      parts.push(expr.slice(start, i).trim())
      i += needle.length
      start = i
      continue
    }
    i++
  }
  parts.push(expr.slice(start).trim())
  return parts.filter(Boolean)
}

function evalLocationPredicate(expr: string, row: LocationRow): boolean {
  let e = expr.replace(/\s+/g, ' ').trim()
  while (e.startsWith('(') && matchingParen(e) === e.length - 1) {
    e = e.slice(1, -1).trim()
  }
  const orParts = splitTopLevel(e, 'OR')
  if (orParts.length > 1) return orParts.some(p => evalLocationPredicate(p, row))
  const andParts = splitTopLevel(e, 'AND')
  if (andParts.length > 1) return andParts.every(p => evalLocationPredicate(p, row))
  if (/^true$/i.test(e)) return true
  if (/^false$/i.test(e)) return false
  const isNull = e.match(/^(\w+)\s+IS\s+NULL$/i)
  if (isNull) return row[isNull[1].toLowerCase() as keyof LocationRow] == null
  const isNotNull = e.match(/^(\w+)\s+IS\s+NOT\s+NULL$/i)
  if (isNotNull) return row[isNotNull[1].toLowerCase() as keyof LocationRow] != null
  const eq = e.match(/^(\w+)(?:::[a-z0-9_ ]+)?\s*=\s*'([^']*)'$/i)
  if (eq) {
    const col = eq[1].toLowerCase()
    const actual = row[col as keyof LocationRow]
    return String(actual ?? '') === eq[2]
  }
  const boolEq = e.match(/^(\w+)\s*=\s*(true|false)$/i)
  if (boolEq) {
    const actual = row[boolEq[1].toLowerCase() as keyof LocationRow]
    return String(actual) === boolEq[2].toLowerCase()
  }
  if (/\sIN\s*\(/i.test(e) || /^EXISTS\s*\(/i.test(e)) return false
  throw new Error(`unmodeled locations predicate atom: ${e}`)
}

/**
 * Live catalog SELECT policies on public.locations before this migration
 * (captured 2026-09-07). DROP/CREATE in the migration are applied in order
 * so a forgotten DROP of locations_select_policy (TO public, tenant_id IS
 * NULL) makes anonCanSeeNullTenantPickup() true and fails the suite.
 */
const LOCATIONS_SELECT_BASELINE: SelectPolicy[] = [
  { name: 'anon_read_locations', roles: ['public'], usingExpr: 'true' },
  {
    name: 'authenticated_read_locations',
    roles: ['authenticated'],
    usingExpr: 'EXISTS (SELECT 1 FROM users u WHERE u.auth_user_id = auth.uid() AND u.tenant_id = locations.tenant_id)',
  },
  { name: 'locations_select', roles: ['authenticated'], usingExpr: 'true' },
  {
    name: 'locations_select_policy',
    roles: ['public'],
    usingExpr:
      'tenant_id IS NULL OR tenant_id IN (SELECT users.tenant_id FROM users WHERE users.auth_user_id = auth.uid() AND users.is_active = true)',
  },
]

function buildLocationsSelectPolicyModel(sql: string) {
  const policies = new Map<string, SelectPolicy>()
  for (const policy of LOCATIONS_SELECT_BASELINE) policies.set(policy.name, { ...policy })

  const dropRe = /^DROP POLICY IF EXISTS "([^"]+)" ON public\.locations$/i
  const createRe =
    /^CREATE POLICY "([^"]+)" ON public\.locations FOR SELECT TO ([^ ]+) USING \(([\s\S]*)\)$/i

  for (const statement of statements(sql)) {
    const drop = statement.match(dropRe)
    if (drop) {
      policies.delete(drop[1])
      continue
    }
    const create = statement.match(createRe)
    if (create) {
      policies.set(create[1], {
        name: create[1],
        roles: parseRoles(create[2]),
        usingExpr: create[3],
      })
    }
  }

  return {
    roleCanSelect(role: string, row: LocationRow) {
      for (const policy of policies.values()) {
        const applies = policy.roles.includes(role) || policy.roles.includes('public')
        if (!applies) continue
        if (evalLocationPredicate(policy.usingExpr, row)) return true
      }
      return false
    },
  }
}

const TENANT_SECRET_COLUMNS = [
  'iban',
  'qr_iban',
  'bank_name',
  'bank_balance_rappen',
  'accounting_inbox_token',
  'accounting_inbox_domain',
  'accounting_inbox_domain_id',
  'wallee_space_id',
  'wallee_user_id',
  'wallee_iban',
  'wallee_handelsregister_url',
  'wallee_uid_number',
  'wallee_application_notes',
  'stripe_customer_id',
  'stripe_subscription_id',
  'stripe_price_id',
  'stripe_sms_subscription_item_id',
  'unit_economics',
  'ads_guardrail',
  'license_number',
  'uid_number',
  'from_email',
  'resend_domain_id',
  'ga4_property_id',
  'google_ads_customer_id',
  'gsc_site_url',
  'default_payment_account_id',
]

// Columns the public booking / landing / registration flows actually read.
const TENANT_PUBLIC_COLUMNS = [
  'id',
  'name',
  'slug',
  'business_type',
  'is_active',
  'contact_email',
  'address',
  'logo_url',
  'logo_square_url',
  'logo_wide_url',
  'primary_color',
  'secondary_color',
  'accent_color',
]

describe('P0 incident containment contract', () => {
  it('drops anon enumeration of staff invitation tokens', () => {
    expect(body).toContain('DROP POLICY IF EXISTS "staff_invitations_token_read"')
    expect(body).toContain('REVOKE ALL ON TABLE public.staff_invitations FROM anon')
    expect(body).not.toMatch(/CREATE POLICY "staff_invitations_token_read"/)
  })

  describe('F-2 tenant secrets — privilege semantics, not SQL text', () => {
    it('does not rely on column REVOKE to subtract from table-level SELECT', () => {
      // The bug in the first version of this migration. A column REVOKE issued
      // while the role still has table-level SELECT changes nothing.
      expect(tenantsPrivileges.usedColumnRevokeAsSubtraction).toBe(false)
    })

    it('removes table-level SELECT on tenants from anon and authenticated', () => {
      expect(tenantsPrivileges.hasTablePrivilege('anon')).toBe(false)
      expect(tenantsPrivileges.hasTablePrivilege('authenticated')).toBe(false)
    })

    it.each(TENANT_SECRET_COLUMNS)('anon cannot SELECT tenants.%s', column => {
      expect(tenantsPrivileges.hasColumnPrivilege('anon', column)).toBe(false)
    })

    it.each(TENANT_SECRET_COLUMNS)('ordinary authenticated user cannot SELECT tenants.%s', column => {
      expect(tenantsPrivileges.hasColumnPrivilege('authenticated', column)).toBe(false)
    })

    it.each(TENANT_PUBLIC_COLUMNS)('anon can still SELECT public branding column tenants.%s', column => {
      expect(tenantsPrivileges.hasColumnPrivilege('anon', column)).toBe(true)
    })

    it.each(TENANT_PUBLIC_COLUMNS)('authenticated can still SELECT public branding column tenants.%s', column => {
      expect(tenantsPrivileges.hasColumnPrivilege('authenticated', column)).toBe(true)
    })

    it('keeps operational columns readable for authenticated UI but not for anon', () => {
      for (const column of ['subscription_plan', 'addon_seats', 'twilio_from_sender', 'website_status', 'wallee_onboarding_status']) {
        expect(tenantsPrivileges.hasColumnPrivilege('authenticated', column)).toBe(true)
        expect(tenantsPrivileges.hasColumnPrivilege('anon', column)).toBe(false)
      }
    })

    it('keeps active-tenant branding rows visible to anon and authenticated', () => {
      expect(body).toContain('CREATE POLICY "tenants_anon_select_active"')
      expect(body).toContain('CREATE POLICY "tenants_authenticated_select_active"')
      expect(body).toContain('DROP POLICY IF EXISTS "Allow public access to active tenants"')
    })

    it('does not leak the whole tenant row through the public booking endpoint', () => {
      expect(getAvailability).not.toMatch(/from\('tenants'\)\s*\n\s*\.select\('\*'\)/)
      expect(getAvailability).toContain(
        ".select('id, name, slug, business_type, primary_color, secondary_color, accent_color, logo_url, logo_square_url, logo_wide_url')"
      )
    })
  })

  it('blocks client is_active self-reactivation', () => {
    expect(body).toContain('NEW.is_active IS DISTINCT FROM OLD.is_active')
    expect(body).toContain('NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id')
    expect(body).toContain('NEW.role IS DISTINCT FROM OLD.role')
    expect(body).toContain('NEW.tenant_id IS DISTINCT FROM OLD.tenant_id')
    expect(body).toContain('NEW.admin_level IS DISTINCT FROM OLD.admin_level')
    expect(body).toContain("jwt_role = 'service_role'")
  })

  it('requires service_role for tenant-logos INSERT', () => {
    expect(body).toContain("bucket_id = 'tenant-logos'::text")
    expect(body).toContain("auth.role() = 'service_role'::text")
  })

  describe('F-6 discounts', () => {
    it('removes anon voucher enumeration as well as anon writes', () => {
      expect(body).toContain('DROP POLICY IF EXISTS "discounts_select_anon"')
      expect(body).toContain('DROP POLICY IF EXISTS "discounts_insert_anon"')
      expect(body).toContain('REVOKE ALL ON TABLE public.discounts FROM anon')
      expect(body).not.toMatch(/CREATE POLICY "discounts_select_anon"/)
      expect(body).not.toMatch(/CREATE POLICY "discounts_insert_anon"/)
    })

    it('confines discount writes to active staff/admin of the row tenant', () => {
      for (const name of ['discounts_write_staff_insert', 'discounts_write_staff_update', 'discounts_write_staff_delete']) {
        expect(body).toContain(`CREATE POLICY "${name}"`)
      }
      expect(body).toContain("ARRAY['admin'::text, 'staff'::text, 'tenant_admin'::text, 'super_admin'::text]")
      expect(body).toContain('u.tenant_id = discounts.tenant_id')
      expect(body).toContain('u.is_active = true')
    })
  })

  describe('F-7 locations', () => {
    const WEAK_POLICIES = [
      'locations_insert',
      'locations_insert_policy',
      'locations_update',
      'locations_update_policy',
      'locations_delete',
      'locations_delete_policy',
      'anon_read_locations',
      'locations_select',
      'locations_select_policy',
    ]

    it.each(WEAK_POLICIES)('drops the permissive policy %s', name => {
      expect(body).toContain(`DROP POLICY IF EXISTS "${name}" ON public.locations`)
    })

    it('leaves no write policy without a tenant correlation', () => {
      const policies = [...body.matchAll(/CREATE POLICY "([^"]+)"\s+ON public\.locations([\s\S]*?);/g)]
      const writePolicies = policies.filter(p => /FOR (INSERT|UPDATE|DELETE)/i.test(p[2]))
      expect(writePolicies.length).toBeGreaterThan(0)
      for (const policy of writePolicies) {
        expect(policy[2]).toContain('u.tenant_id = locations.tenant_id')
        // No tenant-free admin escape hatch may survive.
        expect(policy[2]).not.toMatch(/auth\.uid\(\) IN \(\s*SELECT users\.auth_user_id/)
      }
    })

    it('does not trust auth.jwt() role for application authorization', () => {
      const policies = [...body.matchAll(/CREATE POLICY "([^"]+)"\s+ON public\.locations([\s\S]*?);/g)]
      for (const policy of policies) {
        expect(policy[2]).not.toContain("auth.jwt() ->> 'role'")
      }
    })

    it('hides customer pickup rows from anon while keeping public booking rows', () => {
      const anonPolicy = body.match(/CREATE POLICY "locations_anon_select_public"([\s\S]*?);/)
      expect(anonPolicy).not.toBeNull()
      const expression = anonPolicy![1]
      expect(expression).toContain('TO anon')
      expect(expression).toContain("location_type = 'standard'")
      expect(expression).toContain("location_type = 'exam'")
      expect(expression).toContain('is_active = true')
      // A pickup row must not be matchable by the anon predicate.
      expect(expression).not.toContain("'pickup'")
      // Public booking endpoints do not filter on public_bookable, so the
      // policy must not require it or the standard-location list goes empty.
      expect(expression).not.toContain('public_bookable')
    })

    it('does not leave a SELECT policy that exposes NULL-tenant pickup to anon', () => {
      const model = buildLocationsSelectPolicyModel(body)
      const nullTenantPickup = { tenant_id: null, location_type: 'pickup', is_active: true }
      const activeExam = { tenant_id: null, location_type: 'exam', is_active: true }
      const inactiveExam = { tenant_id: null, location_type: 'exam', is_active: false }
      const nullTenantStandard = { tenant_id: null, location_type: 'standard', is_active: true }
      const tenantStandard = { tenant_id: 'aaaaaaaa-0000-0000-0000-000000000001', location_type: 'standard', is_active: true }
      const tenantPickup = { tenant_id: 'aaaaaaaa-0000-0000-0000-000000000001', location_type: 'pickup', is_active: true }

      expect(model.roleCanSelect('anon', nullTenantPickup)).toBe(false)
      expect(model.roleCanSelect('anon', tenantPickup)).toBe(false)
      expect(model.roleCanSelect('anon', inactiveExam)).toBe(false)
      expect(model.roleCanSelect('anon', nullTenantStandard)).toBe(false)
      expect(model.roleCanSelect('anon', activeExam)).toBe(true)
      expect(model.roleCanSelect('anon', tenantStandard)).toBe(true)
      expect(model.roleCanSelect('authenticated', nullTenantPickup)).toBe(false)
      expect(model.roleCanSelect('authenticated', activeExam)).toBe(true)
    })
  })

  it('does not revoke anon DML on public booking tables', () => {
    expect(body).not.toContain('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.availability_slots FROM anon')
    expect(body).not.toContain('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.booking_proposals FROM anon')
    expect(body).not.toContain('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.error_logs FROM anon')
  })

  it('looks up invitations by token through service_role, not anon Data API', () => {
    expect(getInvitation).toContain('getSupabaseAdmin()')
    expect(getInvitation).toContain(".eq('invitation_token', body.token)")
    expect(getInvitation).not.toContain('SUPABASE_ANON_KEY')
    expect(getInvitation).not.toContain("select('*')")
    expect(getInvitation).not.toContain('select("*")')
    expect(getInvitation).toContain(
      "select('id, tenant_id, first_name, last_name, email, phone, status, expires_at, created_at')"
    )
  })
})
