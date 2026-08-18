import Anthropic from '@anthropic-ai/sdk'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'
import { getTerminologyDefaults } from '~/composables/useTerminology'
import { resolveWebsiteCity } from '~/server/utils/website-local-seo'
import {
  consumeSeoAdvisorQuota,
  readSeoAdvisorQuota,
  saveSeoAdvisorLast,
} from '~/server/utils/website-seo-advisor-quota'

const AI_MODEL = 'claude-haiku-4-5'
const client = new Anthropic()

type Competitor = { name: string; rating: number | null; reviews: number | null }

async function loadLocalCompetitors(query: string, ownName: string): Promise<Competitor[]> {
  const key = String(useRuntimeConfig().googleMapsApiKey || process.env.GOOGLE_MAPS_API_KEY || '').trim()
  if (!key || !query) return []
  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/textsearch/json` +
      `?query=${encodeURIComponent(query)}` +
      `&language=de&region=ch&key=${key}`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const data = (await res.json()) as {
      results?: Array<{ name?: string; rating?: number; user_ratings_total?: number }>
    }
    const own = ownName.trim().toLowerCase()
    return (data.results || [])
      .filter((r) => r.name && r.name.trim().toLowerCase() !== own)
      .slice(0, 6)
      .map((r) => ({
        name: String(r.name),
        rating: r.rating ?? null,
        reviews: r.user_ratings_total ?? null,
      }))
  } catch {
    return []
  }
}

function parseAdvisorJson(raw: string) {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(raw.slice(start, end + 1))
  } catch {
    return null
  }
}

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const ip = getClientIP(event)
  const burst = await checkRateLimit(ip, 'website_seo_advisor_ip', 8, 60 * 60 * 1000)
  if (!burst.allowed) {
    throw createError({ statusCode: 429, statusMessage: 'Zu viele Anfragen. Bitte später erneut versuchen.' })
  }

  const supabase = getSupabaseAdmin()
  const { data: user } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!user?.tenant_id || !['admin', 'tenant_admin'].includes(String(user.role || ''))) {
    throw createError({ statusCode: 403, statusMessage: 'Nur Admins' })
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, business_type, invoice_city, address')
    .eq('id', user.tenant_id)
    .single()

  const { data: website } = await supabase
    .from('website_tenants')
    .select('id, seo_advisor_usage')
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (!website?.id) {
    throw createError({ statusCode: 404, statusMessage: 'Website nicht gefunden' })
  }

  const body = (await readBody(event)) || {}
  const rewriteOnly = body.rewrite_only === true
  const focusKeywords = Array.isArray(body.focus_keywords)
    ? body.focus_keywords.map((k: unknown) => String(k || '').trim()).filter(Boolean).slice(0, 4)
    : []

  const before = readSeoAdvisorQuota(website.seo_advisor_usage)
  if (!rewriteOnly && before.remaining < 1) {
    throw createError({
      statusCode: 429,
      statusMessage: `Tageslimit erreicht (${before.limit} Analysen). Wieder ab ${before.resets_on}.`,
      data: { remaining: 0, limit: before.limit, resets_on: before.resets_on, last: before.last },
    })
  }

  const formal = body.formal_address === 'du' ? 'du' : 'sie'
  const current = body.current && typeof body.current === 'object' ? body.current : {}

  const terms = getTerminologyDefaults(tenant?.business_type)
  const city = resolveWebsiteCity(tenant)
  const name = String(tenant?.name || '').trim() || 'Betrieb'
  const searchQuery = city ? `${terms.businessNoun} ${city}` : terms.businessNoun
  const competitors = rewriteOnly ? [] : await loadLocalCompetitors(searchQuery, name)
  const lastCopy = before.last && typeof before.last === 'object' ? (before.last as any).copy : null

  const prompt = `Du bist ein Schweizer Local-SEO-Experte. Schreibe für Laien, ohne Fachjargon. Antworte NUR mit einem JSON-Objekt.

Betrieb: ${name}
Branche: ${terms.businessNoun}
Ort: ${city || 'Schweiz'}
Anrede auf der Website: ${formal === 'du' ? 'Du' : 'Sie'}
Aktuelle Texte:
- Grosse Überschrift: ${String(current.headline || '').slice(0, 120)}
- Kurztext: ${String(current.subheadline || '').slice(0, 280)}
- Google-Titel: ${String(current.seo_title || '').slice(0, 70)}
- Google-Text: ${String(current.seo_description || '').slice(0, 170)}
${focusKeywords.length ? `\nGewählte Richtung (diese Suchwörter müssen natürlich vorkommen): ${focusKeywords.join(', ')}` : ''}
${rewriteOnly ? `\nNur die Texte neu schreiben. Keywords-Liste beibehalten oder leicht anpassen. Vorherige Texte: ${JSON.stringify(lastCopy || {}).slice(0, 500)}` : ''}

${rewriteOnly ? 'Keine Konkurrenz erfinden.' : `Lokale Treffer (Google Places, können Konkurrenz sein — keine URLs erfinden):
${competitors.length ? JSON.stringify(competitors) : 'Keine Places-Treffer. Nur allgemeine CH-Local-SEO-Empfehlungen, keine erfundenen Konkurrenten.'}`}

Regeln:
- Keine erfundenen Bewertungszahlen oder Firmen, die nicht in der Liste stehen
- Suchwörter: so wie Kunden googeln, Deutsch CH, nicht stopfen
- Copy in der gewählten Anrede, konkret, ohne Superlative ohne Beleg
- pro/con in einfachem Deutsch (kein «Transaktionalität», kein «Intent»)
- Grosse Überschrift ≤90, Kurztext 120–220, Google-Titel 35–60, Google-Text 120–160

JSON-Schema:
{
  "summary": "2 Sätze auf Deutsch, was Kunden suchen und was die Website tun sollte",
  "keywords": [
    { "phrase": "fahrschule zürich", "intent": "hoch|mittel|niedrig", "pro": "warum das hilft, alltagssprachlich", "con": "wann eher nicht, alltagssprachlich", "use": "title|h1|body|skip" }
  ],
  "copy": {
    "headline": "",
    "subheadline": "",
    "seo_title": "",
    "seo_description": "",
    "seo_keywords": "a, b, c",
    "trust": [{ "value": "Online", "label": "Jederzeit buchbar" }]
  }
}
${rewriteOnly ? 'Genau die copy-Felder neu. 5–7 keywords. 3 trust-Einträge.' : 'Genau 5–7 keywords, genau 3 trust-Einträge.'}`

  let parsed: any = null
  try {
    const message = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1800,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
    parsed = parseAdvisorJson(text)
  } catch (err: any) {
    console.warn('[seo-advisor] claude failed', err?.message)
  }

  if (!parsed?.copy || !Array.isArray(parsed.keywords)) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Analyse gerade nicht verfügbar. Bitte später erneut versuchen — es wurde nichts vom Tageslimit abgezogen.',
    })
  }

  const briefing = {
    summary: String(parsed.summary || '').slice(0, 400),
    keywords: parsed.keywords.slice(0, 8).map((k: any) => ({
      phrase: String(k.phrase || '').slice(0, 80),
      intent: ['hoch', 'mittel', 'niedrig'].includes(k.intent) ? k.intent : 'mittel',
      pro: String(k.pro || '').slice(0, 180),
      con: String(k.con || '').slice(0, 180),
      use: String(k.use || 'body').slice(0, 16),
    })),
    copy: {
      headline: String(parsed.copy.headline || '').slice(0, 90),
      subheadline: String(parsed.copy.subheadline || '').slice(0, 280),
      seo_title: String(parsed.copy.seo_title || '').slice(0, 60),
      seo_description: String(parsed.copy.seo_description || '').slice(0, 160),
      seo_keywords: String(parsed.copy.seo_keywords || '').slice(0, 200),
      trust: Array.isArray(parsed.copy.trust)
        ? parsed.copy.trust.slice(0, 3).map((t: any) => ({
            value: String(t.value || '').slice(0, 24),
            label: String(t.label || '').slice(0, 40),
          }))
        : [],
    },
    research: {
      city: city || null,
      query: searchQuery,
      competitors,
    },
    created_at: new Date().toISOString(),
  }

  if (rewriteOnly) {
    const merged = {
      ...(before.last && typeof before.last === 'object' ? before.last : {}),
      ...briefing,
      keywords: briefing.keywords.length ? briefing.keywords : (before.last as any)?.keywords || [],
      research: (before.last as any)?.research || briefing.research,
    }
    await saveSeoAdvisorLast(supabase, website.id, website.seo_advisor_usage, merged)
    return {
      remaining: before.remaining,
      limit: before.limit,
      used: before.count,
      resets_on: before.resets_on,
      briefing: merged,
      rewrite: true,
    }
  }

  const after = await consumeSeoAdvisorQuota(supabase, website.id, website.seo_advisor_usage, briefing)

  return {
    remaining: after.remaining,
    limit: after.limit,
    used: after.count,
    resets_on: after.resets_on,
    briefing,
  }
})
