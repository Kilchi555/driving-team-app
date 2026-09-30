/**
 * Fail-closed gate for simy-test demo setup and teardown.
 * Pure checks stay free of Supabase clients so tests never open a connection.
 */

export const SIMY_TEST_TARGET = 'simy-test'
export const SIMY_TEST_SUPABASE_HOST = 'kssqalisskhvorqwgy.supabase.co'
export const SETUP_SECRET_NAMES = Object.freeze([
  'E2E_DEMO_PASSWORD',
  'E2E_ISOLATION_PASSWORD',
])

export const GATE_FAILURE_MESSAGE =
  'E2E safety gate failed: SIMY_ENV_TARGET must be simy-test and SUPABASE_URL must target the approved simy-test Supabase project.'
export const DEMO_PASSWORD_REJECTED_MESSAGE =
  'E2E safety gate failed: DEMO_PASSWORD is not an accepted setup secret.'
export const RESEED_CONFIRMATION_MESSAGE =
  'E2E safety gate failed: --reseed requires explicit --confirm and was refused.'
export const TEARDOWN_CONFIRMATION_MESSAGE =
  'E2E safety gate failed: teardown requires --confirm.'
export const SERVICE_ROLE_MESSAGE =
  'E2E safety gate failed: SUPABASE_SERVICE_ROLE_KEY must be set.'
export const RESEED_UNSUPPORTED_MESSAGE =
  'E2E safety gate failed: --reseed is not supported for this setup.'

const AUTH_PAGE_SIZE = 200
const AUTH_PAGE_LIMIT = 50

export function secretMissingMessage(name) {
  return `E2E safety gate failed: ${name} must be set before setup.`
}

function hasValue(value) {
  return typeof value === 'string' && value.length > 0
}

export function evaluateSimyTestGate(env) {
  if (!env || env.SIMY_ENV_TARGET !== SIMY_TEST_TARGET) {
    return { ok: false, message: GATE_FAILURE_MESSAGE }
  }

  const rawUrl = env.SUPABASE_URL
  if (typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    return { ok: false, message: GATE_FAILURE_MESSAGE }
  }

  let url
  try {
    url = new URL(rawUrl)
  } catch {
    return { ok: false, message: GATE_FAILURE_MESSAGE }
  }

  if (url.protocol !== 'https:') return { ok: false, message: GATE_FAILURE_MESSAGE }
  if (url.username || url.password) return { ok: false, message: GATE_FAILURE_MESSAGE }
  if (url.hostname !== SIMY_TEST_SUPABASE_HOST) return { ok: false, message: GATE_FAILURE_MESSAGE }
  if (url.port && url.port !== '443') return { ok: false, message: GATE_FAILURE_MESSAGE }

  return { ok: true, supabaseUrl: url.origin }
}

export function planSetupAction(env, argv, options) {
  const gate = evaluateSimyTestGate(env)
  if (!gate.ok) return { ok: false, exitCode: 1, message: gate.message }

  if (hasValue(env.DEMO_PASSWORD)) {
    return { ok: false, exitCode: 1, message: DEMO_PASSWORD_REJECTED_MESSAGE }
  }

  const secretName = options?.secretName
  if (!SETUP_SECRET_NAMES.includes(secretName)) {
    return { ok: false, exitCode: 1, message: 'E2E safety gate failed: unknown setup secret.' }
  }

  const password = env[secretName]
  if (!hasValue(password) || password.length < 12) {
    return { ok: false, exitCode: 1, message: secretMissingMessage(secretName) }
  }

  const wantsReseed = Array.isArray(argv) && argv.includes('--reseed')
  if (!options.allowReseed && wantsReseed) {
    return { ok: false, exitCode: 1, message: RESEED_UNSUPPORTED_MESSAGE }
  }
  if (wantsReseed && !argv.includes('--confirm')) {
    return { ok: false, exitCode: 1, message: RESEED_CONFIRMATION_MESSAGE }
  }

  if (!hasValue(env.SUPABASE_SERVICE_ROLE_KEY)) {
    return { ok: false, exitCode: 1, message: SERVICE_ROLE_MESSAGE }
  }

  return {
    ok: true,
    exitCode: 0,
    supabaseUrl: gate.supabaseUrl,
    password,
    reseed: Boolean(options.allowReseed && wantsReseed),
  }
}

export function planTeardownAction(env, argv) {
  if (!Array.isArray(argv) || !argv.includes('--confirm')) {
    return { ok: false, exitCode: 1, message: TEARDOWN_CONFIRMATION_MESSAGE }
  }

  const gate = evaluateSimyTestGate(env)
  if (!gate.ok) return { ok: false, exitCode: 1, message: gate.message }

  if (!hasValue(env.SUPABASE_SERVICE_ROLE_KEY)) {
    return { ok: false, exitCode: 1, message: SERVICE_ROLE_MESSAGE }
  }

  return { ok: true, exitCode: 0, supabaseUrl: gate.supabaseUrl }
}

export function safeErrorText(error) {
  const raw = error instanceof Error
    ? error.message
    : error && typeof error === 'object' && typeof error.message === 'string'
      ? error.message
      : ''
  const message = raw || 'Setup failed.'
  if (message.length > 500) return 'Setup failed.'
  if (/eyJ|service_role|sb_secret_|Bearer\s+/i.test(message)) return 'Setup failed.'
  if (/password\s*[:=]/i.test(message)) return 'Setup failed.'
  return message
}

/**
 * Profile row first, then paginated Auth lookup that stops on the first match.
 * A full page budget without a match aborts instead of creating a duplicate.
 */
export async function resolveAuthUserId(supabase, email) {
  const normalized = String(email || '').toLowerCase()
  const { data, error } = await supabase
    .from('users')
    .select('auth_user_id')
    .eq('email', email)
    .maybeSingle()
  if (error) throw new Error('Auth user lookup failed.')
  if (data?.auth_user_id) return data.auth_user_id

  for (let page = 1; page <= AUTH_PAGE_LIMIT; page += 1) {
    const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
      page,
      perPage: AUTH_PAGE_SIZE,
    })
    if (listError) throw new Error('Auth user lookup failed.')
    const users = listed?.users ?? []
    const match = users.find((user) => user?.email?.toLowerCase() === normalized)
    if (match?.id) return match.id
    if (users.length < AUTH_PAGE_SIZE) return null
  }

  throw new Error('Auth user lookup did not find the target before the page limit.')
}

export async function setAuthPassword(admin, userId, password) {
  const { error } = await admin.updateUserById(userId, {
    password,
    email_confirm: true,
  })
  if (error) throw new Error('Auth password update failed.')
}
