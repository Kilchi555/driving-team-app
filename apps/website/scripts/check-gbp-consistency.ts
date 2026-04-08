/**
 * GBP ↔ Website Konsistenz-Check
 *
 * Vergleicht die Daten aus Google Business Profile (via Places API)
 * mit den statischen Werten in business.config.ts
 *
 * Ausführen:
 *   cd apps/website
 *   npx tsx scripts/check-gbp-consistency.ts
 */

import { LOCATION_ZUERICH, LOCATION_LACHEN, LOCATION_SPREITENBACH, LOCATION_USTER } from '../business.config'

const API_KEY = process.env.GOOGLE_PLACES_API_KEY
if (!API_KEY) {
  console.error('❌  GOOGLE_PLACES_API_KEY nicht gesetzt')
  process.exit(1)
}

const LOCATIONS = [LOCATION_ZUERICH, LOCATION_LACHEN, LOCATION_SPREITENBACH, LOCATION_USTER]

const FIELDS = [
  'displayName',
  'formattedAddress',
  'internationalPhoneNumber',
  'regularOpeningHours',
  'rating',
  'userRatingCount',
  'websiteUri',
].join(',')

interface PlacesResult {
  displayName?: { text: string }
  formattedAddress?: string
  internationalPhoneNumber?: string
  regularOpeningHours?: {
    periods?: Array<{ open: { day: number; hour: number; minute: number }; close: { day: number; hour: number; minute: number } }>
    weekdayDescriptions?: string[]
  }
  rating?: number
  userRatingCount?: number
  websiteUri?: string
}

function padHM(h: number, m: number) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function ok(label: string) { console.log(`  ✅  ${label}`) }
function warn(label: string, gbp: unknown, config: unknown) {
  console.log(`  ⚠️   ${label}`)
  console.log(`       GBP:    ${JSON.stringify(gbp)}`)
  console.log(`       Config: ${JSON.stringify(config)}`)
}

async function checkLocation(loc: typeof LOCATION_ZUERICH) {
  if (!loc.placeId) {
    console.log(`\n⏭️  ${loc.gbpName} – keine Place ID, übersprungen\n`)
    return
  }

  console.log(`\n──────────────────────────────────────────`)
  console.log(`📍  ${loc.gbpName}`)
  console.log(`──────────────────────────────────────────`)

  const url = `https://places.googleapis.com/v1/places/${loc.placeId}?fields=${FIELDS}&key=${API_KEY}`
  const res = await fetch(url)
  const data: PlacesResult = await res.json()

  if (!res.ok) {
    console.log(`  ❌  API-Fehler: ${JSON.stringify(data)}`)
    return
  }

  // Name
  const gbpName = data.displayName?.text ?? ''
  if (gbpName === loc.gbpName) {
    ok(`Name: "${gbpName}"`)
  } else {
    warn('Name stimmt nicht überein', gbpName, loc.gbpName)
  }

  // Adresse (grobe Prüfung: Strasse + PLZ enthalten?)
  const addr = data.formattedAddress ?? ''
  const streetOk = addr.includes(loc.address.street)
  const zipOk = addr.includes(loc.address.zip)
  if (streetOk && zipOk) {
    ok(`Adresse: "${addr}"`)
  } else {
    warn('Adresse stimmt nicht überein', addr, `${loc.address.street}, ${loc.address.zip} ${loc.address.city}`)
  }

  // Telefon
  const phone = (data.internationalPhoneNumber ?? '').replace(/\s/g, '')
  const configPhone = loc.phone.replace(/\s/g, '')
  if (phone === configPhone) {
    ok(`Telefon: ${phone}`)
  } else {
    warn('Telefon stimmt nicht überein', phone, configPhone)
  }

  // Website
  const website = data.websiteUri ?? ''
  if (website.includes('drivingteam.ch')) {
    ok(`Website: ${website}`)
  } else {
    warn('Website stimmt nicht überein', website, 'drivingteam.ch')
  }

  // Rating
  if (data.rating !== undefined) {
    if (data.rating === loc.rating.value) {
      ok(`Rating: ${data.rating} (Fallback aktuell)`)
    } else {
      warn('Rating-Fallback veraltet', data.rating, loc.rating.value)
    }
  }

  // Review Count
  if (data.userRatingCount !== undefined) {
    if (data.userRatingCount === loc.rating.count) {
      ok(`Bewertungen: ${data.userRatingCount} (Fallback aktuell)`)
    } else {
      warn('Bewertungsanzahl-Fallback veraltet', data.userRatingCount, loc.rating.count)
    }
  }

  // Öffnungszeiten (nur Wochentage prüfen)
  const descriptions = data.regularOpeningHours?.weekdayDescriptions
  if (descriptions) {
    console.log(`  ℹ️   GBP-Öffnungszeiten:`)
    descriptions.forEach(d => console.log(`       ${d}`))
    console.log(`  ℹ️   Config: ${loc.hoursDisplay}`)
  }
}

async function main() {
  console.log('🔍  GBP ↔ Website Konsistenz-Check')
  console.log('====================================')

  for (const loc of LOCATIONS) {
    await checkLocation(loc)
  }

  console.log('\n====================================')
  console.log('✅  Check abgeschlossen')
  console.log('⚠️  = manuelle Korrektur nötig (Config oder GBP)')
}

main().catch(console.error)
