#!/usr/bin/env node
/**
 * Load simy-test credentials from one machine-local file outside every worktree.
 *
 * Default file: ~/.config/simy/simy-test.env
 * Override path: SIMY_TEST_ENV_FILE
 * Disable: SIMY_LOAD_TEST_ENV=0
 *
 * The file may only contain simy-test keys. Production Supabase, Stripe, Wallee,
 * Resend, Twilio, and Vercel values are rejected. Secret values are never logged.
 *
 * `force` skips the CI / Vercel / production / Vitest guards and is for unit tests only.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const PRODUCTION_SUPABASE_PROJECT_REF = 'unyjaetebnaexaflpyoc'

export const SIMY_TEST_SUPABASE_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEY',
]

export const SIMY_TEST_E2E_KEYS = [
  'E2E_BASE_URL',
  'E2E_DEMO_PASSWORD',
  'E2E_ISOLATION_PASSWORD',
  'E2E_STAFF_EMAIL',
  'E2E_WORKING_HOUR_EXCEPTIONS',
]

const ALLOWED_KEYS = new Set([...SIMY_TEST_SUPABASE_KEYS, ...SIMY_TEST_E2E_KEYS])
const BUILD_LIFECYCLES = new Set(['build', 'generate', 'preview', 'postinstall', 'smoke-test'])
const PROFILES = new Set(['nuxt-dev', 'e2e', 'all'])

export function defaultSimyTestEnvPath() {
  return path.join(os.homedir(), '.config', 'simy', 'simy-test.env')
}

export function loadSimyTestEnv(options = {}) {
  const env = options.env ?? process.env
  const file = resolveFile(options.file, env)
  const base = {
    file,
    exists: false,
    outsideRepo: false,
    skipped: null,
    fatal: false,
    applied: [],
    missing: [],
    warnings: [],
  }

  if (!PROFILES.has(options.profile)) {
    return finish(base, {
      fatal: true,
      skipped: 'bad-profile',
      warnings: ['simy-test env profile must be nuxt-dev, e2e, or all'],
    })
  }

  if (String(env.SIMY_TEST_ENV_CHECKED || '') === '1' && !options.force) {
    return finish(base, { skipped: 'already-checked' })
  }
  if (String(env.SIMY_LOAD_TEST_ENV || process.env.SIMY_LOAD_TEST_ENV || '') === '0') {
    return finish(base, { skipped: 'disabled' })
  }

  if (!options.force) {
    const guard = guardReason(env)
    if (guard) return finish(base, { skipped: guard })
  }

  const located = locateFile(file)
  if (located.error) {
    return finish(base, {
      fatal: true,
      skipped: 'unreadable',
      warnings: [`Unable to read simy-test env file (${located.error})`],
    })
  }
  base.exists = located.exists
  base.outsideRepo = !located.insideRepo

  if (located.insideRepo) {
    return finish(base, {
      exists: located.exists,
      fatal: true,
      skipped: 'inside-repo',
      warnings: ['Refusing to load simy-test env from inside a git worktree'],
    })
  }

  if (!located.exists) {
    return finish(base, {
      exists: false,
      outsideRepo: true,
      skipped: 'missing',
      warnings: [`simy-test env file not found at ${file}`],
    })
  }

  if (located.looseMode) {
    base.warnings.push(`simy-test env file is group- or world-readable (${file}); chmod 600 is recommended`)
  }

  let parsed
  try {
    parsed = parseEnvFile(fs.readFileSync(located.realPath, 'utf8'))
  } catch {
    return finish(base, {
      exists: true,
      outsideRepo: true,
      fatal: true,
      skipped: 'unreadable',
      warnings: ['Unable to read simy-test env file'],
    })
  }
  if (parsed.error) {
    return finish(base, {
      exists: true,
      outsideRepo: true,
      fatal: true,
      skipped: 'malformed',
      warnings: [parsed.error],
    })
  }
  if (parsed.target !== 'simy-test') {
    return finish(base, {
      exists: true,
      outsideRepo: true,
      fatal: true,
      skipped: 'wrong-target',
      warnings: ['simy-test env file must set SIMY_ENV_TARGET=simy-test'],
    })
  }

  const unexpected = Object.keys(parsed.vars).filter((key) => !ALLOWED_KEYS.has(key)).sort()
  if (unexpected.length > 0) {
    return finish(base, {
      exists: true,
      outsideRepo: true,
      fatal: true,
      skipped: 'unexpected-keys',
      warnings: [`simy-test env file contains keys that are not allowed: ${unexpected.join(', ')}`],
    })
  }

  const vars = {}
  for (const [key, value] of Object.entries(parsed.vars)) {
    if (value !== '') vars[key] = value
  }

  if (vars.SUPABASE_URL) {
    const urlKind = classifySupabaseUrl(vars.SUPABASE_URL)
    if (urlKind === 'production') {
      return finish(base, {
        exists: true,
        outsideRepo: true,
        fatal: true,
        skipped: 'production-supabase',
        warnings: ['SUPABASE_URL points at the production Supabase project; simy-test env was not applied'],
      })
    }
    if (urlKind !== 'ok') {
      return finish(base, {
        exists: true,
        outsideRepo: true,
        fatal: true,
        skipped: 'invalid-supabase-url',
        warnings: ['SUPABASE_URL is not a simy-test Supabase https URL; simy-test env was not applied'],
      })
    }
  }

  const wantsSupabase = options.profile === 'nuxt-dev' || options.profile === 'all'
  const wantsE2E = options.profile === 'e2e' || options.profile === 'all'
  const applied = []
  const missing = []

  if (wantsSupabase) {
    const supabaseResult = applySupabase(env, vars)
    if (supabaseResult.fatal) {
      return finish(base, {
        exists: true,
        outsideRepo: true,
        fatal: true,
        skipped: supabaseResult.skipped,
        missing: supabaseResult.missing,
        warnings: base.warnings.concat(supabaseResult.warnings),
      })
    }
    applied.push(...supabaseResult.applied)
    missing.push(...supabaseResult.missing)
    base.warnings.push(...supabaseResult.warnings)
  }

  if (wantsE2E) {
    const e2eResult = applyE2E(env, vars)
    applied.push(...e2eResult.applied)
    missing.push(...e2eResult.missing)
    base.warnings.push(...e2eResult.warnings)
  }

  return finish(base, {
    exists: true,
    outsideRepo: true,
    skipped: applied.length > 0 ? null : 'not-applied',
    applied,
    missing,
    warnings: base.warnings,
  })
}

export function emitSimyTestEnvWarnings(result) {
  for (const warning of result.warnings) console.warn(warning)
}

function finish(base, patch) {
  return { ...base, ...patch }
}

function resolveFile(explicit, env) {
  if (explicit) return explicit
  const fromEnv = env.SIMY_TEST_ENV_FILE
  if (typeof fromEnv === 'string' && fromEnv.trim()) return fromEnv.trim()
  return defaultSimyTestEnvPath()
}

function guardReason(env) {
  if (process.env.CI || env.CI) return 'ci'
  if (process.env.VERCEL || env.VERCEL) return 'vercel'
  if (process.env.NODE_ENV === 'production' || env.NODE_ENV === 'production') return 'production'
  if (process.env.VITEST || env.VITEST) return 'vitest'
  const lifecycle = process.env.npm_lifecycle_event || env.npm_lifecycle_event
  if (BUILD_LIFECYCLES.has(lifecycle)) return 'build'
  return null
}

function locateFile(file) {
  const resolved = path.resolve(file)
  let exists = false
  let realPath = resolved
  let looseMode = false
  try {
    const stat = fs.lstatSync(resolved)
    exists = stat.isFile() || stat.isSymbolicLink()
    if (exists) {
      realPath = fs.realpathSync(resolved)
      const realStat = fs.statSync(realPath)
      exists = realStat.isFile()
      looseMode = (realStat.mode & 0o077) !== 0
    }
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      exists = false
    } else {
      return { error: error && error.code ? error.code : 'read-failed' }
    }
  }
  return {
    exists,
    realPath,
    looseMode,
    insideRepo: isInsideWorktree(exists ? realPath : resolved),
  }
}

function isInsideWorktree(candidate) {
  const resolved = path.resolve(candidate)
  for (const root of worktreeRoots()) {
    if (isInside(resolved, root)) return true
  }
  return false
}

function worktreeRoots() {
  const roots = []
  const local = findRepoRoot(process.cwd())
  if (local) roots.push(local)
  try {
    const out = execFileSync('git', ['worktree', 'list', '--porcelain'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    for (const line of out.split('\n')) {
      if (line.startsWith('worktree ')) roots.push(line.slice('worktree '.length).trim())
    }
  } catch {
    // git is unavailable; the cwd walk above is the fallback
  }
  return roots
}

function findRepoRoot(start) {
  let dir = path.resolve(start)
  for (;;) {
    const gitPath = path.join(dir, '.git')
    if (fs.existsSync(gitPath)) return dir
    const parent = path.dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

function isInside(child, parent) {
  const root = path.resolve(parent)
  const target = path.resolve(child)
  return target === root || target.startsWith(root + path.sep)
}

function parseEnvFile(text) {
  const vars = {}
  const seen = new Set()
  let target = null
  const lines = String(text).replace(/^\uFEFF/, '').split(/\r?\n/)
  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) return { error: `Malformed line ${index + 1} in simy-test env file` }
    let name = trimmed.slice(0, eq).trim()
    if (name.startsWith('export ')) name = name.slice('export '.length).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      return { error: `Malformed line ${index + 1} in simy-test env file` }
    }
    let value = trimmed.slice(eq + 1).trim()
    if (value.length >= 2) {
      const quote = value[0]
      if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
        value = value.slice(1, -1)
        if (quote === '"') {
          value = value.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
        }
      }
    }
    if (seen.has(name)) return { error: `Duplicate key ${name} in simy-test env file` }
    seen.add(name)
    if (name === 'SIMY_ENV_TARGET') {
      target = value
      continue
    }
    vars[name] = value
  }
  return { vars, target }
}

function classifySupabaseUrl(value) {
  let url
  try {
    url = new URL(value)
  } catch {
    return 'invalid'
  }
  if (url.protocol !== 'https:') return 'invalid'
  if (url.username || url.password) return 'invalid'
  const host = url.hostname.toLowerCase()
  if (!host.endsWith('.supabase.co')) return 'invalid'
  const ref = host.slice(0, -'.supabase.co'.length)
  if (!ref || ref.includes('.')) return 'invalid'
  if (ref === PRODUCTION_SUPABASE_PROJECT_REF) return 'production'
  return 'ok'
}

function applySupabase(env, vars) {
  const missing = missingSupabase(vars)
  const already = SIMY_TEST_SUPABASE_KEYS.some((key) => hasValue(env[key]))
  if (already) {
    return {
      fatal: false,
      skipped: 'explicit-supabase',
      applied: [],
      missing,
      warnings: ['Supabase variables are already set; simy-test database variables were not applied'],
    }
  }
  if (missing.length > 0) {
    return {
      fatal: true,
      skipped: 'incomplete-supabase',
      applied: [],
      missing,
      warnings: [`simy-test env is missing: ${missing.join(', ')}`],
    }
  }
  const applied = []
  for (const key of SIMY_TEST_SUPABASE_KEYS) {
    if (!hasValue(vars[key])) continue
    env[key] = vars[key]
    applied.push(key)
  }
  return { fatal: false, skipped: null, applied, missing: [], warnings: [] }
}

function missingSupabase(vars) {
  const missing = []
  if (!hasValue(vars.SUPABASE_URL)) missing.push('SUPABASE_URL')
  if (!hasValue(vars.SUPABASE_ANON_KEY)) missing.push('SUPABASE_ANON_KEY')
  if (!hasValue(vars.SUPABASE_SERVICE_ROLE_KEY) && !hasValue(vars.SUPABASE_SECRET_KEY)) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY')
  }
  return missing
}

function applyE2E(env, vars) {
  const e2eNames = ['E2E_DEMO_PASSWORD', 'E2E_ISOLATION_PASSWORD', 'E2E_BASE_URL']
  const already = e2eNames.some((key) => hasValue(env[key]))
  if (already) {
    return {
      applied: [],
      missing: [],
      warnings: ['E2E variables are already set; simy-test E2E variables were not applied'],
    }
  }
  if (!hasValue(vars.E2E_BASE_URL)) {
    const missing = []
    if (!hasValue(vars.E2E_DEMO_PASSWORD) && !hasValue(vars.E2E_ISOLATION_PASSWORD)) {
      missing.push('E2E_BASE_URL', 'E2E_DEMO_PASSWORD')
    } else {
      missing.push('E2E_BASE_URL')
    }
    return {
      applied: [],
      missing,
      warnings: [`simy-test E2E variables were not applied; missing: ${missing.join(', ')}`],
    }
  }
  if (!isSafeE2eBaseUrl(vars.E2E_BASE_URL)) {
    return {
      applied: [],
      missing: [],
      warnings: ['E2E_BASE_URL is not a local simy-test target; E2E credentials were not applied'],
    }
  }
  if (!hasValue(vars.E2E_DEMO_PASSWORD) && !hasValue(vars.E2E_ISOLATION_PASSWORD)) {
    return {
      applied: [],
      missing: ['E2E_DEMO_PASSWORD'],
      warnings: ['simy-test E2E variables were not applied; missing: E2E_DEMO_PASSWORD'],
    }
  }
  const applied = []
  for (const key of SIMY_TEST_E2E_KEYS) {
    if (!hasValue(vars[key])) continue
    env[key] = vars[key]
    applied.push(key)
  }
  return { applied, missing: [], warnings: [] }
}

function isSafeE2eBaseUrl(value) {
  let url
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (host === 'app.simy.ch') return false
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true
  return host.includes('simy-test')
}

function hasValue(value) {
  return typeof value === 'string' && value.length > 0
}

function isDirectRun() {
  const arg = process.argv[1]
  if (!arg) return false
  return pathToFileURL(path.resolve(arg)).href === import.meta.url
}

if (isDirectRun()) {
  const profileIndex = process.argv.indexOf('--profile')
  const profileFlag = process.argv.find((arg) => arg.startsWith('--profile='))
  const profile = profileFlag
    ? profileFlag.slice('--profile='.length)
    : profileIndex >= 0
      ? process.argv[profileIndex + 1]
      : 'all'
  if (!process.argv.includes('--check')) {
    console.error('Usage: node scripts/load-simy-test-env.mjs --check [--profile nuxt-dev|e2e|all]')
    process.exit(2)
  }
  const result = loadSimyTestEnv({ profile })
  emitSimyTestEnvWarnings(result)
  process.stdout.write(`${JSON.stringify({
    file: result.file,
    outsideRepo: result.outsideRepo,
    exists: result.exists,
    skipped: result.skipped,
    fatal: result.fatal,
    applied: result.applied,
    missing: result.missing,
  })}\n`)
  process.exit(result.fatal ? 1 : 0)
}
