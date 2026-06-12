/**
 * Meta Ads — KI-generierte Ad Copy
 *
 * Generiert Headlines, Primärtexte und Beschreibungen optimiert für Meta Ads
 * basierend auf Produkt, Zielgruppe und bestehenden Top-Performern.
 *
 * POST /api/admin/meta-ads-copy
 * Body: { product: 'auto' | 'anhaenger' | 'lkw' | 'retargeting', context?: string }
 */

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const PRODUCT_CONTEXT: Record<string, string> = {
  auto: `Produkt: Führerschein Kat. B (Automatik & Schaltung)
Standorte: Zürich Altstetten (Baslerstrasse 145) & Lachen SZ
Zielgruppe: 17–30 Jahre, Junglenker in Zürich
USPs: Online buchen & sofort bestätigt, faire Preise (ab CHF 95/Lektion), 4.9 Sterne Bewertung, über 500 Fahrschüler, flexible Termine
Conversion-Ziel: Booking auf drivingteam.ch`,

  anhaenger: `Produkt: Anhängerkurs Kat. BE (Wohnwagen, Pferdeanhänger, Bootsanhänger, Trailer)
Standorte: Zürich Altstetten & Lachen SZ
Zielgruppe: 25–55 Jahre, Autobesitzer / Freizeitfahrer
USPs: Praktische Prüfung direkt ab Kurs möglich, Kurs an einem Tag, beide Standorte, online buchbar
Conversion-Ziel: Kursanmeldung auf drivingteam.ch`,

  lkw: `Produkt: Lastwagen-Führerschein Kat. C, C1, CE
Standorte: Lachen SZ (Hauptfokus), Zürich Altstetten
Zielgruppe: 21–55 Jahre, Transport-/Logistikberufe, Quereinsteiger
USPs: Zertifizierte Ausbildung, Theorie & Praxis kombiniert, flexible Termine, Berufsausbildung Chauffeur möglich
Conversion-Ziel: Anfrage / Buchung auf drivingteam.ch`,

  retargeting: `Produkt: Retargeting — alle Fahrausbildungen (B, BE, C/CE)
Standorte: Zürich Altstetten & Lachen SZ
Zielgruppe: Website-Besucher der letzten 30 Tage, 17–55 Jahre
Kontext: Person war bereits interessiert, hat aber noch nicht gebucht
USPs: Einfaches Online-Booking, flexible Termine, top Bewertungen, lokale Fahrschule
Conversion-Ziel: Zurückgewinnung → Booking auf drivingteam.ch`,
}

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event) as { product: string; context?: string }
  const { product = 'auto', context } = body

  const productInfo = PRODUCT_CONTEXT[product] ?? PRODUCT_CONTEXT.auto

  const prompt = `Du bist ein Direct-Response-Copywriter, spezialisiert auf Meta (Facebook/Instagram) Ads für lokale Schweizer Dienstleistungen.

${productInfo}
${context ? `\nZusatzkontext vom Nutzer: "${context}"` : ''}

Erstelle hochkonvertierende Meta Ad Copy. Meta-spezifische Regeln:
- Headlines: max. 40 Zeichen — kurz, direkt, benefit-focused
- Primärtexte: max. 125 Zeichen für Mobile-Truncation — Hook zuerst
- Beschreibungen: max. 30 Zeichen — ergänzend zur Headline

Psychologische Trigger nutzen: FOMO, Social Proof, Convenience, Lokalität, Preis-Transparenz.
Sprache: Schweizer Hochdeutsch, direkt, keine leeren Floskeln.

Antworte NUR als gültiges JSON:
{
  "headlines": [
    { "text": "...", "chars": 0, "angle": "benefit/social-proof/urgency/price/local" }
  ],
  "primaryTexts": [
    { "text": "...", "chars": 0, "hook": "Kurze Beschreibung des Hooks" }
  ],
  "descriptions": [
    { "text": "...", "chars": 0 }
  ],
  "tips": ["Tipp 1", "Tipp 2"]
}

Gib aus: 6 Headlines, 5 Primärtexte, 4 Beschreibungen, 2 Performance-Tipps.`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const parsed = JSON.parse(jsonMatch[0])

    const addChars = (arr: any[]) => arr.map((item: any) => ({
      ...item,
      chars: item.text?.length ?? 0,
    }))

    return {
      success: true,
      headlines: addChars(parsed.headlines ?? []),
      primaryTexts: addChars(parsed.primaryTexts ?? []),
      descriptions: addChars(parsed.descriptions ?? []),
      tips: parsed.tips ?? [],
      tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
    }
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'Failed to parse AI response' })
  }
})
