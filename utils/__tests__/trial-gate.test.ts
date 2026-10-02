import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildPersistentSession,
  clearAppSessionCache,
  sessionRestorePlan,
  SESSION_STORAGE_KEY,
  type PersistentSession,
} from '../session-persistence'
import { decideTrialGate, resolveServerTrialAuthority, type TenantTrialSnapshot } from '../trial-gate'

const NOW = new Date('2026-10-01T10:47:00.000Z')
const EXPIRED_TRIAL = '2026-09-30T12:34:57.000Z'
const FUTURE_PERIOD = '2026-10-30T09:14:20.000Z'
const FUTURE_TRIAL = '2026-10-15T12:00:00.000Z'

function trial(overrides: Partial<TenantTrialSnapshot>): TenantTrialSnapshot {
  return {
    is_trial: false,
    trial_ends_at: EXPIRED_TRIAL,
    subscription_plan: 'starter',
    current_period_end: FUTURE_PERIOD,
    ...overrides,
  }
}

function gate(
  info: TenantTrialSnapshot | null,
  authority: 'server' | 'unavailable' | 'idle' | 'pending',
  path = '/admin/products',
  loggedInWithTenant = true,
) {
  return decideTrialGate({
    path,
    now: NOW,
    info: authority === 'server' ? info : null,
    loggedInWithTenant,
    authority: loggedInWithTenant ? authority : 'idle',
  })
}

const identity: PersistentSession = {
  user: { id: 'user-1', email: 'admin@fahrstil.example' },
  profile: {
    id: 'profile-1',
    tenant_id: 'be4c91a3-f5bf-4848-9917-571f6954a77c',
    role: 'admin',
    email: 'admin@fahrstil.example',
    auth_user_id: 'user-1',
  },
  timestamp: NOW.getTime() - 60_000,
  expiresIn: 24 * 60 * 60 * 1000,
  trialInfo: trial({ is_trial: true, subscription_plan: 'trial', current_period_end: null }),
}

