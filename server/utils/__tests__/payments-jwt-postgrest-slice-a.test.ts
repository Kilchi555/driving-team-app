/**
 * Slice A: close JWT/PostgREST monetary writes on public.payments.
 * Live catalog is not queried here. This pins the new migration and the
 * remaining browser/source contract so staff JWT cannot INSERT/UPDATE payments.
 */
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const migrationPath = resolve(root, 'migrations/20260917_payments_jwt_postgrest_slice_a.sql')
const quotePath = resolve(root, 'server/utils/quote-staff-appointment.ts')
const resolvePath = resolve(root, 'server/utils/resolve-offer-price.ts')
const savePath = resolve(root, 'server/api/appointments/save.post.ts')
const eventModalPath = resolve(root, 'composables/useEventModalForm.ts')
const paymentStatusPath = resolve(root, 'composables/usePaymentStatus.ts')
const reminderPath = resolve(root, 'composables/useReminderService.ts')
const paymentServicePath = resolve(root, 'utils/paymentService.ts')
const reminderApiPath = resolve(root, 'server/api/staff/record-payment-reminder.post.ts')

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function stripSqlComments(sql: string): string {
  return sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
}

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue
    if (entry.name.startsWith('backup_')) continue
    const full = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      collectSourceFiles(full, acc)
      continue
    }
    if (/\.(ts|js|vue)$/.test(entry.name)) acc.push(full)
  }
  return acc
}

