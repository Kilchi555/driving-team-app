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
import { writeFileSync, mkdirSync, readFileSync } from 'fs'
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
  lastwagen:          /lastwagen|lkw|c[\s-]?führerschein|c1|sattelzug|kategorie c/i,
  'motorrad-grundkurs': /grundkurs|motorrad grundkurs|töff kurs/i,
  motorrad:           /motorrad|töff|a[\s-]?führerschein|a1|a2/i,
  anhaenger:          /anhänger|hänger|be[\s-]?prüfung/i,
  motorboot:          /boot|motorboot|bootsführerschein|zürichsee.*boot/i,
  'auto-theorie':     /theorie|vku|nothilfe|nothelfer/i,
  lachen:             /lachen|altendorf|wangen|siebnen|march/i,
  pfaeffikon:         /pfäffikon|freienbach/i,
  reichenburg:        /reichenburg|benken/i,
  spreitenbach:       /spreitenbach|haldenstrasse/i,
  uster:              /uster|weiherweg/i,
  birmensdorf:        /birmensdorf|panoramastrasse/i,
  dietikon:           /dietikon/i,
  zuerich:            /zürich|altstetten|züri\b|vulkanstrasse/i,
  taxi:               /taxi|taxiprüfung/i,
  bus:                /bus\b|reisecar/i,
}

/**
 * Fahrlehrer → Kategorien Mapping.
 * Ein Review das den Namen eines Fahrlehrers erwähnt, wird automatisch
 * allen Kategorien zugeordnet, in denen dieser Fahrlehrer unterrichtet.
 */
const INSTRUCTOR_CATEGORIES: Record<string, string[]> = {
  pascal:   ['zuerich', 'motorrad', 'motorrad-grundkurs', 'uster'],
  vito:     ['zuerich', 'motorrad', 'motorrad-grundkurs'],
  keni:     ['zuerich', 'spreitenbach', 'anhaenger'],
  skender:  ['zuerich', 'spreitenbach', 'anhaenger'],
  kenny:    ['zuerich', 'spreitenbach', 'anhaenger'],
  rijad:    ['zuerich'],
  samuel:   ['zuerich', 'dietikon'],
  samir:    ['zuerich', 'birmensdorf'],
  marc:     ['lachen', 'pfaeffikon', 'reichenburg', 'motorboot'],
  sybille:  ['lachen', 'pfaeffikon', 'reichenburg'],
  andré:    ['lachen', 'pfaeffikon', 'reichenburg'],
  peter:    ['lachen', 'lastwagen', 'taxi'],
  rahel:    ['taxi', 'lastwagen'],
  tayfun:   ['spreitenbach'],
  alexandra: ['auto-theorie'],
}

function getCategories(text: string): string[] {
  const matched = new Set<string>()

  // 1. Keyword-Matching (Kategorien, Fahrzeugtypen, Orte)
  for (const [category, pattern] of Object.entries(CATEGORY_KEYWORDS)) {
    if (pattern.test(text)) matched.add(category)
  }

  // 2. Fahrlehrer-Matching: Wenn ein Fahrlehrer-Name im Review steht,
  //    werden alle Kategorien dieses Fahrlehrers hinzugefügt.
  const textLower = text.toLowerCase()
  for (const [instructor, categories] of Object.entries(INSTRUCTOR_CATEGORIES)) {
    // Ganzes Wort abgleichen um false positives zu vermeiden (z.B. "Pascal" != "pascals")
    const regex = new RegExp(`\\b${instructor}\\b`, 'i')
    if (regex.test(textLower)) {
      for (const cat of categories) matched.add(cat)
    }
  }

  return matched.size > 0 ? Array.from(matched) : ['default']
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
  console.log('📥  Driving Team Reviews Import (Places API + Smart Merge)')
  console.log('============================================================')

  if (!PLACES_API_KEY) {
    console.error('❌  VITE_GOOGLE_MAPS_API_KEY not set')
    process.exit(1)
  }

  // Load existing curated reviews — these are preserved and only supplemented
  let existing: Record<string, CuratedReview[]> = {}
  try {
    const raw = readFileSync(OUTPUT_PATH, 'utf-8')
    existing = JSON.parse(raw)
    const existingTotal = Object.values(existing).reduce((s, a) => s + a.length, 0)
    console.log(`\n📂  Bestehende Reviews geladen: ${existingTotal} in ${Object.keys(existing).length} Kategorien`)
  } catch {
    console.log('\n📂  Keine bestehende Datei — wird neu erstellt')
  }

  const fresh: Record<string, CuratedReview[]> = {}

  for (const location of LOCATIONS) {
    console.log(`\n📍  ${location.label} (${location.placeId})`)

    const reviews = await fetchPlaceReviews(location.placeId)
    console.log(`  ${reviews.length} Reviews von Places API`)

    const filtered = reviews.filter(r => r.rating >= 4 && r.text?.trim())
    console.log(`  Nach Filter (≥4 Sterne, mit Text): ${filtered.length}`)

    for (const r of filtered) {
      const categories = getCategories(r.text)
      if (!categories.includes(location.label)) categories.push(location.label)

      const curated: CuratedReview = {
        text: toQuotedText(r.text),
        author: r.author_name,
        link: r.author_url || location.mapsUrl,
        datePublished: epochToYearMonth(r.time),
      }

      for (const cat of categories) {
        if (!fresh[cat]) fresh[cat] = []
        if (!fresh[cat].some(e => e.author === curated.author)) {
          fresh[cat].push(curated)
        }
      }
    }
    console.log(`  ✅  importiert`)
  }

  // Smart Merge: fresh reviews + existing curated reviews, deduplicated
  const merged: Record<string, CuratedReview[]> = { ...existing }

  let newCount = 0
  for (const [cat, freshReviews] of Object.entries(fresh)) {
    if (!merged[cat]) merged[cat] = []
    for (const r of freshReviews) {
      const isDuplicate = merged[cat].some(e => e.author === r.author)
      if (!isDuplicate) {
        merged[cat].unshift(r) // neue Reviews vorne
        newCount++
        console.log(`  ➕  Neu in [${cat}]: ${r.author} (${r.datePublished})`)
      }
    }
  }

  // Sort by date desc, max 8 per category
  for (const cat of Object.keys(merged)) {
    merged[cat] = merged[cat]
      .sort((a, b) => b.datePublished.localeCompare(a.datePublished))
      .slice(0, 8)
  }

  mkdirSync(join(__dirname, '../../apps/website/data'), { recursive: true })
  writeFileSync(OUTPUT_PATH, JSON.stringify(merged, null, 2), 'utf-8')

  const totalReviews = Object.values(merged).reduce((sum, arr) => sum + arr.length, 0)
  const categories = Object.keys(merged).filter(k => merged[k].length > 0)

  console.log('\n============================================================')
  console.log(`✅  Fertig: ${totalReviews} Reviews in ${categories.length} Kategorien (${newCount} neu)`)
  console.log(`📁  Ausgabe: ${OUTPUT_PATH}`)
  console.log(`🏷️  Kategorien: ${categories.join(', ')}`)
}

main().catch(err => {
  console.error('❌  Import fehlgeschlagen:', err)
  process.exit(1)
})
