/** Rewrite baked landing copy between Sie and Du. Phrase rules first, then pronouns. */

type Formal = 'du' | 'sie'

const SIE_PHRASES: Array<[RegExp, string]> = [
  [/\bBuchen Sie Ihre\b/g, 'Buche deine'],
  [/\bBuchen Sie Ihren\b/g, 'Buche deinen'],
  [/\bBuchen Sie Ihr\b/g, 'Buche dein'],
  [/\bBuchen Sie\b/g, 'Buche'],
  [/\bbuchen Sie\b/g, 'buche'],
  [/\bWählen Sie\b/g, 'Wähle'],
  [/\bwählen Sie Zeit und Ort und buchen\b/g, 'wählst du Zeit und Ort und buchst'],
  [/\bwählen Sie\b/g, 'wähle'],
  [/\bSehen Sie\b/g, 'Siehst du'],
  [/\bsehen Sie\b/g, 'siehst du'],
  [/\bKönnen Sie\b/g, 'Kannst du'],
  [/\bkönnen Sie\b/g, 'kannst du'],
  [/\bBenötigen Sie\b/g, 'Brauchst du'],
  [/\bbenötigen Sie\b/g, 'brauchst du'],
  [/\bBeantragen Sie\b/g, 'Beantrage'],
  [/\bbeantragen Sie\b/g, 'beantragst du'],
  [/\bLernen Sie\b/g, 'Lerne'],
  [/\blernen Sie\b/g, 'lerne'],
  [/\bWir begleiten Sie\b/g, 'Wir begleiten dich'],
  [/\bbegleitet Sie\b/g, 'begleitet dich'],
  [/\bbegleiten Sie\b/g, 'begleiten dich'],
  [/\bbringt Sie\b/g, 'bringt dich'],
  [/\bberaten Sie\b/g, 'beraten dich'],
  [/\bbestätigt Ihren\b/g, 'bestätigt deinen'],
  [/\bbestätigt Ihre\b/g, 'bestätigt deine'],
  [/\bSo einfach geht es\b/g, 'So einfach geht’s'],
  [/\bIhr Team vor Ort\b/g, 'Dein Team vor Ort'],
  [/\bBereit für Ihre\b/g, 'Bereit für deine'],
  [/\bBuchen Sie online\b/g, 'Buche online'],
]

const DU_PHRASES: Array<[RegExp, string]> = [
  [/\bBuche deine\b/g, 'Buchen Sie Ihre'],
  [/\bBuche deinen\b/g, 'Buchen Sie Ihren'],
  [/\bBuche dein\b/g, 'Buchen Sie Ihr'],
  [/\bBuche online\b/g, 'Buchen Sie online'],
  [/\bBuche\b/g, 'Buchen Sie'],
  [/\bbuche\b/g, 'buchen Sie'],
  [/\bWähle\b/g, 'Wählen Sie'],
  [/\bwählst du Zeit und Ort und buchst\b/g, 'wählen Sie Zeit und Ort und buchen'],
  [/\bwähle\b/g, 'wählen Sie'],
  [/\bSiehst du\b/g, 'Sehen Sie'],
  [/\bsiehst du\b/g, 'sehen Sie'],
  [/\bKannst du\b/g, 'Können Sie'],
  [/\bkannst du\b/g, 'können Sie'],
  [/\bBrauchst du\b/g, 'Benötigen Sie'],
  [/\bbrauchst du\b/g, 'benötigen Sie'],
  [/\bBeantrage\b/g, 'Beantragen Sie'],
  [/\bbeantragst du\b/g, 'beantragen Sie'],
  [/\bLerne\b/g, 'Lernen Sie'],
  [/\blerne\b/g, 'lernen Sie'],
  [/\bWir begleiten dich\b/g, 'Wir begleiten Sie'],
  [/\bbegleitet dich\b/g, 'begleitet Sie'],
  [/\bbegleiten dich\b/g, 'begleiten Sie'],
  [/\bbringt dich\b/g, 'bringt Sie'],
  [/\bberaten dich\b/g, 'beraten Sie'],
  [/\bbestätigt deinen\b/g, 'bestätigt Ihren'],
  [/\bbestätigt deine\b/g, 'bestätigt Ihre'],
  [/\bSo einfach geht’s\b/g, 'So einfach geht es'],
  [/\bSo einfach gehts\b/g, 'So einfach geht es'],
  [/\bDein Team vor Ort\b/g, 'Ihr Team vor Ort'],
  [/\bBereit für deine\b/g, 'Bereit für Ihre'],
  [/\bDu buchst\b/g, 'Sie buchen'],
  [/\bdu buchst\b/g, 'Sie buchen'],
]

