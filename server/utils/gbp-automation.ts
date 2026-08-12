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
  /** Branch label e.g. Fahrschule / Coaching-Praxis — defaults via getTerminologyDefaults */
  businessNoun?: string
  clientSingular?: string
  clientsPlural?: string
  appointmentSingular?: string
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
  /** Optional image for photo_caption vision (raw base64, no data: prefix) */
  imageBase64?: string | null
  imageMediaType?: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | null
}

const TONE_LABELS: Record<GbpAiTextTone, string> = {
  local_friendly: 'Lokal & freundlich',
  factual: 'Sachlich & informativ',
  cta_focus: 'Mit starker Handlungsaufforderung',
}

/** Customer-facing GBP copy: High German only — never Swiss dialect. */
const HOCHDEUTSCH_RULE = `Sprache: ausschliesslich Hochdeutsch (Standarddeutsch).
VERBOTEN: Schweizerdeutsch/Mundart — keine Dialektwörter wie Grüezi, Merci vielmal, isch, nöd, guet, mer, chönd, ässe, luege, schaffe, etc.
Schweizer Schreibweise ist erlaubt (ss statt ß).`

type AnthropicImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

async function callAnthropic(
  prompt: string,
  maxTokens: number,
  image?: { base64: string; mediaType: AnthropicImageMediaType } | null,
): Promise<string> {
  const apiKey = requireAnthropicApiKey()
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey })

  const content: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; source: { type: 'base64'; media_type: AnthropicImageMediaType; data: string } }
  > = []

  if (image?.base64) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: image.mediaType,
        data: image.base64,
      },
    })
  }
  content.push({ type: 'text', text: prompt })

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content }],
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
  const { getTerminologyDefaults } = await import('~/composables/useTerminology')
  const defaults = getTerminologyDefaults(null)
  const businessNoun = params.businessNoun || defaults.businessNoun
  const clientsPlural = params.clientsPlural || defaults.clientsPlural
  const branchTag = `(${businessNoun} Schweiz)`

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
    prompt = `Du schreibst eine Google-Bewertungsantwort für "${params.tenantName}" ${branchTag}.${loc}${voice}${kw}
Ton: ${baseTone}, ${tone}.

Bewertung von ${params.reviewerName || 'einem Kunden'} (${stars}/5):
"${params.reviewText || '(Kein Kommentar)'}"
${modeBlock}

Regeln:
- ${HOCHDEUTSCH_RULE}
- Max. 3 Sätze
- Persönlich, authentisch, nicht defensiv
- Signatur: "${params.tenantName}"
- Nur den Antworttext, kein JSON`
    return callAnthropic(prompt, 300)
  }

  if (params.context === 'profile_description') {
    prompt = `Du schreibst die Google Business Profile Kurzbeschreibung ("Über uns") für "${params.tenantName}" ${branchTag}.${loc}${voice}${kw}
Ton: ${tone}.
${modeBlock}

Anforderungen:
- Schweizer Hochdeutsch, 400–750 Zeichen (Google-Limit 750)
- Local SEO: Standort(e), Leistungen, Zielgruppe natürlich einbauen
- Erzählt die Geschichte/den Nutzen von ${businessNoun}, keine Aufzählung
- Kein Keyword-Stuffing, keine erfundenen Fakten (Gründungsjahr, Preise etc.)
- Nur den Beschreibungstext, kein JSON`
    return callAnthropic(prompt, 500)
  }

  if (params.context === 'photo_caption') {
    const hasImage = !!params.imageBase64
    prompt = `Du schreibst eine Google Business Profile Foto-Beschreibung für "${params.tenantName}" ${branchTag}.${loc}${voice}${kw}
Ton: ${tone}.
${hasImage ? '\nDir liegt das Foto als Bild bei. Erkenne zuerst klar das Motiv (Fahrzeug, Ort, Personen, Innen/Aussen, Situation) und schreibe die Caption DANACH passend dazu — nicht generisch.' : '\nKein Bild übermittelt — nutze Stichworte und Standort.'}
${modeBlock}

Anforderungen:
- ${HOCHDEUTSCH_RULE}
- 80–220 Zeichen
- Beschreibe konkret, was auf dem Foto zu sehen ist (Marke/Modell nur wenn klar erkennbar; nichts erfinden)
- Local SEO: Ort und Leistung natürlich einbauen, passend zum Motiv
- Kein Hashtag-Spam
- Nur den Beschreibungstext`
    return callAnthropic(
      prompt,
      200,
      hasImage && params.imageBase64
        ? {
            base64: params.imageBase64,
            mediaType: (params.imageMediaType || 'image/jpeg') as AnthropicImageMediaType,
          }
        : null,
    )
  }

  // post
  prompt = `Du schreibst einen Google Business Profile Post für "${params.tenantName}" ${branchTag}.${loc}${voice}${kw}
Ton: ${tone}.
${modeBlock}

Anforderungen:
- Schweizer Hochdeutsch, 400–900 Zeichen
- Local SEO: Orte, Leistungen, Zielgruppe (${clientsPlural}) natürlich einbauen
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
  businessNoun?: string
  locationTitle?: string | null
  categoryName?: string | null
  existingServiceNames?: string[]
  keywords?: string[]
  brandVoice?: string | null
}): Promise<GbpServiceSuggestion[]> {
  const { getTerminologyDefaults } = await import('~/composables/useTerminology')
  const businessNoun = params.businessNoun || getTerminologyDefaults(null).businessNoun
  const existing = (params.existingServiceNames ?? []).filter(Boolean)
  const kw = (params.keywords ?? []).filter(Boolean)
  const voice = params.brandVoice ? `\nMarkenstimme: ${params.brandVoice}` : ''
  const loc = params.locationTitle ? `\nStandort: ${params.locationTitle}` : ''
  const cat = params.categoryName ? `\nGoogle-Kategorie: ${params.categoryName}` : ''
  const kwLine = kw.length ? `\nStichworte, die zum Angebot passen könnten: ${kw.join(', ')}` : ''
  const existingLine = existing.length
    ? `\nBereits vorhandene Leistungen (NICHT wiederholen): ${existing.join(', ')}`
    : ''

  const prompt = `Du erstellst eine Liste von Leistungen für das Google Business Profile von "${params.tenantName}" (${businessNoun} Schweiz).${loc}${cat}${voice}${kwLine}${existingLine}

