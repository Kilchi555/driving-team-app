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
    ]
    for (const rel of files) {
      const src = readFileSync(resolve(process.cwd(), rel), 'utf8')
      expect(src).toMatch(/sanitizeTenantHtml|sanitizeSvgMarkup/)
    }
  })
})

describe('P1 staff_working_hours RLS', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'migrations/20260909_p1_staff_working_hours_rls.sql'),
    'utf8',
  )

  it('drops the unscoped own-hours FOR ALL policy and requires a role + tenant WITH CHECK', () => {
    expect(sql).toContain('DROP POLICY IF EXISTS "Staff can manage their own working hours"')
    expect(sql).toContain('staff_working_hours_mutate_own')
    expect(sql).toContain('WITH CHECK')
    expect(sql).toContain("role IN ('admin', 'staff', 'tenant_admin', 'super_admin')")
  })
})
