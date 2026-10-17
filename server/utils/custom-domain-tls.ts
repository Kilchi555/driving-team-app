/**
 * Live certificate check for a hostname that is already stored on a tenant.
 * A DNS reply, a database flag, or a Vercel "verified" bit is not a certificate.
 * This module opens one TLS connection to port 443 and fails closed on every error.
 */
import { resolve4 } from 'node:dns/promises'
import { checkServerIdentity, connect as tlsConnect, type PeerCertificate } from 'node:tls'

export const TLS_PROBE_TIMEOUT_MS = 2_500
const MAX_ADDRESSES = 8

export type PresentedCertificate = Pick<PeerCertificate, 'subject' | 'subjectaltname' | 'valid_from' | 'valid_to'>

export type TlsConnectResult = {
  authorized: boolean
  cert: PresentedCertificate | null
}

export type TlsProbeDeps = {
  resolve4: (hostname: string) => Promise<string[]>
  connect: (input: { ip: string; servername: string; timeoutMs: number }) => Promise<TlsConnectResult>
  now?: Date
  timeoutMs?: number
}

export type TlsProof = {
  ok: boolean
  reason: 'ok' | 'unregistered' | 'dns' | 'address' | 'timeout' | 'tls' | 'mismatch' | 'expired' | 'validity'
}

function normalizeProbeHost(input: string): string {
  let host = String(input || '').trim().toLowerCase()
  host = host.replace(/^https?:\/\//, '')
  host = host.split('/')[0] || ''
  host = host.split('?')[0] || ''
  host = host.split('#')[0] || ''
  host = host.replace(/:\d+$/, '')
  host = host.replace(/\.$/, '')
  return host
}

/** Customer hostnames only. IP literals and platform names are not probe targets. */
export function isProbeableHostname(host: string): boolean {
  if (!host || host.length > 253) return false
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    return false
  }
  if (host === 'app.simy.ch' || host.endsWith('.simy.ch') || host.endsWith('.vercel.app')) return false
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) return false
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(host)
}

/** True when an address must never be dialed (loopback, private, link-local, metadata, multicast). */
export function isDisallowedProbeAddress(ip: string): boolean {
  const parts = ip.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true
  const [a, b, c] = parts
  if (a === 0 || a === 10 || a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true
  if (a === 198 && (b === 18 || b === 19)) return true
  if (a === 198 && b === 51 && c === 100) return true
  if (a === 203 && b === 0 && c === 113) return true
  if (a >= 224) return true
  return false
}

function reasonFromError(err: unknown): TlsProof['reason'] {
  const code = err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : ''
  const message = err instanceof Error ? err.message : ''
  if (code === 'CERT_HAS_EXPIRED' || /expired/i.test(message)) return 'expired'
  if (code === 'ERR_TLS_CERT_ALTNAME_INVALID' || /altname|hostname/i.test(message)) return 'mismatch'
  if (code === 'ETIMEOUT' || /timeout/i.test(message)) return 'timeout'
  return 'tls'
}

/**
 * Prove that `hostname` currently presents a trusted certificate for itself.
 * `registeredHostname` must be the same name already stored for one tenant.
 * Any other name returns before DNS or a socket is opened.
 */
export async function readAuthoritativeTlsEvidence(
  hostname: string,
  registeredHostname: string,
  deps: TlsProbeDeps,
): Promise<TlsProof> {
  const host = normalizeProbeHost(hostname)
  const registered = normalizeProbeHost(registeredHostname)
  if (!host || host !== registered || !isProbeableHostname(host)) {
    return { ok: false, reason: 'unregistered' }
  }

  const timeoutMs = deps.timeoutMs ?? TLS_PROBE_TIMEOUT_MS
  let ips: string[]
  try {
    ips = await withTimeout(deps.resolve4(host), timeoutMs)
  } catch (err) {
    return { ok: false, reason: reasonFromError(err) === 'timeout' ? 'timeout' : 'dns' }
  }
  if (!Array.isArray(ips) || ips.length === 0 || ips.length > MAX_ADDRESSES) {
    return { ok: false, reason: 'dns' }
  }
  if (ips.some((ip) => isDisallowedProbeAddress(ip))) {
    return { ok: false, reason: 'address' }
  }

  let result: TlsConnectResult
  try {
    result = await withTimeout(deps.connect({ ip: ips[0], servername: host, timeoutMs }), timeoutMs)
  } catch (err) {
    return { ok: false, reason: reasonFromError(err) }
  }
  if (!result?.authorized || !result.cert) return { ok: false, reason: 'tls' }

  const identityError = checkServerIdentity(host, result.cert as PeerCertificate)
  if (identityError) return { ok: false, reason: 'mismatch' }

  const notBefore = Date.parse(result.cert.valid_from)
  const notAfter = Date.parse(result.cert.valid_to)
  if (!Number.isFinite(notBefore) || !Number.isFinite(notAfter) || notAfter < notBefore) {
    return { ok: false, reason: 'validity' }
  }
  const now = deps.now ?? new Date()
  if (now.getTime() < notBefore) return { ok: false, reason: 'validity' }
  if (now.getTime() > notAfter) return { ok: false, reason: 'expired' }
  return { ok: true, reason: 'ok' }
}

function withTimeout<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'ETIMEOUT' })), timeoutMs)
    work.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}

/** One connection to the resolved public address. Port 443 only. No HTTP redirect. */
export function connectAuthoritativeTls(input: {
  ip: string
  servername: string
  timeoutMs: number
}): Promise<TlsConnectResult> {
  if (isDisallowedProbeAddress(input.ip) || !isProbeableHostname(input.servername)) {
    return Promise.reject(Object.assign(new Error('refused'), { code: 'ECONNREFUSED' }))
  }
  return new Promise((resolve, reject) => {
    let settled = false
    const socket = tlsConnect({
      host: input.ip,
      port: 443,
      servername: input.servername,
      rejectUnauthorized: true,
    })
    const finish = (err: Error | null, result?: TlsConnectResult) => {
      if (settled) return
      settled = true
      socket.setTimeout(0)
      socket.destroy()
      if (err) reject(err)
      else resolve(result as TlsConnectResult)
    }
    socket.setTimeout(input.timeoutMs, () => finish(Object.assign(new Error('timeout'), { code: 'ETIMEOUT' })))
    socket.once('secureConnect', () => {
      const cert = socket.getPeerCertificate(false)
      const present = cert && typeof cert === 'object' && Boolean(cert.valid_to)
      finish(null, {
        authorized: socket.authorized === true,
        cert: present ? cert : null,
      })
    })
    socket.once('error', (err) => finish(err instanceof Error ? err : new Error('tls')))
  })
}

async function resolvePublicV4(hostname: string): Promise<string[]> {
  return resolve4(hostname)
}

export const liveTlsDeps: TlsProbeDeps = {
  resolve4: resolvePublicV4,
  connect: connectAuthoritativeTls,
  timeoutMs: TLS_PROBE_TIMEOUT_MS,
}
