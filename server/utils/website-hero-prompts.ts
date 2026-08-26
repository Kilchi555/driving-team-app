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
  dog_training: [
    'dog trainer teaching puppy outdoor class',
    'dog obedience training park natural light',
    'professional dog school handler and dog',
  ],
  massage: [
    'professional massage therapy treatment room',
    'wellness massage hands calm spa light',
    'massage clinic peaceful treatment table',
  ],
  default: [
    'professional service appointment modern office',
    'friendly local business customer service',
    'small business storefront warm daylight',
  ],
}

/** Optional chips the admin can tap — still industry-specific, not generic stock. */
const INDUSTRY_CHIPS: Record<string, Array<{ label: string; hint: string }>> = {
  driving_school: [
    { label: 'Auto', hint: 'driving lesson car instructor student Switzerland' },
    { label: 'Motorrad', hint: 'motorcycle riding lesson instructor Switzerland' },
    { label: 'LKW', hint: 'truck driving school lesson Switzerland' },
  ],
  tutoring: [
    { label: 'Nachhilfe', hint: 'private tutoring student desk books' },
    { label: 'Prüfung', hint: 'exam preparation student teacher desk' },
  ],
  music_school: [
    { label: 'Klavier', hint: 'piano lesson teacher student studio' },
    { label: 'Gitarre', hint: 'guitar lesson music teacher student' },
  ],
  therapy: [
    { label: 'Praxis', hint: 'calm therapy office natural light Switzerland' },
    { label: 'Gespräch', hint: 'counseling conversation warm room' },
  ],
  mental_coach: [
    { label: 'Coaching', hint: 'coaching conversation modern office' },
    { label: 'Workshop', hint: 'small workshop coaching group daylight' },
  ],
  consulting: [
    { label: 'Beratung', hint: 'business consulting meeting modern office' },
    { label: 'Workshop', hint: 'strategy workshop whiteboard natural light' },
  ],
  fitness: [
    { label: 'Studio', hint: 'personal training gym session' },
    { label: 'Outdoor', hint: 'outdoor personal training park Switzerland' },
  ],
  dog_training: [
    { label: 'Outdoor', hint: 'dog training outdoor class Switzerland' },
    { label: 'Welpen', hint: 'puppy training class indoor' },
  ],
  massage: [
    { label: 'Behandlung', hint: 'massage therapy treatment room' },
    { label: 'Wellness', hint: 'calm spa massage natural light' },
  ],
}

const OFFER_STOCK_QUERIES: Array<{ re: RegExp; query: string }> = [
  { re: /motorrad|motorcycle|\ba1\b|\ba2\b/, query: 'motorcycle riding lesson instructor helmet' },
  { re: /anhänger|anhaenger|\bbe\b|trailer/, query: 'car towing trailer driving road' },
  { re: /lastwagen|lkw|truck|\bc1\b|czv/, query: 'truck driving school lesson cab' },
  { re: /\bbus\b|fahrerlaubnis d/, query: 'bus driver training coach' },
  { re: /vku|verkehrskunde|theorie/, query: 'traffic theory classroom students teacher' },
  { re: /\bwab\b/, query: 'advanced driver training course' },
  { re: /nothelfer|first aid/, query: 'first aid training course classroom' },
  { re: /taxi/, query: 'taxi driver city street' },
  { re: /automatik|automatic/, query: 'automatic car driving lesson steering wheel' },
  { re: /autofahren|personenwagen|fahrlektion|kat(?:egorie)?\.?\s*b\b/, query: 'driving instructor teaching student in car' },
  { re: /preise|price/, query: 'transparent pricing desk consultation' },
  { re: /klavier|piano/, query: 'piano lesson teacher student studio' },
  { re: /gitarre|guitar/, query: 'guitar lesson music teacher student' },
  { re: /hund|welpe|dog|puppy/, query: 'dog trainer teaching puppy outdoor class' },
  { re: /massage|wellness/, query: 'professional massage therapy treatment room' },
  { re: /fitness|training|workout/, query: 'personal training gym natural light' },
]

/** English Unsplash query for a named offer / section. */
export function stockQueryForOffer(label: string, businessType?: string | null): string {
  const raw = String(label || '').trim()
  if (!raw) return (STOCK_QUERIES[businessKey(businessType)] || STOCK_QUERIES.default)[0]
  for (const item of OFFER_STOCK_QUERIES) {
    if (item.re.test(raw.toLowerCase())) return item.query
  }
  const industry = (STOCK_QUERIES[businessKey(businessType)] || STOCK_QUERIES.default)[0]
  return `${raw} ${industry}`.replace(/\s+/g, ' ').trim().slice(0, 90)
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

export function businessKey(businessType?: string | null): string {
  const t = (businessType || '').toLowerCase().trim()
  if (t && t in STOCK_QUERIES) return t
  if (t === 'coaching') return 'mental_coach'
  if (t.includes('driv') || t.includes('fahr')) return 'driving_school'
  if (t.includes('tutor') || t.includes('nachhilfe')) return 'tutoring'
  if (t.includes('music') || t.includes('musik')) return 'music_school'
  if (t.includes('therap')) return 'therapy'
  if (t.includes('mental') || t.includes('coach')) return 'mental_coach'
  if (t.includes('consult') || t.includes('berat')) return 'consulting'
  if (t.includes('fit') || t.includes('sport')) return 'fitness'
  if (t.includes('dog') || t.includes('hund')) return 'dog_training'
  if (t.includes('massag') || t.includes('wellness')) return 'massage'
  // Product default in this app
  if (!t) return 'driving_school'
  return 'default'
}

export function heroIndustryLabel(businessType?: string | null): string {
  switch (businessKey(businessType)) {
    case 'driving_school':
      return 'Fahrschulen'
    case 'tutoring':
      return 'Nachhilfe'
    case 'music_school':
      return 'Musikschulen'
    case 'therapy':
      return 'Therapien'
    case 'mental_coach':
      return 'Coaching'
    case 'consulting':
      return 'Consulting'
    case 'fitness':
      return 'Personal Training'
    case 'dog_training':
      return 'Hundeschulen'
    case 'massage':
      return 'Massage'
    default:
      return 'deine Branche'
  }
}

export function heroIndustryChips(businessType?: string | null): Array<{ label: string; hint: string }> {
  return INDUSTRY_CHIPS[businessKey(businessType)] || []
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
    case 'dog_training':
      return 'professional dog training class outdoors in Switzerland'
    case 'massage':
      return 'professional massage treatment in a calm Swiss practice'
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
  const offers = (ctx.categories || []).filter(Boolean).slice(0, 3).join(', ')

  return [
    `Photorealistic editorial photograph of ${subject}${location}.`,
    offers && !hint ? `The business offers: ${offers}. Show a scene that matches this industry, not a generic office.` : '',
    mood,
    '16:9 landscape composition suitable as a website hero banner.',
    'No text, no logos, no watermarks, no UI overlays, no people looking at camera awkwardly.',
    'Natural colors, high detail, professional photography.',
  ].filter(Boolean).join(' ')
}
