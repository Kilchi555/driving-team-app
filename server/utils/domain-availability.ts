import { resolve4, resolveCname } from 'node:dns/promises'
import { normalizeHostname } from '~/server/utils/custom-domain'

const SUGGESTED_TLDS = ['ch', 'com', 'li'] as const

export function apexDomain(input: string): string {
  let host = normalizeHostname(input)
  if (host.startsWith('www.')) host = host.slice(4)
  return host
}

export function suggestDomains(input: string): string[] {
  const host = apexDomain(input)
  if (!host) return []
  if (host.includes('.')) return [host]
  const label = host.replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '')
  if (!label || label.length < 2) return []
  return SUGGESTED_TLDS.map((tld) => `${label}.${tld}`)
}

export function infomaniakShopUrl(domain: string): string {
  const q = encodeURIComponent(apexDomain(domain))
  return `https://www.infomaniak.com/goto/de/shop/domain?search=${q}`
}

export function infomaniakDnsGuideUrl() {
  return 'https://www.infomaniak.com/de/support/faq/2100/eine-dns-zone-verwalten'
}

function rdapUrls(domain: string): string[] {
  const tld = domain.split('.').pop() || ''
  if (tld === 'ch' || tld === 'li') return [`https://rdap.nic.ch/domain/${domain}`]
  if (tld === 'com') return [`https://rdap.verisign.com/com/v1/domain/${domain}`]
  if (tld === 'net') return [`https://rdap.verisign.com/net/v1/domain/${domain}`]
  return [`https://rdap.org/domain/${domain}`]
}

async function rdapStatus(domain: string): Promise<'available' | 'taken' | 'unknown'> {
  for (const url of rdapUrls(domain)) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/rdap+json, application/json' },
        signal: AbortSignal.timeout(6000),
      })
      if (res.status === 404) return 'available'
      if (res.ok) return 'taken'
    } catch {
      /* try next */
    }
  }
  return 'unknown'
}

async function dnsLooksRegistered(domain: string): Promise<boolean | null> {
  try {
    const cnames = await resolveCname(domain)
    if (cnames.length) return true
  } catch {
    /* no CNAME */
  }
  try {
    const ips = await resolve4(domain)
    if (ips.length) return true
  } catch (err: any) {
    if (err?.code === 'ENOTFOUND' || err?.code === 'ENODATA') return false
  }
  return null
}

export type DomainAvailability = {
  domain: string
  status: 'available' | 'taken' | 'unknown'
  shop_url: string
  source: 'rdap' | 'dns' | 'mixed'
}

export async function checkDomainAvailability(domain: string): Promise<DomainAvailability> {
  const name = apexDomain(domain)
  const rdap = await rdapStatus(name)
  if (rdap !== 'unknown') {
    return { domain: name, status: rdap, shop_url: infomaniakShopUrl(name), source: 'rdap' }
  }
  const dns = await dnsLooksRegistered(name)
  if (dns === true) {
    return { domain: name, status: 'taken', shop_url: infomaniakShopUrl(name), source: 'dns' }
  }
  if (dns === false) {
    return { domain: name, status: 'available', shop_url: infomaniakShopUrl(name), source: 'dns' }
  }
  return { domain: name, status: 'unknown', shop_url: infomaniakShopUrl(name), source: 'mixed' }
}
