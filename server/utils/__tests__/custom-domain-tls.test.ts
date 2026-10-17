import { describe, expect, it } from 'vitest'
import {
  connectAuthoritativeTls,
  isDisallowedProbeAddress,
  isProbeableHostname,
  readAuthoritativeTlsEvidence,
  type PresentedCertificate,
  type TlsProbeDeps,
} from '../custom-domain-tls'

const HOST = 'www.example-driving-school.ch'
const NOW = new Date('2026-10-16T12:00:00.000Z')
const VALID_FROM = 'Jan  1 00:00:00 2026 GMT'
const VALID_TO = 'Jan  1 00:00:00 2028 GMT'

function cert(overrides: Partial<PresentedCertificate> = {}): PresentedCertificate {
  return {
    subject: { CN: HOST },
    subjectaltname: `DNS:${HOST}`,
    valid_from: VALID_FROM,
    valid_to: VALID_TO,
    ...overrides,
  }
}

function deps(options: {
  ips?: string[] | Error
  result?: { authorized: boolean; cert: PresentedCertificate | null } | Error
  hang?: 'resolve' | 'connect'
  timeoutMs?: number
} = {}): { deps: TlsProbeDeps; calls: { resolve: number; connect: number } } {
  const calls = { resolve: 0, connect: 0 }
  return {
    calls,
    deps: {
      now: NOW,
      timeoutMs: options.timeoutMs ?? 2_500,
      resolve4: async () => {
        calls.resolve += 1
        if (options.hang === 'resolve') return new Promise(() => {})
        if (options.ips instanceof Error) throw options.ips
        return options.ips ?? ['76.76.21.21']
      },
      connect: async () => {
        calls.connect += 1
        if (options.hang === 'connect') return new Promise(() => {})
        if (options.result instanceof Error) throw options.result
        return options.result ?? { authorized: true, cert: cert() }
      },
    },
  }
}

describe('probe target policy', () => {
  it('rejects platform names, IP literals, and local suffixes before any lookup', async () => {
    const probe = deps()
    for (const host of ['app.simy.ch', 'preview.simy.ch', 'demo.vercel.app', '8.8.8.8', 'localhost', 'printer.local', 'db.internal']) {
      const proof = await readAuthoritativeTlsEvidence(host, host, probe.deps)
      expect(proof).toEqual({ ok: false, reason: 'unregistered' })
    }
    expect(probe.calls).toEqual({ resolve: 0, connect: 0 })
    expect(isProbeableHostname(HOST)).toBe(true)
    expect(isProbeableHostname('app.simy.ch')).toBe(false)
  })

  it('does not resolve a hostname that is not the registered tenant hostname', async () => {
    const probe = deps()
    const proof = await readAuthoritativeTlsEvidence('other.example', HOST, probe.deps)
    expect(proof).toEqual({ ok: false, reason: 'unregistered' })
    expect(probe.calls.resolve).toBe(0)
    expect(probe.calls.connect).toBe(0)
  })

  it('refuses private, link-local, loopback, and documentation addresses without connecting', () => {
    for (const ip of [
      '0.0.0.0',
      '10.1.2.3',
      '127.0.0.1',
      '169.254.169.254',
      '172.16.0.1',
      '192.168.1.1',
      '100.64.0.1',
      '192.0.0.8',
      '192.0.2.1',
      '198.18.0.1',
      '198.51.100.1',
      '203.0.113.1',
      '224.0.0.1',
      '255.255.255.255',
      '::1',
      'not-an-ip',
    ]) {
      expect(isDisallowedProbeAddress(ip)).toBe(true)
    }
    expect(isDisallowedProbeAddress('76.76.21.21')).toBe(false)
    expect(isDisallowedProbeAddress('8.8.8.8')).toBe(false)
  })

  it('does not dial when any resolved address is disallowed', async () => {
    const probe = deps({ ips: ['8.8.8.8', '10.0.0.1'] })
    const proof = await readAuthoritativeTlsEvidence(HOST, HOST, probe.deps)
    expect(proof).toEqual({ ok: false, reason: 'address' })
    expect(probe.calls.connect).toBe(0)
  })

  it('refuses a direct connect helper call to a private address', async () => {
    await expect(connectAuthoritativeTls({
      ip: '169.254.169.254',
      servername: HOST,
      timeoutMs: 50,
    })).rejects.toThrow(/refused/)
  })
})

