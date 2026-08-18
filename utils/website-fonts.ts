/**
 * Curated heading + body pairings for tenant websites.
 * Default (syne-manrope) is self-hosted; others load from Google Fonts.
 */

export type WebsiteFontPair = {
  id: string
  label: string
  hint: string
  display: string
  body: string
  /** Google css2 family specs, e.g. Inter:wght@400;600;700 */
  google?: string[]
}

export const DEFAULT_FONT_PAIR_ID = 'syne-manrope'

export const WEBSITE_FONT_PAIRS: readonly WebsiteFontPair[] = [
  { id: 'syne-manrope', label: 'Simy', hint: 'Standard — klar und eigen', display: 'Syne', body: 'Manrope' },
  { id: 'inter', label: 'Klar', hint: 'Die meistgenutzte UI-Schrift', display: 'Inter', body: 'Inter', google: ['Inter:wght@400;600;700;800'] },
  { id: 'source-sans', label: 'Sachlich', hint: 'Ruhig, gut lesbar, seriös', display: 'Source Sans 3', body: 'Source Sans 3', google: ['Source+Sans+3:wght@400;600;700;800'] },
  { id: 'ibm-plex', label: 'Swiss', hint: 'IBM Plex — nüchtern und präzise', display: 'IBM Plex Sans', body: 'IBM Plex Sans', google: ['IBM+Plex+Sans:wght@400;600;700'] },
  { id: 'plus-jakarta', label: 'Freundlich', hint: 'Modern, weich, einladend', display: 'Plus Jakarta Sans', body: 'Plus Jakarta Sans', google: ['Plus+Jakarta+Sans:wght@400;600;700;800'] },
  { id: 'outfit', label: 'Weich', hint: 'Geometrisch, rund, zeitlos', display: 'Outfit', body: 'Outfit', google: ['Outfit:wght@400;600;700;800'] },
  { id: 'figtree', label: 'Alltag', hint: 'Unaufgeregt und nahbar', display: 'Figtree', body: 'Figtree', google: ['Figtree:wght@400;600;700;800'] },
  { id: 'space-inter', label: 'Technisch', hint: 'Space Grotesk mit Inter', display: 'Space Grotesk', body: 'Inter', google: ['Space+Grotesk:wght@500;600;700', 'Inter:wght@400;600;700'] },
  { id: 'poppins-open', label: 'Beliebt', hint: 'Poppins + Open Sans', display: 'Poppins', body: 'Open Sans', google: ['Poppins:wght@500;600;700;800', 'Open+Sans:wght@400;600;700'] },
  { id: 'montserrat-source', label: 'Kraftvoll', hint: 'Stark in Überschriften', display: 'Montserrat', body: 'Source Sans 3', google: ['Montserrat:wght@600;700;800', 'Source+Sans+3:wght@400;600;700'] },
  { id: 'nunito', label: 'Warm', hint: 'Weiche Formen, zugänglich', display: 'Nunito', body: 'Nunito Sans', google: ['Nunito:wght@600;700;800', 'Nunito+Sans:wght@400;600;700'] },
  { id: 'playfair-source', label: 'Editorial', hint: 'Klassische Eleganz', display: 'Playfair Display', body: 'Source Sans 3', google: ['Playfair+Display:wght@600;700;800', 'Source+Sans+3:wght@400;600;700'] },
  { id: 'dm-serif', label: 'Magazin', hint: 'DM Serif mit DM Sans', display: 'DM Serif Display', body: 'DM Sans', google: ['DM+Serif+Display:wght@400', 'DM+Sans:wght@400;600;700'] },
  { id: 'fraunces-nunito', label: 'Charakter', hint: 'Ausdrucksstark, aber lesbar', display: 'Fraunces', body: 'Nunito Sans', google: ['Fraunces:wght@600;700', 'Nunito+Sans:wght@400;600;700'] },
  { id: 'cormorant-outfit', label: 'Elegant', hint: 'Fein, für Premium-Auftritt', display: 'Cormorant Garamond', body: 'Outfit', google: ['Cormorant+Garamond:wght@600;700', 'Outfit:wght@400;600;700'] },
  { id: 'newsreader-inter', label: 'Zeitung', hint: 'Editorial mit klarer UI', display: 'Newsreader', body: 'Inter', google: ['Newsreader:wght@500;600;700', 'Inter:wght@400;600;700'] },
  { id: 'lora-inter', label: 'Lesestark', hint: 'Für längere Texte', display: 'Lora', body: 'Inter', google: ['Lora:wght@500;600;700', 'Inter:wght@400;600;700'] },
  { id: 'instrument', label: 'Kultiviert', hint: 'Instrument Serif + Sans', display: 'Instrument Serif', body: 'Instrument Sans', google: ['Instrument+Serif:wght@400', 'Instrument+Sans:wght@400;600;700'] },
  { id: 'libre-baskerville', label: 'Klassisch', hint: 'Traditionell und vertrauenswürdig', display: 'Libre Baskerville', body: 'Source Sans 3', google: ['Libre+Baskerville:wght@400;700', 'Source+Sans+3:wght@400;600;700'] },
  { id: 'bricolage-source', label: 'Ausgefallen', hint: 'Bricolage mit ruhigem Text', display: 'Bricolage Grotesque', body: 'Source Sans 3', google: ['Bricolage+Grotesque:wght@600;700;800', 'Source+Sans+3:wght@400;600;700'] },
] as const

export function resolveWebsiteFontPair(id?: string | null): WebsiteFontPair {
  return WEBSITE_FONT_PAIRS.find((p) => p.id === id) || WEBSITE_FONT_PAIRS[0]
}

export function websiteFontGoogleHref(pair: WebsiteFontPair): string | null {
  if (!pair.google?.length) return null
  const q = pair.google.map((f) => `family=${f}`).join('&')
  return `https://fonts.googleapis.com/css2?${q}&display=swap`
}

export function websiteFontEditorHrefs(): string[] {
  const seen = new Set<string>()
  const families: string[] = []
  for (const pair of WEBSITE_FONT_PAIRS) {
    for (const spec of pair.google || []) {
      if (seen.has(spec)) continue
      seen.add(spec)
      families.push(spec)
    }
  }
  const chunks: string[][] = []
  for (let i = 0; i < families.length; i += 8) chunks.push(families.slice(i, i + 8))
  return chunks.map(
    (chunk) => `https://fonts.googleapis.com/css2?${chunk.map((f) => `family=${f}`).join('&')}&display=swap`,
  )
}

export function websiteFontCssVars(id?: string | null) {
  const pair = resolveWebsiteFontPair(id)
  return {
    '--lp-font-display': pair.display,
    '--lp-font-body': pair.body,
  }
}

export function websiteFontHeadLinks(id?: string | null) {
  const pair = resolveWebsiteFontPair(id)
  const links: Array<Record<string, string>> = []
  const google = websiteFontGoogleHref(pair)
  if (google) {
    links.push({ rel: 'preconnect', href: 'https://fonts.googleapis.com' })
    links.push({ rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' })
    links.push({ rel: 'stylesheet', href: google })
  }
  if (pair.display === 'Syne') {
    links.push({
      rel: 'preload',
      href: '/fonts/website/syne-latin.woff2',
      as: 'font',
      type: 'font/woff2',
      crossorigin: 'anonymous',
    })
  }
  if (pair.body === 'Manrope') {
    links.push({
      rel: 'preload',
      href: '/fonts/website/manrope-latin.woff2',
      as: 'font',
      type: 'font/woff2',
      crossorigin: 'anonymous',
    })
  }
  return links
}
