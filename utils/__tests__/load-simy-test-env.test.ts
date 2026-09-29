import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  defaultSimyTestEnvPath,
  loadSimyTestEnv,
  PRODUCTION_SUPABASE_PROJECT_REF,
} from '../../scripts/load-simy-test-env.mjs'

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
