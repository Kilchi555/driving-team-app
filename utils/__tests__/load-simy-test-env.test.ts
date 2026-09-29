import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  defaultSimyTestEnvPath,
  loadSimyTestEnv,
  PRODUCTION_SUPABASE_PROJECT_REF,
} from '../../scripts/load-simy-test-env.mjs'
import {
  assertSimyTestSetupUrl as assertIsolationUrl,
  createGuardedSetupClient as createIsolationClient,
  SIMY_TEST_SUPABASE_PROJECT_REF as isolationProjectRef,
} from '../../scripts/setup-e2e-isolation-tenant.mjs'
import {
  assertSimyTestSetupUrl as assertAppleUrl,
  createGuardedSetupClient as createAppleClient,
  SIMY_TEST_SUPABASE_PROJECT_REF as appleProjectRef,
} from '../../scripts/setup-apple-review-tenant.mjs'

const SECRET = 'fixture-secret-value'
const ANON = 'fixture-anon-value'
const TEST_URL = 'https://simytestproject.supabase.co'

function writeEnv(contents: string, mode = 0o600) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'simy-test-env-'))
  const file = path.join(dir, 'simy-test.env')
  fs.writeFileSync(file, contents, { mode })
  return file
}

function validEnv(extra = '') {
  return [
    'SIMY_ENV_TARGET=simy-test',
    `SUPABASE_URL=${TEST_URL}`,
    `SUPABASE_ANON_KEY=${ANON}`,
    `SUPABASE_SERVICE_ROLE_KEY=${SECRET}`,
    'E2E_BASE_URL=http://127.0.0.1:3000',
    `E2E_DEMO_PASSWORD=${SECRET}`,
    extra,
  ].filter(Boolean).join('\n')
}

