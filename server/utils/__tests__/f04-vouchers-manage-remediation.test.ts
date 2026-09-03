/**
 * F-04 — Voucher manage IDOR remediation contract + unit helpers.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const managePath = resolve(process.cwd(), 'server/api/vouchers/manage.post.ts')
const useVouchersPath = resolve(process.cwd(), 'composables/useVouchers.ts')

describe('F-04 vouchers/manage contract', () => {
  const src = readFileSync(managePath, 'utf8')

  it('uses db session identity, not bare getAuthenticatedUser alone', () => {
    expect(src).toContain('getAuthenticatedUserWithDbId')
    expect(src).not.toMatch(/getAuthenticatedUser\(event\)/)
  })

  it('scopes load by tenant_id and does not trust body.userId without staff check', () => {
    expect(src).toContain(".eq('tenant_id', tenantId)")
    expect(src).toContain('Forbidden')
    expect(src).toContain('isStaff')
  })

  it('scopes find-by-code by tenant_id', () => {
    expect(src).toMatch(/\.eq\('code',\s*code\)[\s\S]*\.eq\('tenant_id',\s*tenantId\)/)
  })

  it('whitelists create fields and forces tenant_id / user_id', () => {
    expect(src).toContain('CREATE_ALLOWLIST')
    expect(src).toContain('pickAllowedCreateFields')
    expect(src).toContain('tenant_id: tenantId')
    expect(src).toContain('user_id: ownerUserId')
    expect(src).not.toMatch(/\.insert\(\[body\.voucherData\]\)/)
  })

  it('redeems only within tenant and ownership rules', () => {
    expect(src).toContain("action === 'redeem'")
    expect(src).toMatch(/\.eq\('id',\s*body\.voucherId\)[\s\S]*\.eq\('tenant_id',\s*tenantId\)/)
    expect(src).toContain('voucher.user_id !== dbUserId')
  })

  it('returns 401 for missing auth instead of generic 400 Unauthorized string', () => {
    expect(src).toContain('statusCode: 401')
    expect(src).not.toMatch(/throw new Error\('Unauthorized'\)/)
  })
})

describe('F-04 useVouchers caller still hits manage for load/create/find', () => {
  const src = readFileSync(useVouchersPath, 'utf8')

  it('load/create/find-by-code still use /api/vouchers/manage', () => {
    expect(src).toContain("/api/vouchers/manage")
    expect(src).toContain("action: 'load'")
    expect(src).toContain("action: 'create'")
    expect(src).toContain("action: 'find-by-code'")
  })

  it('primary redeem path uses dedicated /api/vouchers/redeem', () => {
    expect(src).toContain("/api/vouchers/redeem")
  })
})
