/**
 * PR #421 Path A — disposable PG identity helpers (URL + live server NIC policy).
 *
 * Client connection endpoint and PostgreSQL inet_server_addr() are distinct:
 * Actions service containers publish 5432 to the runner loopback while Postgres
 * reports its Docker bridge interface (e.g. 172.18.0.2). Private server NICs are
 * accepted only in conjunction with a loopback client host and exact DB name —
 * never as standalone proof of identity.
 *
 * Unix sockets (NULL inet_server_addr): fail closed — Path A uses TCP to 127.0.0.1.
 *
 * IP validation uses node:net (isIP / BlockList). Prefix-only string matching is forbidden.
 */

import { BlockList, isIP, isIPv4, isIPv6 } from 'node:net'

export const FORBIDDEN_SUBSTR = ['unyjaetebnaexaflpyoc', 'kssqalisscxkhvorqwgy', 'supabase.co']
export const DEFAULT_EXPECTED_DB = 'pr421_f1_concurrency'

/** IPv6 ULA fc00::/7 */
const IPV6_ULA = new BlockList()
IPV6_ULA.addSubnet('fc00::', 7, 'ipv6')

/** IPv6 link-local fe80::/10 */
const IPV6_LINK_LOCAL = new BlockList()
IPV6_LINK_LOCAL.addSubnet('fe80::', 10, 'ipv6')

/** IPv6 loopback ::1/128 */
const IPV6_LOOPBACK = new BlockList()
IPV6_LOOPBACK.addSubnet('::1', 128, 'ipv6')

/** IPv4-mapped IPv6 ::ffff:0:0/96 — rejected (no blanket accept; no unmap path). */
const IPV6_V4_MAPPED = new BlockList()
IPV6_V4_MAPPED.addSubnet('::ffff:0.0.0.0', 96, 'ipv6')

export function stripHostBrackets(host) {
  const h = String(host || '')
  if (h.startsWith('[') && h.endsWith(']')) return h.slice(1, -1)
  return h
}

function hasZoneId(addr) {
  // Zone / scope IDs (e.g. fe80::1%eth0) are not accepted for Path A identity.
  return String(addr).includes('%')
}

function parseIpv4Octets(host) {
  if (!isIPv4(host)) return null
  const parts = host.split('.')
  if (parts.length !== 4) return null
  const nums = parts.map((p) => Number(p))
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null
  // Reject non-canonical leading zeros (Number('018')===18 but isIPv4 may vary).
  if (parts.some((p) => p.length > 1 && p.startsWith('0'))) return null
  return nums
}

/**
 * Normalize a server inet value to a bare, validated IP string.
 *
 * Accepts:
 *   - bare IPv4 / IPv6 as returned by SQL host(inet_server_addr())
 *   - exact `ip/prefixlen` with a decimal prefix in range (for inet::text fixtures)
 *
 * Rejects (returns null): zone IDs, malformed CIDR suffixes, non-IP strings.
 */
export function normalizeInetHost(addr) {
  if (addr == null) return null
  const s = String(addr).trim()
  if (!s) return null
  if (hasZoneId(s)) return null

  let ipPart = s
  if (s.includes('/')) {
    const parts = s.split('/')
    if (parts.length !== 2) return null
    const [rawIp, pref] = parts
    if (!/^\d+$/.test(pref)) return null
    const prefNum = Number(pref)
    ipPart = stripHostBrackets(rawIp.trim())
    const ver = isIP(ipPart)
    if (ver === 4) {
      if (prefNum < 0 || prefNum > 32) return null
    } else if (ver === 6) {
      if (prefNum < 0 || prefNum > 128) return null
    } else {
      return null
    }
  } else {
    ipPart = stripHostBrackets(s)
    if (!isIP(ipPart)) return null
  }

  // Canonicalize casing only; do not alter IPv6 structure beyond validation.
  return ipPart.toLowerCase()
}

export function isLoopbackHost(host) {
  const raw = String(host || '').trim()
  if (!raw) return false
  const h = stripHostBrackets(raw).toLowerCase()
  if (h === 'localhost') return true
  if (hasZoneId(h)) return false
  if (!isIP(h)) return false
  return isLoopbackIp(h)
}

export function isLoopbackIp(addr) {
  if (hasZoneId(addr)) return false
  const h = stripHostBrackets(String(addr || '')).toLowerCase()
  if (!isIP(h)) return false
  if (isIPv4(h)) {
    const v4 = parseIpv4Octets(h)
    return Boolean(v4 && v4[0] === 127)
  }
  if (isIPv6(h)) {
    if (IPV6_V4_MAPPED.check(h, 'ipv6')) return false
    return IPV6_LOOPBACK.check(h, 'ipv6')
  }
  return false
}

function isIpv4Mapped(addr) {
  if (!isIPv6(addr) || hasZoneId(addr)) return false
  return IPV6_V4_MAPPED.check(addr, 'ipv6')
}

/**
 * IPv4 RFC1918 / link-local shapes consistent with Docker-published disposable PG.
 * Not sufficient alone — must be paired with loopback client host + exact DB name.
 */
export function isDockerBridgeCompatibleServerIp(addr) {
  if (hasZoneId(addr)) return false
  const h = stripHostBrackets(String(addr || '')).toLowerCase()
  if (!isIP(h)) return false

  if (isIPv4(h)) {
    const v4 = parseIpv4Octets(h)
    if (!v4) return false
    const [a, b] = v4
    if (a === 10) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true
    return false
  }

  if (isIPv6(h)) {
    // No IPv4-mapped accept path (do not unmap / blanket-accept).
    if (isIpv4Mapped(h)) return false
    if (IPV6_ULA.check(h, 'ipv6')) return true
    if (IPV6_LINK_LOCAL.check(h, 'ipv6')) return true
    return false
  }

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

  if (serverHost == null || String(serverHost).trim() === '') {
    throw new Error(
      `live identity (${phase}): inet_server_addr is null (Unix socket not supported for Path A TCP disposable service)`,
    )
  }

  const normalized = normalizeInetHost(serverHost)
  if (normalized == null) {
    throw new Error(`live identity (${phase}): unverifiable inet_server_addr ${serverHost}`)
  }

  if (isIpv4Mapped(normalized)) {
    throw new Error(`live identity (${phase}): IPv4-mapped inet_server_addr rejected ${serverHost}`)
  }

  if (isLoopbackIp(normalized)) {
    return { ok: true, serverHost: normalized, topology: 'loopback-server' }
  }

  if (isDockerBridgeCompatibleServerIp(normalized)) {
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
  const host = parsed.hostname
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
  return { ok: true, host: stripHostBrackets(host).toLowerCase(), dbName }
}
