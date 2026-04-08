<template>
  <div>
    <Head>
      <Title>Anhängerprüfung Schweiz – Kategorie BE | Zürich & Lachen</Title>
      <Meta name="description" content="Anhängerprüfung Schweiz Kategorie BE ✓ Kein Theorietest ✓ Prüfungsort Regensdorf & Wettingen (Zürich) oder Pfäffikon SZ (Lachen) ✓ Jetzt Fahrstunden buchen!" />
      <Meta name="keywords" content="Anhängerprüfung Schweiz, Anhänger Prüfung, Kategorie BE, anhänger führerschein schweiz, BE prüfung, kategorie be maximalgewicht" />
      <Meta property="og:title" content="Anhängerprüfung Schweiz – Kategorie BE | Driving Team" />
      <Meta property="og:description" content="Alles zur Anhängerprüfung Kategorie BE: Voraussetzungen, Ablauf, Kosten und Standorte Zürich & Lachen." />
      <Meta property="og:url" content="https://drivingteam.ch/anhaenger-pruefung/" />
      <Link rel="canonical" href="https://drivingteam.ch/anhaenger-pruefung/" />
      <Meta property="og:image" content="https://drivingteam.ch/images/categories/anhaenger-fahrschule-hero.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
      <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <BreadcrumbNav :breadcrumbs="[{ label: 'Fahrschule', href: '/' }, { label: 'Anhänger Fahrschule', href: '/anhaenger-fahrschule/' }, { label: 'Anhängerprüfung' }]" />

    <!-- Hero -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-8 md:py-12">
      <div class="section-container">
        <h1 class="heading-lg text-white mb-6 text-center">Anhängerprüfung Schweiz</h1>
        <p class="text-xl text-white mb-8 text-center">Wähle deinen Standort:</p>

        <div class="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <a href="/anhaenger-pruefung-zuerich/" class="bg-white text-gray-900 border-2 border-white rounded-lg p-6 hover:shadow-lg hover:bg-primary-50 transition transform hover:scale-105 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <p class="text-3xl">📍</p>
              <div>
                <h3 class="font-bold text-lg">Zürich</h3>
                <p class="text-xs text-gray-500">Prüfung Regensdorf & Wettingen</p>
              </div>
            </div>
            <p class="text-primary-600 font-semibold text-lg">→</p>
          </a>
          <a href="/anhaenger-pruefung-lachen/" class="bg-white text-gray-900 border-2 border-white rounded-lg p-6 hover:shadow-lg hover:bg-primary-50 transition transform hover:scale-105 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <p class="text-3xl">📍</p>
              <div>
                <h3 class="font-bold text-lg">Lachen SZ</h3>
                <p class="text-xs text-gray-500">Prüfung Pfäffikon SZ</p>
              </div>
            </div>
            <p class="text-primary-600 font-semibold text-lg">→</p>
          </a>
        </div>
      </div>
    </section>

    <!-- Was ist Kategorie BE? -->
    <section class="section-container">
      <h2 class="heading-md mb-8 text-center">Was ist die Anhängerprüfung Kategorie BE?</h2>
      <div class="max-w-3xl mx-auto text-gray-700 space-y-4">
        <p>Die Anhängerprüfung (Kategorie BE) erlaubt das Ziehen von Anhängern bis <strong>14'000 kg Gesamtzugsgewicht</strong>. Kein Nothelferkurs, keine Theorieprüfung – nur die praktische Prüfung beim Strassenverkehrsamt.</p>
        <p>Mit wenigen Fahrstunden zum Ziel: Durchschnittlich <strong>4–8 Lektionen</strong> genügen, um zur Prüfung bereit zu sein.</p>
      </div>
    </section>

    <!-- CTA -->
    <section class="bg-primary-600 text-white py-16">
      <div class="section-container text-center">
        <h2 class="heading-md mb-6 text-white">Jetzt zur Anhängerprüfung anmelden!</h2>
        <div class="flex flex-col md:flex-row gap-4 justify-center">
          <a href="https://www.simy.ch/booking/availability/driving-team?service=BE" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">📅 Jetzt Fahrstunden buchen</a>
          <a href="tel:+41444310033" class="btn-primary bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary-600 text-lg">📞 +41 44 431 00 33</a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const jsonLdScripts = [
  { type: 'application/ld+json', innerHTML: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" },
      { "@type": "ListItem", "position": 2, "name": "Anhänger Fahrschule", "item": "https://drivingteam.ch/anhaenger-fahrschule/" },
      { "@type": "ListItem", "position": 3, "name": "Anhängerprüfung", "item": "https://drivingteam.ch/anhaenger-pruefung/" }
    ]
  }) }
]
useHead({ script: jsonLdScripts })
definePageMeta({ layout: 'default' })
</script>
