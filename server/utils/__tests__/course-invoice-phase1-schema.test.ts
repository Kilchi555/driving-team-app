/**
 * Phase 1 course-invoice schema. Static only: the SQL file is read, never applied.
 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = 'migrations/20260928_course_invoice_phase1_schema.sql'
const sql = readFileSync(resolve(process.cwd(), migrationPath), 'utf8')
const previousProtect = readFileSync(
  resolve(process.cwd(), 'migrations/20260909_p0_09_course_registrations_rls.sql'),
  'utf8',
)

const forbiddenPaths = [
  'server/utils/auto-invoice-on-complete.ts',
  'server/api/cron/auto-invoice-scheduled.get.ts',
  'server/utils/invoice-persist-and-send.ts',
  'server/utils/course-enrollment-billing.ts',
  'server/utils/admin-course-enroll.ts',
  'server/api/courses/enroll-cash.post.ts',
  'server/api/courses/enroll-wallee.post.ts',
  'server/api/wallee/webhook.post.ts',
  'server/api/invoices/create.post.ts',
  'pages/admin/profile.vue',
  'pages/admin/courses.vue',
  'vercel.json',
  'tsconfig.json',
]

function between(source: string, start: string, end: string): string {
  const from = source.indexOf(start)
  expect(from, start).toBeGreaterThanOrEqual(0)
  const to = source.indexOf(end, from + start.length)
  expect(to, end).toBeGreaterThan(from)
  return source.slice(from, to)
}

function stripLineComments(source: string): string {
  return source
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n')
}

function stripTaggedBody(source: string, tag: string): string {
  const pattern = new RegExp(`\\$${tag}\\$[\\s\\S]*?\\$${tag}\\$`)
  expect(source).toMatch(pattern)
  return source.replace(pattern, '')
}

const tenantDdl = between(
  sql,
  'ALTER TABLE public.tenants',
  '-- Course category override',
)
const categoryDdl = between(
  sql,
  'ALTER TABLE public.course_categories',
  '-- Registration price snapshot',
)
const snapshotDdl = between(
  sql,
  'ALTER TABLE public.course_registrations',
  '-- One registration, one course-invoice binding',
)
const bindingDdl = between(
  sql,
  'CREATE TABLE IF NOT EXISTS public.course_invoice_bindings',
  '-- Keep the existing payment/SARI freeze',
)
const protectBody = between(sql, 'AS $protect$', '-- issue_course_invoice')
const issueBody = between(sql, 'AS $issue$', 'COMMENT ON FUNCTION public.issue_course_invoice')
const outsideFunctions = stripLineComments(
  stripTaggedBody(stripTaggedBody(stripTaggedBody(sql, 'guard'), 'protect'), 'issue'),
)

describe('course invoice phase 1 schema', () => {
  it('1. tenant default timing is off', () => {
    expect(tenantDdl).toContain(
      "ADD COLUMN IF NOT EXISTS default_invoice_timing_mode text NOT NULL DEFAULT 'off'",
    )
    expect(tenantDdl).not.toContain("'inherit'")
  })

  it('2. tenant immediate is allowed', () => {
    expect(tenantDdl).toContain("'immediate'")
    expect(tenantDdl).toContain('tenants_default_invoice_timing_mode_chk')
  })

  it('3. tenant on_confirmed is allowed', () => {
    expect(tenantDdl).toContain("'on_confirmed'")
  })

  it('4. tenant days_before_start accepts lead days 0..365', () => {
    expect(tenantDdl).toContain("'days_before_start'")
    expect(tenantDdl).toContain('default_invoice_lead_days >= 0')
    expect(tenantDdl).toContain('default_invoice_lead_days <= 365')
  })

  it('5. tenant days_before_start without lead days is rejected', () => {
    expect(tenantDdl).toContain('tenants_default_invoice_lead_days_required_chk')
    expect(tenantDdl).toContain("default_invoice_timing_mode <> 'days_before_start'")
    expect(tenantDdl).toContain('OR default_invoice_lead_days IS NOT NULL')
  })

  it('6. tenant lead days above 365 are rejected', () => {
    expect(tenantDdl).toContain('tenants_default_invoice_lead_days_range_chk')
    expect(tenantDdl).toContain('default_invoice_lead_days <= 365')
  })

  it('7. category default timing is inherit', () => {
    expect(categoryDdl).toContain(
      "ADD COLUMN IF NOT EXISTS invoice_timing_mode text NOT NULL DEFAULT 'inherit'",
    )
    expect(categoryDdl).not.toContain("DEFAULT 'off'")
  })

  it('8. existing categories stay inherit without an update', () => {
    expect(categoryDdl).toContain("NOT NULL DEFAULT 'inherit'")
    expect(outsideFunctions).not.toMatch(/\bUPDATE\s+public\.course_categories\b/i)
    expect(sql).not.toMatch(/\bUPDATE\s+public\.course_categories\b/i)
  })

  it('9. category off is a valid explicit override', () => {
    expect(categoryDdl).toContain("'inherit', 'off', 'immediate', 'days_before_start', 'on_confirmed'")
  })

  it('10. category immediate is valid', () => {
    expect(categoryDdl).toContain("'immediate'")
  })

  it('11. category on_confirmed is valid', () => {
    expect(categoryDdl).toContain("'on_confirmed'")
  })

  it('12. category days_before_start accepts lead days 0..365', () => {
    expect(categoryDdl).toContain("'days_before_start'")
    expect(categoryDdl).toContain('invoice_lead_days >= 0')
    expect(categoryDdl).toContain('invoice_lead_days <= 365')
    expect(categoryDdl).toContain("invoice_timing_mode <> 'days_before_start'")
    expect(categoryDdl).toContain('OR invoice_lead_days IS NOT NULL')
  })

  it('13. category lead days above 365 are rejected', () => {
    expect(categoryDdl).toContain('course_categories_invoice_lead_days_range_chk')
    expect(categoryDdl).toContain('invoice_lead_days <= 365')
  })

  it('14. only the invoice payment method can be billed', () => {
    expect(issueBody).toContain("v_reg.agreed_payment_method IS DISTINCT FROM 'invoice'")
    expect(issueBody).toContain("v_reg.payment_method IS DISTINCT FROM 'invoice'")
    expect(issueBody).toContain("RAISE EXCEPTION 'payment_method_not_invoice'")
    expect(issueBody).not.toMatch(/p_payment_method|p_agreed_payment_method/)
  })

  it('15. wallee is not an invoice payment method', () => {
    expect(sql).toContain('wallee, cash_on_site, admin, reserved')
    expect(issueBody).toContain("IS DISTINCT FROM 'invoice'")
  })

  it('16. cash_on_site is not an invoice payment method', () => {
    expect(sql).toContain('cash_on_site')
    expect(issueBody).not.toContain("= 'cash_on_site'")
    expect(issueBody).toContain("RAISE EXCEPTION 'payment_method_not_invoice'")
  })

  it('17. a tenant mismatch is rejected', () => {
    expect(issueBody).toContain('AND cr.tenant_id = p_tenant_id')
    expect(issueBody).toContain("RAISE EXCEPTION 'registration_not_found'")
    expect(issueBody).toContain('AND p.tenant_id IS DISTINCT FROM p_tenant_id')
    expect(issueBody).toContain("RAISE EXCEPTION 'registration_not_billable'")
    expect(bindingDdl).toContain("RAISE EXCEPTION 'tenant_mismatch'")
    expect(bindingDdl).toContain('AND i.tenant_id = NEW.tenant_id')
    expect(bindingDdl).toContain('AND cr.tenant_id = NEW.tenant_id')
  })

  it('18. a client cannot control the tenant', () => {
    expect(sql).toContain(
      'REVOKE ALL ON FUNCTION public.issue_course_invoice(uuid, uuid[], uuid) FROM anon, authenticated',
    )
    expect(sql).toContain(
      'GRANT EXECUTE ON FUNCTION public.issue_course_invoice(uuid, uuid[], uuid) TO service_role',
    )
    expect(sql).not.toContain('TO anon')
    expect(sql).not.toContain('TO authenticated')
    expect(issueBody).toContain('WHERE cr.id = v_id')
    expect(issueBody).toContain('AND cr.tenant_id = p_tenant_id')
  })

  it('19. a client cannot control the invoice id', () => {
    expect(issueBody).not.toMatch(/p_invoice_id/)
    expect(issueBody).toContain('v_new_invoice := gen_random_uuid()')
    expect(sql).toContain(
      'REVOKE ALL ON FUNCTION public.issue_course_invoice(uuid, uuid[], uuid) FROM PUBLIC',
    )
  })

  it('20. a client cannot control the invoice amount', () => {
    expect(issueBody).not.toMatch(/p_amount|p_vat|p_total|p_net|p_discount/)
    expect(issueBody).toContain('v_reg.agreed_net_rappen')
    expect(issueBody).toContain('v_reg.agreed_vat_rappen')
    expect(issueBody).toContain('v_reg.agreed_gross_rappen')
    const signature = between(sql, 'CREATE OR REPLACE FUNCTION public.issue_course_invoice(', 'RETURNS TABLE')
    expect(signature).not.toMatch(/rappen|vat|amount/i)
  })

  it('21. an existing registration invoice link is protected', () => {
    expect(protectBody.indexOf("RAISE EXCEPTION 'invoice_link_frozen'")).toBeGreaterThan(0)
    expect(protectBody.indexOf("RAISE EXCEPTION 'invoice_link_frozen'")).toBeLessThan(
      protectBody.indexOf("coalesce(auth.role(), '') = 'service_role'"),
    )
    expect(protectBody).toContain('OLD.invoice_id IS NOT NULL')
    expect(protectBody).toContain('NEW.invoice_id IS DISTINCT FROM OLD.invoice_id')
    expect(protectBody).toContain('NEW.invoice_id := NULL')
    expect(protectBody).toContain('NEW.invoice_id := OLD.invoice_id')
    expect(issueBody).toContain('cr.invoice_id IS NOT NULL')
    expect(issueBody).toContain('SELECT v_existing, v_existing_number, false')
  })

  it('22. an existing payment invoice link is protected', () => {
    expect(issueBody).toContain('p.course_registration_id = v_id')
    expect(issueBody).toContain('p.invoice_id IS NOT NULL')
    expect(issueBody).not.toMatch(/\bUPDATE\s+public\.payments\b/i)
    expect(sql).not.toMatch(/\bUPDATE\s+public\.payments\b/i)
  })

  it('23. a second binding for the same registration is not inserted', () => {
    expect(issueBody).toContain('WHEN unique_violation THEN')
    expect(issueBody).toContain('FROM public.course_invoice_bindings b')
    expect(issueBody).toContain('SELECT v_existing, v_existing_number, false')
    expect(issueBody).not.toMatch(/\bUPDATE\s+public\.course_registrations\b/i)
  })

  it('24. bindings are unique per tenant and registration', () => {
    expect(bindingDdl).toContain(
      'CONSTRAINT course_invoice_bindings_registration_key UNIQUE (tenant_id, registration_id)',
    )
    expect(sql).not.toMatch(/UNIQUE\s*\(\s*invoice_id\s*\)/i)
    expect(sql).not.toMatch(/course_registrations\.invoice_id[^;\n]*UNIQUE/i)
  })

  it('25. existing invoice statuses stay valid', () => {
    const statusMigration = readFileSync(
      resolve(process.cwd(), 'sql_migrations/20260713_add_pdf_created_invoice_status.sql'),
      'utf8',
    )
    for (const status of ['draft', 'pdf_created', 'sent', 'paid', 'overdue', 'cancelled']) {
      expect(statusMigration).toContain(`'${status}'`)
    }
    expect(issueBody).toContain("'draft'")
    expect(sql).not.toMatch(/DROP\s+CONSTRAINT\s+IF\s+EXISTS\s+check_status/i)
    expect(sql).not.toMatch(/\bALTER\s+TABLE\s+public\.invoices\b/i)
  })

  it('26. issued is not introduced', () => {
    expect(sql.toLowerCase()).not.toContain('issued')
  })

  it('27. snapshots are not backfilled', () => {
    expect(snapshotDdl).toContain('ADD COLUMN IF NOT EXISTS price_snapshot_at timestamptz')
    expect(snapshotDdl).not.toMatch(/price_snapshot_at\s+timestamptz\s+NOT\s+NULL/i)
    expect(snapshotDdl).not.toMatch(/price_snapshot_at[^,\n]*DEFAULT/i)
    expect(sql).not.toMatch(/\bUPDATE\s+public\.course_registrations\b/i)
    expect(outsideFunctions).not.toMatch(/\bINSERT\s+INTO\b/i)
  })

  it('28. amount_paid_rappen is not copied into the snapshot', () => {
    expect(sql).not.toMatch(/agreed_\w+\s*(:=|=)\s*.*amount_paid_rappen/)
    expect(sql).not.toMatch(/amount_paid_rappen\s*(:=|=)\s*.*agreed_/)
    expect(protectBody).toContain('NEW.amount_paid_rappen := 0')
    expect(protectBody).toContain('NEW.amount_paid_rappen := OLD.amount_paid_rappen')
  })

  it('29. appointment automation files and switches stay untouched', () => {
    expect(sql).not.toContain('auto_invoice_on_complete')
    expect(sql).not.toContain('auto_invoice_schedule')
    expect(sql).not.toMatch(/\bALTER\s+TABLE\s+public\.tenants\b[\s\S]*booking_policy/)
    const porcelain = execSync('git status --porcelain', { encoding: 'utf8' })
    const dirty = porcelain
      .split('\n')
      .map((line) => line.slice(3).trim())
      .filter(Boolean)
    for (const path of forbiddenPaths) {
      expect(dirty, path).not.toContain(path)
    }
    const allowed = new Set([
      migrationPath,
      'server/utils/__tests__/course-invoice-phase1-schema.test.ts',
    ])
    expect(dirty.filter((path) => !allowed.has(path))).toEqual([])
  })

  it('30. new binding table enables row level security and has no client policy', () => {
    expect(sql).toContain('ALTER TABLE public.course_invoice_bindings ENABLE ROW LEVEL SECURITY')
    expect(sql).not.toMatch(/CREATE\s+POLICY/i)
    expect(sql).not.toContain('course_invoice_batches')
    expect(sql).not.toContain('invoice_delivery_attempts')
    expect(sql).not.toContain('invoice_admin_tasks')
    expect(sql).not.toContain('invoice_documents')
    expect(sql).not.toContain('course_invoice_events')
    expect(sql).not.toMatch(/\binvoice_events\b/)
  })

  it('31. anon and authenticated cannot read or write the new objects', () => {
    expect(sql).toContain('REVOKE ALL ON TABLE public.course_invoice_bindings FROM PUBLIC, anon, authenticated')
    expect(sql).toContain(
      'REVOKE ALL ON FUNCTION public.issue_course_invoice(uuid, uuid[], uuid) FROM anon, authenticated',
    )
    expect(sql).toContain(
      'REVOKE ALL ON FUNCTION public.course_invoice_bindings_tenant_guard() FROM anon, authenticated',
    )
    expect(sql).not.toMatch(/GRANT\s+[\s\S]*\sTO\s+anon\b/)
    expect(sql).not.toMatch(/GRANT\s+[\s\S]*\sTO\s+authenticated\b/)
  })

  it('32. service_role can execute the issuer and use the binding table', () => {
    expect(sql).toContain(
      'GRANT EXECUTE ON FUNCTION public.issue_course_invoice(uuid, uuid[], uuid) TO service_role',
    )
    expect(sql).toContain(
      'GRANT EXECUTE ON FUNCTION public.course_invoice_bindings_tenant_guard() TO service_role',
    )
    expect(sql).toContain(
      'GRANT SELECT, INSERT, UPDATE ON TABLE public.course_invoice_bindings TO service_role',
    )
    expect(sql).not.toMatch(/GRANT\s+DELETE\s+ON\s+TABLE\s+public\.course_invoice_bindings/i)
  })
})

describe('course invoice phase 1 safety', () => {
  it('keeps the previous payment and SARI freeze as a superset', () => {
    const oldBody = between(previousProtect, 'AS $$', '$$;')
    const preserved = [
      "coalesce(auth.role(), '') = 'service_role'",
      "NEW.payment_status := 'pending'",
      'NEW.payment_id := NULL',
      'NEW.amount_paid_rappen := 0',
      'NEW.payment_method := NULL',
      'NEW.discount_applied_rappen := 0',
      'NEW.sari_data := NULL',
      'NEW.sari_synced := FALSE',
      'NEW.sari_synced_at := NULL',
      'NEW.sari_faberid := NULL',
      'NEW.sari_license_id := NULL',
      'NEW.sari_licenses := NULL',
      'NEW.payment_status := OLD.payment_status',
      'NEW.payment_id := OLD.payment_id',
      'NEW.amount_paid_rappen := OLD.amount_paid_rappen',
      'NEW.payment_method := OLD.payment_method',
      'NEW.discount_applied_rappen := OLD.discount_applied_rappen',
      'NEW.sari_data := OLD.sari_data',
      'NEW.sari_synced := OLD.sari_synced',
      'NEW.sari_synced_at := OLD.sari_synced_at',
      'NEW.sari_faberid := OLD.sari_faberid',
      'NEW.sari_license_id := OLD.sari_license_id',
      'NEW.sari_licenses := OLD.sari_licenses',
    ]
    for (const line of preserved) {
      expect(oldBody).toContain(line)
      expect(protectBody).toContain(line)
    }
    expect(sql).not.toContain('DROP TRIGGER IF EXISTS trg_course_registrations_protect_payment_fields')
    expect(protectBody).toContain('NEW.agreed_net_rappen := NULL')
    expect(protectBody).toContain('NEW.agreed_gross_rappen := OLD.agreed_gross_rappen')
    expect(protectBody).toContain('NEW.agreed_payment_method := NULL')
    expect(protectBody).toContain('NEW.agreed_payment_method := OLD.agreed_payment_method')
  })

  it('does not replace calculate_invoice_vat or allocate_invoice_number', () => {
    expect(sql).not.toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.calculate_invoice_vat/i)
    expect(sql).not.toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.allocate_invoice_number/i)
    expect(sql).not.toMatch(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.allocate_invoice_number/i)
    expect(issueBody).toContain('public.allocate_invoice_number(p_tenant_id)')
    expect(issueBody).toContain('round(v_reg.agreed_net_rappen::numeric * v_reg.agreed_vat_rate / 100)')
    expect(issueBody).toContain('v_reg.agreed_net_rappen + v_expected_vat - v_discount')
    expect(sql).not.toContain('simy.course_invoice_explicit_totals')
  })

  it('defines security definer functions with a locked search_path', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.course_invoice_bindings_tenant_guard()')
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.issue_course_invoice(')
    const guardHeader = between(sql, 'CREATE OR REPLACE FUNCTION public.course_invoice_bindings_tenant_guard()', 'AS $guard$')
    const issueHeader = between(sql, 'CREATE OR REPLACE FUNCTION public.issue_course_invoice(', 'AS $issue$')
    for (const header of [guardHeader, issueHeader]) {
      expect(header).toContain('SECURITY DEFINER')
      expect(header).toContain('SET search_path = pg_catalog, public')
    }
    const protectHeader = between(
      sql,
      'CREATE OR REPLACE FUNCTION public.course_registrations_protect_payment_fields()',
      'AS $protect$',
    )
    expect(protectHeader).not.toContain('SECURITY DEFINER')
    expect(protectHeader).toContain('SET search_path = pg_catalog, public')
  })

  it('has no top-level data mutation outside function definitions', () => {
    expect(outsideFunctions).not.toMatch(/\bINSERT\s+INTO\b/i)
    expect(outsideFunctions).not.toMatch(/\bDELETE\s+FROM\b/i)
    expect(outsideFunctions).not.toMatch(/(^|\n)\s*UPDATE\s+/i)
    expect(issueBody).toMatch(/INSERT INTO public\.invoices \(/)
    expect(issueBody).toMatch(/INSERT INTO public\.invoice_items \(/)
    expect(issueBody).toMatch(/INSERT INTO public\.course_invoice_bindings \(/)
    expect(issueBody).not.toMatch(/\bUPDATE\s+public\./i)
    expect(issueBody).not.toMatch(/\bDELETE\s+FROM\b/i)
    expect(sql).not.toContain('open_amount_rappen')
    expect(sql).not.toContain('qr_amount_rappen')
    expect(sql).not.toContain('invoices_with_details')
  })
})
