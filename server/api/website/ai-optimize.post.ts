// server/api/website/ai-optimize.post.ts
// Generate AI optimization suggestions using Claude

import Anthropic from '@anthropic-ai/sdk'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getTerminologyDefaults, type Terminology } from '~/composables/useTerminology'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'

const client = new Anthropic()

// Use latest Claude Haiku model for cost efficiency
// claude-haiku-4-5 is the current latest Haiku version (replacing deprecated 3.5)
const AI_MODEL = 'claude-haiku-4-5'

function industryKeywords(terms: Terminology, businessType: string, city?: string): string {
  const geo = city ? `"${terms.businessNoun} ${city}", "${terms.appointment} ${city}"` : `"${terms.businessNoun} Schweiz"`
  if (businessType === 'driving_school') {
    return `${geo}, "Fahrschule", "Fahrausbildung", "Lernfahrausweis", "${terms.appointment}", Automatik, Schaltung`
  }
  return `${geo}, "${terms.businessNoun}", "${terms.appointmentsPlural}", "${terms.staff}", Beratung`
}

function contentTypeRules(contentType: string, terms: Terminology, city?: string): string {
  const where = city ? ` in ${city}` : ''
  switch (contentType) {
    case 'bio':
      return `Content-type rules for BIO (website intro / about blurb):
- MUST be exactly 2–3 complete sentences (not 1, not a paragraph of 5+)
- Target length: 120–220 characters total
- Sentence 1: who you are + where (${terms.businessNoun}${where})
- Sentence 2: what ${terms.clientsPlural} get (offer, prices clarity, personal coaching)
- Sentence 3 (optional but preferred): soft CTA to book ${terms.appointmentsPlural} online
- Do NOT return a single short slogan sentence`
    case 'seo_title':
      return `Content-type rules for SEO TITLE:
- 35–60 characters
- Prefer pattern: "${terms.businessNoun}${city ? ` ${city}` : ''} | Markenname"`
    case 'seo_description':
      return `Content-type rules for META DESCRIPTION:
- 120–160 characters, one or two short sentences
- Include geo + offer + CTA`
    case 'keywords':
      return `Content-type rules for KEYWORDS:
- 5–8 comma-separated phrases, lowercase, local intent`
    case 'service_description':
      return `Content-type rules for SERVICE DESCRIPTION:
- 1–2 sentences, concrete benefit + what is included
- 60–160 characters`
    case 'testimonial':
      return `Content-type rules for TESTIMONIAL polish:
- Rewrite the customer's OWN words more clearly — do NOT invent facts, names, or praise
- Keep the meaning; 1–3 short sentences
- First person is OK if the original is first person
- Never fabricate a review from scratch`
    case 'headline':
      return `Content-type rules for H1 HEADLINE:
- 35–90 characters, one line
- Local + clear: "${terms.businessNoun}${where}" or offer + city
- No keyword stuffing, no invented superlatives`
    case 'cta_headline':
      return `Content-type rules for CTA HEADLINE:
- 20–80 characters
- Action + benefit, ${terms.bookAction}
- No exclamation-mark spam`
    case 'cta_sub':
      return `Content-type rules for CTA SUBLINE:
- 60–160 characters, 1–2 sentences
- Reduce friction (online, schnell, ohne Telefon)`
    case 'cta_button':
      return `Content-type rules for CTA BUTTON:
- 8–28 characters
- Verb first: ${terms.bookAction}, Jetzt buchen, Termin sichern
- No exclamation marks, no «hier klicken»`
    case 'faq_question':
      return `Content-type rules for FAQ QUESTION:
- 40–120 characters
- How customers actually search (also-asked)
- Include geo or ${terms.businessNoun} when natural`
    case 'faq_answer':
      return `Content-type rules for FAQ ANSWER:
- 80–280 characters, 1–3 sentences
- Direct answer first, then a soft next step
- No invented prices, hours, or legal claims`
    case 'trust_row':
      return `Content-type rules for TRUST ROW (3 cards under the H1):
- Return EXACTLY 3 lines, format: VALUE | LABEL
- VALUE ≤24 chars (number or short word: Online, 4.9★, CH, WhatsApp)
- LABEL ≤40 chars (short explanation)
- Do NOT invent star ratings or review counts unless they already appear in the current content
- Prefer real differentiators: booking, local/CH, WhatsApp, personal coaching`
    case 'brand_name':
      return `Content-type rules for BRAND / DISPLAY NAME:
- 2–40 characters, one line, no slogan, no punctuation spam
- Keep the REAL business identity — do not invent a new brand
- Variants only: drop GmbH/AG, tighten spelling, optional city, shorter website display name
- At least ONE suggestion MUST include the industry keyword «${terms.businessNoun}» if the current name does not already contain it (e.g. «${terms.businessNoun} Muster»)
- Do not invent extra keywords beyond «${terms.businessNoun}» and an optional city
- Swiss High German, no «beste ${terms.businessNoun}», no invented first names`
    default:
      return `Respect typical length for content type "${contentType}".`
  }
}

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const ip = getClientIP(event)
  const burst = await checkRateLimit(ip, 'website_ai_optimize_ip', 40, 60 * 60 * 1000)
  if (!burst.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Zu viele AI-Anfragen. Bitte später erneut versuchen.',
    })
  }

  const { content, content_type, optimization_type, formal_address } = await readBody(event)

  if (!content || content.length < 5) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Content must be at least 5 characters long'
    })
  }

  const formal = formal_address === 'du' ? 'du' : 'sie'

  const supabase = getSupabaseAdmin()

  const { data: userProfile } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('auth_user_id', authUser.id)
    .single()

  let businessType = 'driving_school'
  let tenantName = ''
  let tenantCity = ''
  let tenantAddress = ''
  if (userProfile?.tenant_id) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('business_type, name, invoice_city, address')
      .eq('id', userProfile.tenant_id)
      .single()
    if (tenant?.business_type) businessType = tenant.business_type
    tenantName = tenant?.name || ''
    tenantCity = tenant?.invoice_city || ''
    tenantAddress = tenant?.address || ''
  }

  const { buildLocalSeoDefaults, resolveWebsiteCity } = await import(
    '~/server/utils/website-local-seo'
  )
  const city = resolveWebsiteCity({ address: tenantAddress, invoice_city: tenantCity })
  const localSeo = buildLocalSeoDefaults({
    name: tenantName || content.slice(0, 40),
    business_type: businessType,
    city: city || null,
    address: tenantAddress || null,
    formal_address: formal,
  })
  const terms = getTerminologyDefaults(businessType)
  const prompt = buildOptimizationPrompt(
    content,
    content_type,
    optimization_type,
    terms,
    businessType,
    formal,
    {
      name: localSeo.name,
      city: localSeo.city,
      sampleTitle: localSeo.title,
      sampleDescription: localSeo.description,
      sampleHeadline: localSeo.headline,
      sampleBio: localSeo.bio,
    },
  )

  try {
    const message = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : ''
    let suggestions = parseAIResponse(responseText)

    if (!suggestions.length) {
      console.warn('AI optimize returned empty suggestions, using local fallbacks. Raw:', responseText.slice(0, 500))
      suggestions = buildLocalFallbacks(content_type, content, terms, formal, localSeo)
    }

    if (userProfile?.tenant_id) {
      const { data: websiteRow } = await supabase
        .from('website_tenants')
        .select('id')
        .eq('tenant_id', userProfile.tenant_id)
        .maybeSingle()

      if (websiteRow?.id) {
        const { error: historyError } = await supabase.from('website_ai_history').insert({
          website_id: websiteRow.id,
          content_type,
          original_content: content,
          ai_suggestions: suggestions,
          tokens_used: message.usage.input_tokens + message.usage.output_tokens,
          optimization_type,
        })
        if (historyError) {
          console.warn('website_ai_history insert failed:', historyError.message)
        }
      }
    }

    return {
      success: true,
      suggestions,
      tokens_used: message.usage.input_tokens + message.usage.output_tokens,
    }
  } catch (error: any) {
    console.error('Claude API error:', error)

    // Graceful fallback for API errors (no credits, rate limit, etc.)
    if (error.status === 400 || error.status === 429 || error.status === 503 || error.status === 401) {
      console.warn('⚠️ Claude API unavailable, using fallback suggestions')

      return {
        success: true,
        suggestions: buildLocalFallbacks(content_type, content, terms, formal, localSeo),
        tokens_used: 0,
        fallback: true,
        message: 'AI service temporarily unavailable. Showing local suggestions.',
      }
    }

    // Still prefer useful copy over a hard error for tenants
    return {
      success: true,
      suggestions: buildLocalFallbacks(content_type, content, terms, formal, localSeo),
      tokens_used: 0,
      fallback: true,
      message: error?.message || 'AI optimization failed',
    }
  }
})

