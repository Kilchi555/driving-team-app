import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '../../..')

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('tenant registration abuse protection contracts', () => {
  it('register uses getClientIP, pending inactive tenant, and no immediate registration_token', () => {
    const src = read('server/api/tenants/register.post.ts')
    expect(src).toContain("from '~/server/utils/ip-utils'")
    expect(src).toContain('getClientIP(event)')
    expect(src.includes("x-forwarded-for')?.split(',')[0]")).toBe(false)
    expect(src).toContain("registration_status: REGISTRATION_STATUS_PENDING")
    expect(src).toContain('is_active: false')
    expect(src).toContain('requires_email_verification: true')
    expect(src).toContain('issueRegistrationEmailToken')
    expect(src).toContain('sendRegistrationVerificationEmail')
    expect(src).toContain('tenant_register_email')
    expect(src).toContain('tenantRegisterRequiresHcaptcha')
    // Must not mint registration_token before verification in the success path
    expect(src).not.toMatch(/registration_token:\s*generateRegistrationToken/)
  })

  it('create-admin requires verified tenant and audits outcomes', () => {
    const src = read('server/api/tenants/create-admin.post.ts')
    expect(src).toContain('tenantAllowsPrivilegedOnboarding')
    expect(src).toContain('getClientIP')
    expect(src).toContain("action: 'tenant_create_admin'")
    expect(src).toContain('admin_email_mismatch')
    expect(src).toContain('email_not_verified')
  })

  it('invite-staff-batch blocks unverified tenants', () => {
    const src = read('server/api/tenants/invite-staff-batch.post.ts')
    expect(src).toContain('tenantAllowsPrivilegedOnboarding')
  })

  it('migration widens rate_limit operation check and adds verification table', () => {
    const sql = read('sql_migrations/20261014_tenant_registration_abuse_protection.sql')
    expect(sql).toContain('DROP CONSTRAINT IF EXISTS rate_limit_logs_operation_check')
    expect(sql).toContain('consume_rate_limit')
    expect(sql).toContain('tenant_registration_email_tokens')
    expect(sql).toContain('email_verified_at')
    expect(sql).toContain('registration_status')
  })

  it('getClientIP does not trust the first X-Forwarded-For hop', () => {
    const src = read('server/utils/ip-utils.ts')
    expect(src).toContain('x-vercel-forwarded-for')
    expect(src.toLowerCase()).toContain('not trust')
    expect(src).toContain('reverse()')
  })
})
