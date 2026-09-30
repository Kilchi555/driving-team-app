import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  DEMO_PASSWORD_REJECTED_MESSAGE,
  GATE_FAILURE_MESSAGE,
  RESEED_CONFIRMATION_MESSAGE,
  RESEED_UNSUPPORTED_MESSAGE,
  SERVICE_ROLE_MESSAGE,
  TEARDOWN_CONFIRMATION_MESSAGE,
  evaluateSimyTestGate,
  planSetupAction,
  planTeardownAction,
  resolveAuthUserId,
  safeErrorText,
  secretMissingMessage,
  setAuthPassword,
} from '../../scripts/simy-e2e-safety.mjs'

const APPROVED_URL = 'https://kssqalisskhvorqwgy.supabase.co'
const PASSWORD = 'unit-test-password-value'
const SERVICE_ROLE = 'unit-test-service-role'
const ROOT = path.resolve(__dirname, '../..')

function approvedEnv(extra: Record<string, string> = {}) {
  return {
    SIMY_ENV_TARGET: 'simy-test',
    SUPABASE_URL: APPROVED_URL,
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE,
    ...extra,
  }
}

function assertNoSecretLeak(message: string) {
  expect(message).not.toContain(PASSWORD)
  expect(message).not.toContain(SERVICE_ROLE)
  expect(message).not.toContain('short-secret')
}

describe('simy-test environment gate', () => {
  it('rejects a missing SIMY_ENV_TARGET before any client would be created', () => {
    const result = evaluateSimyTestGate({ SUPABASE_URL: APPROVED_URL })
    expect(result.ok).toBe(false)
    expect(result.message).toBe(GATE_FAILURE_MESSAGE)
  })

  it('rejects SIMY_ENV_TARGET=production', () => {
    const result = evaluateSimyTestGate({
      SIMY_ENV_TARGET: 'production',
      SUPABASE_URL: APPROVED_URL,
    })
    expect(result.ok).toBe(false)
    expect(result.message).toBe(GATE_FAILURE_MESSAGE)
  })

  it('rejects simy-test when SUPABASE_URL is missing', () => {
    const result = evaluateSimyTestGate({ SIMY_ENV_TARGET: 'simy-test' })
    expect(result.ok).toBe(false)
    expect(result.message).toBe(GATE_FAILURE_MESSAGE)
  })

  it('rejects simy-test with the wrong Supabase host', () => {
    const result = evaluateSimyTestGate({
      SIMY_ENV_TARGET: 'simy-test',
      SUPABASE_URL: 'https://unyjaetebnaexaflpyoc.supabase.co',
    })
    expect(result.ok).toBe(false)
    expect(result.message).toBe(GATE_FAILURE_MESSAGE)
    expect(result.message).not.toContain('unyjaetebnaexaflpyoc')
  })

  it('rejects malformed, insecure, and credentialed URLs', () => {
    for (const rawUrl of [
      'not a url',
      'http://kssqalisskhvorqwgy.supabase.co',
      'https://user:pass@kssqalisskhvorqwgy.supabase.co',
      'https://kssqalisskhvorqwgy.supabase.co.evil.example',
      'https://kssqalisskhvorqwgy.supabase.co:8443',
    ]) {
      const result = evaluateSimyTestGate({
        SIMY_ENV_TARGET: 'simy-test',
        SUPABASE_URL: rawUrl,
      })
      expect(result.ok).toBe(false)
      expect(result.message).toBe(GATE_FAILURE_MESSAGE)
      expect(result.message).not.toContain('pass')
    }
  })

  it('accepts the approved simy-test host', () => {
    const result = evaluateSimyTestGate({
      SIMY_ENV_TARGET: 'simy-test',
      SUPABASE_URL: `${APPROVED_URL}/rest/v1`,
    })
    expect(result).toEqual({ ok: true, supabaseUrl: APPROVED_URL })
  })
})

