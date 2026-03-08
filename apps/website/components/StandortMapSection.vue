<template>
  <section class="py-16 bg-white">
    <div class="section-container">
      <h2 class="heading-md text-center mb-4">📍 Treffpunkt {{ location.city }}</h2>
      <p class="text-center text-gray-500 mb-12">{{ location.area }}</p>

      <div class="grid lg:grid-cols-3 gap-0 max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-xl border border-gray-100">

        <!-- Google Maps Embed (nimmt 2/3 der Breite) -->
        <div class="lg:col-span-2 h-72 lg:h-[380px]">
          <iframe
            :src="`https://maps.google.com/maps?q=${encodeURIComponent(location.address)}&output=embed&hl=de&z=15`"
            class="w-full h-full border-0"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
            :title="`Fahrschule Driving Team ${location.city} – Karte`"
          />
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
            :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 bg-primary-600 text-white font-bold px-5 py-2.5 rounded-lg hover:bg-primary-700 transition text-sm w-fit"
          >
            🗺️ In Google Maps öffnen
          </a>
        </div>
      </div>
    </div>

    <!-- SEO: LocalBusiness Structured Data -->
    <component :is="'script'" type="application/ld+json">{{ structuredData }}</component>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ locationKey: string }>()

const locations: Record<string, { city: string; area: string; address: string; name: string; street: string; zip: string; lat: string; lng: string; region: string }> = {
  zuerich: {
    city: 'Zürich-Altstetten',
    area: 'Zürich-Altstetten & Umgebung',
    name: 'Bahnhof Altstetten',
    street: 'Altstetterplatz 1',
    zip: '8048',
    address: 'Altstetterplatz 1, 8048 Zürich-Altstetten',
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
    address: 'Herrengasse 17, 8853 Lachen SZ',
    region: 'Lachen, Altendorf, Pfäffikon/SZ, Galgenen, Wangen/SZ, Siebnen, Schübelbach',
    lat: '47.1990',
    lng: '8.8551',
  },
  uster: {
    city: 'Uster',
    area: 'Zürcher Oberland',
    name: 'Bahnhof Uster',
    street: 'Bankstrasse 11',
    zip: '8610',
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
    address: 'Neumattstrasse 22, 8953 Dietikon',
    region: 'Dietikon, Schlieren, Urdorf, Geroldswil, Spreitenbach, Wettingen',
    lat: '47.40641',
    lng: '8.40399',
  },
  spreitenbach: {
    city: 'Spreitenbach',
    area: 'Spreitenbach und Umgebung',
    name: 'Spreitenbach Sternenplatz',
    street: 'Dorfstrasse 67',
    zip: '8957',
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
    address: 'Bahnhofstrasse 4, 8730 Uznach',
    region: 'Rapperswil, Uznach, Kaltbrunn, Benken, Ziegelbrücke',
    lat: '47.2242',
    lng: '8.9819',
  },
  pfaeffikon: {
    city: 'Pfäffikon/SZ',
    area: 'Pfäffikon/SZ & Umgebung',
    name: 'Fahrschule Driving Team Pfäffikon/SZ',
    street: 'Herrengasse 17',
    zip: '8808',
    address: 'Herrengasse 17, 8808 Pfäffikon SZ',
    region: 'Pfäffikon/SZ, Lachen, Altendorf, Galgenen, Wangen/SZ, Siebnen, Schübelbach',
    lat: '47.1990',
    lng: '8.8551',
  },
  zug: {
    city: 'Zug',
    area: 'Zug & Umgebung',
    name: 'Motorradschule Zug',
    street: 'Sennweidstrasse 30',
    zip: '6312',
    address: 'Sennweidstrasse 30, 6312 Steinhausen',
    region: 'Zug, Steinhausen, Cham, Hünenberg',
    lat: '47.1697',
    lng: '8.5111',
  },
  einsiedeln: {
    city: 'Einsiedeln',
    area: 'Einsiedeln & Umgebung',
    name: 'Motorradschule Einsiedeln',
    street: 'Klosterstr. 10',
    zip: '8840',
    address: 'Klosterstr. 10, 8840 Einsiedeln',
    region: 'Einsiedeln, Schwyz, Steinen, Gersau',
    lat: '47.1344',
    lng: '8.7621',
  },
}

const location = computed(() => locations[props.locationKey] ?? locations.zuerich)

const structuredData = computed(() => JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  'name': `Fahrschule Driving Team ${location.value.city}`,
  'description': `Professionelle Fahrschule in ${location.value.city}. Auto, Motorrad, Lastwagen, Taxi und Motorboot Ausbildung.`,
  'address': {
    '@type': 'PostalAddress',
    'streetAddress': location.value.street,
    'postalCode': location.value.zip,
    'addressLocality': location.value.city,
    'addressCountry': 'CH',
  },
  'telephone': '+41444310033',
  'email': 'info@drivingteam.ch',
  'url': 'https://drivingteam.ch',
  'openingHours': 'Mo-Fr 08:00-12:00,13:00-17:00',
  'geo': {
    '@type': 'GeoCoordinates',
    'latitude': location.value.lat,
    'longitude': location.value.lng,
  },
  'aggregateRating': {
    '@type': 'AggregateRating',
    'ratingValue': '4.8',
    'reviewCount': '150',
  },
}))
</script>
