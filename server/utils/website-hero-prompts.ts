/**
 * Build Unsplash queries + AI image prompts from tenant context.
 * Admin does not need to type anything — optional hint overrides.
 */

export type HeroImageSource = 'own' | 'stock' | 'ai'

export type HeroPromptContext = {
  business_type?: string | null
  name?: string | null
  city?: string | null
  address?: string | null
  categories?: string[] | null
  hint?: string | null
}

/** English Unsplash queries per business type — keep subject nouns first. */
const STOCK_QUERIES: Record<string, string[]> = {
  driving_school: [
    'driving instructor teaching student in car',
    'learner driver hands on steering wheel',
    'driving school lesson car dashboard road',
  ],
  tutoring: [
    'tutoring student desk books natural light',
    'teacher helping student homework calm',
    'study session modern classroom',
  ],
  music_school: [
    'piano lesson music teacher student',
    'guitar practice warm natural light',
    'music school studio instruments',
  ],
  therapy: [
    'calm therapy office soft natural light',
    'wellness consultation peaceful room',
    'professional counseling warm atmosphere',
  ],
  mental_coach: [
    'coaching conversation calm office natural light',
    'professional mentor meeting modern workspace',
    'one on one coaching session bright room',
  ],
  consulting: [
    'business consultation meeting modern office',
    'advisor client discussion natural light',
    'professional consulting workspace',
  ],
  fitness: [
    'personal training gym natural light',
    'fitness coaching workout session',
    'personal trainer client exercise',
  ],
  default: [
    'professional service appointment modern office',
    'friendly local business customer service',
    'small business storefront warm daylight',
  ],
}

/** Map noisy category labels to short English Unsplash keywords. */
function categoryStockHints(categories: string[] | null | undefined): string[] {
  const hints: string[] = []
  for (const raw of categories || []) {
    const c = raw.toLowerCase()
    if (/automatik|automatic/.test(c)) hints.push('automatic car')
    else if (/schaltung|manual|getriebe/.test(c)) hints.push('manual transmission car')
    else if (/\bmoto|\ba1\b|\ba2\b|\ba\b|motorcycle/.test(c)) hints.push('motorcycle riding')
    else if (/boot|motorboot|boat/.test(c)) hints.push('boat on water')
    else if (/\bbe\b|lastwagen|truck|lkw/.test(c)) hints.push('truck driving')
    else if (/\bbus\b|d\b|fahrer/.test(c) && /bus|d\b/.test(c)) hints.push('bus driver')
    // Skip generic "Kategorie B" — too vague for Unsplash
  }
  return [...new Set(hints)].slice(0, 2)
}

function extractCity(ctx: HeroPromptContext): string {
  if (ctx.city?.trim()) return ctx.city.trim()
  const addr = ctx.address || ''
  const m = addr.match(/\b\d{4}\s+([A-Za-zÄÖÜäöüÉéÈèÊêÂâÎîÔôÛûçÇ\-\s]+)\b/)
  if (m?.[1]) return m[1].trim().split(',')[0].trim()
  return ''
}

function businessKey(businessType?: string | null): string {
  const t = (businessType || '').toLowerCase().trim()
  if (t && t in STOCK_QUERIES) return t
  if (t.includes('driv') || t.includes('fahr')) return 'driving_school'
  if (t.includes('tutor') || t.includes('nachhilfe')) return 'tutoring'
  if (t.includes('music') || t.includes('musik')) return 'music_school'
  if (t.includes('therap')) return 'therapy'
  if (t.includes('mental') || t.includes('coach')) return 'mental_coach'
  if (t.includes('consult') || t.includes('berat')) return 'consulting'
  if (t.includes('fit') || t.includes('sport')) return 'fitness'
  // Product default in this app
  if (!t) return 'driving_school'
  return 'default'
}

function industryPhrase(businessType?: string | null): string {
  switch (businessKey(businessType)) {
    case 'driving_school':
      return 'Swiss driving school lesson, instructor and learner in a modern car'
    case 'tutoring':
      return 'private tutoring session with student and teacher at a desk'
    case 'music_school':
      return 'music lesson with instrument in a bright studio'
    case 'therapy':
      return 'calm professional consultation room in Switzerland'
    case 'mental_coach':
      return 'professional coaching conversation in a bright modern office'
    case 'consulting':
      return 'business consulting meeting in a modern Swiss office'
    case 'fitness':
      return 'personal fitness coaching session'
    default:
      return 'professional local service business in Switzerland'
  }
}

/** Unsplash search queries (up to 3 variants). */
export function buildStockQueries(ctx: HeroPromptContext): string[] {
  const hint = ctx.hint?.trim()
  if (hint) {
    return [hint, `${hint} lifestyle`, `${hint} natural light`]
  }
  const key = businessKey(ctx.business_type)
  const base = STOCK_QUERIES[key] || STOCK_QUERIES.default
  const catHints = categoryStockHints(ctx.categories)
  // City often pulls tourism landscapes on Unsplash — only append for non-driving
  // types where place context helps more than it hurts.
  const city = extractCity(ctx)
  const useCity = Boolean(city) && key !== 'driving_school'

  return base.map((q, i) => {
    const parts = [q]
    if (catHints[i]) parts.push(catHints[i])
    else if (catHints[0] && i === 1) parts.push(catHints[0])
    if (useCity && i === 0) parts.push(city)
    return parts.join(' ').replace(/\s+/g, ' ').trim()
  })
}

/** Single photorealistic AI prompt for OpenAI Images. */
export function buildAiHeroPrompt(ctx: HeroPromptContext, variantIndex = 0): string {
  const hint = ctx.hint?.trim()
  const city = extractCity(ctx)
  const location = city ? ` in ${city}, Switzerland` : ' in Switzerland'
  const moods = [
    'golden hour, authentic documentary photo',
    'bright overcast daylight, clean modern look',
    'warm afternoon light, shallow depth of field',
  ]
  const mood = moods[variantIndex % moods.length]
  const subject = hint || industryPhrase(ctx.business_type)

  return [
    `Photorealistic editorial photograph of ${subject}${location}.`,
    mood,
    '16:9 landscape composition suitable as a website hero banner.',
    'No text, no logos, no watermarks, no UI overlays, no people looking at camera awkwardly.',
    'Natural colors, high detail, professional photography.',
  ].join(' ')
}