function jwtPaymentWriteHits(source: string): string[] {
  const hits: string[] = []
  const lines = source.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (!/\.from\(\s*['"]payments['"]\s*\)/.test(lines[i])) continue
    const window = lines.slice(i, Math.min(lines.length, i + 12)).join('\n')
    if (/\.(insert|update|upsert|delete)\s*\(/.test(window)) {
      hits.push(`line ${i + 1}`)
    }
  }
  return hits
}

describe('Slice A payments JWT/PostgREST containment migration', () => {
  const sql = read(migrationPath)
  const executable = stripSqlComments(sql)

  it('exists as a new origin/main migration and does not recreate anon shop INSERT', () => {
    expect(sql.length).toBeGreaterThan(400)
    expect(sql).toContain('Do not apply automatically to production')
    expect(executable).not.toMatch(/CREATE POLICY[\s\S]{0,80}anon_insert_shop_payment/i)
    expect(executable).not.toMatch(/CREATE TRIGGER/i)
    expect(executable).not.toMatch(/USING\s*\(\s*true\s*\)/)
    expect(executable).not.toMatch(/WITH CHECK\s*\(\s*true\s*\)/)
  })

  it('drops staff/customer JWT insert and staff JWT update policies', () => {
    expect(executable).toMatch(/DROP POLICY IF EXISTS "staff_insert_tenant" ON public\.payments/)
    expect(executable).toMatch(/DROP POLICY IF EXISTS "customer_insert_own" ON public\.payments/)
    expect(executable).toMatch(/DROP POLICY IF EXISTS "staff_update_tenant" ON public\.payments/)
    expect(executable).toMatch(/DROP POLICY IF EXISTS "anon_insert_shop_payment" ON public\.payments/)
    expect(executable).not.toMatch(/CREATE POLICY[\s\S]{0,80}customer_insert_own/i)
    expect(executable).not.toMatch(/CREATE POLICY[\s\S]{0,80}staff_insert_tenant/i)
    expect(executable).not.toMatch(/CREATE POLICY[\s\S]{0,80}staff_update_tenant/i)
  })

  it('revokes authenticated and anon INSERT/UPDATE and does not grant them back', () => {
    expect(executable).toMatch(/REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER\s+ON TABLE public\.payments FROM anon/)
    expect(executable).toMatch(/REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER\s+ON TABLE public\.payments FROM authenticated/)
    expect(executable).toMatch(/GRANT SELECT ON TABLE public\.payments TO authenticated/)
    expect(executable).toMatch(/GRANT ALL ON TABLE public\.payments TO service_role/)
    expect(executable).not.toMatch(/GRANT INSERT ON TABLE public\.payments TO (anon|authenticated)/)
    expect(executable).not.toMatch(/GRANT UPDATE ON TABLE public\.payments TO (anon|authenticated)/)
    expect(executable).not.toMatch(/GRANT ALL ON TABLE public\.payments TO anon/)
  })
})

describe('Slice A browser JWT writers are closed', () => {
  it('C1 EventModal no longer updates payments via getSupabase', () => {
    const src = read(eventModalPath)
    expect(src).toContain('/api/appointments/save')
    expect(src).toContain('invoiceAddress')
    expect(src).toContain('isInvoiceStaffPayment')
    expect(src).toMatch(/invoiceAddress:\s*isInvoiceStaffPayment &&/)
    expect(src).toMatch(/companyBillingAddressId:\s*isInvoiceStaffPayment/)
    expect(jwtPaymentWriteHits(src)).toEqual([])
  })

  it('C1 save distinguishes omitted metadata from explicit clear and method-gates invoice_address', () => {
    const src = read(savePath)
    expect(src).toContain('bodyHasOwn')
    expect(src).toContain('paymentNotesProvided')
    expect(src).toContain('companyBillingAddressIdProvided')
    expect(src).toContain("mappedPaymentMethod !== 'invoice'")
    expect(src).toContain('invoice_address = null')
    expect(src).toContain('getSupabaseAdmin')
  })

  it('C2 payment status updates go through /api/payments/status', () => {
    const src = read(paymentStatusPath)
    expect(src).toContain('/api/payments/status')
    expect(jwtPaymentWriteHits(src)).toEqual([])
  })

  it('C5 reminder stamps go through the staff reminder API', () => {
    const src = read(reminderPath)
    expect(src).toContain('/api/staff/record-payment-reminder')
    expect(jwtPaymentWriteHits(src)).toEqual([])
    const api = read(reminderApiPath)
    expect(api).toContain('getSupabaseAdmin')
    expect(api).not.toContain('lesson_price_rappen')
    expect(api).not.toContain('total_amount_rappen')
  })

  it('createPaymentRecord cannot insert through JWT/PostgREST', () => {
    const src = read(paymentServicePath)
    expect(src).toContain('Direct JWT/PostgREST payment inserts are not allowed')
    expect(src).toContain('Direct JWT/PostgREST payment updates are not allowed')
    expect(jwtPaymentWriteHits(src)).toEqual([])
    expect(src).not.toMatch(/\.from\(\s*['"]payments['"]\s*\)[\s\S]{0,120}\.insert\(/)
    expect(src).not.toMatch(/\.from\(\s*['"]payments['"]\s*\)[\s\S]{0,120}\.update\(/)
  })

  it('production client/composables/utils pages have no remaining payments writes', () => {
    const files = [
      ...collectSourceFiles(resolve(root, 'composables')),
      ...collectSourceFiles(resolve(root, 'components')),
      ...collectSourceFiles(resolve(root, 'pages')),
      ...collectSourceFiles(resolve(root, 'utils')),
    ]
    const offenders: string[] = []
    for (const file of files) {
      const hits = jwtPaymentWriteHits(read(file))
      if (hits.length) offenders.push(`${file.replace(root + '/', '')}: ${hits.join(', ')}`)
    }
    expect(offenders).toEqual([])
  })
})

describe('Slice A preserves #227 quote architecture', () => {
  it('does not reintroduce the #201 staff-appointment-price engine', () => {
    expect(existsSync(resolve(root, 'server/utils/staff-appointment-price.ts'))).toBe(false)
    expect(read(savePath)).toContain('quoteStaffAppointmentOffer')
    expect(read(quotePath)).toContain('resolveOfferPrice')
    expect(read(quotePath)).not.toContain('staff-appointment-price')
  })

  it('keeps exam fallback in resolveOfferPrice', () => {
    const src = read(resolvePath)
    expect(src).toContain("hint === 'exam'")
    expect(src).toContain("paidCategoryRule(categoryCode, 'base_price')")
  })
})
