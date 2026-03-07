<template>
  <div>
    <Head>
      <Title>Fahrschule Standorte | Zürich, Lachen, Uster, St.Gallen | Driving Team</Title>
      <Meta name="description" content="Fahrschule Standorte in der Schweiz - Zürich, Lachen, Uster, St.Gallen, Dietikon, Aargau, Reichenburg. Alle Kategorien, flexible Zeiten. Jetzt Termin buchen!" />
      <Meta property="og:title" content="Fahrschule Standorte - 7 Locations in der Schweiz" />
      <Meta property="og:description" content="Besuche einen unserer 7 Fahrschule Standorte in Zürich, Lachen, Uster und mehr." />
      <Link rel="canonical" href="https://drivingteam.ch/fahrschule-standorte/" />
      
      <!-- JSON-LD Schema -->
      <Script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Fahrschule Standorte",
        "description": "Alle Fahrschule Standorte von Driving Team in der Schweiz",
        "url": "https://drivingteam.ch/fahrschule-standorte/",
        "hasPart": [
          {"@type": "LocalBusiness", "name": "Driving Team Zürich"},
          {"@type": "LocalBusiness", "name": "Driving Team Lachen"},
          {"@type": "LocalBusiness", "name": "Driving Team Uster"},
          {"@type": "LocalBusiness", "name": "Driving Team St.Gallen"},
          {"@type": "LocalBusiness", "name": "Driving Team Dietikon"},
          {"@type": "LocalBusiness", "name": "Driving Team Aargau"},
          {"@type": "LocalBusiness", "name": "Driving Team Reichenburg"}
        ]
      }
      </Script>
      
      <!-- BreadcrumbList Schema -->
      <Script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/"},
          {"@type": "ListItem", "position": 2, "name": "Standorte", "item": "https://drivingteam.ch/fahrschule-standorte/"}
        ]
      }
      </Script>
    </Head>

    <h1 class="sr-only">Fahrschule Standorte in der Schweiz</h1>

    <!-- Hero Section -->
    <section class="bg-gradient-to-br from-primary-500 to-primary-700 text-white py-16 md:py-24">
      <div class="section-container">
        <div class="max-w-4xl">
          <h2 class="text-3xl md:text-5xl font-bold mb-6">Fahrschule in deiner Nähe</h2>
          <p class="text-lg md:text-xl text-primary-100 mb-8">
            Wir sind an 7 Standorten in der Schweiz für dich da. Finde den Ort, der dir am besten passt, 
            und buche deine Fahrstunden oder Kurse.
          </p>
        </div>
      </div>
    </section>

    <!-- Locations Grid -->
    <section class="section-container py-16">
      <h2 class="text-3xl font-bold mb-12 text-center">Unsere Standorte</h2>
      
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
        <!-- Zürich -->
        <div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition border-t-4 border-primary-600">
          <div class="h-40 bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
            <span class="text-4xl">📍</span>
          </div>
          <div class="p-6">
            <h3 class="text-2xl font-bold text-primary-600 mb-2">Zürich-Altstetten</h3>
            <p class="text-gray-600 mb-4">Unsere Hauptlocation mit allen Kategorien</p>
            <div class="space-y-2 mb-6 text-sm text-gray-600">
              <p><span class="font-semibold">Adresse:</span> Gewerbestrasse 10, 8000 Zürich</p>
              <p><span class="font-semibold">Öffnungszeiten:</span> Mo-Sa 8:00 - 18:00</p>
              <p><span class="font-semibold">Kategorien:</span> Alle (Auto bis Motorboot)</p>
            </div>
            <a href="/fahrschule-zuerich/" class="block w-full text-center bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 transition mb-2" aria-label="Mehr zu Fahrschule Zürich">
              Mehr erfahren
            </a>
            <a href="tel:+41444310033" class="block w-full text-center border-2 border-primary-600 text-primary-600 px-4 py-2 rounded hover:bg-primary-50 transition" aria-label="Fahrschule Zürich anrufen">
              📞 +41 44 431 00 33
            </a>
          </div>
        </div>

        <!-- Lachen -->
        <div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition border-t-4 border-red-600">
          <div class="h-40 bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
            <span class="text-4xl">🏞️</span>
          </div>
          <div class="p-6">
            <h3 class="text-2xl font-bold text-red-600 mb-2">Lachen</h3>
            <p class="text-gray-600 mb-4">Standort im Kanton Schwyz</p>
            <div class="space-y-2 mb-6 text-sm text-gray-600">
              <p><span class="font-semibold">Region:</span> Kanton Schwyz</p>
              <p><span class="font-semibold">Öffnungszeiten:</span> Mo-Sa 8:00 - 18:00</p>
              <p><span class="font-semibold">Kategorien:</span> Auto, Motorrad, Lastwagen</p>
            </div>
            <a href="/fahrschule-lachen/" class="block w-full text-center bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition mb-2" aria-label="Mehr zu Fahrschule Lachen">
              Mehr erfahren
            </a>
            <a href="tel:+41444310033" class="block w-full text-center border-2 border-red-600 text-red-600 px-4 py-2 rounded hover:bg-red-50 transition" aria-label="Fahrschule Lachen anrufen">
              📞 +41 44 431 00 33
            </a>
          </div>
        </div>

        <!-- Uster -->
        <div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition border-t-4 border-yellow-600">
          <div class="h-40 bg-gradient-to-br from-yellow-500 to-yellow-700 flex items-center justify-center">
            <span class="text-4xl">🚗</span>
          </div>
          <div class="p-6">
            <h3 class="text-2xl font-bold text-yellow-600 mb-2">Uster</h3>
            <p class="text-gray-600 mb-4">Im Zürcher Oberland</p>
            <div class="space-y-2 mb-6 text-sm text-gray-600">
              <p><span class="font-semibold">Region:</span> Zürcher Oberland</p>
              <p><span class="font-semibold">Öffnungszeiten:</span> Mo-Sa 8:00 - 18:00</p>
              <p><span class="font-semibold">Kategorien:</span> Auto, Motorrad</p>
            </div>
            <a href="/fahrschule-uster/" class="block w-full text-center bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition mb-2" aria-label="Mehr zu Fahrschule Uster">
              Mehr erfahren
            </a>
            <a href="tel:+41444310033" class="block w-full text-center border-2 border-yellow-600 text-yellow-600 px-4 py-2 rounded hover:bg-yellow-50 transition" aria-label="Fahrschule Uster anrufen">
              📞 +41 44 431 00 33
            </a>
          </div>
        </div>

        <!-- St. Gallen -->
        <div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition border-t-4 border-green-600">
          <div class="h-40 bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center">
            <span class="text-4xl">🏛️</span>
          </div>
          <div class="p-6">
            <h3 class="text-2xl font-bold text-green-600 mb-2">St. Gallen</h3>
            <p class="text-gray-600 mb-4">Osten der Schweiz</p>
            <div class="space-y-2 mb-6 text-sm text-gray-600">
              <p><span class="font-semibold">Region:</span> Kanton St. Gallen</p>
              <p><span class="font-semibold">Öffnungszeiten:</span> Mo-Sa 8:00 - 18:00</p>
              <p><span class="font-semibold">Kategorien:</span> Auto, Motorrad</p>
            </div>
            <a href="/fahrschule-stgallen/" class="block w-full text-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition mb-2" aria-label="Mehr zu Fahrschule St. Gallen">
              Mehr erfahren
            </a>
            <a href="tel:+41444310033" class="block w-full text-center border-2 border-green-600 text-green-600 px-4 py-2 rounded hover:bg-green-50 transition" aria-label="Fahrschule St. Gallen anrufen">
              📞 +41 44 431 00 33
            </a>
          </div>
        </div>

        <!-- Dietikon -->
        <div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition border-t-4 border-purple-600">
          <div class="h-40 bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
            <span class="text-4xl">🌉</span>
          </div>
          <div class="p-6">
            <h3 class="text-2xl font-bold text-purple-600 mb-2">Dietikon</h3>
            <p class="text-gray-600 mb-4">Im Limmattal</p>
            <div class="space-y-2 mb-6 text-sm text-gray-600">
              <p><span class="font-semibold">Region:</span> Limmattal</p>
              <p><span class="font-semibold">Öffnungszeiten:</span> Mo-Sa 8:00 - 18:00</p>
              <p><span class="font-semibold">Kategorien:</span> Auto, Motorrad</p>
            </div>
            <a href="/fahrschule-dietikon/" class="block w-full text-center bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition mb-2" aria-label="Mehr zu Fahrschule Dietikon">
              Mehr erfahren
            </a>
            <a href="tel:+41444310033" class="block w-full text-center border-2 border-purple-600 text-purple-600 px-4 py-2 rounded hover:bg-purple-50 transition" aria-label="Fahrschule Dietikon anrufen">
              📞 +41 44 431 00 33
            </a>
          </div>
        </div>

        <!-- Aargau -->
        <div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition border-t-4 border-orange-600">
          <div class="h-40 bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center">
            <span class="text-4xl">🌄</span>
          </div>
          <div class="p-6">
            <h3 class="text-2xl font-bold text-orange-600 mb-2">Aargau</h3>
            <p class="text-gray-600 mb-4">Kanton Aargau</p>
            <div class="space-y-2 mb-6 text-sm text-gray-600">
              <p><span class="font-semibold">Region:</span> Kanton Aargau</p>
              <p><span class="font-semibold">Öffnungszeiten:</span> Mo-Sa 8:00 - 18:00</p>
              <p><span class="font-semibold">Kategorien:</span> Auto, Motorrad</p>
            </div>
            <a href="/fahrschule-aargau/" class="block w-full text-center bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 transition mb-2" aria-label="Mehr zu Fahrschule Aargau">
              Mehr erfahren
            </a>
            <a href="tel:+41444310033" class="block w-full text-center border-2 border-orange-600 text-orange-600 px-4 py-2 rounded hover:bg-orange-50 transition" aria-label="Fahrschule Aargau anrufen">
              📞 +41 44 431 00 33
            </a>
          </div>
        </div>

        <!-- Reichenburg -->
        <div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition border-t-4 border-cyan-600">
          <div class="h-40 bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center">
            <span class="text-4xl">🏔️</span>
          </div>
          <div class="p-6">
            <h3 class="text-2xl font-bold text-cyan-600 mb-2">Reichenburg</h3>
            <p class="text-gray-600 mb-4">Kanton Schwyz</p>
            <div class="space-y-2 mb-6 text-sm text-gray-600">
              <p><span class="font-semibold">Region:</span> Kanton Schwyz</p>
              <p><span class="font-semibold">Öffnungszeiten:</span> Mo-Sa 8:00 - 18:00</p>
              <p><span class="font-semibold">Kategorien:</span> Auto, Motorrad</p>
            </div>
            <a href="/fahrschule-reichenburg/" class="block w-full text-center bg-cyan-600 text-white px-4 py-2 rounded hover:bg-cyan-700 transition mb-2" aria-label="Mehr zu Fahrschule Reichenburg">
              Mehr erfahren
            </a>
            <a href="tel:+41444310033" class="block w-full text-center border-2 border-cyan-600 text-cyan-600 px-4 py-2 rounded hover:bg-cyan-50 transition" aria-label="Fahrschule Reichenburg anrufen">
              📞 +41 44 431 00 33
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Category Section -->
    <section class="section-container py-16 bg-gray-50">
      <h2 class="text-3xl font-bold mb-8 text-center">Nach Kategorien suchen?</h2>
      <p class="text-center text-gray-600 mb-12 max-w-3xl mx-auto">
        Möchtest du eine bestimmte Fahrschule Kategorie vergleichen? Schau dir unseren Kategorien-Vergleich an.
      </p>
      <div class="text-center">
        <a href="/fahrschule-kategorien/" class="inline-block bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 transition font-semibold" aria-label="Zu Fahrschule Kategorien Vergleich">
          🔍 Kategorien vergleichen
        </a>
      </div>
    </section>

    <!-- CTA Section -->
    <CtaSection title="Finde deinen nächsten Standort!" />
  </div>
</template>

<script setup lang="ts">
// Fahrschule Standorte Hub Page
</script>
