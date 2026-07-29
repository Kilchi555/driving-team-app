import { createError } from 'h3'

/** Shared GBP helpers for P1 automation */

export function requireAnthropicApiKey(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'AI nicht konfiguriert (ANTHROPIC_API_KEY fehlt)',
    })
  }
  return apiKey
}

export function gbpStarToNumber(rating?: string | number | null): number {
  if (typeof rating === 'number') return rating
  const map: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }
  return map[String(rating || '').toUpperCase()] ?? 0
}

export function assertCronAuth(authHeader: string | undefined) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
}

export type GbpAiTextContext = 'post' | 'photo_caption' | 'review_reply' | 'profile_description'
export type GbpAiTextTone = 'local_friendly' | 'factual' | 'cta_focus'
export type GbpAiTextMode = 'generate' | 'regenerate' | 'shorter' | 'more_cta'

export interface GenerateGbpAiTextParams {
  context: GbpAiTextContext
  tenantName: string
  locationTitle?: string | null
  brandVoice?: string | null
  keywords?: string[]
  draftText?: string | null
  tone?: GbpAiTextTone
  mode?: GbpAiTextMode
  ctaType?: string | null
  reviewerName?: string | null
  starRating?: number | null
  reviewText?: string | null
}

const TONE_LABELS: Record<GbpAiTextTone, string> = {
  local_friendly: 'Lokal & freundlich',
  factual: 'Sachlich & informativ',
  cta_focus: 'Mit starker Handlungsaufforderung',
}

async function callAnthropic(prompt: string, maxTokens: number): Promise<string> {
  const apiKey = requireAnthropicApiKey()
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey })
  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })
  return message.content[0].type === 'text' ? message.content[0].text.trim() : ''
}

function buildModeInstruction(mode: GbpAiTextMode, currentText?: string | null): string {
  if (mode === 'shorter' && currentText) {
    return `\nKürze den folgenden Text deutlich, behalte Kernbotschaft und SEO-Stichworte:\n"""${currentText}"""`
  }
  if (mode === 'more_cta' && currentText) {
    return `\nOptimiere den folgenden Text mit klarerer Handlungsaufforderung (CTA), ohne aufdringlich zu wirken:\n"""${currentText}"""`
  }
  if (mode === 'regenerate' && currentText) {
    return `\nSchreibe eine neue Variante — anderer Einstieg, gleiche Fakten. Aktueller Entwurf zur Orientierung:\n"""${currentText}"""`
  }
  if (currentText?.trim()) {
    return `\nRohentwurf / Stichpunkte des Nutzers (einbauen und verbessern):\n"""${currentText.trim()}"""`
  }
  return ''
}

export async function generateGbpAiText(params: GenerateGbpAiTextParams): Promise<string> {
  const keywords = (params.keywords ?? []).filter(Boolean)
  const voice = params.brandVoice ? `\nMarkenstimme: ${params.brandVoice}` : ''
  const kw = keywords.length
    ? `\nSEO-Stichworte natürlich einbauen (kein Keyword-Stuffing): ${keywords.join(', ')}`
    : ''
  const loc = params.locationTitle ? `\nStandort: ${params.locationTitle}` : ''
  const tone = TONE_LABELS[params.tone || 'local_friendly']
  const mode = params.mode || 'generate'
  const modeBlock = buildModeInstruction(mode, params.draftText)

  let prompt = ''

  if (params.context === 'review_reply') {
    const stars = params.starRating ?? 0
    const baseTone = stars >= 4 ? 'dankend und herzlich' : stars === 3 ? 'verständnisvoll' : 'entschuldigend und konstruktiv'
    prompt = `Du schreibst eine Google-Bewertungsantwort für "${params.tenantName}" (Fahrschule Schweiz).${loc}${voice}${kw}
Ton: ${baseTone}, ${tone}.

Bewertung von ${params.reviewerName || 'einem Kunden'} (${stars}/5):
"${params.reviewText || '(Kein Kommentar)'}"
${modeBlock}

Regeln:
- Max. 3 Sätze, Schweizer Hochdeutsch
- Persönlich, authentisch, nicht defensiv
- Signatur: "${params.tenantName}"
- Nur den Antworttext, kein JSON`
    return callAnthropic(prompt, 300)
  }

  if (params.context === 'profile_description') {
    prompt = `Du schreibst die Google Business Profile Kurzbeschreibung ("Über uns") für "${params.tenantName}" (Fahrschule Schweiz).${loc}${voice}${kw}
Ton: ${tone}.
${modeBlock}

Anforderungen:
- Schweizer Hochdeutsch, 400–750 Zeichen (Google-Limit 750)
- Local SEO: Standort(e), Leistungen, Zielgruppe natürlich einbauen
- Erzählt die Geschichte/den Nutzen der Fahrschule, keine Aufzählung
- Kein Keyword-Stuffing, keine erfundenen Fakten (Gründungsjahr, Preise etc.)
- Nur den Beschreibungstext, kein JSON`
    return callAnthropic(prompt, 500)
  }

  if (params.context === 'photo_caption') {
    prompt = `Du schreibst eine Google Business Profile Foto-Beschreibung für "${params.tenantName}" (Fahrschule Schweiz).${loc}${voice}${kw}
Ton: ${tone}.
${modeBlock}

Anforderungen:
- 80–220 Zeichen
- Local SEO: Ort, Leistung, Nutzen — natürlich formuliert
- Kein Hashtag-Spam
- Nur den Beschreibungstext`
    return callAnthropic(prompt, 200)
  }

  // post
  prompt = `Du schreibst einen Google Business Profile Post für "${params.tenantName}" (Fahrschule Schweiz).${loc}${voice}${kw}
Ton: ${tone}.
${modeBlock}

Anforderungen:
- Schweizer Hochdeutsch, 400–900 Zeichen
- Local SEO: Orte, Leistungen, Zielgruppe natürlich einbauen
- 1 klarer Nutzen, max. 3 Hashtags
- Keine erfundenen Preise/Aktionen
- CTA am Ende passend zu: ${params.ctaType || 'BOOK'}
- Nur den Post-Text`
  return callAnthropic(prompt, 500)
}

