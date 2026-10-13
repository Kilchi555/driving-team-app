/**
 * PR #421 Path A — disposable PG identity helpers (URL + live server NIC policy).
 *
 * Client connection endpoint and PostgreSQL inet_server_addr() are distinct:
 * Actions service containers publish 5432 to the runner loopback while Postgres
 * reports its Docker bridge interface (e.g. 172.18.0.2). RFC1918 server NICs are
 * accepted only in conjunction with a loopback client host and exact DB name —
 * never as standalone proof of identity.
 *
 * Unix sockets (NULL inet_server_addr): fail closed — Path A uses TCP to 127.0.0.1.
 */

export const FORBIDDEN_SUBSTR = ['unyjaetebnaexaflpyoc', 'kssqalisscxkhvorqwgy', 'supabase.co']
export const DEFAULT_EXPECTED_DB = 'pr421_f1_concurrency'

export function isLoopbackHost(host) {
  const h = String(host || '').toLowerCase()
  return h === 'localhost' || h === '127.0.0.1' || h === '::1'
}

/**
 * Normalize PG inet text (`172.18.0.2/32`) or `host(inet)` output to a bare address.
 * Returns null for null/empty (Unix-socket / missing).
 */
export function normalizeInetHost(addr) {
  if (addr == null) return null
  const s = String(addr).trim()
  if (!s) return null
  const slash = s.indexOf('/')
  const bare = (slash === -1 ? s : s.slice(0, slash)).toLowerCase()
  return bare || null
}

function parseIpv4(host) {
  const parts = host.split('.')
  if (parts.length !== 4) return null
  const nums = parts.map((p) => {
    if (!/^\d{1,3}$/.test(p)) return NaN
    return Number(p)
  })
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null
  return nums
}

export function isLoopbackIp(addr) {
  const h = normalizeInetHost(addr)
  if (!h) return false
  if (h === '127.0.0.1' || h === '::1') return true
  const v4 = parseIpv4(h)
  if (v4 && v4[0] === 127) return true
  return false
}

/**
 * Server-interface shape consistent with a Docker-published disposable service.
 * Not sufficient alone — must be paired with loopback client host + exact DB name.
 */
export function isDockerBridgeCompatibleServerIp(addr) {
  const h = normalizeInetHost(addr)
  if (!h) return false
  if (h.includes(':')) {
    // IPv6 ULA fc00::/7 (fc/fd) and link-local fe80::/10 only — not global unicast.
    if (h.startsWith('fe80:')) return true
    if (h.startsWith('fc') || h.startsWith('fd')) return true
    return false
  }
  const v4 = parseIpv4(h)
  if (!v4) return false
  const [a, b] = v4
  if (a === 10) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  // Docker sometimes uses link-local on edge cases; still requires loopback client.
  if (a === 169 && b === 254) return true
  return false
}

/**
 * Live identity: database name + server NIC policy under a known loopback client.
 *
 * @param {{
 *   connectionHost: string,
 *   database: string,
 *   serverHost: string | null | undefined,
 *   expectedDb?: string,
 *   phase?: string,
 * }} args
 * @returns {{ ok: true, serverHost: string, topology: 'loopback-server' | 'docker-bridge-published' }}
 */
export function assertLiveServerIdentity({
  connectionHost,
  database,
  serverHost,
  expectedDb = DEFAULT_EXPECTED_DB,
  phase = 'live',
}) {
  if (!isLoopbackHost(connectionHost)) {
    throw new Error(
      `live identity (${phase}): connection host must be loopback, got ${connectionHost}`,
    )
  }
  if (database !== expectedDb) {
    throw new Error(`live identity (${phase}): database ${database} != ${expectedDb}`)
  }

  const normalized = normalizeInetHost(serverHost)
  if (normalized == null) {
    throw new Error(
      `live identity (${phase}): inet_server_addr is null (Unix socket not supported for Path A TCP disposable service)`,
    )
  }

  // Reject non-IP / unverifiable hostnames for server interface.
  const looksIpv4 = Boolean(parseIpv4(normalized))
  const looksIpv6 = normalized.includes(':')
  if (!looksIpv4 && !looksIpv6) {
    throw new Error(`live identity (${phase}): unverifiable inet_server_addr ${serverHost}`)
  }

  if (isLoopbackIp(normalized)) {
    return { ok: true, serverHost: normalized, topology: 'loopback-server' }
  }

  if (isDockerBridgeCompatibleServerIp(normalized)) {
    // Conjunction already enforced: loopback client + exact DB name above.
    return { ok: true, serverHost: normalized, topology: 'docker-bridge-published' }
  }

  throw new Error(`live identity (${phase}): unexpected inet_server_addr ${serverHost}`)
}

/**
 * URL / env identity gate (client endpoint + forbidden hosted targets).
 *
 * @param {string} url
 * @param {{
 *   phase?: string,
 *   expectedDb?: string,
 *   supabaseDbUrlSet?: boolean,
 * }} [opts]
 */
export function assertUrlIdentityGate(url, {
  phase = 'url',
  expectedDb = DEFAULT_EXPECTED_DB,
  supabaseDbUrlSet = false,
} = {}) {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`identityGate(${phase}): unparseable DATABASE_URL`)
  }
  const host = parsed.hostname.toLowerCase()
  if (!isLoopbackHost(host)) {
    throw new Error(`identityGate(${phase}): host must be localhost/127.0.0.1, got ${host}`)
  }
  const hay = url.toLowerCase()
  for (const s of FORBIDDEN_SUBSTR) {
    if (hay.includes(s)) {
      throw new Error(`identityGate(${phase}): forbidden substring ${s}`)
    }
  }
  if (supabaseDbUrlSet) {
    throw new Error(`identityGate(${phase}): SUPABASE_DB_URL must not be set for Path A harness`)
  }
  const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, ''))
  if (dbName !== expectedDb) {
    throw new Error(`identityGate(${phase}): database name must be ${expectedDb}, got ${dbName}`)
  }
  return { ok: true, host, dbName }
}
