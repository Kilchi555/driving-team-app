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

/** Cloud Agent / tunnel hosts that must serve the app, not custom-domain 404. */
const DEV_PREVIEW_SUFFIXES = [
  '.cursor.com',
  '.cursor.sh',
  '.cursor.run',
  '.cursor.app',
  '.ngrok-free.dev',
  '.ngrok.io',
  '.trycloudflare.com',
  '.loca.lt',
]

const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/

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

/**
 * Positive custom-domain routing evidence.
 * JSONB can store these keys, but this module never writes a TLS pass.
 * Missing, false, or non-boolean values fail closed.
 */
export type CustomDomainEvidenceRow = {
  custom_domain?: string | null
  is_published?: boolean | null
  custom_domain_verified?: boolean | null
  custom_domain_status?: string | null
  custom_domain_verification?: unknown
}

export type CustomDomainLookup =
  | { ok: true; row: CustomDomainEvidenceRow & { subdomain: string } }
  | { ok: false; reason: 'missing' | 'conflict' | 'error' }

export type CustomDomainRouteDecision =
  | { action: 'app' }
  | { action: 'not_found' }
  | { action: 'rewrite'; subdomain: string; suffix: string }

const CUSTOM_HOST_NOT_FOUND = 'Diese Domain ist noch nicht mit einer Simy-Website verbunden'

export function customDomainNotFoundMessage(): string {
  return CUSTOM_HOST_NOT_FOUND
}

function evidenceRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function isTrue(value: unknown): boolean {
  return value === true
}

/**
 * Platform evidence is only the explicit pair configured=true and verified=true
 * on the stored Vercel object, with no error. DNS ok and the verified/active
 * columns are not platform proof. A missing API stores configured=false.
 */
export function hasPositivePlatformEvidence(verification: unknown): boolean {
  const vercel = evidenceRecord(evidenceRecord(verification)?.vercel)
  if (!vercel) return false
  if (!isTrue(vercel.configured)) return false
  if (!isTrue(vercel.verified)) return false
  if (vercel.error != null && vercel.error !== false) return false
  return true
}

/** DNS match is necessary and not sufficient. */
export function hasPositiveDnsEvidence(verification: unknown): boolean {
  const dns = evidenceRecord(evidenceRecord(verification)?.dns)
  return isTrue(dns?.ok)
}

/**
 * Maximum age of stored custom-domain evidence.
 * A timestamp inside this window is not proof that DNS or TLS is still valid.
 * No scheduled reader refreshes DNS or platform state.
 */
export const CUSTOM_DOMAIN_EVIDENCE_MAX_AGE_MS = 60 * 60 * 1000

/**
 * Authoritative TLS evidence does not exist in this process.
 *
 * Missing dependency: there is no server-side reader of a certificate and no
 * reader of a Vercel TLS or certificate API. `vercel.verified` on a project
 * domain is ownership configuration, not a certificate. The JSON key
 * `custom_domain_verification.tls.ok` is ignored because a tenant session can
 * store it. Routing stays disabled until a real reader exists.
 */
export function hasAuthoritativeTlsEvidence(): boolean {
  return false
}

/** Tenant-supplied tls.ok is not evidence. This never reads the JSON flag. */
export function hasPositiveTlsEvidence(_verification?: unknown): boolean {
  return hasAuthoritativeTlsEvidence()
}

export function hasFreshCheckedAt(verification: unknown, nowMs: number = Date.now()): boolean {
  const raw = evidenceRecord(verification)?.checked_at
  if (typeof raw !== 'string' || !raw.trim()) return false
  const checkedMs = Date.parse(raw)
  if (!Number.isFinite(checkedMs)) return false
  if (checkedMs > nowMs) return false
  if (nowMs - checkedMs > CUSTOM_DOMAIN_EVIDENCE_MAX_AGE_MS) return false
  return true
}

/**
 * Conjunctive routing decision.
 * `authoritativeTls` must be the result of hasAuthoritativeTlsEvidence().
 * Tests may pass true only as a double to show the other gates still fail.
 * That double is not a certificate check.
 */
export function evaluateCustomDomainRouting(
  row: CustomDomainEvidenceRow | null | undefined,
  nowMs: number,
  authoritativeTls: boolean,
): boolean {
  if (!row?.custom_domain) return false
  if (row.is_published !== true) return false
  if (!hasPositivePlatformEvidence(row.custom_domain_verification)) return false
  if (!hasPositiveDnsEvidence(row.custom_domain_verification)) return false
  if (!hasFreshCheckedAt(row.custom_domain_verification, nowMs)) return false
  if (authoritativeTls !== true) return false
  return true
}

export function isCustomDomainRoutingEnabled(
  row: CustomDomainEvidenceRow | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  return evaluateCustomDomainRouting(row, nowMs, hasAuthoritativeTlsEvidence())
}