describe('setup secret and reseed plans', () => {
  it('stops when the tenant E2E secret is missing', () => {
    const result = planSetupAction(approvedEnv(), [], {
      secretName: 'E2E_DEMO_PASSWORD',
      allowReseed: true,
    })
    expect(result.ok).toBe(false)
    expect(result.exitCode).toBe(1)
    expect(result.message).toBe(secretMissingMessage('E2E_DEMO_PASSWORD'))
    assertNoSecretLeak(result.message)
  })

  it('does not accept DEMO_PASSWORD as the setup secret', () => {
    const onlyLegacy = planSetupAction(approvedEnv({ DEMO_PASSWORD: PASSWORD }), [], {
      secretName: 'E2E_DEMO_PASSWORD',
      allowReseed: true,
    })
    expect(onlyLegacy.ok).toBe(false)
    expect(onlyLegacy.message).toBe(DEMO_PASSWORD_REJECTED_MESSAGE)
    assertNoSecretLeak(onlyLegacy.message)

    const competing = planSetupAction(
      approvedEnv({ DEMO_PASSWORD: PASSWORD, E2E_DEMO_PASSWORD: PASSWORD }),
      [],
      { secretName: 'E2E_DEMO_PASSWORD', allowReseed: true },
    )
    expect(competing.ok).toBe(false)
    expect(competing.message).toBe(DEMO_PASSWORD_REJECTED_MESSAGE)
  })

  it('refuses --reseed without explicit --confirm', () => {
    const result = planSetupAction(
      approvedEnv({ E2E_DEMO_PASSWORD: PASSWORD }),
      ['--reseed'],
      { secretName: 'E2E_DEMO_PASSWORD', allowReseed: true },
    )
    expect(result.ok).toBe(false)
    expect(result.exitCode).toBe(1)
    expect(result.message).toBe(RESEED_CONFIRMATION_MESSAGE)
  })

  it('allows reseed only when the gate, secret, and --confirm all pass', () => {
    const result = planSetupAction(
      approvedEnv({ E2E_DEMO_PASSWORD: PASSWORD }),
      ['--reseed', '--confirm'],
      { secretName: 'E2E_DEMO_PASSWORD', allowReseed: true },
    )
    expect(result.ok).toBe(true)
    expect(result.reseed).toBe(true)
    expect(result.supabaseUrl).toBe(APPROVED_URL)
  })

  it('does not enable reseed for the isolation setup', () => {
    const result = planSetupAction(
      approvedEnv({ E2E_ISOLATION_PASSWORD: PASSWORD }),
      ['--reseed', '--confirm'],
      { secretName: 'E2E_ISOLATION_PASSWORD', allowReseed: false },
    )
    expect(result.ok).toBe(false)
    expect(result.message).toBe(RESEED_UNSUPPORTED_MESSAGE)
  })

  it('refuses teardown without --confirm', () => {
    const result = planTeardownAction(approvedEnv(), [])
    expect(result.ok).toBe(false)
    expect(result.exitCode).toBe(1)
    expect(result.message).toBe(TEARDOWN_CONFIRMATION_MESSAGE)
  })

  it('refuses confirmed teardown for the wrong environment', () => {
    const result = planTeardownAction(
      { ...approvedEnv(), SIMY_ENV_TARGET: 'production', SUPABASE_URL: 'https://example.supabase.co' },
      ['--confirm'],
    )
    expect(result.ok).toBe(false)
    expect(result.exitCode).toBe(1)
    expect(result.message).toBe(GATE_FAILURE_MESSAGE)
  })

  it('requires the service role only after the host gate', () => {
    const result = planSetupAction(
      {
        SIMY_ENV_TARGET: 'simy-test',
        SUPABASE_URL: APPROVED_URL,
        E2E_DEMO_PASSWORD: PASSWORD,
      },
      [],
      { secretName: 'E2E_DEMO_PASSWORD', allowReseed: true },
    )
    expect(result.ok).toBe(false)
    expect(result.message).toBe(SERVICE_ROLE_MESSAGE)
  })
})

describe('auth password update and lookup', () => {
  it('fails setup when updateUserById fails and does not echo the password', async () => {
    const password = PASSWORD
    await expect(setAuthPassword({
      updateUserById: async () => ({ error: { message: `rejected ${password}` } }),
    }, 'user-id', password)).rejects.toThrow('Auth password update failed.')
  })

  it('uses the profile auth id and does not list Auth users', async () => {
    let listed = false
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { auth_user_id: 'profile-id' }, error: null }),
          }),
        }),
      }),
      auth: { admin: { listUsers: async () => { listed = true; return { data: { users: [] }, error: null } } } },
    }
    await expect(resolveAuthUserId(supabase, 'apple-review@simy.ch')).resolves.toBe('profile-id')
    expect(listed).toBe(false)
  })

  it('continues past the first Auth page and stops when the email is found', async () => {
    const pages: number[] = []
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
      auth: {
        admin: {
          listUsers: async ({ page }: { page: number }) => {
            pages.push(page)
            if (page === 1) {
              return {
                data: {
                  users: Array.from({ length: 200 }, (_, index) => ({
                    id: `other-${index}`,
                    email: `other-${index}@simy.ch`,
                  })),
                },
                error: null,
              }
            }
            return {
              data: { users: [{ id: 'target-id', email: 'Apple-Review@simy.ch' }] },
              error: null,
            }
          },
        },
      },
    }
    await expect(resolveAuthUserId(supabase, 'apple-review@simy.ch')).resolves.toBe('target-id')
    expect(pages).toEqual([1, 2])
  })
})

describe('setup script source guards', () => {
  const scripts = [
    'scripts/setup-apple-review-tenant.mjs',
    'scripts/setup-e2e-isolation-tenant.mjs',
    'scripts/teardown-apple-review-tenant.mjs',
  ]

  it('keeps createClient behind the gate and removes the production fallback', () => {
    for (const relativePath of scripts) {
      const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
      expect(source).not.toContain('unyjaetebnaexaflpyoc')
      expect(source).not.toContain('randomBytes')
      expect(source).not.toContain("|| 'https://")
      expect(source).not.toContain('process.env.DEMO_PASSWORD')
      const planAt = Math.max(source.indexOf('planSetupAction('), source.indexOf('planTeardownAction('))
      const clientAt = source.indexOf('const supabase = createClient(')
      expect(planAt).toBeGreaterThan(0)
      expect(clientAt).toBeGreaterThan(planAt)
    }
  })

  it('does not bake teardown confirmation into package.json', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
    expect(pkg.scripts['demo:apple-review:setup']).toBe('node scripts/setup-apple-review-tenant.mjs')
    expect(pkg.scripts['demo:apple-review:teardown']).toBe('node scripts/teardown-apple-review-tenant.mjs')
    expect(pkg.scripts['demo:e2e-isolation:setup']).toBe('node scripts/setup-e2e-isolation-tenant.mjs')
    expect(pkg.scripts['demo:apple-review:teardown']).not.toContain('--confirm')
    expect(pkg.scripts['demo:apple-review:setup']).not.toContain('--reseed')
  })
})

describe('safe error text', () => {
  it('drops error text that embeds a credential', () => {
    expect(safeErrorText(new Error(`password=${PASSWORD}`))).toBe('Setup failed.')
    expect(safeErrorText(new Error('Auth password update failed.'))).toBe('Auth password update failed.')
  })
})
