<template>
  <div>
    <Head>
      <Title>Fahrschule Uitikon | Waldegg & Whiskeypass | Driving Team</Title>
      <Meta name="description" content="Fahrschule Uitikon Waldegg ✓ Fahrlehrer Skender ✓ Whiskeypass, Alte Waldegg & Stallikon ✓ Rechtsvortritte Uitikon ✓ Prüfung Albisgütli ✓ DE/EN/AL ✓ Ab CHF 95.-. Jetzt buchen!" />
      <Meta name="keywords" content="Fahrschule Uitikon, Fahrschule Uitikon Waldegg, Fahrstunden Uitikon, Fahrlehrer Uitikon, Führerschein Uitikon, Auto Fahrschule Uitikon Waldegg" />
      <Meta property="og:title" content="Fahrschule Uitikon Waldegg – Alte Waldegg & Whiskeypass | Driving Team" />
      <Meta property="og:description" content="Fahrschule Uitikon Waldegg mit Fahrlehrer Skender. Whiskeypass, Stallikon → Uitikon, Parkplatz Waldegg. Überraschende Rechtsvortritte. Prüfung Albisgütli." />
      <Meta property="og:url" content="https://drivingteam.ch/fahrschule-uitikon/" />
      <Link rel="canonical" href="https://drivingteam.ch/fahrschule-uitikon/" />
      <Meta property="og:image" content="https://drivingteam.ch/images/locations/dietikon-hero.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
      <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <!-- Hero -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-8 xs:py-16 md:py-24 relative overflow-hidden">
      <img src="/images/locations/dietikon-hero.webp" alt="Fahrstunden Uitikon Waldegg – Alte Waldegg Whiskeypass Prüfungsrouten" class="absolute inset-0 w-full h-full object-cover opacity-100" fetchpriority="high" loading="eager" width="1920" height="1080" />
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="section-container relative z-10">
        <div class="max-w-3xl">
          <p class="text-primary-200 text-sm font-semibold uppercase tracking-widest mb-3">Fahrschule Driving Team</p>
          <h1 class="heading-lg text-white mb-4">Fahrschule Uitikon Waldegg</h1>
          <p class="text-base xs:text-xl text-white mb-6">Skender kennt jede Kurve rund um Uitikon – Alte Waldegg, Whiskeypass, Stallikon und die überraschenden Rechtsvortritte in Uitikon und Ringlikon. Professionell vorbereitet für die Prüfung am StVA Albisgütli.</p>
          <div class="flex flex-wrap gap-2 mb-6">
            <span class="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-semibold px-3 py-1.5 rounded-full">📍 Zentrum Uitikon · Alte Waldegg</span>
            <span class="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-semibold px-3 py-1.5 rounded-full">⭐ 5.0 · 414 Bewertungen</span>
            <span class="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-semibold px-3 py-1.5 rounded-full">🗣️ DE / EN / Albanisch</span>
          </div>
          <a href="https://app.simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
            ✨ Jetzt Termin buchen
          </a>
        </div>
      </div>
    </section>

    <FeatureSection
      title="Warum Driving Team Uitikon?"
      subtitle="Wir üben genau dort, wo die Prüfung stattfindet – Alte Waldegg, Whiskeypass, Stallikon → Uitikon. Keine Überraschungen an der Prüfung."
      :extras="['<strong>Alte Waldegg</strong> – wir üben auf dem grossen Parkplatz', '<strong>Rechtsvortritte</strong> Uitikon & Ringlikon – wir fahren alle kritischen Stellen', '414+ Google-Bewertungen · 5.0 Sterne']"
    />

    <section class="py-10 bg-gray-50 text-center">
      <div class="section-container">
        <p class="text-gray-600 mb-4 text-sm">Was kostet deine Fahrausbildung in Uitikon?</p>
        <PriceCalculator title="Kostenrechner Fahrschule Uitikon" />
      </div>
    </section>

    <InstructorProfileSection :instructors="instructors" />

    <div class="bg-gray-50">
      <LazyStandortMapSection location-key="zuerich" />
    </div>

    <AusbildungsthemenSection location="Uitikon Waldegg" />
    <ReviewsSection category="zuerich" />
    <CtaSection title="Jetzt in Uitikon starten!" />
    <PriceSection />

    <!-- Prüfungsgebiet Uitikon – UNIQUE CONTENT -->
    <section class="section-container py-12">
      <div class="max-w-3xl mx-auto">
        <h2 class="heading-md mb-4">Prüfungsgebiet Uitikon – Die Strecken, die zählen</h2>
        <p class="text-gray-700 mb-6">Uitikon Waldegg liegt am Rand des Prüfungsgebiets Albisgütli – und genau das macht die Fahrprüfung hier besonders anspruchsvoll. Die Kombination aus Waldhang, Siedlungsgebiet und Verbindungsstrassen nach Zürich sorgt für abwechslungsreiche Prüfungssituationen.</p>

        <!-- Waldegg Parkplatz -->
        <div class="bg-green-50 border border-green-200 rounded-xl p-5 mb-6">
          <h3 class="font-bold text-green-900 mb-2">🅿️ Parkplatz Waldegg – Unser Übungsgelände</h3>
          <p class="text-green-800 text-sm leading-relaxed">Der grosse Parkplatz auf der Waldegg ist einer der beliebtesten Übungsorte für Einparkmanöver, Wenden und Rückwärtsfahren im gesamten Prüfungsgebiet. Wir nutzen ihn regelmässig für gezielte Manöver-Übungen – damit du diese Situationen an der Prüfung sicher beherrschst.</p>
        </div>

        <!-- Stallikon Route -->
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
          <h3 class="font-bold text-blue-900 mb-2">🛣️ Stallikon → Uitikon – Kurvenreiche Verbindungsstrecke</h3>
          <p class="text-blue-800 text-sm leading-relaxed">Die Strecke von Stallikon nach Uitikon ist eine der kurvenreichsten und anspruchsvollsten Verbindungsstrassen im Prüfungsgebiet. Enger Strassenquerschnitt, wechselnde Kurvenradien und Begegnungsverkehr – ideal für die Ausbildung. Fahrschüler die diese Route kennen, sind klar im Vorteil.</p>
        </div>

        <h3 class="font-bold text-gray-900 mb-3">Alle relevanten Prüfungsstrecken Uitikon</h3>
        <ul class="space-y-2 text-gray-700 mb-6">
          <li class="flex gap-2"><span class="text-primary-600 font-bold">→</span> <strong>Alte Waldegg</strong> – Kurvenreiche Waldstrecke, Parkplatz für Manöver</li>
          <li class="flex gap-2"><span class="text-primary-600 font-bold">→</span> <strong>Whiskeypass</strong> – Strecke mit wechselnden Tempolimits und Kurven</li>
          <li class="flex gap-2"><span class="text-primary-600 font-bold">→</span> <strong>Rechtsvortritte Uitikon & Ringlikon</strong> – unscheinbar, aber prüfungsrelevant</li>
          <li class="flex gap-2"><span class="text-primary-600 font-bold">→</span> <strong>Autobahnauffahrten Uitikon</strong> (A3) – Einfahren und Ausfahren</li>
          <li class="flex gap-2"><span class="text-primary-600 font-bold">→</span> <strong>Richtung Altstetten / Albisgütli</strong> – Stadteinfahrt Zürich</li>
        </ul>
        <div class="flex flex-wrap gap-2 text-sm">
          <span class="bg-primary-50 text-primary-700 px-3 py-1 rounded-full">📍 Uitikon Waldegg, Ringlikon</span>
          <span class="bg-primary-50 text-primary-700 px-3 py-1 rounded-full">📍 Birmensdorf, Stallikon, Urdorf</span>
          <span class="bg-gray-100 text-gray-700 px-3 py-1 rounded-full">🗣️ Deutsch, Englisch & Albanisch</span>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="py-16 bg-white">
      <div class="section-container">
        <h2 class="heading-md mb-10 text-center">Häufige Fragen zur Fahrschule Uitikon</h2>
        <div class="faq-masonry">
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Was ist der Parkplatz Waldegg und warum ist er beim Driving Team beliebt?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Der grosse Parkplatz auf der Waldegg in Uitikon ist ideal für Manöver-Übungen wie Einparken, Wenden und Rückwärtsfahren. Wir nutzen ihn regelmässig in der Ausbildung, da er geräumig, verkehrsarm und gut erreichbar ist.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wo findet die Fahrprüfung für Uitikon statt?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Die Fahrprüfung findet am Strassenverkehrsamt Zürich-Albisgütli statt. Uitikon liegt direkt im Prüfungsgebiet – Skender kennt alle Routen und bereitet dich auf genau diese Strecken vor.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie komme ich als Uitikon-Bewohner zum Fahrlehrer?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Der Treffpunkt ist das <strong>Zentrum Uitikon</strong>. Nach Absprache sind auch flexible Treffpunkte direkt bei dir möglich. Uitikon ist gut erreichbar via Bus Richtung Schlieren oder Altstetten.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Was kostet die Fahrausbildung in Uitikon?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Eine Fahrstunde (45 Min.) kostet CHF 95.-. Mit 15 Lektionen inkl. VKU, Nothelferkurs und Prüfungsgebühren kommt man auf ca. CHF 2'250.–, mit 30 Lektionen auf ca. CHF 3'530.–.</p>
          </details>
        </div>
      </div>
    </section>

    <!-- Internal Links -->
    <section class="py-12 bg-gray-50">
      <div class="section-container">
        <h2 class="text-xl font-semibold text-gray-900 mb-6">Passende Angebote in Uitikon & Umgebung</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <a href="/fahrschule-birmensdorf/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Fahrschule Birmensdorf</a>
          <a href="/fahrschule-wettswil/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Fahrschule Wettswil</a>
          <a href="/fahrschule-urdorf/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Fahrschule Urdorf</a>
          <a href="/fahrschule-schlieren/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Fahrschule Schlieren</a>
          <a href="/auto-fahrschule-zuerich/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Auto Fahrschule Zürich</a>
          <a href="/vku-kurs-zuerich/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">VKU Kurs Zürich</a>
          <a href="/fahrschule-preise/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Preise & Kosten</a>
          <a href="/fahrschule-standorte/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Alle Standorte</a>
        </div>
      </div>
    </section>

    <div class="bg-gray-50"><GutscheinSection /></div>
    <CtaSection title="Bereit? Jetzt Termin buchen!" />
    <StandorteSection exclude="uitikon" />
    <WarumSection category="zuerich" />
  </div>