function buildOptimizationPrompt(
  content: string,
  contentType: string,
  optimizationType: string,
  terms: Terminology,
  businessType: string,
  formal: 'sie' | 'du' = 'sie',
  local?: {
    name: string
    city: string
    sampleTitle: string
    sampleDescription: string
    sampleHeadline: string
    sampleBio?: string
  },
): string {
  const keywords = industryKeywords(terms, businessType, local?.city)
  const addressRule =
    formal === 'du'
      ? 'Always use "du" for informal address (du/dein/dir), not "Sie"'
      : 'Always use "Sie" for formal address, not "du"'
  const ctaAddress = formal === 'du' ? 'use du form' : 'use Sie form'
  const localBlock = local
    ? `Business context:
- Name: ${local.name}
- City / geo: ${local.city || 'Schweiz (city unknown)'}
- Example strong title: "${local.sampleTitle}"
- Example meta description: "${local.sampleDescription}"
- Example H1: "${local.sampleHeadline}"
- Example bio (2–3 sentences): "${local.sampleBio || ''}"`
    : ''
  const basePrompt = `You are a world-class local SEO copywriter for ${terms.businessNoun} businesses in Switzerland (Schweizer Hochdeutsch).

IMPORTANT INSTRUCTIONS:
- Write ONLY in Schweizer Hochdeutsch
- Use professional but friendly tone
- ${addressRule}
- Use branch terminology: business="${terms.businessNoun}", appointment="${terms.appointment}", client="${terms.client}", staff="${terms.staff}"
- Do NOT default to Fahrschule/Fahrstunde/Fahrlehrer unless the business type is driving_school
- Prefer LOCAL search intent (business + city) over SaaS jargon
- NEVER use phrases like "Online-Terminbuchung" as the main keyword — prefer "${terms.businessNoun}${local?.city ? ` ${local.city}` : ''}", "${terms.appointmentsPlural}", "${terms.bookAction}"
- Keep language simple and clear
- Write for potential ${terms.clientsPlural} searching Google near the business

${localBlock}

Current content to optimize:
<<<
${content}
>>>

Content type: ${contentType}
Optimization focus: ${optimizationType}

Generate EXACTLY 3 alternative versions of this content that are optimized for ${optimizationType}.

${contentTypeRules(contentType, terms, local?.city)}

${
  optimizationType === 'seo'
    ? `Include relevant local keywords customers actually search (e.g., ${keywords}).
Focus on:
- Local SEO: lead with service + city when geo is known; brand near the end for titles
- Clear Swiss High German, no fluff
- Match content_type length rules above
- Natural CTA without sounding like booking software`
    : ''
}

${
  optimizationType === 'conversion'
    ? `Make it more persuasive and action-oriented:
- Include unique value proposition
- Address customer pain points
- Strong call-to-action (${ctaAddress})
- Trust signals (experience, qualifications, success rate)
- Emotional benefits, not just features`
    : ''
}

${
  optimizationType === 'readability'
    ? `Make it easier to understand and scan:
- Shorter sentences (15-20 words max)
- Remove jargon
- Use active voice
- Break into logical sections
- Use power words and action verbs
- Keep Swiss German terminology consistent`
    : ''
}

For each version, provide:
1. The optimized text
2. A brief explanation (1-2 sentences) why it is better
3. An SEO effectiveness score from 1-10 (for SEO optimization) or conversion potential score (for conversion) or readability score (for readability)

Format your response ONLY as valid JSON (no markdown fences, no prose outside JSON):
{"suggestions":[{"suggestion":"...","reason":"...","score":8},{"suggestion":"...","reason":"...","score":8},{"suggestion":"...","reason":"...","score":8}]}`

  return basePrompt
}

