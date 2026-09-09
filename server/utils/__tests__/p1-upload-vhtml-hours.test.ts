import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { sanitizeTenantHtml, sanitizeSvgMarkup } from '../../../utils/sanitize-tenant-html'

describe('P1 upload bucket pin', () => {
  it('ignores a client-supplied storage bucket', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'server/api/auth/upload-document.post.ts'),
      'utf8',
    )
    expect(src).toContain("const bucket = 'user-documents'")
    expect(src).not.toMatch(/const \{ fileData, fileName, bucket, path \}/)
  })
})

describe('P1 tenant HTML sanitization', () => {
  it('strips script tags from tenant HTML', () => {
    expect(sanitizeTenantHtml('<p>ok</p><script>alert(1)</script>')).toBe('<p>ok</p>')
  })

  it('strips script from SVG markup', () => {
    const out = sanitizeSvgMarkup('<svg><script>alert(1)</script><circle r="1"/></svg>')
    expect(out).not.toContain('<script')
    expect(out).toContain('<svg')
  })

  it('hardens the listed tenant-controlled v-html sinks', () => {
    const files = [
      'pages/onboarding/[token].vue',
      'pages/register/[tenant].vue',
      'pages/booking/availability/[slug].vue',
      'components/TenantLogo.vue',
      'server/api/public/website/[subdomain]/legal.get.ts',
      'components/ConfirmationDialog.vue',
    ]
    for (const rel of files) {
      const src = readFileSync(resolve(process.cwd(), rel), 'utf8')
      expect(src).toMatch(/sanitizeTenantHtml|sanitizeSvgMarkup/)
    }
  })
})

describe('calendar ICS token entropy', () => {
  it('generates calendar tokens with crypto.randomBytes instead of Math.random', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'server/api/calendar/generate-token.post.ts'),
      'utf8',
    )
    expect(src).toContain("randomBytes(32).toString('base64url')")
    expect(src).not.toContain('Math.random()')
  })
})

describe('P1 staff_working_hours RLS', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'migrations/20260909_p1_staff_working_hours_rls.sql'),
    'utf8',
  )

  it('drops the live FOR ALL isolation policy and anonymous SELECT by exact name', () => {
    expect(sql).toContain('DROP POLICY IF EXISTS staff_working_hours_tenant_isolation')
    expect(sql).toContain('DROP POLICY IF EXISTS "anon_read_staff_working_hours"')
    expect(sql).toContain('DROP POLICY IF EXISTS "Staff can manage their own working hours"')
    expect(sql).toContain('REVOKE ALL ON TABLE public.staff_working_hours FROM anon')
  })

  it('splits INSERT/UPDATE/DELETE with WITH CHECK that the target staff is in the session tenant', () => {
    expect(sql).toContain('staff_working_hours_insert')
    expect(sql).toContain('staff_working_hours_update')
    expect(sql).toContain('staff_working_hours_delete')
    expect(sql).toContain('target.tenant_id = staff_working_hours.tenant_id')
    expect(sql).not.toMatch(/CREATE POLICY[\s\S]{0,80}staff_working_hours_mutate_own[\s\S]{0,40}FOR ALL/i)
    expect(sql).not.toMatch(/CREATE POLICY[\s\S]{0,80}staff_working_hours_admin_mutate[\s\S]{0,40}FOR ALL/i)
    expect(sql).not.toMatch(/CREATE POLICY[\s\S]{0,80}staff_working_hours_tenant_isolation[\s\S]{0,40}FOR ALL/i)
  })
})