describe('readAuthoritativeTlsEvidence', () => {
  it('accepts a trusted certificate whose SAN matches the registered hostname', async () => {
    const probe = deps()
    const proof = await readAuthoritativeTlsEvidence(`HTTPS://${HOST}/path`, `${HOST}.`, probe.deps)
    expect(proof).toEqual({ ok: true, reason: 'ok' })
    expect(probe.calls).toEqual({ resolve: 1, connect: 1 })
  })

  it('accepts one wildcard label and rejects that wildcard for the apex', async () => {
    const wildcard = cert({
      subject: { CN: '*.example-driving-school.ch' },
      subjectaltname: 'DNS:*.example-driving-school.ch',
    })
    const www = deps({ result: { authorized: true, cert: wildcard } })
    expect(await readAuthoritativeTlsEvidence(HOST, HOST, www.deps)).toEqual({ ok: true, reason: 'ok' })
    const apex = deps({ result: { authorized: true, cert: wildcard } })
    expect(await readAuthoritativeTlsEvidence(
      'example-driving-school.ch',
      'example-driving-school.ch',
      apex.deps,
    )).toEqual({ ok: false, reason: 'mismatch' })
  })

  it('fails closed on a missing, expired, not-yet-valid, or mismatched certificate', async () => {
    const missing = deps({ result: { authorized: true, cert: null } })
    expect(await readAuthoritativeTlsEvidence(HOST, HOST, missing.deps)).toEqual({ ok: false, reason: 'tls' })

    const unauthorized = deps({ result: { authorized: false, cert: cert() } })
    expect(await readAuthoritativeTlsEvidence(HOST, HOST, unauthorized.deps)).toEqual({ ok: false, reason: 'tls' })

    const mismatched = deps({
      result: {
        authorized: true,
        cert: cert({ subject: { CN: 'other.example' }, subjectaltname: 'DNS:other.example' }),
      },
    })
    expect(await readAuthoritativeTlsEvidence(HOST, HOST, mismatched.deps)).toEqual({ ok: false, reason: 'mismatch' })

    const expired = deps({
      result: {
        authorized: true,
        cert: cert({ valid_from: 'Jan  1 00:00:00 2019 GMT', valid_to: 'Jan  1 00:00:00 2020 GMT' }),
      },
    })
    expect(await readAuthoritativeTlsEvidence(HOST, HOST, expired.deps)).toEqual({ ok: false, reason: 'expired' })

    const future = deps({
      result: {
        authorized: true,
        cert: cert({ valid_from: 'Jan  1 00:00:00 2027 GMT' }),
      },
    })
    expect(await readAuthoritativeTlsEvidence(HOST, HOST, future.deps)).toEqual({ ok: false, reason: 'validity' })

    const undated = deps({
      result: {
        authorized: true,
        cert: cert({ valid_from: 'not-a-date', valid_to: 'also-not' }),
      },
    })
    expect(await readAuthoritativeTlsEvidence(HOST, HOST, undated.deps)).toEqual({ ok: false, reason: 'validity' })
  })

  it('fails closed on DNS failure, too many answers, and timeouts', async () => {
    const failed = deps({ ips: Object.assign(new Error('no such host'), { code: 'ENOTFOUND' }) })
    expect(await readAuthoritativeTlsEvidence(HOST, HOST, failed.deps)).toEqual({ ok: false, reason: 'dns' })
    expect(failed.calls.connect).toBe(0)

    const empty = deps({ ips: [] })
    expect(await readAuthoritativeTlsEvidence(HOST, HOST, empty.deps)).toEqual({ ok: false, reason: 'dns' })

    const tooMany = deps({ ips: Array.from({ length: 9 }, () => '8.8.8.8') })
    expect(await readAuthoritativeTlsEvidence(HOST, HOST, tooMany.deps)).toEqual({ ok: false, reason: 'dns' })
    expect(tooMany.calls.connect).toBe(0)

    const dnsTimeout = deps({ hang: 'resolve', timeoutMs: 20 })
    expect(await readAuthoritativeTlsEvidence(HOST, HOST, dnsTimeout.deps)).toEqual({ ok: false, reason: 'timeout' })
    expect(dnsTimeout.calls.connect).toBe(0)

    const tlsTimeout = deps({ hang: 'connect', timeoutMs: 20 })
    expect(await readAuthoritativeTlsEvidence(HOST, HOST, tlsTimeout.deps)).toEqual({ ok: false, reason: 'timeout' })

    const tlsError = deps({ result: Object.assign(new Error('handshake failed'), { code: 'ECONNRESET' }) })
    expect(await readAuthoritativeTlsEvidence(HOST, HOST, tlsError.deps)).toEqual({ ok: false, reason: 'tls' })
  })
})