describe('stale app-session-cache trial authority', () => {
  it('restores identity and drops cached trialInfo and profile.tenant', () => {
    const cached = {
      ...identity,
      profile: {
        ...identity.profile,
        tenant: trial({ is_trial: true, subscription_plan: 'trial', current_period_end: null }),
      },
    } as PersistentSession

    const restored = sessionRestorePlan(cached)
    expect(restored.user.email).toBe('admin@fahrstil.example')
    expect(restored.role).toBe('admin')
    expect(restored.profile.tenant_id).toBe(identity.profile.tenant_id)
    expect(restored.profile).not.toHaveProperty('tenant')
    expect(restored).not.toHaveProperty('trialInfo')
  })

  it('does not write trialInfo back into the session cache', () => {
    const saved = buildPersistentSession({
      user: identity.user,
      profile: {
        ...identity.profile,
        tenant: trial({ is_trial: true }),
      },
      now: NOW.getTime(),
    })
    expect(saved).not.toHaveProperty('trialInfo')
    expect(saved.profile).not.toHaveProperty('tenant')
    expect(JSON.stringify(saved)).not.toContain('is_trial')
  })

  it('stale cached trial cannot block an active paid tenant', async () => {
    const server = trial({ is_trial: false, subscription_plan: 'starter', current_period_end: FUTURE_PERIOD })
    const resolved = await resolveServerTrialAuthority({
      cached: identity.trialInfo!,
      fetchServer: async () => server,
    })

    expect(resolved.authority).toBe('server')
    expect(resolved.info).toEqual(server)
    expect(gate(resolved.info, resolved.authority)).toBe('allow')
  })

  it('server trial state overrides a cached non-trial', async () => {
    const server = trial({
      is_trial: true,
      trial_ends_at: FUTURE_TRIAL,
      subscription_plan: 'trial',
      current_period_end: null,
    })
    const resolved = await resolveServerTrialAuthority({
      cached: trial({ is_trial: false }),
      fetchServer: async () => server,
    })

    expect(resolved.info?.is_trial).toBe(true)
    expect(gate(resolved.info, 'server')).toBe('allow')
  })

  it('expired server trial still redirects /admin/products', () => {
    const server = trial({
      is_trial: true,
      trial_ends_at: EXPIRED_TRIAL,
      subscription_plan: 'trial',
      current_period_end: null,
    })
    expect(gate(server, 'server', '/admin/products')).toBe('upgrade')
    expect(gate(server, 'server', '/admin')).toBe('allow')
    expect(gate(server, 'server', '/admin/users')).toBe('allow')
    expect(gate({ ...server, website_only: true }, 'server', '/admin/products')).toBe('allow')
  })

  it('current paid subscription remains accessible even if the cache said expired trial', () => {
    const server = trial({
      is_trial: false,
      subscription_plan: 'starter',
      current_period_end: FUTURE_PERIOD,
    })
    expect(gate(server, 'server', '/admin/products')).toBe('allow')
  })

  it('does not let a logged-out session restore create trial authority', () => {
    const restored = sessionRestorePlan(identity)
    expect(restored).not.toHaveProperty('trialInfo')
    expect(gate(identity.trialInfo!, 'idle', '/admin/products', false)).toBe('allow')
  })

  it('fails closed when the server status cannot be loaded', async () => {
    const resolved = await resolveServerTrialAuthority({
      cached: trial({ is_trial: false, subscription_plan: 'starter', current_period_end: FUTURE_PERIOD }),
      fetchServer: async () => {
        throw new Error('trial-status down')
      },
    })

    expect(resolved).toEqual({ authority: 'unavailable', info: null })
    expect(gate(identity.trialInfo!, 'unavailable')).toBe('upgrade')
    expect(decideTrialGate({
      path: '/admin/products',
      now: NOW,
      info: trial({ is_trial: false, subscription_plan: 'starter', current_period_end: FUTURE_PERIOD }),
      loggedInWithTenant: true,
      authority: 'unavailable',
    })).toBe('upgrade')
    expect(decideTrialGate({
      path: '/admin/products',
      now: NOW,
      info: trial({ is_trial: true, trial_ends_at: EXPIRED_TRIAL, subscription_plan: 'trial', current_period_end: null }),
      loggedInWithTenant: true,
      authority: 'idle',
    })).toBe('wait')
  })

  it('keeps /admin/products open when the server returns a starter plan and the cache has no trial info', () => {
    const server = trial({ is_trial: false, subscription_plan: 'starter', current_period_end: FUTURE_PERIOD })
    expect(gate(server, 'server')).toBe('allow')
  })

  it('clears the session cache on logout', () => {
    const removed: string[] = []
    clearAppSessionCache({
      removeItem: (key) => removed.push(key),
    })
    expect(removed).toEqual([SESSION_STORAGE_KEY])
  })

  it('keeps the plugins from restoring or returning before the server trial refresh', () => {
    const root = path.resolve(__dirname, '../..')
    const persist = readFileSync(path.join(root, 'plugins/00-session-persist.client.ts'), 'utf8')
    const autoSave = readFileSync(path.join(root, 'plugins/01-session-auto-save.client.ts'), 'utf8')
    const restore = readFileSync(path.join(root, 'plugins/auth-restore.client.ts'), 'utf8')
    const logout = readFileSync(path.join(root, 'stores/auth.ts'), 'utf8')

    expect(persist).toContain('sessionRestorePlan')
    expect(persist).not.toContain('session.trialInfo')
    expect(persist).not.toContain('trialInfo:')
    expect(autoSave).not.toContain('trialInfo')
    expect(restore).toContain('loadTenantTrialInfo')
    const skippedReturn = restore.indexOf('A valid Supabase session used to return here')
    const refresh = restore.lastIndexOf('loadTenantTrialInfo')
    expect(skippedReturn).toBeGreaterThan(-1)
    expect(refresh).toBeGreaterThan(skippedReturn)
    expect(restore.slice(skippedReturn, refresh)).not.toMatch(/\n\s*return\b/)
    expect(logout).toContain('clearAppSessionCache(localStorage)')
  })
})
