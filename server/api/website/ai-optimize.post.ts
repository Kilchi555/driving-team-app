// server/api/website/ai-optimize.post.ts
// Generate AI optimization suggestions using Claude

import Anthropic from '@anthropic-ai/sdk'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getTerminologyDefaults, type Terminology } from '~/composables/useTerminology'

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
      .select('business_type, name, city, address')
      .eq('id', userProfile.tenant_id)
      .single()
    if (tenant?.business_type) businessType = tenant.business_type
    tenantName = tenant?.name || ''
    tenantCity = tenant?.city || ''
    tenantAddress = tenant?.address || ''
  }

  const { buildLocalSeoDefaults, extractCityFromAddress } = await import(
    '~/server/utils/website-local-seo'
  )
  const city = extractCityFromAddress(tenantAddress, tenantCity)
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
      .filter((s: any) => s.suggestion.length >= 5)
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
