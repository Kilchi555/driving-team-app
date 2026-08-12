/**
 * Custom domain helpers for tenant landing pages (Vercel + DNS).
 */
import { resolveCname, resolve4 } from 'node:dns/promises'

export const APP_HOSTS = new Set([
  'app.simy.ch',
  'www.app.simy.ch',
  'localhost',
  '127.0.0.1',
])

/** Vercel CNAME target shown to customers */
export const VERCEL_CNAME_TARGET = 'cname.vercel-dns.com'

/** Common Vercel A record for apex domains */
export const VERCEL_A_IPS = new Set(['76.76.21.21'])

export type DomainVerificationChallenge = {
  type: string
  domain: string
  value: string
  reason?: string
}

export function normalizeHostname(input: string): string {
  let host = String(input || '')
    .trim()
    .toLowerCase()
  host = host.replace(/^https?:\/\//, '')
  host = host.split('/')[0] || ''
  host = host.split('?')[0] || ''
  host = host.split('#')[0] || ''
  host = host.replace(/:\d+$/, '')
  host = host.replace(/\.$/, '')
  if (host.startsWith('www.')) {
    // keep www as-is — customer chooses www vs apex
  }
  return host
}

export function isValidHostname(host: string): boolean {
  if (!host || host.length > 253) return false
  if (APP_HOSTS.has(host)) return false
  if (host.endsWith('.vercel.app') || host.endsWith('.simy.ch')) return false
  // basic hostname: labels of alnum/hyphen
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(host)
}

export function isAppHost(host: string): boolean {
  const h = normalizeHostname(host)
  if (!h) return true
  if (APP_HOSTS.has(h)) return true
  if (h.endsWith('.vercel.app')) return true
  if (h === 'simy.ch' || h === 'www.simy.ch') return true
  return false
}

export function dnsInstructions(domain: string) {
  const isApex = domain.split('.').length === 2
  if (isApex) {
    return {
      type: 'A' as const,
      host: '@',
      value: '76.76.21.21',
      note: 'Für die Root-Domain (ohne www). Alternativ ALIAS/ANAME auf cname.vercel-dns.com, falls dein Registrar das unterstützt.',
      alt: {
        type: 'CNAME' as const,
        host: 'www',
        value: VERCEL_CNAME_TARGET,
        note: 'Empfohlen: zusätzlich www als CNAME setzen und www als Canonical nutzen.',
      },
    }
  }
  return {
    type: 'CNAME' as const,
    host: domain.split('.')[0] || 'www',
    value: VERCEL_CNAME_TARGET,
    note: 'CNAME für die Subdomain (z.B. www) auf Vercel zeigen.',
    alt: null,
  }
}

export async function checkDnsPointsToVercel(domain: string): Promise<{
  ok: boolean
  detail: string
  records: string[]
}> {
  try {
    const cnames = await resolveCname(domain)
    const normalized = cnames.map((c) => c.replace(/\.$/, '').toLowerCase())
    if (normalized.some((c) => c === VERCEL_CNAME_TARGET || c.endsWith('.vercel-dns.com'))) {
      return { ok: true, detail: 'CNAME zeigt auf Vercel', records: normalized }
    }
    return { ok: false, detail: `CNAME gefunden, aber nicht Vercel: ${normalized.join(', ')}`, records: normalized }
  } catch {
    // try A records (apex)
    try {
      const ips = await resolve4(domain)
      if (ips.some((ip) => VERCEL_A_IPS.has(ip))) {
        return { ok: true, detail: 'A-Record zeigt auf Vercel', records: ips }
      }
      return { ok: false, detail: `A-Records ohne Vercel-IP: ${ips.join(', ')}`, records: ips }
    } catch (err: any) {
      return { ok: false, detail: err?.code || err?.message || 'DNS nicht auflösbar', records: [] }
    }
  }
}

type VercelConfig = {
  token: string
  projectId: string
  teamId?: string
}

export function getVercelDomainConfig(): VercelConfig | null {
  const config = useRuntimeConfig()
  const token = String(
    (config as any).vercelToken ||
      process.env['NUXT_VERCEL_TOKEN'] ||
      process.env['VERCEL_TOKEN'] ||
      '',
  ).trim()
  const projectId = String(
    (config as any).vercelProjectId ||
      process.env['NUXT_VERCEL_PROJECT_ID'] ||
      process.env['VERCEL_PROJECT_ID'] ||
      process.env['VERCEL_PROJECT_ID_APP'] ||
      '',
  ).trim()
  const teamId =
    String(
      (config as any).vercelTeamId ||
        process.env['NUXT_VERCEL_TEAM_ID'] ||
        process.env['VERCEL_TEAM_ID'] ||
        '',
    ).trim() || undefined
  if (!token || !projectId) return null
  return { token, projectId, teamId }
}

function vercelUrl(path: string, teamId?: string) {
  const u = new URL(`https://api.vercel.com${path}`)
  if (teamId) u.searchParams.set('teamId', teamId)
  return u.toString()
}

export async function vercelAddDomain(domain: string) {
  const cfg = getVercelDomainConfig()
  if (!cfg) return { configured: false as const, data: null as any }

  const res = await fetch(vercelUrl(`/v10/projects/${encodeURIComponent(cfg.projectId)}/domains`, cfg.teamId), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: domain }),
  })
  const data = await res.json().catch(() => ({}))

  // 409 / domain already exists → fetch current
  if (!res.ok && (res.status === 409 || String(data?.error?.code || '').includes('domain_already'))) {
    const existing = await vercelGetDomain(domain)
    return { configured: true as const, data: existing.data, alreadyExists: true }
  }

  if (!res.ok) {
    const msg = data?.error?.message || `Vercel domain add failed (${res.status})`
    throw new Error(msg)
  }

  return { configured: true as const, data, alreadyExists: false }
}

export async function vercelGetDomain(domain: string) {
  const cfg = getVercelDomainConfig()
  if (!cfg) return { configured: false as const, data: null as any }

  const res = await fetch(
    vercelUrl(`/v9/projects/${encodeURIComponent(cfg.projectId)}/domains/${encodeURIComponent(domain)}`, cfg.teamId),
    { headers: { Authorization: `Bearer ${cfg.token}` } },
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { configured: true as const, data: null, error: data?.error?.message || `status ${res.status}` }
  }
  return { configured: true as const, data }
}

export async function vercelVerifyDomain(domain: string) {
  const cfg = getVercelDomainConfig()
  if (!cfg) return { configured: false as const, data: null as any }

  const res = await fetch(
    vercelUrl(
      `/v9/projects/${encodeURIComponent(cfg.projectId)}/domains/${encodeURIComponent(domain)}/verify`,
      cfg.teamId,
    ),
    { method: 'POST', headers: { Authorization: `Bearer ${cfg.token}` } },
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { configured: true as const, data: null, error: data?.error?.message || `verify failed (${res.status})` }
  }
  return { configured: true as const, data }
}

export async function vercelRemoveDomain(domain: string) {
  const cfg = getVercelDomainConfig()
  if (!cfg) return { configured: false as const }

  const res = await fetch(
    vercelUrl(`/v9/projects/${encodeURIComponent(cfg.projectId)}/domains/${encodeURIComponent(domain)}`, cfg.teamId),
    { method: 'DELETE', headers: { Authorization: `Bearer ${cfg.token}` } },
  )
  if (!res.ok && res.status !== 404) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error?.message || `Vercel domain remove failed (${res.status})`)
  }
  return { configured: true as const }
}
