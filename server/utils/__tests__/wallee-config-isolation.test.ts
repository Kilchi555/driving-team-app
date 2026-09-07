import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  PRODUCTION_WALLEE_SPACE_ID,
  assertWalleeReadSpace,
  isNonProductionRuntime,
  resolveWalleeConfigBySpace,
  resolveWalleeConfigForTenant,
  type WalleeConfig,
} from '../wallee-config'

const prod: WalleeConfig = { spaceId: 88489, userId: 1, apiSecret: 'prod' }
const test: WalleeConfig = { spaceId: 97706, userId: 2, apiSecret: 'test' }
const fakeTestOnProdSpace: WalleeConfig = { spaceId: 88489, userId: 3, apiSecret: 'oops' }

describe('isNonProductionRuntime', () => {
  it('treats Vercel preview and development as non-production', () => {
    expect(isNonProductionRuntime({ VERCEL_ENV: 'preview' })).toBe(true)
    expect(isNonProductionRuntime({ VERCEL_ENV: 'development' })).toBe(true)
    expect(isNonProductionRuntime({ VERCEL_ENV: 'production' })).toBe(false)
  })

  it('falls back to NODE_ENV when VERCEL_ENV is absent', () => {
    expect(isNonProductionRuntime({ NODE_ENV: 'development' })).toBe(true)
    expect(isNonProductionRuntime({ NODE_ENV: 'production' })).toBe(false)
  })
})

describe('resolveWalleeConfigForTenant', () => {
  it('uses isolated test credentials in test mode', () => {
    expect(resolveWalleeConfigForTenant({
      tenantId: 't1',
      testMode: true,
      testConfig: test,
      prodConfig: prod,
      envConfig: prod,
      nonProduction: false,
    })).toEqual(test)
  })

  it('fails closed when test mode has no test credentials', () => {
    expect(() => resolveWalleeConfigForTenant({
      tenantId: 't1',
      testMode: true,
      testConfig: null,
      prodConfig: prod,
      envConfig: prod,
      nonProduction: false,
    })).toThrow(/Refusing production fallback/)
  })

  it('fails closed when preview is missing test credentials', () => {
    expect(() => resolveWalleeConfigForTenant({
      tenantId: 't1',
      testMode: false,
      testConfig: null,
      prodConfig: prod,
      envConfig: prod,
      nonProduction: true,
    })).toThrow(/Preview\/staging checkout requires isolated test credentials/)
  })

  it('refuses test credentials that point at production space 88489', () => {
    expect(() => resolveWalleeConfigForTenant({
      tenantId: 't1',
      testMode: true,
      testConfig: fakeTestOnProdSpace,
      prodConfig: prod,
      envConfig: prod,
      nonProduction: true,
    })).toThrow(/must not use production space 88489/)
  })

  it('keeps production tenant_secrets then env fallback', () => {
    expect(resolveWalleeConfigForTenant({
      tenantId: 't1',
      testMode: false,
      testConfig: null,
      prodConfig: prod,
      envConfig: { spaceId: 1, userId: 1, apiSecret: 'env' },
      nonProduction: false,
    })).toEqual(prod)

    expect(resolveWalleeConfigForTenant({
      tenantId: 't1',
      testMode: false,
      testConfig: null,
      prodConfig: null,
      envConfig: prod,
      nonProduction: false,
    })).toEqual(prod)
  })

  it('refuses no-tenantId env fallback on preview', () => {
    expect(() => resolveWalleeConfigForTenant({
      testMode: false,
      testConfig: null,
      prodConfig: null,
      envConfig: prod,
      nonProduction: true,
    })).toThrow(/requires tenant-scoped test credentials/)
  })
})

