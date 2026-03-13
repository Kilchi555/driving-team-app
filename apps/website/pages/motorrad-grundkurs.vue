<template>
  <div>
    <Head>
      <Title>Motorrad Grundkurs | Sicher Motorrad fahren lernen | Driving Team</Title>
      <Meta name="description" content="Motorrad Grundkurs beim Driving Team. In Zürich, Lachen, Zug und Einsiedeln. 3 x 4h praxisorientierter Kurs. Max. 5 Teilnehmer. CHF 499.-. Jetzt anmelden!" />
      <Meta property="og:title" content="Motorrad Grundkurs – Zürich, Lachen, Zug & Einsiedeln | Driving Team" />
      <Meta property="og:description" content="Motorrad Grundkurs an 4 Standorten. 3x4h, max. 5 Teilnehmer, ab CHF 499.-. Alle Kategorien A1, A2, A." />
      <Meta property="og:url" content="https://drivingteam.ch/motorrad-grundkurs/" />
      <Link rel="canonical" href="https://drivingteam.ch/motorrad-grundkurs/" />
      
      
    </Head>

    <!-- Hero with Standorte Selection -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-8 md:py-12">
      <div class="section-container">
        <h1 class="heading-lg text-white mb-6 text-center">Motorrad Grundkurs</h1>
        <p class="text-xl text-white mb-8 text-center">Wähle deinen Standort:</p>
        
        <div class="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <a href="/motorrad-grundkurs-zuerich/" class="bg-white text-gray-900 border-2 border-white rounded-lg p-6 hover:shadow-lg hover:bg-primary-50 transition transform hover:scale-105 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <p class="text-3xl">🏍️</p>
              <h3 class="font-bold">Zürich</h3>
            </div>
            <p class="text-primary-600 font-semibold text-lg">→</p>
          </a>
          <a href="/motorrad-grundkurs-lachen/" class="bg-white text-gray-900 border-2 border-white rounded-lg p-6 hover:shadow-lg hover:bg-primary-50 transition transform hover:scale-105 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <p class="text-3xl">🏍️</p>
              <h3 class="font-bold">Lachen</h3>
            </div>
            <p class="text-primary-600 font-semibold text-lg">→</p>
          </a>
          <a href="/motorrad-grundkurs-zug/" class="bg-white text-gray-900 border-2 border-white rounded-lg p-6 hover:shadow-lg hover:bg-primary-50 transition transform hover:scale-105 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <p class="text-3xl">🏍️</p>
              <h3 class="font-bold">Zug</h3>
            </div>
            <p class="text-primary-600 font-semibold text-lg">→</p>
          </a>
          <a href="/motorrad-grundkurs-einsiedeln/" class="bg-white text-gray-900 border-2 border-white rounded-lg p-6 hover:shadow-lg hover:bg-primary-50 transition transform hover:scale-105 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <p class="text-3xl">🏍️</p>
              <h3 class="font-bold">Einsiedeln</h3>
            </div>
            <p class="text-primary-600 font-semibold text-lg">→</p>
          </a>
        </div>
      </div>
    </section>

    <!-- Was ist Motorrad Grundkurs -->
    <section class="section-container">
      <h2 class="heading-md mb-8 text-center">Was ist der Motorrad Grundkurs?</h2>
      <div class="max-w-3xl mx-auto text-gray-700 space-y-4">
        <p>Der Motorrad Grundkurs ist eine praxisorientierte Ausbildung für angehende Motorradfahrer. Du lernst die wichtigsten Techniken und Sicherheitsaspekte unter Anleitung erfahrener Motorrad-Fahrlehrer:innen.</p>
        <p>Der Kurs umfasst drei Teile à 4 Stunden und wird an mehreren Standorten angeboten. Die maximale Teilnehmerzahl liegt bei 5 Personen, um eine persönliche Betreuung zu gewährleisten.</p>
      </div>
    </section>

    <!-- Warum Section -->
    <WarumSection category="motorrad" />

    <!-- CTA -->
    <section class="bg-primary-600 text-white py-16">
      <div class="section-container text-center">
        <h2 class="heading-md mb-6 text-white">Jetzt Motorrad Grundkurs buchen!</h2>
        <div class="flex flex-col md:flex-row gap-4 justify-center">
          <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">📅 Jetzt anmelden</a>
          <a href="tel:+41444310033" class="btn-primary bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary-600 text-lg">📞 +41 44 431 00 33</a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const jsonLdScripts = [
  { type: 'application/ld+json', innerHTML:  JSON.stringify({ "@context": "https://schema.org", "@type": "Course", "name": "Motorrad Grundkurs", "description": "Praxisorientierter Motorrad Grundkurs für alle Kategorien. 3x4h, max. 5 Teilnehmer.", "url": "https://drivingteam.ch/motorrad-grundkurs/", "provider": { "@type": "Organization", "name": "Driving Team Fahrschule", "url": "https://drivingteam.ch" }, "offers": { "@type": "Offer", "price": "499", "priceCurrency": "CHF" }, "hasCourseInstance": [{ "@type": "CourseInstance", "courseMode": "onsite", "location": { "@type": "Place", "name": "Zürich" } }, { "@type": "CourseInstance", "courseMode": "onsite", "location": { "@type": "Place", "name": "Lachen" } }, { "@type": "CourseInstance", "courseMode": "onsite", "location": { "@type": "Place", "name": "Zug" } }, { "@type": "CourseInstance", "courseMode": "onsite", "location": { "@type": "Place", "name": "Einsiedeln" } }] }) },
  { type: 'application/ld+json', innerHTML:  JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" }, { "@type": "ListItem", "position": 2, "name": "Motorrad Grundkurs", "item": "https://drivingteam.ch/motorrad-grundkurs/" }] }) },
]
useHead({ script: jsonLdScripts })

</script>
