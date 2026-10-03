import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const VKU = readFileSync(resolve(process.cwd(), 'server/api/sari/save-settings.post.ts'), 'utf8')
const CZV = readFileSync(resolve(process.cwd(), 'server/api/sari/czv/save-settings.post.ts'), 'utf8')

const VKU_SECRET_NAMES = [
  'sari_client_id',
  'sari_client_secret',
  'sari_username',
  'sari_password',
] as const

const CZV_SECRET_NAMES = [
  'sari_czv_client_id',
  'sari_czv_client_secret',
  'sari_czv_username',
  'sari_czv_password',
  'sari_czv_registration_id',
] as const

const FL_SECRET_NAMES = [
  'sari_fl_client_id',
  'sari_fl_client_secret',
  'sari_fl_username',
  'sari_fl_password',
  'sari_fl_registration_id',
] as const

function conflictTargets(src: string): string[] {
  return [...src.matchAll(/onConflict:\s*'([^']+)'/g)].map((match) => match[1])
}

function loggerCalls(src: string): string[] {
  return src.match(/logger\.\w+\([\s\S]*?\)/g) ?? []
}

describe('SARI save-settings tenant_secrets upsert', () => {
  it('does not send updated_by', () => {
    expect(VKU).not.toContain('updated_by')
    expect(CZV).not.toContain('updated_by')
  })

  it('uses the production unique key as onConflict', () => {
    expect(conflictTargets(VKU)).toEqual(['tenant_id,secret_type,secret_name'])
    expect(conflictTargets(CZV)).toEqual(['tenant_id,secret_type,secret_name'])
  })

  it('stores standard SARI as sari_credentials with lowercase secret_name', () => {
    const types = VKU.match(/secret_type:\s*'([^']+)'/g) ?? []
    expect(types).toEqual([
      "secret_type: 'sari_credentials'",
      "secret_type: 'sari_credentials'",
      "secret_type: 'sari_credentials'",
      "secret_type: 'sari_credentials'",
    ])
    for (const name of VKU_SECRET_NAMES) {
      expect(VKU).toContain(`secret_name: '${name}'`)
    }
    expect(VKU).not.toMatch(/secret_type:\s*'SARI_/)
    expect(VKU).not.toMatch(/secret_name:\s*'SARI_/)
    expect(VKU).not.toMatch(/secret_name:\s*['"]['"]/)
  })

  it('stores CZV and FL as sari_credentials with lowercase secret_name', () => {
    expect(CZV).toContain("secret_type: 'sari_credentials'")
    expect(CZV).not.toMatch(/secret_type:\s*secretName/)
    expect(CZV).not.toMatch(/secret_type:\s*'SARI_/)
    expect(CZV).not.toMatch(/secret_name:\s*'SARI_/)
    for (const name of [...CZV_SECRET_NAMES, ...FL_SECRET_NAMES]) {
      expect(CZV).toContain(`addSecret('${name}'`)
    }
    expect(CZV).not.toMatch(/addSecret\('SARI_/)
    expect(CZV).not.toMatch(/secret_name:\s*['"]['"]/)
  })

  it('takes tenant_id from the authenticated profile, not the request body', () => {
    expect(VKU).toContain('tenant_id: userProfile.tenant_id')
    expect(VKU).not.toContain('tenant_id: body')
    expect(CZV).toContain('const tenantId = userProfile.tenant_id')
    expect(CZV).toContain('tenant_id: tenantId')
    expect(CZV).not.toContain('tenant_id: body')
  })

  it('does not log secret values', () => {
    const forbidden = /sari_client_secret|sari_password|sari_czv_password|sari_fl_password|secret_value/
    for (const call of [...loggerCalls(VKU), ...loggerCalls(CZV)]) {
      expect(call).not.toMatch(forbidden)
    }
  })
})