describe('simy-test env loader', () => {
  it('resolves the shared file outside the repository', () => {
    const file = defaultSimyTestEnvPath()
    expect(file.endsWith(`${path.sep}.config${path.sep}simy${path.sep}simy-test.env`)).toBe(true)
    expect(path.resolve(file).startsWith(path.resolve(process.cwd()) + path.sep)).toBe(false)
  })

  it('loads simy-test names for nuxt dev without copying e2e secrets', () => {
    const file = writeEnv(validEnv())
    const env: Record<string, string> = {}
    const result = loadSimyTestEnv({ force: true, profile: 'nuxt-dev', file, env })
    expect(result.fatal).toBe(false)
    expect(result.applied).toEqual(['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'])
    expect(env.SUPABASE_URL).toBe(TEST_URL)
    expect(env.E2E_DEMO_PASSWORD).toBeUndefined()
    expect(JSON.stringify(result)).not.toContain(SECRET)
    expect(process.env['SUPABASE_SERVICE_ROLE_KEY']).not.toBe(SECRET)
  })

  it('loads e2e names only for a local base url', () => {
    const file = writeEnv(validEnv())
    const env: Record<string, string> = {}
    const result = loadSimyTestEnv({ force: true, profile: 'e2e', file, env })
    expect(result.fatal).toBe(false)
    expect(result.applied).toEqual(['E2E_BASE_URL', 'E2E_DEMO_PASSWORD'])
    expect(env.E2E_BASE_URL).toBe('http://127.0.0.1:3000')
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined()
    expect(JSON.stringify(result)).not.toContain(SECRET)
  })

  it('does not apply e2e credentials when the base url is production', () => {
    const file = writeEnv(validEnv().replace('http://127.0.0.1:3000', 'https://app.simy.ch'))
    const env: Record<string, string> = {}
    const result = loadSimyTestEnv({ force: true, profile: 'e2e', file, env })
    expect(result.fatal).toBe(false)
    expect(result.applied).toEqual([])
    expect(env.E2E_DEMO_PASSWORD).toBeUndefined()
    expect(result.warnings.join('\n')).not.toContain(SECRET)
    expect(result.warnings.join('\n')).not.toContain('app.simy.ch')
  })

  it('refuses the production supabase project without echoing secrets', () => {
    const file = writeEnv([
      'SIMY_ENV_TARGET=simy-test',
      `SUPABASE_URL=https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`,
      `SUPABASE_ANON_KEY=${ANON}`,
      `SUPABASE_SERVICE_ROLE_KEY=${SECRET}`,
    ].join('\n'))
    const env: Record<string, string> = {}
    const result = loadSimyTestEnv({ force: true, profile: 'nuxt-dev', file, env })
    expect(result.fatal).toBe(true)
    expect(result.skipped).toBe('production-supabase')
    expect(result.applied).toEqual([])
    expect(env.SUPABASE_URL).toBeUndefined()
    expect(result.warnings.join('\n')).not.toContain(SECRET)
    expect(result.warnings.join('\n')).not.toContain(PRODUCTION_SUPABASE_PROJECT_REF)
  })

  it('rejects unexpected production keys', () => {
    const file = writeEnv(`${validEnv()}\nSTRIPE_SECRET_KEY=${SECRET}\n`)
    const env: Record<string, string> = {}
    const result = loadSimyTestEnv({ force: true, profile: 'all', file, env })
    expect(result.fatal).toBe(true)
    expect(result.skipped).toBe('unexpected-keys')
    expect(result.applied).toEqual([])
    expect(result.warnings.join('\n')).toContain('STRIPE_SECRET_KEY')
    expect(result.warnings.join('\n')).not.toContain(SECRET)
  })

  it('does not merge into supabase variables that are already set', () => {
    const file = writeEnv(validEnv())
    const env: Record<string, string> = { SUPABASE_URL: 'https://explicit.supabase.co' }
    const result = loadSimyTestEnv({ force: true, profile: 'nuxt-dev', file, env })
    expect(result.fatal).toBe(false)
    expect(result.applied).toEqual([])
    expect(env.SUPABASE_URL).toBe('https://explicit.supabase.co')
    expect(env.SUPABASE_ANON_KEY).toBeUndefined()
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined()
  })

  it('refuses a file inside a worktree before using it', () => {
    const result = loadSimyTestEnv({
      force: true,
      profile: 'nuxt-dev',
      file: path.join(process.cwd(), 'config', 'simy-test.env.example'),
      env: {},
    })
    expect(result.fatal).toBe(true)
    expect(result.skipped).toBe('inside-repo')
    expect(result.applied).toEqual([])
  })

  it('refuses a symlink that resolves inside a worktree', () => {
    const linkDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simy-test-link-'))
    const link = path.join(linkDir, 'simy-test.env')
    fs.symlinkSync(path.join(process.cwd(), 'config', 'simy-test.env.example'), link)
    const result = loadSimyTestEnv({ force: true, profile: 'nuxt-dev', file: link, env: {} })
    expect(result.skipped).toBe('inside-repo')
    expect(result.applied).toEqual([])
  })

  it('skips ci, production, and vitest unless tests force a fixture', () => {
    const file = writeEnv(validEnv())
    const previous = {
      CI: process.env.CI,
      NODE_ENV: process.env.NODE_ENV,
    }
    try {
      process.env.CI = 'true'
      const ci = loadSimyTestEnv({ profile: 'nuxt-dev', file, env: {} })
      expect(ci.skipped).toBe('ci')
      expect(ci.applied).toEqual([])

      delete process.env.CI
      process.env.NODE_ENV = 'production'
      const production = loadSimyTestEnv({ profile: 'nuxt-dev', file, env: {} })
      expect(production.skipped).toBe('production')

      process.env.NODE_ENV = 'test'
      const vitest = loadSimyTestEnv({ profile: 'nuxt-dev', file, env: {} })
      expect(vitest.skipped).toBe('vitest')
    } finally {
      if (previous.CI === undefined) delete process.env.CI
      else process.env.CI = previous.CI
      if (previous.NODE_ENV === undefined) delete process.env.NODE_ENV
      else process.env.NODE_ENV = previous.NODE_ENV
    }
  })

  it('does not echo a malformed line', () => {
    const file = writeEnv(`SIMY_ENV_TARGET=simy-test\nthis is bad ${SECRET}\n`)
    const result = loadSimyTestEnv({ force: true, profile: 'nuxt-dev', file, env: {} })
    expect(result.skipped).toBe('malformed')
    expect(result.warnings.join('\n')).toContain('Malformed line 2')
    expect(result.warnings.join('\n')).not.toContain(SECRET)
  })

  it('warns when the file is missing and when it is too open', () => {
    const missing = loadSimyTestEnv({
      force: true,
      profile: 'nuxt-dev',
      file: path.join(os.tmpdir(), 'simy-test-env-missing', 'simy-test.env'),
      env: {},
    })
    expect(missing.fatal).toBe(false)
    expect(missing.exists).toBe(false)
    expect(missing.skipped).toBe('missing')

    const open = writeEnv(validEnv(), 0o644)
    const result = loadSimyTestEnv({ force: true, profile: 'nuxt-dev', file: open, env: {} })
    expect(result.applied).toContain('SUPABASE_URL')
    expect(result.warnings.join('\n')).toContain('chmod 600')
    expect(result.warnings.join('\n')).not.toContain(SECRET)
  })

  it('check output lists names only', () => {
    const file = writeEnv(validEnv(`E2E_ISOLATION_PASSWORD=${SECRET}`))
    const env = { ...process.env }
    for (const key of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY', 'E2E_BASE_URL', 'E2E_DEMO_PASSWORD', 'E2E_ISOLATION_PASSWORD', 'E2E_STAFF_EMAIL', 'E2E_WORKING_HOUR_EXCEPTIONS']) {
      delete env[key]
    }
    delete env.CI
    delete env.VERCEL
    delete env.VITEST
    delete env.SIMY_TEST_ENV_CHECKED
    delete env.SIMY_LOAD_TEST_ENV
    env.NODE_ENV = 'development'
    env.SIMY_TEST_ENV_FILE = file
    const output = execFileSync(process.execPath, ['scripts/load-simy-test-env.mjs', '--check', '--profile', 'all'], {
      cwd: process.cwd(),
      env,
      encoding: 'utf8',
    })
    expect(output).not.toContain(SECRET)
    expect(output).not.toContain(ANON)
    const report = JSON.parse(output)
    expect(report.exists).toBe(true)
    expect(report.outsideRepo).toBe(true)
    expect(report.fatal).toBe(false)
    expect(report.applied).toEqual([
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'E2E_BASE_URL',
      'E2E_DEMO_PASSWORD',
      'E2E_ISOLATION_PASSWORD',
    ])
  })

  it('keeps production build and nuxt config free of the loader', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    expect(pkg.scripts.dev).toContain('scripts/with-simy-test-env.mjs --profile nuxt-dev')
    expect(pkg.scripts['test:e2e']).toContain('scripts/with-simy-test-env.mjs --profile e2e')
    expect(pkg.scripts.build).toBe('nuxt build')
    expect(pkg.scripts.build).not.toContain('simy-test')
    const nuxtConfig = fs.readFileSync('nuxt.config.ts', 'utf8')
    expect(nuxtConfig).not.toContain('load-simy-test-env')
    const gitignore = fs.readFileSync('.gitignore', 'utf8')
    expect(gitignore).toContain('simy-test.env')
    expect(gitignore).toContain('.env.test')
  })
})