export function customDomainOrigin(
  row: CustomDomainEvidenceRow | null | undefined,
  nowMs: number = Date.now(),
): string | null {
  if (!isCustomDomainRoutingEnabled(row, nowMs) || !row?.custom_domain) return null
  return `https://${row.custom_domain}`
}

export function customDomainActivation(input: {
  domain: string
  isPublished: boolean
  verification: unknown
  nowMs?: number
}): { verified: false; status: 'dns_pending' } | { verified: true; status: 'active' } {
  const enabled = isCustomDomainRoutingEnabled({
    custom_domain: input.domain,
    is_published: input.isPublished,
    custom_domain_verification: input.verification,
  }, input.nowMs)
  if (!enabled) return { verified: false, status: 'dns_pending' }
  return { verified: true, status: 'active' }
}

export const PROTECTED_CUSTOM_DOMAIN_CLIENT_KEYS = [
  'custom_domain_verification',
  'custom_domain_verified',
  'custom_domain_status',
  'custom_domain_verified_at',
  'tls',
  'verification',
] as const

export class ClientCustomDomainEvidenceError extends Error {
  constructor() {
    super('Custom-domain verification fields are server-managed')
    this.name = 'ClientCustomDomainEvidenceError'
  }
}

/** Reads only `domain`. Protected verification keys are rejected, not stored. */
export function readCustomDomainClaimBody(body: unknown): { domain: string } {
  const record = body && typeof body === 'object' && !Array.isArray(body)
    ? body as Record<string, unknown>
    : {}
  for (const key of PROTECTED_CUSTOM_DOMAIN_CLIENT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      throw new ClientCustomDomainEvidenceError()
    }
  }
  return { domain: typeof record.domain === 'string' ? record.domain : '' }
}

export function customDomainLookupFromQuery(result: {
  data: (CustomDomainEvidenceRow & { subdomain?: string | null }) | null
  error: unknown
}): CustomDomainLookup {
  if (result.error) return { ok: false, reason: 'error' }
  const subdomain = result.data?.subdomain
  if (!subdomain) return { ok: false, reason: 'missing' }
  return { ok: true, row: { ...result.data, subdomain } }
}

export function presentPublicWebsiteDomain<T extends CustomDomainEvidenceRow>(website: T): T & {
  custom_domain_routing_enabled: boolean
} {
  const custom_domain_routing_enabled = isCustomDomainRoutingEnabled(website)
  const copy = { ...website } as T & { custom_domain_routing_enabled: boolean }
  delete (copy as { custom_domain_verification?: unknown }).custom_domain_verification
  delete (copy as { custom_domain_status?: unknown }).custom_domain_status
  copy.custom_domain_routing_enabled = custom_domain_routing_enabled
  return copy
}

/**
 * Fresh lookup only. Callers must not cache an allow: a removed or conflicting
 * host has to 404 on the next request.
 */
export function decideCustomDomainRoute(input: {
  host: string
  path: string
  lookup: CustomDomainLookup | null
}): CustomDomainRouteDecision {
  if (!input.host || isAppHost(input.host)) return { action: 'app' }

  const path = input.path || '/'
  if (!input.lookup?.ok || !input.lookup.row.subdomain) return { action: 'not_found' }
  if (!isCustomDomainRoutingEnabled(input.lookup.row)) return { action: 'not_found' }

  const subdomain = input.lookup.row.subdomain
  if (
    path.startsWith('/_nuxt/') ||
    path.startsWith('/__nuxt') ||
    path.startsWith('/_vercel') ||
    path.startsWith('/favicon') ||
    path.startsWith('/fonts/') ||
    path.startsWith('/simy-') ||
    path === '/robots.txt' ||
    path === '/sitemap.xml' ||
    path === '/llms.txt'
  ) {
    return { action: 'app' }
  }

  if (path.startsWith('/api/') || path.startsWith('/admin') || path.startsWith('/booking')) {
    return { action: 'not_found' }
  }

  if (path.startsWith('/s/')) {
    const own = `/s/${subdomain}`
    if (path === own || path.startsWith(`${own}/`)) return { action: 'app' }
    return { action: 'not_found' }
  }

  if (path === '/' || path === '') {
    return { action: 'rewrite', subdomain, suffix: '' }
  }

  const clean = path.replace(/^\//, '').split('/')[0]
  if (!clean) return { action: 'not_found' }
  return { action: 'rewrite', subdomain, suffix: `/${encodeURIComponent(clean)}` }
}

export function isAppHost(host: string): boolean {
  const h = normalizeHostname(host)
  if (!h) return true
  if (APP_HOSTS.has(h)) return true
  if (h.endsWith('.vercel.app')) return true
  if (h === 'simy.ch' || h === 'www.simy.ch') return true
  // IPs and single-label names (Cloud Agent VNC: "cursor", pod IPs)
  if (IPV4_RE.test(h) || h === '::1') return true
  if (!h.includes('.')) return true
  if (DEV_PREVIEW_SUFFIXES.some((suffix) => h === suffix.slice(1) || h.endsWith(suffix))) {
    return true
  }
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
