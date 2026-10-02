import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const VKU = readFileSync(resolve(process.cwd(), 'server/api/sari/save-settings.post.ts'), 'utf8')
const CZV = readFileSync(resolve(process.cwd(), 'server/api/sari/czv/save-settings.post.ts'), 'utf8')

const VKU_SECRET_NAMES = [
  'SARI_CLIENT_ID',
  'SARI_CLIENT_SECRET',
  'SARI_USERNAME',
  'SARI_PASSWORD',
] as const

const CZV_SECRET_NAMES = [
  'SARI_CZV_CLIENT_ID',
  'SARI_CZV_CLIENT_SECRET',
  'SARI_CZV_USERNAME',
  'SARI_CZV_PASSWORD',
  'SARI_CZV_REGISTRATION_ID',
  'SARI_FL_CLIENT_ID',
  'SARI_FL_CLIENT_SECRET',
  'SARI_FL_USERNAME',
  'SARI_FL_PASSWORD',
  'SARI_FL_REGISTRATION_ID',
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

  it('sets a non-empty secret_name from the existing secret identity', () => {
    for (const name of VKU_SECRET_NAMES) {
      expect(VKU).toContain(`secret_type: '${name}'`)
      expect(VKU).toContain(`secret_name: '${name}'`)
    }
    expect(CZV).toContain('secret_name: type')
    for (const name of CZV_SECRET_NAMES) {
      expect(CZV).toContain(`addSecret('${name}'`)
    }
    expect(VKU).not.toMatch(/secret_name:\s*['"]['"]/)
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
