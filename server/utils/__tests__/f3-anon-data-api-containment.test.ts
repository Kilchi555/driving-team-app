/**
 * F-3 anon Data-API containment — SQL + public-flow source contracts.
 *
 * Live production (unyjaetebnaexaflpyoc, 2026-09-17) allowed:
 *   anon SELECT on vouchers / voucher_codes via public lookup policies + GRANT ALL
 *   anon UPDATE on availability_slots via update_available_slots
 *   anon INSERT on course_waitlist via course_waitlist_public_insert WITH CHECK (true)
 *
 * Public Nitro routes already use service_role. This file pins that contract
 * and the new migration so the Data-API holes cannot reopen silently.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const migrationPath = resolve(root, 'migrations/20260917_f3_anon_data_api_containment.sql')
const lookupPath = resolve(root, 'server/api/vouchers/lookup.post.ts')
const getSlotsPath = resolve(root, 'server/api/booking/get-available-slots.get.ts')
const reservePath = resolve(root, 'server/api/booking/reserve-slot.post.ts')
const guestBookPath = resolve(root, 'server/api/booking/guest-book.post.ts')
const releasePath = resolve(root, 'server/api/booking/release-reservation.post.ts')
const waitlistSignupPath = resolve(root, 'server/api/courses/waitlist-signup.post.ts')
const categoryWaitlistPath = resolve(root, 'server/api/courses/category-waitlist-signup.post.ts')
const websiteWaitlistPath = resolve(
  root,
  'apps/website/server/api/courses/category-waitlist-signup.post.ts',
)
const websiteClientPath = resolve(root, 'apps/website/server/utils/supabase-service-env.ts')
const staffWaitlistComposable = resolve(root, 'composables/useCourseParticipants.ts')

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function stripSqlComments(sql: string): string {
  return sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
}

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue
    const full = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      collectSourceFiles(full, acc)
      continue
    }
    if (/\.(ts|js|vue)$/.test(entry.name)) acc.push(full)
  }
  return acc
}

describe('F-3 anon Data-API containment migration', () => {
  const sql = read(migrationPath)
  const executable = stripSqlComments(sql)

  it('exists as a new origin/main migration and does not copy #169 filenames', () => {
    expect(sql.length).toBeGreaterThan(400)
    expect(sql).not.toContain('20260907_p0_incident_containment')
    expect(sql).not.toContain('20260908_f3_p0_containment')
    expect(sql).toContain('Do not apply automatically to production')
  })

  it('drops live voucher lookup policies and revokes anon/PUBLIC table privileges', () => {
    expect(executable).toMatch(
      /DROP POLICY IF EXISTS "Anon can lookup active vouchers" ON public\.vouchers/,
    )
    expect(executable).toMatch(
      /DROP POLICY IF EXISTS "Anon can lookup active vouchers by code" ON public\.vouchers/,
    )
    expect(executable).toMatch(
      /DROP POLICY IF EXISTS "Anon can lookup active voucher codes" ON public\.voucher_codes/,
    )
    expect(executable).toMatch(
      /DROP POLICY IF EXISTS "Anon can lookup active voucher codes by code and tenant" ON public\.voucher_codes/,
    )
    expect(executable).toMatch(/REVOKE ALL ON TABLE public\.vouchers FROM anon/)
    expect(executable).toMatch(/REVOKE ALL ON TABLE public\.vouchers FROM PUBLIC/)
    expect(executable).toMatch(/REVOKE ALL ON TABLE public\.voucher_codes FROM anon/)
    expect(executable).toMatch(/REVOKE ALL ON TABLE public\.voucher_codes FROM PUBLIC/)
  })

  it('does not drop authenticated or admin voucher policies', () => {
    expect(executable).not.toMatch(/DROP POLICY IF EXISTS "Users can view their own vouchers"/)
    expect(executable).not.toMatch(/DROP POLICY IF EXISTS "Admins can manage vouchers"/)
    expect(executable).not.toMatch(
      /DROP POLICY IF EXISTS "Admins can view all vouchers of their tenant"/,
    )
    expect(executable).not.toMatch(
      /DROP POLICY IF EXISTS "Users can view active vouchers of their tenant"/,
    )
  })

  it('drops anon availability UPDATE policies and revokes anon DML, keeping SELECT', () => {
    expect(executable).toMatch(/DROP POLICY IF EXISTS update_available_slots ON public\.availability_slots/)
    expect(executable).toMatch(
      /DROP POLICY IF EXISTS release_own_reservation ON public\.availability_slots/,
    )
    expect(executable).toMatch(
      /REVOKE INSERT,\s*UPDATE,\s*DELETE,\s*TRUNCATE ON TABLE public\.availability_slots FROM anon/,
    )
    expect(executable).not.toMatch(/REVOKE SELECT ON TABLE public\.availability_slots FROM anon/)
    expect(executable).not.toMatch(/DROP POLICY IF EXISTS ["']?select_available_slots_for_listing/)
  })

  it('drops waitlist public insert and revokes anon DML without touching tenant policies', () => {
    expect(executable).toMatch(
      /DROP POLICY IF EXISTS course_waitlist_public_insert ON public\.course_waitlist/,
    )
    expect(executable).toMatch(
      /REVOKE INSERT,\s*UPDATE,\s*DELETE,\s*TRUNCATE ON TABLE public\.course_waitlist FROM anon/,
    )
    expect(executable).not.toMatch(/DROP POLICY IF EXISTS course_waitlist_tenant_access/)
    expect(executable).not.toMatch(/DROP POLICY IF EXISTS course_waitlist_tenant_read/)
    expect(executable).not.toMatch(/DROP POLICY IF EXISTS course_waitlist_tenant_update/)
    expect(executable).not.toMatch(/REVOKE SELECT ON TABLE public\.course_waitlist FROM anon/)
  })

  it('does not change out-of-scope objects from Phase 14', () => {
    expect(executable).not.toMatch(/course_sessions/)
    expect(executable).not.toMatch(/course_sessions_public_read/)
    expect(executable).not.toMatch(/\btenants\b/)
    expect(executable).not.toMatch(/\bpayments\b/)
    expect(executable).not.toMatch(/anon_insert_shop_payment/)
    expect(executable).not.toMatch(/\blocations\b/)
    expect(executable).not.toMatch(/\bdiscounts\b/)
    expect(executable).not.toMatch(/prevent_users_privilege_escalation/)
    expect(executable).not.toMatch(/storage\.objects/)
    expect(executable).not.toMatch(/tenant-logos/)
  })
})

describe('public voucher lookup stays on service_role', () => {
  const src = read(lookupPath)

  it('uses getSupabaseAdmin and does not use the anon key', () => {
    expect(src).toContain("from '~/server/utils/supabase-admin'")
    expect(src).toContain('getSupabaseAdmin()')
    expect(src).not.toMatch(/SUPABASE_ANON_KEY/)
    expect(src).not.toMatch(/createClient\(/)
  })

  it('scopes lookup by tenant_id and returns metadata only', () => {
    expect(src).toContain(".from('voucher_codes')")
    expect(src).toContain(".from('vouchers')")
    expect(src).toContain(".eq('tenant_id', tenant_id)")
    expect(src).toContain('amount_chf')
    expect(src).not.toMatch(/select\('\*'\)/)
  })
})

describe('public booking slot flows stay on service_role', () => {
  it.each([
    ['get-available-slots', getSlotsPath],
    ['reserve-slot', reservePath],
    ['guest-book', guestBookPath],
    ['release-reservation', releasePath],
  ] as const)('%s uses getSupabaseAdmin', (_name, path) => {
    const src = read(path)
    expect(src).toContain('getSupabaseAdmin()')
    expect(src).toContain(".from('availability_slots')")
    expect(src).not.toMatch(/SUPABASE_ANON_KEY/)
  })
})

describe('public waitlist signup stays on service_role', () => {
  it('waitlist-signup uses getSupabaseAdmin', () => {
    const src = read(waitlistSignupPath)
    expect(src).toContain('getSupabaseAdmin()')
    expect(src).toContain(".from('course_waitlist')")
    expect(src).not.toMatch(/SUPABASE_ANON_KEY/)
  })

  it('category-waitlist-signup uses getSupabaseAdmin', () => {
    const src = read(categoryWaitlistPath)
    expect(src).toContain('getSupabaseAdmin()')
    expect(src).toContain(".from('course_waitlist')")
    expect(src).not.toMatch(/SUPABASE_ANON_KEY/)
  })

  it('website category waitlist uses the service-role website client', () => {
    const src = read(websiteWaitlistPath)
    const client = read(websiteClientPath)
    expect(src).toContain('createWebsiteSupabaseClient')
    expect(src).toContain(".from('course_waitlist')")
    expect(client).toContain('SUPABASE_SERVICE_ROLE_KEY')
    expect(client).toContain('bypasses RLS')
    expect(client).not.toMatch(/SUPABASE_ANON_KEY/)
  })

  it('staff waitlist composable is authenticated session, not anon', () => {
    const src = read(staffWaitlistComposable)
    expect(src).toContain('getSupabase')
    expect(src).toContain('useCurrentUser')
    expect(src).toContain(".from('course_waitlist')")
    expect(src).toContain('currentUser.value?.tenant_id')
    expect(src).not.toMatch(/SUPABASE_ANON_KEY/)
  })
})

describe('no unexplained browser Data-API writes on contained tables', () => {
  const pages = collectSourceFiles(resolve(root, 'pages'))
  const components = collectSourceFiles(resolve(root, 'components'))

  it('pages and components do not query vouchers, voucher_codes, availability_slots, or course_waitlist', () => {
    const offenders: string[] = []
    for (const file of [...pages, ...components]) {
      const src = read(file)
      if (
        /from\(['"]vouchers['"]\)/.test(src)
        || /from\(['"]voucher_codes['"]\)/.test(src)
        || /from\(['"]availability_slots['"]\)/.test(src)
        || /from\(['"]course_waitlist['"]\)/.test(src)
      ) {
        offenders.push(file.replace(`${root}/`, ''))
      }
    }
    expect(offenders).toEqual([])
  })
})
