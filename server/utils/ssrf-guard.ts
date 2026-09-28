/**
 * Outbound fetch guard for untrusted URLs.
 * Pins the connection to DNS answers that were checked, and re-checks every redirect.
 */
import { lookup } from 'node:dns/promises'
import http from 'node:http'
import https from 'node:https'
import { isIP } from 'node:net'

export const SSRF_MAX_URL_LENGTH = 2048
export const SSRF_MAX_REDIRECTS = 3
export const SSRF_MAX_BYTES = 512 * 1024
export const SSRF_TIMEOUT_MS = 8000

export class UnsafeUrlError extends Error {
  constructor(message = 'unsafe url') {
    super(message)
    this.name = 'UnsafeUrlError'
  }
}

export type DnsLookup = (hostname: string) => Promise<string[]>

const BLOCKED_HOSTS = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata',
  'metadata.google.internal',
  'metadata.google',
])

export function isBlockedAddress(ip: string): boolean {
  let value = String(ip || '').trim().toLowerCase().replace(/^\[|\]$/g, '')
  if (value.startsWith('::ffff:')) value = value.slice('::ffff:'.length)
  const kind = isIP(value)
  if (kind === 4) {
    const parts = value.split('.').map((n) => Number(n))
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true
    const [a, b] = parts
    if (a === 0 || a === 10 || a === 127) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && (b === 168 || b === 0)) return true
    if (a === 100 && b >= 64 && b <= 127) return true
    if (a === 198 && (b === 18 || b === 19 || b === 51)) return true
    if (a === 203 && b === 0) return true
    if (a >= 224) return true
    return false
  }
  if (kind === 6) {
    if (value === '::' || value === '::1') return true
    if (value.startsWith('fe80:') || value.startsWith('fc') || value.startsWith('fd')) return true
    if (value.startsWith('2001:db8')) return true
    return false
  }
  return true
}

function blockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  if (!host || BLOCKED_HOSTS.has(host)) return true
  if (host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return true
  if (/^\d+$/.test(host)) return true
  return false
}

export async function defaultDnsLookup(hostname: string): Promise<string[]> {
  if (isIP(hostname)) return [hostname]
  const rows = await lookup(hostname, { all: true, verbatim: true })
  return rows.map((row) => row.address)
}

export async function assertPublicHttpUrl(
  raw: string,
  opts: { lookup?: DnsLookup; allowedHostSuffixes?: string[] } = {},
): Promise<URL> {
  const input = String(raw || '').trim()
  if (!input || input.length > SSRF_MAX_URL_LENGTH) throw new UnsafeUrlError('url length')
  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new UnsafeUrlError('url parse')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new UnsafeUrlError('protocol')
  if (url.username || url.password) throw new UnsafeUrlError('credentials')
  const hostname = url.hostname.replace(/\.$/, '')
  if (blockedHostname(hostname)) throw new UnsafeUrlError('host')
  const literal = hostname.replace(/^\[|\]$/g, '')
  if (isIP(literal) && isBlockedAddress(literal)) throw new UnsafeUrlError('host')
  if (opts.allowedHostSuffixes?.length) {
    const host = hostname.toLowerCase()
    const ok = opts.allowedHostSuffixes.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))
    if (!ok) throw new UnsafeUrlError('host not allowed')
  }
  const resolve = opts.lookup || defaultDnsLookup
  let addresses: string[]
  try {
    addresses = await resolve(hostname)
  } catch {
    throw new UnsafeUrlError('dns')
  }
  if (!addresses.length || addresses.some((ip) => isBlockedAddress(ip))) throw new UnsafeUrlError('address')
  return url
}

export type PinnedResponse = {
  status: number
  headers: Record<string, string | string[] | undefined>
  body: string
}

async function defaultPinnedRequest(url: URL, ip: string, maxBytes: number): Promise<PinnedResponse> {
  const lib = url.protocol === 'https:' ? https : http
  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        protocol: url.protocol,
        host: ip,
        servername: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        method: 'GET',
        path: `${url.pathname || '/'}${url.search}`,
        headers: {
          Host: url.host,
          'User-Agent': 'SimyWebsiteFactory/1.0',
          Accept: 'text/html,application/xhtml+xml,application/ld+json;q=0.9',
        },
        timeout: SSRF_TIMEOUT_MS,
        rejectUnauthorized: true,
      },
      (res) => {
        const chunks: Buffer[] = []
        let size = 0
        res.on('data', (chunk: Buffer) => {
          size += chunk.length
          if (size > maxBytes) {
            req.destroy()
            reject(new UnsafeUrlError('response too large'))
            return
          }
          chunks.push(chunk)
        })
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers as PinnedResponse['headers'],
            body: Buffer.concat(chunks).toString('utf8'),
          })
        })
      },
    )
    req.on('timeout', () => {
      req.destroy()
      reject(new UnsafeUrlError('timeout'))
    })
    req.on('error', (err) => reject(err))
    req.end()
  })
}

function headerValue(headers: PinnedResponse['headers'], name: string): string {
  const raw = headers[name] ?? headers[name.toLowerCase()]
  const value = Array.isArray(raw) ? raw[0] : raw
  return String(value || '')
}

export async function safeFetchPublic(
  raw: string,
  opts: {
    lookup?: DnsLookup
    request?: (url: URL, ip: string, maxBytes: number) => Promise<PinnedResponse>
    maxRedirects?: number
    maxBytes?: number
    allowedHostSuffixes?: string[]
    allowedContentTypes?: string[]
  } = {},
): Promise<{ finalUrl: string; contentType: string; body: string }> {
  const maxRedirects = opts.maxRedirects ?? SSRF_MAX_REDIRECTS
  const maxBytes = opts.maxBytes ?? SSRF_MAX_BYTES
  const request = opts.request || defaultPinnedRequest
  let current = String(raw || '').trim()
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const url = await assertPublicHttpUrl(current, opts)
    const resolve = opts.lookup || defaultDnsLookup
    const addresses = await resolve(url.hostname)
    const ip = addresses.find((item) => !isBlockedAddress(item))
    if (!ip) throw new UnsafeUrlError('address')
    const response = await request(url, ip, maxBytes)
    if (response.body.length > maxBytes) throw new UnsafeUrlError('response too large')
    const location = headerValue(response.headers, 'location')
    if ([301, 302, 303, 307, 308].includes(response.status) && location) {
      if (hop === maxRedirects) throw new UnsafeUrlError('too many redirects')
      current = new URL(location, url).toString()
      continue
    }
    if (response.status < 200 || response.status >= 300) throw new UnsafeUrlError('status')
    const contentType = headerValue(response.headers, 'content-type').toLowerCase()
    const allowed = opts.allowedContentTypes || ['text/html', 'application/xhtml+xml', 'application/ld+json']
    if (!allowed.some((kind) => contentType.includes(kind))) throw new UnsafeUrlError('content-type')
    return { finalUrl: url.toString(), contentType, body: response.body }
  }
  throw new UnsafeUrlError('too many redirects')
}
