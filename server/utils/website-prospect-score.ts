import type {
  ProspectAnalysis,
  ProspectFinding,
  ProspectPagespeed,
  ProspectScrape,
} from '~/server/utils/website-prospect-types'

const CURRENT_YEAR = 2026

export function scoreProspectSeo(scrape: ProspectScrape | null, city?: string | null, noun?: string | null): number {
  if (!scrape) return 20
  let score = 0
  const title = String(scrape.title || '')
  const desc = String(scrape.description || '')
  const h1 = String(scrape.h1 || '')
  if (title.length >= 20 && title.length <= 65) score += 18
  else if (title.length >= 8) score += 8
  if (desc.length >= 80 && desc.length <= 170) score += 14
  else if (desc.length >= 30) score += 6
  if (h1.length >= 8) score += 10
  if (scrape.viewport) score += 10
  if (scrape.has_og) score += 8
  if (scrape.has_schema) score += 10
  if (scrape.canonical) score += 6
  const blob = `${title} ${desc} ${h1}`.toLowerCase()
  if (city && blob.includes(city.toLowerCase())) score += 8
  if (noun && blob.includes(noun.toLowerCase())) score += 8
  if (scrape.has_booking_cta) score += 8
  return Math.max(0, Math.min(100, score))
}

export function scoreProspectFreshness(scrape: ProspectScrape | null, nowYear = CURRENT_YEAR): number {
  if (!scrape) return 30
  let score = 55
  if (scrape.copyright_year) {
    const age = nowYear - scrape.copyright_year
    if (age <= 0) score = 90
    else if (age === 1) score = 75
    else if (age === 2) score = 55
    else if (age === 3) score = 35
    else score = 15
  }
  const cms = String(scrape.cms || '')
  if (/Jimdo|Wix|Weebly|IONOS/i.test(cms)) score = Math.min(score, 40)
  if (scrape.word_count < 80) score = Math.min(score, 25)
  return score
}

export function scoreProspectSpeed(pagespeed: ProspectPagespeed | null): number | null {
  if (!pagespeed || pagespeed.source !== 'psi') return null
  if (pagespeed.performance == null) return null
  let score = pagespeed.performance
  if (pagespeed.lcp_ms != null && pagespeed.lcp_ms > 4000) score = Math.min(score, 35)
  else if (pagespeed.lcp_ms != null && pagespeed.lcp_ms > 2500) score = Math.min(score, 55)
  return Math.max(0, Math.min(100, Math.round(score)))
}

export function scoreProspectOpportunity(input: {
  seo: number
  freshness: number
  speed: number | null
  scrape: ProspectScrape | null
}): { opportunity: number; findings: ProspectFinding[]; recommend: boolean } {
  const parts = [100 - input.seo, 100 - input.freshness]
  if (input.speed != null) parts.push(100 - input.speed)
  let opportunity = Math.round(parts.reduce((a, b) => a + b, 0) / parts.length)

  const findings: ProspectFinding[] = []
  const scrape = input.scrape
  if (!scrape?.viewport) {
    findings.push({
      id: 'mobile',
      severity: 'high',
      title: 'Kein Mobile-Viewport',
      detail: 'Google wertet die Seite als nicht mobilfreundlich.',
    })
    opportunity += 6
  }
  if (!scrape?.has_schema) {
    findings.push({
      id: 'schema',
      severity: 'high',
      title: 'Kein LocalBusiness-Schema',
      detail: 'Ohne strukturierte Daten lesen Google und ChatGPT die Firma schlechter.',
    })
    opportunity += 5
  }
  if (!scrape?.has_booking_cta) {
    findings.push({
      id: 'cta',
      severity: 'high',
      title: 'Kein klarer Buchungs-CTA',
      detail: 'Besucher müssen selbst eine Mail schreiben oder anrufen.',
    })
    opportunity += 8
  }
  if ((scrape?.copyright_year || 0) > 0 && CURRENT_YEAR - (scrape?.copyright_year || 0) >= 3) {
    findings.push({
      id: 'stale',
      severity: 'medium',
      title: `Copyright ${scrape?.copyright_year}`,
      detail: 'Die Seite wirkt seit Jahren nicht aktualisiert.',
    })
  }
  if (scrape?.cms && /Jimdo|Wix|Weebly|WordPress|IONOS/i.test(scrape.cms)) {
    findings.push({
      id: 'cms',
      severity: 'medium',
      title: `${scrape.cms}-Baukasten`,
      detail: 'Typisch langsam, schwach in Local SEO, schwer zu pflegen.',
    })
  }
  if (!scrape?.title || scrape.title.length < 12) {
    findings.push({
      id: 'title',
      severity: 'medium',
      title: 'Schwacher Seitentitel',
      detail: 'Title fehlt oder ist zu kurz für lokale Suche.',
    })
  }
  if (input.speed != null && input.speed < 50) {
    findings.push({
      id: 'speed',
      severity: 'high',
      title: `Langsam (PageSpeed ${input.speed})`,
      detail: 'Mobile Performance unter 50 — Google und Nutzer springen ab.',
    })
  }
  if (input.seo < 45) {
    findings.push({
      id: 'seo',
      severity: 'high',
      title: `On-Page SEO schwach (${input.seo}/100)`,
      detail: 'Title, Beschreibung, Schema oder Stadt-Keyword fehlen.',
    })
  }

  opportunity = Math.max(0, Math.min(100, opportunity))
  return {
    opportunity,
    findings: findings.slice(0, 8),
    recommend: opportunity >= 45,
  }
}

export function buildProspectAnalysis(input: {
  name: string
  seo: number
  freshness: number
  speed: number | null
  scrape: ProspectScrape | null
}): ProspectAnalysis {
  const scored = scoreProspectOpportunity(input)
  const bits = [
    scored.recommend
      ? `${input.name} hat eine veraltete oder schwach optimierte Homepage.`
      : `${input.name} ist kein klarer Weak-Site-Treffer.`,
    `SEO ${input.seo}/100, Aktualität ${input.freshness}/100` +
      (input.speed != null ? `, Speed ${input.speed}/100` : ', Speed nicht gemessen') +
      `.`,
  ]
  return {
    findings: scored.findings,
    summary: bits.join(' '),
    recommend_generate: scored.recommend,
  }
}