function applyPairs(text: string, pairs: Array<[RegExp, string]>) {
  let out = text
  for (const [re, to] of pairs) out = out.replace(re, to)
  return out
}

function siePronounsToDu(text: string) {
  return text
    .replace(/\bIhren\b/g, 'deinen')
    .replace(/\bIhrem\b/g, 'deinem')
    .replace(/\bIhres\b/g, 'deines')
    .replace(/\bIhrer\b/g, 'deiner')
    .replace(/\bIhre\b/g, 'deine')
    .replace(/\bIhr\b/g, 'dein')
    .replace(/\bIhnen\b/g, 'dir')
    .replace(/\bdass Sie\b/g, 'dass du')
    .replace(/\bwenn Sie\b/g, 'wenn du')
    .replace(/\bob Sie\b/g, 'ob du')
    .replace(/\bdie Sie\b/g, 'die du')
    .replace(/\bSie\b/g, 'du')
}

function duPronounsToSie(text: string) {
  return text
    .replace(/\bdeinen\b/g, 'Ihren')
    .replace(/\bDeinen\b/g, 'Ihren')
    .replace(/\bdeinem\b/g, 'Ihrem')
    .replace(/\bDeinem\b/g, 'Ihrem')
    .replace(/\bdeines\b/g, 'Ihres')
    .replace(/\bDeines\b/g, 'Ihres')
    .replace(/\bdeiner\b/g, 'Ihrer')
    .replace(/\bDeiner\b/g, 'Ihrer')
    .replace(/\bdeine\b/g, 'Ihre')
    .replace(/\bDeine\b/g, 'Ihre')
    .replace(/\bdein\b/g, 'Ihr')
    .replace(/\bDein\b/g, 'Ihr')
    .replace(/\bdir\b/g, 'Ihnen')
    .replace(/\bDir\b/g, 'Ihnen')
    .replace(/\bdich\b/g, 'Sie')
    .replace(/\bDich\b/g, 'Sie')
    .replace(/\bdass du\b/g, 'dass Sie')
    .replace(/\bwenn du\b/g, 'wenn Sie')
    .replace(/\bob du\b/g, 'ob Sie')
    .replace(/\bdie du\b/g, 'die Sie')
    .replace(/\bDu\b/g, 'Sie')
    .replace(/\bdu\b/g, 'Sie')
}

export function rewriteGermanFormal(text: string, target: Formal): string {
  const src = String(text || '')
  if (!src.trim()) return src
  if (target === 'du') return siePronounsToDu(applyPairs(src, SIE_PHRASES))
  return duPronounsToSie(applyPairs(src, DU_PHRASES))
}

function rewriteDeep(value: unknown, target: Formal): unknown {
  if (typeof value === 'string') return rewriteGermanFormal(value, target)
  if (Array.isArray(value)) return value.map((v) => rewriteDeep(v, target))
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'formal_address' || k === 'id' || k === 'url' || k.endsWith('_url') || k.endsWith('_href')) {
        out[k] = v
        continue
      }
      out[k] = rewriteDeep(v, target)
    }
    return out
  }
  return value
}

/** Rewrite customer-facing landing strings to the chosen Anrede. */
export function applyFormalToLanding<T extends { brand?: any; seo?: any; blocks?: any[] }>(
  payload: T,
  target: Formal,
): T {
  const next = JSON.parse(JSON.stringify(payload)) as T
  if (next.brand) next.brand.formal_address = target
  if (next.seo?.description) {
    next.seo.description = rewriteGermanFormal(String(next.seo.description), target)
  }
  if (Array.isArray(next.blocks)) {
    next.blocks = next.blocks.map((block) => {
      if (!block?.content) return block
      const type = block.type
      if (!['hero', 'cta', 'process', 'faq', 'services', 'contact', 'team'].includes(type)) {
        return block
      }
      return { ...block, content: rewriteDeep(block.content, target) }
    })
  }
  return next
}
