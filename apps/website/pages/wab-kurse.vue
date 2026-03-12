<template>
  <div>
    <Head>
      <Title>WAB Kurse | Weiterbildung nach Fahrprüfung | Driving Team</Title>
      <Meta name="description" content="WAB Kurse (Weiterausbildung) beim Driving Team. In Zürich und Schwyz. Ab CHF 290.- pro Kurs. Obligatorisch für Neulenker innert 12 Monaten nach Fahrprüfung." />
      <Meta property="og:title" content="WAB Kurse – Weiterbildung nach Fahrprüfung | Driving Team" />
      <Meta property="og:description" content="Obligatorische WAB Kurse für Neulenker. Innert 12 Monaten nach Fahrprüfung. Ab CHF 290.-. Standorte Pfäffikon ZH, Tuggen SZ & English." />
      <Link rel="canonical" href="https://drivingteam.ch/wab-kurse/" />
      <Script type="application/ld+json">{{ JSON.stringify({ "@context": "https://schema.org", "@type": "Course", "name": "WAB Kurs – Weiterbildung nach Fahrprüfung", "description": "Obligatorische Weiterbildung für Neulenker innerhalb 12 Monaten nach bestandener Fahrprüfung.", "url": "https://drivingteam.ch/wab-kurse/", "provider": { "@type": "Organization", "name": "Driving Team Fahrschule", "url": "https://drivingteam.ch" }, "offers": { "@type": "Offer", "price": "290", "priceCurrency": "CHF", "availability": "https://schema.org/InStock" }, "hasCourseInstance": [{ "@type": "CourseInstance", "courseMode": "onsite", "location": { "@type": "Place", "name": "Pfäffikon ZH" } }, { "@type": "CourseInstance", "courseMode": "onsite", "location": { "@type": "Place", "name": "Tuggen SZ" } }] }) }}</Script>
      <Script type="application/ld+json">{{ JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" }, { "@type": "ListItem", "position": 2, "name": "WAB Kurse", "item": "https://drivingteam.ch/wab-kurse/" }] }) }}</Script>
    </Head>

    <!-- Hero with Standorte Selection -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-8 md:py-12">
      <div class="section-container">
        <h1 class="heading-lg text-white mb-6 text-center">WAB Kurse</h1>
        <p class="text-xl text-primary-100 mb-8 text-center">Wähle deine Option:</p>
        
        <div class="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <a href="/wab-kurse-zuerich/" class="bg-white text-gray-900 border-2 border-white rounded-lg p-6 hover:shadow-lg hover:bg-primary-50 transition transform hover:scale-105 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <p class="text-3xl">📍</p>
              <div>
                <h3 class="font-bold">Pfäffikon</h3>
                <p class="text-xs text-gray-600">ZH</p>
              </div>
            </div>
            <p class="text-primary-600 font-semibold text-lg">→</p>
          </a>
          <a href="/wab-kurse-schwyz/" class="bg-white text-gray-900 border-2 border-white rounded-lg p-6 hover:shadow-lg hover:bg-primary-50 transition transform hover:scale-105 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <p class="text-3xl">📍</p>
              <div>
                <h3 class="font-bold">Tuggen</h3>
                <p class="text-xs text-gray-600">SZ</p>
              </div>
            </div>
            <p class="text-primary-600 font-semibold text-lg">→</p>
          </a>
          <a href="/wab-course-english/" class="bg-white text-gray-900 border-2 border-white rounded-lg p-6 hover:shadow-lg hover:bg-primary-50 transition transform hover:scale-105 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <p class="text-3xl">🇬🇧</p>
              <h3 class="font-bold">English</h3>
            </div>
            <p class="text-primary-600 font-semibold text-lg">→</p>
          </a>
        </div>
      </div>
    </section>

    <!-- Was ist WAB -->
    <section class="section-container">
      <h2 class="heading-md mb-8 text-center">Was ist der WAB Kurs?</h2>
      <div class="max-w-3xl mx-auto text-gray-700 space-y-4">
        <p>Der WAB Kurs (Weiterbildungskurs Autofahren) ist eine obligatorische Weiterbildung für alle Neulenker. Du musst ihn innerhalb der ersten 12 Monate nach bestandener Fahrprüfung absolvieren. Er umfasst zwei Kurstage.</p>
        <p>Nach drei Jahren Probezeit und erfolgreich absolviertem WAB Kurs kannst du den unbefristeten Führerschein beantragen.</p>
      </div>
    </section>

    <!-- CTA -->
    <section class="bg-primary-600 text-white py-16">
      <div class="section-container text-center">
        <h2 class="heading-md mb-6 text-white">Jetzt WAB Kurs buchen!</h2>
        <div class="flex flex-col md:flex-row gap-4 justify-center">
          <a href="https://simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">📅 Jetzt anmelden</a>
          <a href="tel:+41444310033" class="btn-primary bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary-600 text-lg">📞 +41 44 431 00 33</a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
</script>