export interface GbpServiceSuggestion {
  name: string
  description: string
}

/**
 * Suggest a list of free-form services for a location, based on its category.
 * Returns a clean array — never echoes services the location already has.
 */
export async function generateGbpServiceSuggestions(params: {
  tenantName: string
  locationTitle?: string | null
  categoryName?: string | null
  existingServiceNames?: string[]
  keywords?: string[]
  brandVoice?: string | null
}): Promise<GbpServiceSuggestion[]> {
  const existing = (params.existingServiceNames ?? []).filter(Boolean)
  const kw = (params.keywords ?? []).filter(Boolean)
  const voice = params.brandVoice ? `\nMarkenstimme: ${params.brandVoice}` : ''
  const loc = params.locationTitle ? `\nStandort: ${params.locationTitle}` : ''
  const cat = params.categoryName ? `\nGoogle-Kategorie: ${params.categoryName}` : ''
  const kwLine = kw.length ? `\nStichworte, die zum Angebot passen könnten: ${kw.join(', ')}` : ''
  const existingLine = existing.length
    ? `\nBereits vorhandene Leistungen (NICHT wiederholen): ${existing.join(', ')}`
    : ''

  const prompt = `Du erstellst eine Liste von Leistungen für das Google Business Profile von "${params.tenantName}" (Fahrschule Schweiz).${loc}${cat}${voice}${kwLine}${existingLine}

Schlage 6–10 konkrete, realistische Leistungen einer Schweizer Fahrschule vor (z.B. Führerscheinkategorien, Kurse, Zusatzangebote). Erfinde keine Leistungen, die eine Fahrschule offensichtlich nicht anbietet.

Antworte AUSSCHLIESSLICH mit validem JSON in diesem Format, ohne Markdown-Codeblock, ohne Erklärung:
[{"name": "Kurzname (max. 40 Zeichen)", "description": "Kurze Beschreibung, max. 100 Zeichen"}]`

  const raw = await callAnthropic(prompt, 900)
  const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((s: any) => s?.name)
      .map((s: any) => ({ name: String(s.name).slice(0, 60), description: s.description ? String(s.description).slice(0, 150) : '' }))
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'KI-Antwort konnte nicht gelesen werden' })
  }
}

export async function generateGbpReviewSuggestion(params: {
  tenantName: string
  reviewerName?: string | null
  starRating: number
  reviewText?: string | null
  brandVoice?: string | null
}): Promise<string> {
  const apiKey = requireAnthropicApiKey()
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const stars = params.starRating
  const tone = stars >= 4 ? 'dankend und herzlich' : stars === 3 ? 'verständnisvoll und lösungsorientiert' : 'entschuldigend und konstruktiv'
  const voice = params.brandVoice ? `\nMarkenstimme: ${params.brandVoice}` : ''

  const prompt = `Du bist der Inhaber von "${params.tenantName}", einer Fahrschule in der Schweiz.${voice}
Antworte auf folgende Google-Bewertung professionell auf Deutsch (Schweizer Hochdeutsch).

Bewertung von ${params.reviewerName || 'einem Kunden'} (${stars}/5 Sterne):
"${params.reviewText || '(Kein Kommentar)'}"

Schreibe eine kurze, ${tone}e Antwort (max. 3 Sätze).
Regeln:
- Persönlich ansprechen (Vorname falls bekannt)
- Authentisch, nicht übertrieben
- Bei negativen Reviews: konkreten Lösungsweg erwähnen
- Nie defensiv, immer professionell
- Kein "Sehr geehrte/r", stattdessen "Liebe/r [Name]"
- Signatur: "${params.tenantName}" am Ende

Antworte NUR mit dem Text der Antwort, kein JSON, keine Erklärungen.`

  const client = new Anthropic({ apiKey })
  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  })

  return message.content[0].type === 'text' ? message.content[0].text.trim() : ''
}

export async function generateGbpPostDraft(params: {
  tenantName: string
  locationTitle?: string | null
  keywords?: string[]
  brandVoice?: string | null
  ctaType?: string | null
}): Promise<string> {
  const apiKey = requireAnthropicApiKey()
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const keywords = (params.keywords ?? []).filter(Boolean)
  const voice = params.brandVoice ? `\nMarkenstimme: ${params.brandVoice}` : ''
  const kw = keywords.length ? `\nKeywords natürlich einbauen (nicht spammen): ${keywords.join(', ')}` : ''
  const loc = params.locationTitle ? `\nStandort: ${params.locationTitle}` : ''

  const prompt = `Du schreibst einen Google Business Profile Post für "${params.tenantName}" (Fahrschule Schweiz).${loc}${voice}${kw}

Anforderungen:
- Schweizer Hochdeutsch
- 400–900 Zeichen
- 1 klarer Nutzen für Fahrschüler
- Kein Hashtag-Spam (max. 3)
- Keine erfundenen Preise/Aktionen
- CTA am Ende passend zu: ${params.ctaType || 'BOOK'}
- Nur den Post-Text ausgeben, kein JSON`

  const client = new Anthropic({ apiKey })
  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  })

  return message.content[0].type === 'text' ? message.content[0].text.trim() : ''
}