describe('resolveWalleeConfigBySpace', () => {
  it('rejects incoming production space on preview', () => {
    expect(() => resolveWalleeConfigBySpace({
      tenantId: 't1',
      incomingSpaceId: PRODUCTION_WALLEE_SPACE_ID,
      testConfig: test,
      prodConfig: prod,
      envConfig: prod,
      nonProduction: true,
    })).toThrow(/refused incoming production space 88489/)
  })

  it('matches isolated test space on preview', () => {
    expect(resolveWalleeConfigBySpace({
      tenantId: 't1',
      incomingSpaceId: 97706,
      testConfig: test,
      prodConfig: prod,
      envConfig: prod,
      nonProduction: true,
    })).toEqual(test)
  })

  it('still matches production space on production runtime', () => {
    expect(resolveWalleeConfigBySpace({
      tenantId: 't1',
      incomingSpaceId: 88489,
      testConfig: test,
      prodConfig: prod,
      envConfig: prod,
      nonProduction: false,
    })).toEqual(prod)
  })

  it('matches isolated test space on production runtime', () => {
    expect(resolveWalleeConfigBySpace({
      tenantId: 't1',
      incomingSpaceId: 97706,
      testConfig: test,
      prodConfig: prod,
      envConfig: prod,
      nonProduction: false,
    })).toEqual(test)
  })

  it('fails closed on production when incoming space matches neither test nor prod', () => {
    expect(() => resolveWalleeConfigBySpace({
      tenantId: 't1',
      incomingSpaceId: 11111,
      testConfig: test,
      prodConfig: prod,
      envConfig: prod,
      nonProduction: false,
    })).toThrow(/incoming space: 11111/)
  })

  it('does not return production credentials for an unmatched incoming space', () => {
    expect(() => resolveWalleeConfigBySpace({
      tenantId: 't1',
      incomingSpaceId: 11111,
      testConfig: null,
      prodConfig: prod,
      envConfig: prod,
      nonProduction: false,
    })).toThrow(/Keine Credentials/)
  })

  it('uses env production credentials only when incoming space matches env space', () => {
    const envOnly: WalleeConfig = { spaceId: 88489, userId: 9, apiSecret: 'env' }
    expect(resolveWalleeConfigBySpace({
      tenantId: 't1',
      incomingSpaceId: 88489,
      testConfig: null,
      prodConfig: null,
      envConfig: envOnly,
      nonProduction: false,
    })).toEqual(envOnly)
  })

  it('does not fall back from an explicit production space to a different production space', () => {
    const spaceA: WalleeConfig = { spaceId: 88489, userId: 1, apiSecret: 'space-a' }
    const spaceB: WalleeConfig = { spaceId: 99999, userId: 2, apiSecret: 'space-b' }
    expect(() => resolveWalleeConfigBySpace({
      tenantId: 't1',
      incomingSpaceId: spaceA.spaceId,
      testConfig: null,
      prodConfig: spaceB,
      envConfig: spaceB,
      nonProduction: false,
    })).toThrow(/incoming space: 88489/)
  })
})

describe('assertWalleeReadSpace', () => {
  it('returns the expected space when credentials match', () => {
    expect(assertWalleeReadSpace(88489, prod, 'webhook')).toBe(88489)
  })

  it('fails closed on space mismatch before any Wallee read', () => {
    expect(() => assertWalleeReadSpace(97706, prod, 'webhook txn 123')).toThrow(
      /credential space 88489 does not match expected space 97706/
    )
  })

  it('fails closed when expected space is missing', () => {
    expect(() => assertWalleeReadSpace(null, prod, 'webhook')).toThrow(/does not match expected space/)
  })
})

describe('F1/F-03 webhook contract', () => {
  const src = readFileSync(resolve(process.cwd(), 'server/api/wallee/webhook.post.ts'), 'utf8')

  it('enforces credential-space equality before TransactionService.read', () => {
    expect(src).toContain('assertWalleeReadSpace')
    expect(src).toContain('transactionService.read(readSpaceId')
    expect(src).not.toContain('transactionService.read(walleeCredentials.spaceId')
  })

  it('passes payment.wallee_space_id into save-payment-token (F-03)', () => {
    expect(src).toContain('spaceId: payment.wallee_space_id')
  })
})
