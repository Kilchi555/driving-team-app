<template>
  <div>
    <Head>
      <Title>VKU Kurs | Verkehrskundeunterricht | Driving Team</Title>
      <Meta name="description" content="VKU Kurs beim Driving Team. Verkehrskundeunterricht in Zürich und Lachen. 8 Stunden in 2 Teilen à 4 Stunden. CHF 190.- inkl. Dokumentation. Jetzt anmelden!" />
      <Meta property="og:title" content="VKU Kurs – Verkehrskundeunterricht | Driving Team" />
      <Meta property="og:description" content="Obligatorischer VKU Kurs vor der Fahrprüfung. 8 Stunden, CHF 190.- inkl. Dokumentation. Standorte Zürich & Lachen." />
      <Meta property="og:url" content="https://drivingteam.ch/vku-kurse/" />
      <Link rel="canonical" href="https://drivingteam.ch/vku-kurse/" />
      
      
    </Head>

    <!-- Hero with Standorte Selection -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-8 md:py-12">
      <div class="section-container">
        <h1 class="heading-lg text-white mb-6 text-center">VKU Kurse</h1>
        <p class="text-xl text-white mb-8 text-center">Wähle deinen Standort:</p>
        
        <div class="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <a href="/vku-kurs-zuerich/" class="bg-white text-gray-900 border-2 border-white rounded-lg p-6 hover:shadow-lg hover:bg-primary-50 transition transform hover:scale-105 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <p class="text-3xl">📍</p>
              <h3 class="font-bold">Zürich</h3>
            </div>
            <p class="text-primary-600 font-semibold text-lg">→</p>
          </a>
          <a href="/vku-kurs-lachen/" class="bg-white text-gray-900 border-2 border-white rounded-lg p-6 hover:shadow-lg hover:bg-primary-50 transition transform hover:scale-105 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <p class="text-3xl">📍</p>
              <h3 class="font-bold">Lachen</h3>
            </div>
            <p class="text-primary-600 font-semibold text-lg">→</p>
          </a>
        </div>
      </div>
    </section>

    <!-- Was ist VKU -->
    <section class="section-container">
      <h2 class="heading-md mb-8 text-center">Was ist der VKU Kurs?</h2>
      <div class="max-w-3xl mx-auto text-gray-700 space-y-4">
        <p>Der VKU Kurs (Verkehrskundeunterricht) ist ein obligatorischer Kurs, den du vor der Anmeldung zur Praktischen Führerprüfung absolvieren musst. Im total achtstündigen VKU Kurs wirst du ausführlich auf den Alltag im Strassenverkehr vorbereitet.</p>
        <p>Der VKU Kurs ist in der ganzen Schweiz der gleiche und die Bestätigung ist ebenfalls für die ganze Schweiz gültig. Es ist also rechtlich egal, von welchem Kanton dein Lernfahrausweis ausgestellt wurde – der VKU Kurs gilt überall.</p>
      </div>
    </section>

    <!-- CTA -->
    <section class="bg-primary-600 text-white py-16">
      <div class="section-container text-center">
        <h2 class="heading-md mb-6 text-white">Jetzt VKU Kurs buchen!</h2>
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
  { type: 'application/ld+json', innerHTML:  JSON.stringify({ "@context": "https://schema.org", "@type": "Course", "name": "VKU Kurs – Verkehrskundeunterricht", "description": "Obligatorischer Verkehrskundeunterricht vor der praktischen Führerprüfung. 8 Stunden in 2 Teilen.", "url": "https://drivingteam.ch/vku-kurse/", "provider": { "@type": "Organization", "name": "Driving Team Fahrschule", "url": "https://drivingteam.ch" }, "offers": { "@type": "Offer", "price": "190", "priceCurrency": "CHF", "availability": "https://schema.org/InStock" }, "hasCourseInstance": [{ "@type": "CourseInstance", "courseMode": "onsite", "location": { "@type": "Place", "name": "Zürich" } }, { "@type": "CourseInstance", "courseMode": "onsite", "location": { "@type": "Place", "name": "Lachen" } }] }) },
  { type: 'application/ld+json', innerHTML:  JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" }, { "@type": "ListItem", "position": 2, "name": "VKU Kurse", "item": "https://drivingteam.ch/vku-kurse/" }] }) },
]
useHead({ script: jsonLdScripts })

</script>
