<template>
  <div>
    <Head>
      <Title>Weiterbildungen | CZV, WAB, Motorrad | Driving Team</Title>
      <Meta name="description" content="Weiterbildungen für Fahrer beim Driving Team. CZV Kurse, WAB Kurse, Motorrad Weiterbildung und Fahrlehrer Weiterbildung. Professionelle Schulung in Zürich und Lachen." />
      <Meta property="og:title" content="Weiterbildungen – CZV, WAB, Motorrad & mehr | Driving Team" />
      <Meta property="og:description" content="Professionelle Weiterbildungen: CZV, WAB, Motorrad & Fahrlehrer. Zürich & Lachen." />
      <Meta property="og:url" content="https://drivingteam.ch/weiterbildungen/" />
      <Link rel="canonical" href="https://drivingteam.ch/weiterbildungen/" />
      
          <Meta property="og:image" content="https://drivingteam.ch/images/og-image.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
          <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-16 md:py-24">
      <div class="section-container text-center">
        <h1 class="heading-lg text-white mb-6">Weiterbildungen</h1>
        <p class="text-xl text-white mb-8">Professionelle Schulung für erfahrene Fahrer in Zürich und Lachen</p>
        <a href="https://www.simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
          📅 Termin buchen
        </a>
      </div>
    </section>

    <section class="section-container py-20">
      <h2 class="heading-md mb-12">Unsere Weiterbildungen</h2>
      
      <div class="grid md:grid-cols-2 gap-8 mb-12">
        <a href="/czv-kurse/" class="bg-white border-2 border-gray-200 rounded-lg p-8 hover:shadow-lg hover:border-primary-400 transition">
          <p class="text-4xl mb-4">🚚</p>
          <h3 class="heading-sm mb-2">CZV Kurse</h3>
          <p class="text-gray-600">Berufliche Weiterbildung für Berufschauffeure (Lastwagen & Bus). Grundkurs und 5 x 7h Weiterbildung.</p>
        </a>

        <a href="/wab-kurse/" class="bg-white border-2 border-gray-200 rounded-lg p-8 hover:shadow-lg hover:border-primary-400 transition">
          <p class="text-4xl mb-4">⚡</p>
          <h3 class="heading-sm mb-2">WAB Kurse</h3>
          <p class="text-gray-600">Obligatorische Weiterbildung für Neulenker. In Zürich (Pfäffikon ZH) und Schwyz (Tuggen). Ab CHF 290.-</p>
        </a>

        <a href="/motorrad-weiterbildung/" class="bg-white border-2 border-gray-200 rounded-lg p-8 hover:shadow-lg hover:border-primary-400 transition">
          <p class="text-4xl mb-4">🏍️</p>
          <h3 class="heading-sm mb-2">Motorrad Weiterbildung</h3>
          <p class="text-gray-600">Schräglagen-Training und Prüfungsvorbereitungskurs für Motorradfahrer.</p>
        </a>

        <a href="/fahrlehrerweiterbildung/" class="bg-white border-2 border-gray-200 rounded-lg p-8 hover:shadow-lg hover:border-primary-400 transition">
          <p class="text-4xl mb-4">👨‍🏫</p>
          <h3 class="heading-sm mb-2">Fahrlehrer Weiterbildung</h3>
          <p class="text-gray-600">Obligatorische Weiterbildung für Fahrlehrerinnen und Fahrlehrer gemäss Gesetz.</p>
        </a>
      </div>

      <div class="text-center">
        <a href="mailto:info@drivingteam.ch" class="btn-primary">
          ✉️ Anfrage stellen
        </a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const jsonLdScripts = [
  { type: 'application/ld+json', innerHTML: JSON.stringify({ "@context": "https://schema.org", "@type": "CollectionPage", "name": "Weiterbildungen Driving Team", "description": "Übersicht aller Weiterbildungsangebote der Fahrschule Driving Team.", "url": "https://drivingteam.ch/weiterbildungen/" }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" }, { "@type": "ListItem", "position": 2, "name": "Weiterbildungen", "item": "https://drivingteam.ch/weiterbildungen/" }] }) },
]
useHead({ script: jsonLdScripts })

</script>