Schlage 6–10 konkrete, realistische Leistungen eines Schweizer ${businessNoun}-Betriebs vor. Erfinde keine Leistungen, die offensichtlich nicht zur Branche passen.

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
  businessNoun?: string
  reviewerName?: string | null
  starRating: number
  reviewText?: string | null
  brandVoice?: string | null
}): Promise<string> {
  const { getTerminologyDefaults } = await import('~/composables/useTerminology')
  const businessNoun = params.businessNoun || getTerminologyDefaults(null).businessNoun
  const apiKey = requireAnthropicApiKey()
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const stars = params.starRating
  const tone = stars >= 4 ? 'dankend und herzlich' : stars === 3 ? 'verständnisvoll und lösungsorientiert' : 'entschuldigend und konstruktiv'
  const voice = params.brandVoice ? `\nMarkenstimme: ${params.brandVoice}` : ''

  const prompt = `Du bist der Inhaber von "${params.tenantName}", einem ${businessNoun}-Betrieb in der Schweiz.${voice}
Antworte auf folgende Google-Bewertung professionell.

Bewertung von ${params.reviewerName || 'einem Kunden'} (${stars}/5 Sterne):
"${params.reviewText || '(Kein Kommentar)'}"

Schreibe eine kurze, ${tone}e Antwort (max. 3 Sätze).
Regeln:
- ${HOCHDEUTSCH_RULE}
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
  businessNoun?: string
  clientsPlural?: string
  locationTitle?: string | null
  keywords?: string[]
  brandVoice?: string | null
  ctaType?: string | null
}): Promise<string> {
  const { getTerminologyDefaults } = await import('~/composables/useTerminology')
  const defaults = getTerminologyDefaults(null)
  const businessNoun = params.businessNoun || defaults.businessNoun
  const clientsPlural = params.clientsPlural || defaults.clientsPlural
  const apiKey = requireAnthropicApiKey()
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const keywords = (params.keywords ?? []).filter(Boolean)
  const voice = params.brandVoice ? `\nMarkenstimme: ${params.brandVoice}` : ''
  const kw = keywords.length ? `\nKeywords natürlich einbauen (nicht spammen): ${keywords.join(', ')}` : ''
  const loc = params.locationTitle ? `\nStandort: ${params.locationTitle}` : ''

  const prompt = `Du schreibst einen Google Business Profile Post für "${params.tenantName}" (${businessNoun} Schweiz).${loc}${voice}${kw}

Anforderungen:
- Schweizer Hochdeutsch
- 400–900 Zeichen
- 1 klarer Nutzen für ${clientsPlural}
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

/**
 * SEO photo caption from an uploaded image buffer (sharp → vision → Anthropic).
 * Used by pool upload auto-caption so each file gets its own description.
 */
export async function generateGbpPhotoCaptionFromBuffer(params: {
  tenantId: string
  locationId?: string | null
  imageBuffer: Buffer
  draftText?: string | null
  tone?: GbpAiTextTone
}): Promise<string> {
  const sharp = (await import('sharp')).default
  const jpeg = await sharp(params.imageBuffer, { animated: false, failOn: 'none' })
    .rotate()
    .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 75, mozjpeg: true })
    .toBuffer()

  const imageBase64 = jpeg.toString('base64')
  if (imageBase64.length > 2_000_000) {
    throw createError({
      statusCode: 413,
      statusMessage: 'Bild zu gross für KI-Analyse — bitte kleineres Foto wählen',
    })
  }

  const { getSupabaseAdmin } = await import('~/server/utils/supabase-admin')
  const { getGbpAutomationSettings, resolveGbpLocation } = await import('~/server/utils/gbp')
  const supabase = getSupabaseAdmin()

  let locationTitle: string | null = null
  let settings = await getGbpAutomationSettings(params.tenantId, null)
  if (params.locationId) {
    const loc = await resolveGbpLocation(params.tenantId, params.locationId)
    locationTitle = loc.title
    settings = await getGbpAutomationSettings(params.tenantId, loc.id)
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, business_type')
    .eq('id', params.tenantId)
    .single()

  const { getTerminologyDefaults } = await import('~/composables/useTerminology')
  const terms = getTerminologyDefaults(tenant?.business_type)

  return generateGbpAiText({
    context: 'photo_caption',
    tenantName: tenant?.name || terms.businessNoun,
    businessNoun: terms.businessNoun,
    clientsPlural: terms.clientsPlural,
    clientSingular: terms.client,
    appointmentSingular: terms.appointment,
    locationTitle,
    brandVoice: settings.brand_voice,
    keywords: settings.keywords ?? [],
    draftText: params.draftText,
    tone: params.tone || 'local_friendly',
    mode: 'generate',
    ctaType: settings.default_cta_type,
    imageBase64,
    imageMediaType: 'image/jpeg',
  })
}
