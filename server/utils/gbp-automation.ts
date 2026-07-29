import { createError } from 'h3'

/** Shared GBP helpers for P1 automation */

function requireAnthropicApiKey(): string {
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
