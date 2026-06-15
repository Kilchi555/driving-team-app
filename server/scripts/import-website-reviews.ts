/**
 * import-website-reviews.ts
 *
 * Fetches reviews from Google Places API for all Driving Team locations,
 * applies keyword-based category mapping, and writes the result to
 * apps/website/data/curated-reviews.json.
 *
 * Uses Google Places API (no special approval needed) instead of GBP API.
 * Limitation: Places API returns max 5 "most relevant" reviews per location.
 *
 * Run:
 *   npm run import:reviews
 *
 * Required env vars:
 *   VITE_GOOGLE_MAPS_API_KEY   — Google Maps/Places API key
 *
 * Output:
 *   apps/website/data/curated-reviews.json
 */

import 'dotenv/config'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = join(__dirname, '../../apps/website/data/curated-reviews.json')

const PLACES_API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY

// ── Standorte ─────────────────────────────────────────────────────────────────

interface Location {
  label: string
  placeId: string
  mapsUrl: string
}

const LOCATIONS: Location[] = [
  {
    label: 'zuerich',
    placeId: 'ChIJU29cFMgLkEcRzMfDub2bh9s',
    mapsUrl: 'https://maps.app.goo.gl/drivingteam-zuerich',
  },
  {
    label: 'lachen',
    placeId: 'ChIJqdlnJXTJmkcRAgI05nvPXFU',
    mapsUrl: 'https://maps.app.goo.gl/drivingteam-lachen',
  },
  {
    label: 'birmensdorf',
    placeId: 'ChIJa6ZxPk8PkEcRmC3lYOQJZgo',
    mapsUrl: 'https://maps.app.goo.gl/drivingteam-birmensdorf',
  },
  {
    label: 'pfaeffikon',
    placeId: 'ChIJIU1slRGxmkcRL1mci0s4NEQ',
    mapsUrl: 'https://maps.app.goo.gl/drivingteam-pfaeffikon',
  },
  {
    label: 'spreitenbach',
    placeId: 'ChIJ_V8A6ycNkEcRz6hXDJMr6ls',
    mapsUrl: 'https://maps.app.goo.gl/drivingteam-spreitenbach',
  },
  {
    label: 'uster',
    placeId: 'ChIJtRgKpBClmkcRxXQxbtz0uBA',
    mapsUrl: 'https://maps.app.goo.gl/drivingteam-uster',
  },
]

// ── Keyword-Mapping ───────────────────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<string, RegExp> = {
  lastwagen: /lastwagen|lkw|c[\s-]?führerschein|c1|sattelzug|kategorie c/i,
  'motorrad-grundkurs': /grundkurs|motorrad grundkurs|töff kurs/i,
  motorrad: /motorrad|töff|a[\s-]?führerschein|a1|a2/i,
  anhaenger: /anhänger|hänger|be[\s-]?prüfung/i,
  motorboot: /boot|motorboot|bootsführerschein|zürichsee.*boot/i,
  'auto-theorie': /theorie|vku|nothilfe|nothelfer/i,
  lachen: /lachen|pfäffikon|altendorf|wangen|siebnen|march/i,
  zuerich: /zürich|altstetten|züri\b/i,
  taxi: /taxi|taxiprüfung/i,
  bus: /bus|car|reisecar/i,
}

function getCategories(text: string): string[] {
  const matched: string[] = []
  for (const [category, pattern] of Object.entries(CATEGORY_KEYWORDS)) {
    if (pattern.test(text)) matched.push(category)
  }
  return matched.length > 0 ? matched : ['default']
}

// ── Places API ────────────────────────────────────────────────────────────────

interface PlacesReview {
  author_name: string
  author_url: string
  rating: number
  text: string
  time: number
  relative_time_description: string
}

interface PlaceDetails {
  result?: {
    reviews?: PlacesReview[]
    rating?: number
    user_ratings_total?: number
    name?: string
  }
  status: string
  error_message?: string
}

async function fetchPlaceReviews(placeId: string): Promise<PlacesReview[]> {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,rating,user_ratings_total,name&language=de&reviews_sort=newest&key=${PLACES_API_KEY}`
  const res = await fetch(url)
  const data = await res.json() as PlaceDetails

  if (data.status !== 'OK') {
    console.warn(`  ⚠️  Places API: ${data.status} ${data.error_message ?? ''}`)
    return []
  }
  return data.result?.reviews ?? []
}

// ── Helpers ───────────────────────────────────────────────────────────────────

interface CuratedReview {
  text: string
  author: string
  link: string
  datePublished: string
}

function toQuotedText(text: string): string {
  const clean = text.trim().replace(/^["„"']|["„"']$/g, '')
  return `„${clean}"`
}

function epochToYearMonth(epoch: number): string {
  const d = new Date(epoch * 1000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📥  Driving Team Reviews Import (Places API)')
  console.log('============================================')

  if (!PLACES_API_KEY) {
    console.error('❌  VITE_GOOGLE_MAPS_API_KEY not set')
    process.exit(1)
  }

  const allCategorised: Record<string, CuratedReview[]> = { default: [] }

  for (const location of LOCATIONS) {
    console.log(`\n📍  ${location.label} (${location.placeId})`)

    const reviews = await fetchPlaceReviews(location.placeId)
    console.log(`  ${reviews.length} Reviews geladen`)

    const filtered = reviews.filter(r => r.rating >= 4 && r.text?.trim())
    console.log(`  Nach Filter (≥4 Sterne, mit Text): ${filtered.length}`)

    for (const r of filtered) {
      const text = r.text
      const categories = getCategories(text)

      // Standort-Kategorie immer hinzufügen
      if (!categories.includes(location.label)) {
        categories.push(location.label)
      }

      const curated: CuratedReview = {
        text: toQuotedText(text),
        author: r.author_name,
        link: r.author_url || location.mapsUrl,
        datePublished: epochToYearMonth(r.time),
      }

      for (const cat of categories) {
        if (!allCategorised[cat]) allCategorised[cat] = []
        if (!allCategorised[cat].some(e => e.author === curated.author && e.text === curated.text)) {
          allCategorised[cat].push(curated)
        }
      }
    }

    console.log(`  ✅  ${location.label} importiert`)
  }

  // Max 8 Reviews pro Kategorie, neueste zuerst
  for (const cat of Object.keys(allCategorised)) {
    allCategorised[cat] = allCategorised[cat]
      .sort((a, b) => b.datePublished.localeCompare(a.datePublished))
      .slice(0, 8)
  }

  mkdirSync(join(__dirname, '../../apps/website/data'), { recursive: true })
  writeFileSync(OUTPUT_PATH, JSON.stringify(allCategorised, null, 2), 'utf-8')

  const totalReviews = Object.values(allCategorised).reduce((sum, arr) => sum + arr.length, 0)
  const categories = Object.keys(allCategorised).filter(k => allCategorised[k].length > 0)

  console.log('\n============================================')
  console.log(`✅  Fertig: ${totalReviews} Reviews in ${categories.length} Kategorien`)
  console.log(`📁  Ausgabe: ${OUTPUT_PATH}`)
  console.log(`🏷️  Kategorien: ${categories.join(', ')}`)
}

main().catch(err => {
  console.error('❌  Import fehlgeschlagen:', err)
  process.exit(1)
})
