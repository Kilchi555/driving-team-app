import type { ProspectPagespeed } from '~/server/utils/website-prospect-types'

function psiKey() {
  return (
    process.env.GOOGLE_PSI_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    ''
  ).trim()
}

export async function fetchProspectPagespeed(url: string): Promise<ProspectPagespeed> {
  const key = psiKey()
  if (!key) return { performance: null, seo: null, lcp_ms: null, source: 'skipped' }
  try {
    const endpoint =
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
      `?url=${encodeURIComponent(url)}` +
      `&strategy=mobile&category=performance&category=seo&key=${encodeURIComponent(key)}`
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(25000) })
    if (!res.ok) {
      return { performance: null, seo: null, lcp_ms: null, source: 'error', error: `PSI ${res.status}` }
    }
    const data = (await res.json()) as {
      lighthouseResult?: {
        categories?: { performance?: { score?: number }; seo?: { score?: number } }
        audits?: { 'largest-contentful-paint'?: { numericValue?: number } }
      }
    }
    const perf = data.lighthouseResult?.categories?.performance?.score
    const seo = data.lighthouseResult?.categories?.seo?.score
    const lcp = data.lighthouseResult?.audits?.['largest-contentful-paint']?.numericValue
    return {
      performance: perf == null ? null : Math.round(perf * 100),
      seo: seo == null ? null : Math.round(seo * 100),
      lcp_ms: lcp == null ? null : Math.round(lcp),
      source: 'psi',
    }
  } catch (err: any) {
    return {
      performance: null,
      seo: null,
      lcp_ms: null,
      source: 'error',
      error: err?.message || 'PSI timeout',
    }
  }
}