function extractJsonObject(text: string): string | null {
  const cleaned = String(text || '')
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim()
  const start = cleaned.indexOf('{')
  if (start < 0) return null
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < cleaned.length; i++) {
    const c = cleaned[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return cleaned.slice(start, i + 1)
    }
  }
  return null
}

function parseAIResponse(response: string): any[] {
  try {
    const jsonRaw = extractJsonObject(response)
    if (!jsonRaw) {
      console.error('No JSON found in response:', response.slice(0, 400))
      return []
    }

    const parsed = JSON.parse(jsonRaw)
    const list = Array.isArray(parsed?.suggestions)
      ? parsed.suggestions
      : Array.isArray(parsed)
        ? parsed
        : []

    return list
      .map((s: any) => ({
        suggestion: String(s?.suggestion || s?.text || s?.content || s?.version || '').trim(),
        reason: String(s?.reason || s?.explanation || '').trim(),
        score: Number(s?.score) || 5,
      }))
      .filter((s: any) => s.suggestion.length >= 2)
  } catch (error) {
    console.error('Failed to parse AI response:', error)
    return []
  }
}

function buildLocalFallbacks(
  contentType: string,
  content: string,
  terms: Terminology,
  formal: 'sie' | 'du',
  localSeo: { name: string; city: string; title: string; description: string; keywords: string; bio: string },
) {
  const name = localSeo.name || 'Unser Betrieb'
  const city = localSeo.city
  const where = city ? ` in ${city}` : ''
  const du = formal === 'du'

  if (contentType === 'brand_name') {
    const quoted = content.match(/«([^»]+)»/)
    const raw = String(quoted?.[1] || name || content)
      .replace(/^Markenname[\s\S]*?:/i, '')
      .trim()
      .slice(0, 40)
    const cleaned = raw.replace(/\s+(GmbH|AG|Ltd\.?|LLC)\.?$/i, '').trim() || raw
    const withCity =
      city && !cleaned.toLowerCase().includes(city.toLowerCase())
        ? `${cleaned} ${city}`.slice(0, 40)
        : ''
    const words = cleaned.split(/\s+/).filter(Boolean)
    const shorter = words.length >= 3 ? words.slice(0, 2).join(' ') : ''
    const out: Array<{ suggestion: string; reason: string; score: number }> = []
    const add = (value: string, reason: string, score: number) => {
      const suggestion = value.trim().slice(0, 40)
      if (suggestion.length < 2 || out.some((row) => row.suggestion === suggestion)) return
      out.push({ suggestion, reason, score })
    }
    const industry = String(terms.businessNoun || '').trim()
    const genericIndustry = /^(unternehmen)$/i.test(industry)
    const hasIndustry = industry && cleaned.toLowerCase().includes(industry.toLowerCase())
    if (industry && !genericIndustry && !hasIndustry) {
      add(
        `${industry} ${cleaned}`.slice(0, 40),
        `Mit Branchen-Keyword «${industry}» — besser auffindbar.`,
        9,
      )
    }
    add(cleaned, 'Kurzer Anzeigename — ohne Rechtsform.', hasIndustry ? 9 : 8)
    add(withCity, 'Marke plus Ort, gut erkennbar lokal.', 8)
    add(shorter, 'Kürzer für Navigation und Logo-Text.', 7)
    add(raw, 'Nah am bisherigen Namen.', 7)
    return out.slice(0, 3)
  }

  if (contentType === 'bio') {
    const a = localSeo.bio
    const b = city
      ? `${name}${where} bietet professionelle ${terms.appointmentsPlural} mit klaren Preisen und persönlicher Begleitung. ${du ? 'Du buchst' : 'Sie buchen'} online in wenigen Klicks — inkl. Erinnerungen. ${du ? 'Starte' : 'Starten Sie'} flexibel, wann es ${du ? 'dir' : 'Ihnen'} passt.`
      : `${name} bietet professionelle ${terms.appointmentsPlural} mit klaren Preisen und persönlicher Begleitung. ${du ? 'Du buchst' : 'Sie buchen'} online in wenigen Klicks — inkl. Erinnerungen. ${du ? 'Starte' : 'Starten Sie'} flexibel, wann es ${du ? 'dir' : 'Ihnen'} passt.`
    const c = `${name}${where}: ${terms.appointmentsPlural} ohne Telefon-Hin und Her. Transparente Preise, ${du ? 'dein' : 'Ihr'} Tempo, klare nächste Schritte. ${terms.bookAction} — direkt auf dieser Seite.`
    return [
      { suggestion: a, reason: '2–3 Sätze mit Ort, Nutzen und Buchungs-CTA — ideal für den SEO-Score.', score: 9 },
      { suggestion: b, reason: 'Betont klare Preise und Online-Buchung.', score: 8 },
      { suggestion: c, reason: 'Kurz, lokal und handlungsorientiert.', score: 8 },
    ]
  }

  if (contentType === 'seo_title') {
    return [
      { suggestion: localSeo.title, reason: 'Local-SEO-Titel: Branche + Ort | Marke.', score: 9 },
      {
        suggestion: city ? `${name} | ${terms.businessNoun} ${city}` : `${name} | ${terms.businessNoun}`,
        reason: 'Marke zuerst, Ort als Verstärker.',
        score: 8,
      },
      {
        suggestion: city
          ? `${terms.appointmentsPlural} ${city} | ${name}`.slice(0, 60)
          : `${terms.appointmentsPlural} | ${name}`.slice(0, 60),
        reason: 'Suchintent auf Angebot + Ort.',
        score: 7,
      },
    ]
  }

  if (contentType === 'seo_description') {
    return [
      { suggestion: localSeo.description, reason: 'Meta mit Ort, Angebot und CTA.', score: 9 },
      {
        suggestion: `${name}${where}: ${terms.appointmentsPlural} mit klaren Preisen. ${terms.bookAction} online.`.slice(0, 160),
        reason: 'Kompakt und buchungsstark.',
        score: 8,
      },
      {
        suggestion: `Professionelle ${terms.appointmentsPlural}${where} bei ${name}. Transparent, lokal, online buchbar.`.slice(0, 160),
        reason: 'Vertrauens- und Ortsfokus.',
        score: 7,
      },
    ]
  }

  if (contentType === 'keywords') {
    return [
      { suggestion: localSeo.keywords, reason: 'Lokale Keywords inkl. Marke und Ort.', score: 9 },
      {
        suggestion: [terms.businessNoun, city, terms.appointmentsPlural, name, terms.bookAction, 'schweiz']
          .filter(Boolean)
          .map((s) => String(s).toLowerCase())
          .join(', '),
        reason: 'Kern-Keywords für Local SEO.',
        score: 8,
      },
      {
        suggestion: localSeo.keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean)
          .slice(0, 5)
          .join(', '),
        reason: 'Fokussierte Top-5-Keywords.',
        score: 7,
      },
    ]
  }

  if (contentType === 'service_description') {
    const seed = content.replace(/^Erstelle[\s\S]*«([^»]+)»[\s\S]*$/, '$1').trim() || terms.appointment
    return [
      {
        suggestion: `${seed}: praxisnah, klar erklärt und auf ${du ? 'dein' : 'Ihr'} Tempo abgestimmt. Preise transparent — online buchbar.`,
        reason: 'Nutzen + Transparenz + CTA.',
        score: 8,
      },
      {
        suggestion: `Ideal für ${du ? 'dich' : 'Sie'}, wenn ${du ? 'du' : 'Sie'} ${seed} zuverlässig und ohne Stress ${du ? 'willst' : 'wollen'}.`,
        reason: 'Kundenorientiert und konkret.',
        score: 7,
      },
      {
        suggestion: `${seed} bei ${name}${where} — klare Abläufe, moderne Buchung, persönliche Begleitung.`,
        reason: 'Lokal und vertrauensbildend.',
        score: 7,
      },
    ]
  }

  if (contentType === 'headline') {
    const h = city
      ? `${terms.businessNoun} ${city} — ${terms.appointmentsPlural}`.slice(0, 90)
      : `${name} — ${terms.appointmentsPlural}`.slice(0, 90)
    return [
      { suggestion: h, reason: 'Lokal und klar als H1.', score: 9 },
      { suggestion: h, reason: 'Branche + Ort, ohne Füllwörter.', score: 8 },
      { suggestion: `${name}${where}`.slice(0, 90), reason: 'Marke + Ort, kurz.', score: 7 },
    ]
  }

  if (contentType === 'cta_headline') {
    return [
      { suggestion: du ? `Jetzt ${terms.appointment} buchen` : `Jetzt ${terms.appointment} buchen`, reason: 'Direkter Buchungs-CTA.', score: 8 },
      { suggestion: du ? `Sichere dir den nächsten Termin` : `Sichern Sie sich den nächsten Termin`, reason: 'Leicht dringlicher.', score: 7 },
      { suggestion: `${terms.bookAction}${where}`.slice(0, 80), reason: 'Lokal + Handlung.', score: 7 },
    ]
  }

  if (contentType === 'cta_button') {
    return [
      { suggestion: terms.bookAction.slice(0, 32) || 'Jetzt buchen', reason: 'Klare Handlung.', score: 9 },
      { suggestion: 'Jetzt buchen', reason: 'Kurz und üblich.', score: 8 },
      { suggestion: du ? 'Termin sichern' : 'Termin sichern', reason: 'Etwas weicher.', score: 7 },
    ]
  }

  if (contentType === 'cta_sub') {
    return [
      {
        suggestion: du
          ? `Wähle Zeit und ${terms.staff} online — ohne Telefon-Hin und Her.`
          : `Wählen Sie Zeit und ${terms.staff} online — ohne Telefon-Hin und Her.`,
        reason: 'Nimmt Reibung weg.',
        score: 8,
      },
      {
        suggestion: `Transparente Preise, klare nächste Schritte. ${terms.bookAction}.`.slice(0, 160),
        reason: 'Vertrauen + CTA.',
        score: 7,
      },
      {
        suggestion: du
          ? `In unter einer Minute gebucht — Erinnerung per SMS.`
          : `In unter einer Minute gebucht — Erinnerung per SMS.`,
        reason: 'Schnell und konkret.',
        score: 7,
      },
    ]
  }

  if (contentType === 'faq_question') {
    return [
      { suggestion: city ? `Was kostet eine ${terms.appointment} in ${city}?` : `Was kostet eine ${terms.appointment}?`, reason: 'Preis-Intent, oft gesucht.', score: 8 },
      { suggestion: `Kann ich ${terms.appointmentsPlural} online buchen?`, reason: 'Buchungsfrage.', score: 8 },
      { suggestion: city ? `Wie finde ich eine ${terms.businessNoun} in ${city}?` : `Wie starte ich bei ${name}?`, reason: 'Einstiegsfrage.', score: 7 },
    ]
  }

  if (contentType === 'faq_answer') {
    return [
      {
        suggestion: `${name}${where} zeigt Preise transparent auf der Website. ${du ? 'Du buchst' : 'Sie buchen'} online — ohne Telefon.`,
        reason: 'Antwort zuerst, dann nächster Schritt.',
        score: 8,
      },
      {
        suggestion: `Ja — ${terms.appointmentsPlural} sind online buchbar. ${du ? 'Wähle' : 'Wählen Sie'} Zeit und ${terms.staff} direkt hier.`,
        reason: 'Kurz und handlungsorientiert.',
        score: 7,
      },
      {
        suggestion: `Am einfachsten: Angebot anschauen und den nächsten Termin online sichern. Fragen gehen per WhatsApp.`,
        reason: 'Reibungsarm.',
        score: 7,
      },
    ]
  }

  if (contentType === 'trust_row') {
    const rows = [
      'Online | Jederzeit buchbar\nCH | Schweiz\nWhatsApp | Direkt schreiben',
      city
        ? `Lokal | ${city}\nOnline | Ohne Telefon\nKlar | Transparente Preise`
        : `Online | Ohne Telefon\nKlar | Transparente Preise\nPersönlich | ${terms.staff} bleibt`,
      `SMS | Erinnerungen\nCH | Schweiz\nOnline | ${terms.bookAction}`,
    ]
    return [
      { suggestion: rows[0], reason: 'Buchung, Herkunft, Kontakt — ohne erfundene Sterne.', score: 9 },
      { suggestion: rows[1], reason: 'Lokal und transparent.', score: 8 },
      { suggestion: rows[2], reason: 'Erinnerung + Handlung.', score: 7 },
    ]
  }

  if (contentType === 'testimonial') {
    const raw = content.replace(/^Erstelle[\s\S]*$/i, '').trim() || content
    const polished = raw.length > 280 ? raw.slice(0, 280) : raw
    return [
      { suggestion: polished, reason: 'Klarer formuliert — Inhalt unverändert (kein Fake).', score: 8 },
      { suggestion: polished, reason: 'Leicht geglättet für die Website.', score: 7 },
      { suggestion: polished, reason: 'Originalnah belassen.', score: 6 },
    ]
  }

  // Generic: try to expand short copy
  const base = content.length > 220 ? content.slice(0, 220) : content
  return [
    { suggestion: localSeo.bio, reason: 'Lokaler Standardtext als Ausgangspunkt.', score: 7 },
    { suggestion: localSeo.description, reason: 'SEO-Meta als Alternative.', score: 6 },
    { suggestion: base, reason: 'Bisheriger Text (leicht gekürzt).', score: 5 },
  ]
}