</template>

<script setup lang="ts">
const jsonLdScripts = [
  { type: 'application/ld+json', innerHTML: JSON.stringify({ "@context": "https://schema.org", "@type": ["DrivingSchool", "LocalBusiness"], "name": "Driving Team Fahrschule Uitikon Waldegg", "description": "Professionelle Fahrausbildung in Uitikon Waldegg. Fahrlehrer Skender kennt Alte Waldegg, Whiskeypass, Rechtsvortritte Uitikon/Ringlikon und alle Prüfungsrouten des StVA Albisgütli.", "url": "https://drivingteam.ch/fahrschule-uitikon/", "telephone": "+41444310033", "address": { "@type": "PostalAddress", "addressLocality": "Uitikon", "postalCode": "8142", "addressCountry": "CH" }, "areaServed": [{ "@type": "City", "name": "Uitikon Waldegg" }, { "@type": "City", "name": "Ringlikon" }, { "@type": "City", "name": "Birmensdorf" }, { "@type": "City", "name": "Stallikon" }], "priceRange": "CHF 95–200", "aggregateRating": { "@type": "AggregateRating", "ratingValue": "5.0", "bestRating": "5", "worstRating": "1", "reviewCount": "414" } }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" }, { "@type": "ListItem", "position": 2, "name": "Fahrschule Uitikon", "item": "https://drivingteam.ch/fahrschule-uitikon/" }] }) },
]
useHead({ script: jsonLdScripts })

import InstructorProfileSection from '~/components/InstructorProfileSection.vue'
import { getInstructorsByLocation } from '~/instructor-data'
const instructors = getInstructorsByLocation('uitikon')
</script>