const CORRECT_TEST_URL = 'https://kssqalisscxkhvorqwgy.supabase.co'
const WRONG_PROJECT_URL = 'https://kssqalisskhvorqwgy.supabase.co'
const PRODUCTION_URL = `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`

describe('simy-test setup production guard', () => {
  const setups = [
    {
      name: 'setup-e2e-isolation-tenant.mjs',
      file: 'scripts/setup-e2e-isolation-tenant.mjs',
      assertUrl: assertIsolationUrl,
      createClient: createIsolationClient,
      projectRef: isolationProjectRef,
    },
    {
      name: 'setup-apple-review-tenant.mjs',
      file: 'scripts/setup-apple-review-tenant.mjs',
      assertUrl: assertAppleUrl,
      createClient: createAppleClient,
      projectRef: appleProjectRef,
    },
  ]

  it('does not keep a production supabase fallback in either setup script', () => {
    for (const setup of setups) {
      const source = fs.readFileSync(setup.file, 'utf8')
      expect(source).not.toContain(PRODUCTION_SUPABASE_PROJECT_REF)
      expect(source).not.toContain("|| 'https://")
      expect(source).toContain('loadSimyTestEnv')
      expect(source).toContain('kssqalisscxkhvorqwgy')
      const loaderAt = source.indexOf('loadSimyTestEnv(')
      const clientAt = source.indexOf('createGuardedSetupClient(process.env)')
      expect(loaderAt).toBeGreaterThan(-1)
      expect(clientAt).toBeGreaterThan(loaderAt)
    }
  })

  it.each(setups.map((setup) => [setup.name, setup]))(
    '%s stops before createClient when SUPABASE_URL is missing, production, or a foreign project',
    (_name, setup) => {
      const spy = vi.fn(() => ({ mocked: true }))
      const missing = setup.createClient({ SUPABASE_SERVICE_ROLE_KEY: 'fixture-service-role' }, spy)
      expect(missing.ok).toBe(false)
      expect(missing.reason).toBe('missing-url')
      expect(missing.client).toBeNull()
      expect(setup.assertUrl(undefined).ok).toBe(false)
      expect(setup.assertUrl('').reason).toBe('missing-url')

      const production = setup.createClient({
        SUPABASE_URL: PRODUCTION_URL,
        SUPABASE_SERVICE_ROLE_KEY: 'fixture-service-role',
      }, spy)
      expect(production.ok).toBe(false)
      expect(production.reason).toBe('production-url')
      expect(production.client).toBeNull()

      const wrong = setup.createClient({
        SUPABASE_URL: WRONG_PROJECT_URL,
        SUPABASE_SERVICE_ROLE_KEY: 'fixture-service-role',
      }, spy)
      expect(wrong.ok).toBe(false)
      expect(wrong.reason).toBe('wrong-project')
      expect(wrong.client).toBeNull()
      expect(WRONG_PROJECT_URL).not.toContain('kssqalisscxkhvorqwgy')
      expect(spy).not.toHaveBeenCalled()
    },
  )

  it.each(setups.map((setup) => [setup.name, setup]))(
    '%s reaches createClient only for the simy-test project',
    (_name, setup) => {
      expect(setup.projectRef).toBe('kssqalisscxkhvorqwgy')
      const spy = vi.fn(() => ({ mocked: true }))
      const opened = setup.createClient({
        SUPABASE_URL: CORRECT_TEST_URL,
        SUPABASE_SERVICE_ROLE_KEY: 'fixture-service-role',
      }, spy)
      expect(opened.ok).toBe(true)
      expect(opened.reason).toBe('ok')
      expect(spy).toHaveBeenCalledOnce()
      expect(spy.mock.calls[0]?.[0]).toBe(CORRECT_TEST_URL)
      expect(spy.mock.calls[0]?.[1]).toBe('fixture-service-role')
      expect(opened.client).toEqual({ mocked: true })
    },
  )

  it('still refuses an already-set production URL that the loader will not overwrite', () => {
    const file = writeEnv(validEnv())
    const env: Record<string, string> = {
      SUPABASE_URL: PRODUCTION_URL,
      SUPABASE_SERVICE_ROLE_KEY: 'already-set',
    }
    const loaded = loadSimyTestEnv({ force: true, profile: 'nuxt-dev', file, env })
    expect(loaded.fatal).toBe(false)
    expect(loaded.applied).toEqual([])
    expect(env.SUPABASE_URL).toBe(PRODUCTION_URL)
    const spy = vi.fn(() => ({ mocked: true }))
    const isolation = createIsolationClient(env, spy)
    const apple = createAppleClient(env, spy)
    expect(isolation.reason).toBe('production-url')
    expect(apple.reason).toBe('production-url')
    expect(spy).not.toHaveBeenCalled()
  })
})
