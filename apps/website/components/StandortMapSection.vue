<template>
  <section class="py-16 bg-white">
    <div class="section-container">
      <h2 class="heading-md text-center mb-4">📍 Treffpunkt {{ location.city }}</h2>
      <p class="text-center text-gray-500 mb-12">{{ location.area }}</p>

      <div class="grid lg:grid-cols-3 gap-0 max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-xl border border-gray-100">

        <!-- Google Maps Embed (nimmt 2/3 der Breite) -->
        <div ref="mapContainer" class="lg:col-span-2 h-72 lg:h-[380px]">
          <iframe
            v-if="mapLoaded"
            :src="`https://maps.google.com/maps?q=${encodeURIComponent(location.name + ', ' + location.street + ', ' + location.zip + ' ' + location.city + ', Schweiz')}&output=embed&hl=de&z=16`"
            class="w-full h-full border-0"
            referrerpolicy="no-referrer-when-downgrade"
            :title="`Fahrschule Driving Team ${location.city} – Karte`"
          />
          <div
            v-else
            class="w-full h-full bg-gray-100 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-gray-200 transition-colors"
            @click="mapLoaded = true"
          >
            <div class="text-5xl">🗺️</div>
            <div class="text-center px-6">
              <p class="font-semibold text-gray-700 text-sm">{{ location.name }}</p>
              <p class="text-xs text-gray-500 mt-1">{{ location.street }}, {{ location.zip }} {{ location.city }}</p>
            </div>
            <button class="mt-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 transition">
              Karte laden
            </button>
          </div>
        </div>

        <!-- Info Card -->
        <div class="bg-gray-50 p-8 flex flex-col justify-center space-y-6">
          <div>
            <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Treffpunkt</p>
            <p class="text-gray-900 font-semibold text-sm">{{ location.name }}</p>
            <p class="text-gray-700 text-sm">{{ location.street }}</p>
            <p class="text-gray-700 text-sm">{{ location.zip }} {{ location.city }}</p>
          </div>
          <div>
            <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Tätigkeitsgebiet</p>
            <p class="text-gray-600 text-sm leading-relaxed">{{ location.region }}</p>
          </div>
          <a
            :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.name + ', ' + location.street + ', ' + location.zip + ' ' + location.city + ', Schweiz')}`"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 bg-primary-600 text-white font-bold px-5 py-2.5 rounded-lg hover:bg-primary-700 transition text-sm w-fit"
          >
            🗺️ In Google Maps öffnen
          </a>
        </div>
      </div>
    </div>

  </section>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useHead } from '#app'
import {
  LOCATION_ZUERICH,
  LOCATION_LACHEN,
  LOCATION_PFAEFFIKON,
  LOCATION_SPREITENBACH,
  LOCATION_USTER,
  buildLocationSchema,
} from '~/business.config'

const props = defineProps<{ locationKey: string }>()

const mapContainer = ref<HTMLElement | null>(null)
const mapLoaded = ref(false)

onMounted(() => {
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        mapLoaded.value = true
        observer.disconnect()
      }
    },
    { rootMargin: '400px' }
  )
  if (mapContainer.value) {
    observer.observe(mapContainer.value)
  }
})

// GBP-Locations: Schema kommt aus business.config.ts (rating passt zum echten GBP)
const gbpLocationMap: Record<string, typeof LOCATION_ZUERICH> = {
  zuerich: LOCATION_ZUERICH,
  lachen: LOCATION_LACHEN,
  pfaeffikon: LOCATION_PFAEFFIKON,
  spreitenbach: LOCATION_SPREITENBACH,
  uster: LOCATION_USTER,
}

// Nicht-GBP Standorte (Kurspartner, Treffpunkte) – kein aggregateRating
const locations: Record<string, {
  city: string; area: string; address: string; name: string
  street: string; zip: string; lat: string; lng: string
  region: string; canton: string; addressLocality?: string
}> = {
  zuerich: {
    city: 'Zürich-Altstetten',
    area: 'Zürich-Altstetten & Umgebung',
    name: 'Bahnhof Altstetten',
    street: 'Altstetterplatz 12',
    zip: '8048',
    canton: 'ZH',
    address: 'Altstetterplatz 12, 8048 Zürich-Altstetten',
    region: 'Zürich-Altstetten, Schlieren, Albisrieden, Höngg, Urdorf, Uitikon etc.',
    lat: '47.39113',
    lng: '8.48947',
  },
  lachen: {
    city: 'Lachen',
    area: 'Lachen/SZ & Umgebung',
    name: 'Fahrschule Driving Team Lachen',
    street: 'Herrengasse 17',
    zip: '8853',
    canton: 'SZ',
    address: 'Herrengasse 17, 8853 Lachen SZ',
    region: 'Lachen, Altendorf, Pfäffikon/SZ, Galgenen, Wangen/SZ, Siebnen, Schübelbach',
    lat: '47.19211',
    lng: '8.85303',
  },
  uster: {
    city: 'Uster',
    area: 'Zürcher Oberland',
    name: 'Bahnhof Uster',
    street: 'Bankstrasse 11',
    zip: '8610',
    canton: 'ZH',
    address: 'Bankstrasse 11, 8610 Uster',
    region: 'Uster, Dübendorf, Volketswil, Wetzikon, Hinwil',
    lat: '47.3506',
    lng: '8.7175',
  },
  dietikon: {
    city: 'Dietikon',
    area: 'Zürich bis Baden',
    name: 'Bahnhof Dietikon',
    street: 'Neumattstrasse 22',
    zip: '8953',
    canton: 'ZH',
    address: 'Neumattstrasse 22, 8953 Dietikon',
    region: 'Dietikon, Schlieren, Urdorf, Geroldswil, Spreitenbach, Wettingen',
    lat: '47.40641',
    lng: '8.40399',
  },
  birmensdorf: {
    city: 'Birmensdorf',
    area: 'Birmensdorf & Knonaueramt',
    name: 'Bahnhof Birmensdorf',
    street: 'Bahnhofstrasse 2',
    zip: '8903',
    canton: 'ZH',
    address: 'Bahnhofstrasse 2, 8903 Birmensdorf',
    region: 'Birmensdorf, Uitikon, Urdorf, Stallikon, Ringlikon, Wettswil',
    lat: '47.36011',
    lng: '8.43268',
  },
  spreitenbach: {
    city: 'Spreitenbach',
    area: 'Spreitenbach und Umgebung',
    name: 'Spreitenbach Sternenplatz',
    street: 'Dorfstrasse 67',
    zip: '8957',
    canton: 'AG',
    address: 'Dorfstrasse 67, 8957 Spreitenbach',
    region: 'Spreitenbach, Würenlos, Wettingen, Neuenhof',
    lat: '47.4179',
    lng: '8.3640',
  },
  reichenburg: {
    city: 'Reichenburg',
    area: 'Galgenen bis Bilten',
    name: 'Reichenburg Bahnhof',
    street: 'Bahnhofstrasse 57',
    zip: '8864',
    canton: 'SZ',
    address: 'Bahnhofstrasse 57, 8864 Reichenburg',
    region: 'Reichenburg, Siebnen, Schübelbach, Buttikon, Benken, Bilten',
    lat: '47.1723',
    lng: '8.9833',
  },
  stgallen: {
    city: 'Uznach',
    area: 'Rapperswil bis Kaltbrunn',
    name: 'Bahnhof Uznach',
    street: 'Bahnhofstrasse 4',
    zip: '8730',
    canton: 'SG',
    address: 'Bahnhofstrasse 4, 8730 Uznach',
    region: 'Rapperswil, Uznach, Kaltbrunn, Benken, Ziegelbrücke',
    lat: '47.2242',
    lng: '8.9819',
  },
  pfaeffikon: {
    city: 'Pfäffikon SZ',
    area: 'Pfäffikon/SZ & Umgebung',
    name: 'Fahrschule Driving Team Pfäffikon/SZ',
    street: 'Bahnweg 4',
    zip: '8808',
    canton: 'SZ',
    address: 'Bahnweg 4, 8808 Pfäffikon SZ',
    region: 'Pfäffikon/SZ, Lachen, Altendorf, Galgenen, Wangen/SZ, Siebnen, Schübelbach',
    lat: '47.202904',
    lng: '8.778039',
  },
  pfaeffikon_zh: {
    city: 'Pfäffikon ZH',
    area: 'Pfäffikon ZH – WAB Kurs Standort',
    name: 'Transportschule AG',
    street: 'Barzloostrasse 9',
    zip: '8330',
    canton: 'ZH',
    address: 'Barzloostrasse 9, 8330 Pfäffikon ZH',
    region: 'Pfäffikon ZH, Illnau-Effretikon, Fehraltorf, Wetzikon, Volketswil',
    lat: '47.3678',
    lng: '8.7752',
  },
  tuggen: {
    city: 'Tuggen SZ',
    area: 'Tuggen SZ – WAB Kurs Standort',
    name: 'Verkehrszentrum Tuggen AG',
    street: 'Betti 80',
    zip: '8856',
    canton: 'SZ',
    address: 'Betti 80, 8856 Tuggen SZ',
    region: 'Tuggen, Schübelbach, Lachen, Reichenburg, Siebnen, Galgenen',
    lat: '47.1658',
    lng: '8.9434',
  },
  zug: {
    city: 'Zug',
    area: 'Zug & Umgebung',
    name: 'Motorradschule Zug',
    street: 'Sennweidstrasse 30',
    zip: '6312',
    canton: 'ZG',
    addressLocality: 'Steinhausen',
    address: 'Sennweidstrasse 30, 6312 Steinhausen',
    region: 'Zug, Steinhausen, Cham, Hünenberg',
    lat: '47.1918',
    lng: '8.4807',
  },
  einsiedeln: {
    city: 'Einsiedeln',
    area: 'Einsiedeln & Umgebung',
    name: 'Motorradschule Einsiedeln',
    street: 'Klosterstr. 10',
    zip: '8840',
    canton: 'SZ',
    address: 'Klosterstr. 10, 8840 Einsiedeln',
    region: 'Einsiedeln, Schwyz, Steinen, Gersau',
    lat: '47.1267',
    lng: '8.7516',
  },
}

const location = computed(() => locations[props.locationKey] ?? locations.zuerich)

const structuredData = computed(() => {
  const gbpLocation = gbpLocationMap[props.locationKey]
  if (gbpLocation) {
    // Strip aggregateRating to avoid duplicate rating nodes when this component
    // is embedded on pages that already output their own aggregateRating schema.
    const { aggregateRating: _omit, ...schema } = buildLocationSchema(gbpLocation)
    return JSON.stringify(schema)
  }

  // Kein GBP vorhanden → einfaches LocalBusiness ohne aggregateRating
  const loc = location.value
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    'name': `Fahrschule Driving Team ${loc.city}`,
    'description': `Professionelle Fahrschule in ${loc.city}. Auto, Motorrad, Lastwagen, Taxi und Motorboot Ausbildung.`,
    'address': {
      '@type': 'PostalAddress',
      'streetAddress': loc.street,
      'postalCode': loc.zip,
      'addressLocality': loc.addressLocality ?? loc.city,
      'addressRegion': loc.canton,
      'addressCountry': 'CH',
    },
    'telephone': '+41444310033',
    'email': 'info@drivingteam.ch',
    'url': 'https://drivingteam.ch',
    'geo': {
      '@type': 'GeoCoordinates',
      'latitude': loc.lat,
      'longitude': loc.lng,
    },
  })
})

useHead(computed(() => ({
  script: [{
    type: 'application/ld+json',
    innerHTML: structuredData.value,
    key: `standort-local-business-${props.locationKey}`,
  }]
})))
</script>
