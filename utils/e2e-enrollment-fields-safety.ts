/**
 * Fail-closed discovery gate for enrollment-fields Playwright specs.
 * These specs must never mutate Production (app.simy.ch) or invent a base URL.
 */

export const ENROLLMENT_FIELDS_SPEC_BASENAME = 'enrollment-fields.spec.ts'
export const ENROLLMENT_FIELDS_HTTP_SPEC_BASENAME = 'enrollment-fields-http.spec.ts'

/** Opt-in flag: only then may Playwright discover the enrollment-fields specs. */
export const ENROLLMENT_FIELDS_E2E_ENV = 'SIMY_E2E_ENROLLMENT_FIELDS'

export const PRODUCTION_APP_HOSTS = new Set(['app.simy.ch', 'www.app.simy.ch'])

export type EnrollmentFieldsE2EGate =
  | { ok: true; baseURL: string }
  | { ok: false; reason: string }

/**
 * When the opt-in flag is absent, ignore enrollment-fields specs so default
 * `npm run test:e2e` / CI against Production or Production-backed previews
 * cannot create category/course side effects for this feature.
 */
export function playwrightTestIgnoreForEnrollmentFields(
  env: NodeJS.Dict<string | undefined> = process.env,
): string[] {
  if (env[ENROLLMENT_FIELDS_E2E_ENV] === '1') return []
  return [
    `**/${ENROLLMENT_FIELDS_SPEC_BASENAME}`,
    `**/${ENROLLMENT_FIELDS_HTTP_SPEC_BASENAME}`,
  ]
}

export function isProductionAppBaseUrl(baseURL: string | undefined | null): boolean {
  if (!baseURL || typeof baseURL !== 'string') return false
  try {
    const host = new URL(baseURL).hostname.toLowerCase()
    return PRODUCTION_APP_HOSTS.has(host)
  } catch {
    return false
  }
}

/**
 * Isolated enrollment-fields E2E may run only when:
 * - SIMY_E2E_ENROLLMENT_FIELDS=1
 * - E2E_BASE_URL is set
 * - E2E_BASE_URL is not Production app.simy.ch
 * - E2E_ISOLATION_PASSWORD is set (authorized isolation admin)
 */
export function evaluateEnrollmentFieldsE2EGate(
  env: NodeJS.Dict<string | undefined> = process.env,
): EnrollmentFieldsE2EGate {
  if (env[ENROLLMENT_FIELDS_E2E_ENV] !== '1') {
    return {
      ok: false,
      reason: `${ENROLLMENT_FIELDS_E2E_ENV} must be 1 to run enrollment-fields E2E (isolated only).`,
    }
  }
  const baseURL = env.E2E_BASE_URL
  if (!baseURL || !String(baseURL).trim()) {
    return {
      ok: false,
      reason: 'E2E_BASE_URL must point at an isolated app (not Production).',
    }
  }
  if (isProductionAppBaseUrl(baseURL)) {
    return {
      ok: false,
      reason: 'Refusing enrollment-fields E2E against Production app.simy.ch.',
    }
  }
  const password = env.E2E_ISOLATION_PASSWORD
  if (!password || password.length < 12) {
    return {
      ok: false,
      reason: 'E2E_ISOLATION_PASSWORD must be set for isolation-tenant admin login.',
    }
  }
  return { ok: true, baseURL: String(baseURL).replace(/\/+$/, '') }
}
