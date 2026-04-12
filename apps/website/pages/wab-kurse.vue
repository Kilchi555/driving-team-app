<template>
  <div>
    <Head>
      <Title>WAB Kurse | Weiterbildung nach Fahrprüfung | Driving Team</Title>
      <Meta name="description" content="WAB Kurse (Weiterausbildung) beim Driving Team. In Zürich und Schwyz. Ab CHF 290.- pro Kurs. Obligatorisch für Neulenker innert 12 Monaten nach Fahrprüfung." />
      <Meta property="og:title" content="WAB Kurse – Weiterbildung nach Fahrprüfung | Driving Team" />
      <Meta property="og:description" content="Obligatorische WAB Kurse für Neulenker. Innert 12 Monaten nach Fahrprüfung. Ab CHF 290.-. Standorte Pfäffikon ZH, Tuggen SZ & English." />
      <Meta property="og:url" content="https://drivingteam.ch/wab-kurse/" />
      <Link rel="canonical" href="https://drivingteam.ch/wab-kurse/" />
      <Link rel="alternate" hreflang="de-CH" href="https://drivingteam.ch/wab-kurse/" />
      <Link rel="alternate" hreflang="en" href="https://drivingteam.ch/wab-course-english/" />
      <Link rel="alternate" hreflang="x-default" href="https://drivingteam.ch/wab-kurse/" />
      
      
          <Meta property="og:image" content="https://drivingteam.ch/images/wab-kurs-hero.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
          <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <!-- Hero with Standorte Selection -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-8 md:py-12">
      <div class="section-container">
        <h1 class="heading-lg text-white mb-6 text-center">WAB Kurse</h1>
        <p class="text-xl text-white mb-8 text-center">Wähle deine Option:</p>
        
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
          <a href="https://www.simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">📅 Jetzt anmelden</a>
          <a href="tel:+41444310033" class="btn-primary bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary-600 text-lg">📞 +41 44 431 00 33</a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const jsonLdScripts = [
  { type: 'application/ld+json', innerHTML:  JSON.stringify({ "@context": "https://schema.org", "@type": "Course", "name": "WAB Kurs – Weiterbildung nach Fahrprüfung", "description": "Obligatorische Weiterbildung für Neulenker innerhalb 12 Monaten nach bestandener Fahrprüfung.", "url": "https://drivingteam.ch/wab-kurse/", "provider": { "@type": "Organization", "name": "Driving Team Fahrschule", "url": "https://drivingteam.ch" }, "offers": { "@type": "Offer", "price": "290", "priceCurrency": "CHF", "availability": "https://schema.org/InStock" }, "hasCourseInstance": [{ "@type": "CourseInstance", "courseMode": "onsite", "location": { "@type": "Place", "name": "Pfäffikon ZH" } }, { "@type": "CourseInstance", "courseMode": "onsite", "location": { "@type": "Place", "name": "Tuggen SZ" } }] }) },
  { type: 'application/ld+json', innerHTML:  JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" }, { "@type": "ListItem", "position": 2, "name": "WAB Kurse", "item": "https://drivingteam.ch/wab-kurse/" }] }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [ { "@type": "Question", "name": "Was ist der WAB Kurs?", "acceptedAnswer": { "@type": "Answer", "text": "Der WAB Kurs (Weiterbildungskurs Auto) ist eine obligatorische Weiterbildung für alle Neulenker der Kategorie B. Du musst ihn innerhalb der ersten 12 Monate nach bestandener Fahrprüfung absolvieren. Er umfasst einen Kurstag." } }, { "@type": "Question", "name": "Was passiert, wenn ich den WAB Kurs nicht rechtzeitig absolviere?", "acceptedAnswer": { "@type": "Answer", "text": "Wenn du den WAB Kurs nicht innerhalb von 12 Monaten nach bestandener Fahrprüfung absolvierst, verliert dein Führerschein seine Gültigkeit." } }, { "@type": "Question", "name": "Was kostet der WAB Kurs?", "acceptedAnswer": { "@type": "Answer", "text": "Der WAB Kurs kostet ab CHF 290.- pro Kurstag. Es gibt nur einen Kurstag, den du innerhalb von 12 Monaten absolvieren musst." } }, { "@type": "Question", "name": "Wo bietet Driving Team den WAB Kurs an?", "acceptedAnswer": { "@type": "Answer", "text": "Unsere Partner Fahrschule bietet den WAB Kurs in Pfäffikon ZH (Transportschule) und Tuggen SZ (Verkehrszentrum Tuggen) und auf Englisch an." } }, { "@type": "Question", "name": "Kann ich den WAB Kurs auch auf Englisch machen?", "acceptedAnswer": { "@type": "Answer", "text": "Ja! Wir bieten den WAB Kurs auch auf Englisch an — ideal für Expats und internationale Einwohner der Schweiz." } } ] }) },
]
useHead({ script: jsonLdScripts })

</script>
