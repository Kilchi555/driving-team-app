/**
 * Client trial/subscription gate.
 *
 * Subscription entitlements are server-authoritative. localStorage session
 * cache must never supply is_trial, trial_ends_at, current_period_end, or
 * subscription_plan for this decision.
 */

export interface TenantTrialSnapshot {
  is_trial: boolean
  trial_ends_at: string | null
  subscription_plan: string | null
  current_period_end: string | null
  website_only?: boolean
  website_setup_paid_at?: string | null
  website_hosting_plan?: string | null
}

export type TrialAuthority = 'idle' | 'pending' | 'server' | 'unavailable'

export type TrialGateDecision = 'allow' | 'upgrade' | 'wait'

const PUBLIC_PREFIXES = ['/upgrade', '/payment', '/login', '/register', '/tenant-register']
const PROTECTED_PREFIXES = ['/admin', '/staff', '/customer']
const TRIAL_EXPIRED_ALLOWED = ['/admin', '/admin/users']

export function decideTrialGate(input: {
  path: string
  now: Date
  info: TenantTrialSnapshot | null
  loggedInWithTenant: boolean
  authority: TrialAuthority
}): TrialGateDecision {
  const path = input.path
  if (PUBLIC_PREFIXES.some(prefix => path.startsWith(prefix))) return 'allow'
  if (!PROTECTED_PREFIXES.some(prefix => path.startsWith(prefix))) return 'allow'

  // Logged-out visitors are sent to login by the auth middleware.
  // Missing trial info must not be treated as an expired trial.
  if (!input.loggedInWithTenant) return 'allow'

  if (input.authority === 'pending' || input.authority === 'idle') return 'wait'

  // Server status failed or is missing. Do not fall open on a cached value.
  if (input.authority !== 'server' || !input.info) return 'upgrade'

  const info = input.info
  if (info.website_only) return 'allow'

  const now = input.now

  if (!info.is_trial && info.subscription_plan && info.subscription_plan !== 'trial') {
    if (!info.current_period_end) return 'allow'
    if (now < new Date(info.current_period_end)) return 'allow'
    return 'upgrade'
  }

  if (info.is_trial && info.trial_ends_at) {
    const trialEnd = new Date(info.trial_ends_at)
    if (now > trialEnd) {
      const allowed = TRIAL_EXPIRED_ALLOWED.some(prefix =>
        path === prefix || (prefix !== '/admin' && path.startsWith(prefix + '/'))
      )
      if (!allowed) return 'upgrade'
    }
  }

  return 'allow'
}

/**
 * Loads the tenant row that the gate is allowed to trust.
 * `cached` is accepted only so callers and tests can prove it is ignored.
 */
export async function resolveServerTrialAuthority(input: {
  cached: TenantTrialSnapshot | null
  fetchServer: () => Promise<TenantTrialSnapshot | null>
}): Promise<{ authority: 'server' | 'unavailable', info: TenantTrialSnapshot | null }> {
  void input.cached
  try {
    const info = await input.fetchServer()
    if (!info || typeof info.is_trial !== 'boolean') {
      return { authority: 'unavailable', info: null }
    }
    return { authority: 'server', info }
  } catch {
    return { authority: 'unavailable', info: null }
  }
}
