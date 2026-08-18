import Anthropic from '@anthropic-ai/sdk'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'
import { getTerminologyDefaults } from '~/composables/useTerminology'
import { buildLocalFaqs, resolveWebsiteCity } from '~/server/utils/website-local-seo'

const AI_MODEL = 'claude-haiku-4-5'
const client = new Anthropic()

type FaqItem = { q: string; a: string }

function parseFaqJson(raw: string): FaqItem[] {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) return []
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1))
    const list = Array.isArray(parsed?.faqs) ? parsed.faqs : Array.isArray(parsed) ? parsed : []
    return list
      .map((f: any) => ({
        q: String(f?.q || f?.question || '').trim().slice(0, 160),
        a: String(f?.a || f?.answer || '').trim().slice(0, 500),
      }))
      .filter((f: FaqItem) => f.q.length >= 8 && f.a.length >= 20)
  } catch {
    return []
  }
}

async function loadLocalCompetitors(query: string, ownName: string) {
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

function padFaqs(items: FaqItem[], fallback: FaqItem[], existing: string[]) {
  const seen = new Set(existing.map((q) => q.trim().toLowerCase()))
  const out: FaqItem[] = []
  for (const item of [...items, ...fallback]) {
    const key = item.q.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(item)
    if (out.length >= 10) break
  }
  return out
}

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const ip = getClientIP(event)
  const burst = await checkRateLimit(ip, 'website_faq_research_ip', 12, 60 * 60 * 1000)
  if (!burst.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Zu viele FAQ-Recherchen. Bitte später erneut versuchen.',
    })
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

  const body = (await readBody(event)) || {}
  const formal = body.formal_address === 'du' ? 'du' : 'sie'
  const existing = Array.isArray(body.existing)
    ? body.existing.map((q: unknown) => String(q || '').trim()).filter(Boolean).slice(0, 12)
    : []

  const terms = getTerminologyDefaults(tenant?.business_type)
  const city = resolveWebsiteCity(tenant)
  const name = String(tenant?.name || '').trim() || 'Betrieb'
  const searchQuery = city ? `${terms.businessNoun} ${city}` : terms.businessNoun
  const competitors = await loadLocalCompetitors(searchQuery, name)
  const fallback = buildLocalFaqs(terms, name, formal, tenant?.business_type, city || null)

  const prompt = `Du bist ein Schweizer Local-SEO-Texter. Schreibe für Laien. Antworte NUR mit JSON.

Betrieb: ${name}
Branche: ${terms.businessNoun}
Ort: ${city || 'Schweiz'}
Anrede: ${formal === 'du' ? 'Du' : 'Sie'}
Schon vorhandene Fragen (nicht wiederholen):
${existing.length ? existing.map((q) => `- ${q}`).join('\n') : 'Keine'}
Lokale Betriebe (nur als Kontext, keine URLs oder erfundenen Fakten):
${competitors.length ? JSON.stringify(competitors) : 'Keine Places-Treffer'}

Aufgabe: Genau 10 häufige Kundenfragen mit kurzen Antworten für die Website-FAQ.
Regeln:
- So wie Kunden googeln oder anrufen, Schweizer Hochdeutsch
- Keine erfundenen Preise, Öffnungszeiten, Sterne oder Gesetze
- Antworten 1–3 Sätze, Anrede ${formal === 'du' ? 'Du' : 'Sie'}
- Mischung: buchen, kosten grob ohne Zahl, Ablauf, Absage, Treffpunkt, für wen geeignet
- Keine Duplikate zu den vorhandenen Fragen

{"faqs":[{"q":"...","a":"..."}]}`

  let generated: FaqItem[] = []
  try {
    const message = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 2200,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
    generated = parseFaqJson(text)
  } catch (err: any) {
    console.warn('[faq-research] claude failed', err?.message)
  }

  const suggestions = padFaqs(generated, fallback, existing)
  if (!suggestions.length) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Recherche gerade nicht verfügbar. Bitte später erneut versuchen.',
    })
  }

  return { suggestions }
})
