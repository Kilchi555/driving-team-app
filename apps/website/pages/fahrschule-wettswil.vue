<template>
  <div>
    <Head>
      <Title>Fahrschule Wettswil am Albis | Autobahn & Whiskeypass | Driving Team</Title>
      <Meta name="description" content="Fahrlehrer Skender trainiert mit dir die Autobahnauffahrt A3 und den Whiskeypass – ideale Vorbereitung für Albisgütli. Ab CHF 95.-. Jetzt buchen!" />
      <Meta name="keywords" content="Fahrschule Wettswil, Fahrschule Wettswil am Albis, Fahrstunden Wettswil, Fahrlehrer Wettswil, Führerschein Wettswil, Fahrschule Bonstetten, Fahrschule Knonaueramt" />
      <Meta property="og:title" content="Fahrschule Wettswil am Albis – Autobahn & Whiskeypass | Driving Team" />
      <Meta property="og:description" content="Fahrschule Wettswil am Albis mit Fahrlehrer Skender. Autobahnauffahrten Wettswil, Whiskeypass, Prüfung Albisgütli. Deutsch, Englisch & Albanisch." />
      <Meta property="og:url" content="https://drivingteam.ch/fahrschule-wettswil/" />
      <Link rel="canonical" href="https://drivingteam.ch/fahrschule-wettswil/" />
      <Meta property="og:image" content="https://drivingteam.ch/images/locations/dietikon-hero.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
      <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <!-- Hero -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-8 xs:py-16 md:py-24 relative overflow-hidden">
      <img src="/images/locations/dietikon-hero.webp" alt="Fahrstunden Wettswil am Albis – Autobahnauffahrt Whiskeypass Fahrschule" class="absolute inset-0 w-full h-full object-cover opacity-100" fetchpriority="high" loading="eager" width="1920" height="1080" />
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="section-container relative z-10">
        <div class="max-w-3xl">
          <p class="text-primary-200 text-sm font-semibold uppercase tracking-widest mb-3">Fahrschule Driving Team</p>
          <h1 class="heading-lg text-white mb-4">Fahrschule Wettswil am Albis</h1>
          <p class="text-base xs:text-xl text-white mb-6">Skender bereitet dich in Wettswil am Albis gezielt vor – Autobahnauffahrten, Whiskeypass und kurvenreiche Überlandstrecken im Knonaueramt. Prüfung am StVA Albisgütli.</p>
          <div class="flex flex-wrap gap-2 mb-6">
            <span class="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-semibold px-3 py-1.5 rounded-full">🚉 Bhf Wettswil-Bonstetten · A3</span>
            <span class="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-semibold px-3 py-1.5 rounded-full">⭐ 5.0 · 414 Bewertungen</span>
            <span class="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-semibold px-3 py-1.5 rounded-full">🗣️ DE / EN / Albanisch</span>
          </div>
          <a href="https://app.simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
            ✨ Jetzt Termin buchen
          </a>
        </div>
      </div>
    </section>

    <!-- Wettswil Location Info -->
    <section class="py-10 bg-white">
      <div class="section-container">
        <div class="max-w-3xl mx-auto">
          <p class="text-gray-700 leading-relaxed">Wettswil am Albis liegt im Kanton Zürich, südlich von Zürich im Knonaueramt, und grenzt an Bonstetten und Stallikon. Die Gemeinde ist direkt an die A3-Autobahn angebunden. Die Fahrprüfung für Fahrschüler aus Wettswil findet am Strassenverkehrsamt Zürich-Albisgütli statt – alternativ auch in Baar. Treffpunkt ist der Bahnhof Wettswil-Bonstetten (S9/S14). Das Übungsgebiet vereint städtische Autobahnübergänge mit kurvenreichen Landstrassen wie dem Whiskeypass und den Albis-Strecken.</p>
        </div>
      </div>
    </section>

    <FeatureSection
      title="Warum Driving Team Wettswil?"
      subtitle="Wettswil liegt direkt an der A3 – wir üben Autobahnein- und -ausfahrten, Whiskeypass und das gesamte Knonaueramt für eine praxisnahe Prüfungsvorbereitung."
      :extras="['<strong>Autobahnauffahrten</strong> Wettswil (A3) – gezielt geübt', '<strong>Whiskeypass</strong> & Knonaueramt-Strecken', '414+ Google-Bewertungen · 5.0 Sterne']"
    />

    <section class="py-10 bg-gray-50 text-center">
      <div class="section-container">
        <p class="text-gray-600 mb-4 text-sm">Was kostet deine Fahrausbildung in Wettswil?</p>
        <PriceCalculator title="Kostenrechner Fahrschule Wettswil" />
      </div>
    </section>

    <InstructorProfileSection :instructors="instructors" />

    <div class="bg-gray-50">
      <LazyStandortMapSection location-key="zuerich" />
    </div>

    <AusbildungsthemenSection location="Wettswil am Albis" />
    <ReviewsSection category="zuerich" />
    <CtaSection title="Jetzt in Wettswil starten!" />
    <PriceSection />

    <!-- Prüfungsgebiet Wettswil – UNIQUE CONTENT -->
    <section class="section-container py-12">
      <div class="max-w-3xl mx-auto">
        <h2 class="heading-md mb-4">Prüfungsgebiet Wettswil – Autobahn, Albis & Knonaueramt</h2>
        <p class="text-gray-700 mb-4">Wettswil am Albis liegt an der A3 und ist der Einstieg ins Knonaueramt – ein Übungsgebiet, das urban und ländlich gleichzeitig ist. Die Verbindung von Wettswil Richtung Bonstetten, Stallikon und über den Albis nach Uitikon umfasst die typischsten Prüfungsstrecken des StVA Albisgütli.</p>

        <!-- Autobahn Box -->
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
          <h3 class="font-bold text-blue-900 mb-2">🛣️ Autobahnauffahrten Wettswil (A3)</h3>
          <p class="text-blue-800 text-sm leading-relaxed">Die Autobahnein- und -ausfahrten Wettswil (A3 Richtung Zürich/Luzern) gehören zu den prüfungsrelevanteren Elementen im Knonaueramt. Korrekt einfahren, Spur wechseln, die richtige Geschwindigkeit aufbauen – das üben wir gezielt. Viele Fahrschüler haben hier Unsicherheiten, die wir systematisch beseitigen.</p>
        </div>

        <!-- Whiskeypass Box -->
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
          <h3 class="font-bold text-amber-900 mb-2">🏔️ Whiskeypass & Albis-Strecken</h3>
          <p class="text-amber-800 text-sm leading-relaxed">Der Whiskeypass und die Albis-Strecken sind bei Prüfern sehr beliebt. Die kurvenreichen Verbindungen zwischen Wettswil, Stallikon, Uitikon und Birmensdorf verlangen von Fahrschülern Übersicht, Spurhaltung und korrektes Verhalten im Gegenverkehr. Wir üben diese Routen systematisch.</p>
        </div>

        <h3 class="font-bold text-gray-900 mb-3">Prüfungsrouten rund um Wettswil am Albis</h3>
        <ul class="space-y-2 text-gray-700 mb-6">
          <li class="flex gap-2"><span class="text-primary-600 font-bold">→</span> <strong>Autobahnauffahrten Wettswil</strong> (A3) – Einfahren und Ausfahren</li>
          <li class="flex gap-2"><span class="text-primary-600 font-bold">→</span> <strong>Whiskeypass</strong> – kurvenreiche Verbindung ins Prüfungsgebiet</li>
          <li class="flex gap-2"><span class="text-primary-600 font-bold">→</span> <strong>Wettswil → Bonstetten</strong> – ländliche Ortsdurchfahrten</li>
          <li class="flex gap-2"><span class="text-primary-600 font-bold">→</span> <strong>Stallikon → Uitikon</strong> – anspruchsvolle Kurvenroute</li>
          <li class="flex gap-2"><span class="text-primary-600 font-bold">→</span> <strong>Richtung Altstetten / Albisgütli</strong> – Stadteinfahrt Zürich</li>
        </ul>
        <div class="flex flex-wrap gap-2 text-sm">
          <span class="bg-primary-50 text-primary-700 px-3 py-1 rounded-full">📍 Wettswil, Bonstetten, Stallikon</span>
          <span class="bg-primary-50 text-primary-700 px-3 py-1 rounded-full">📍 Uitikon, Birmensdorf, Urdorf</span>
          <span class="bg-gray-100 text-gray-700 px-3 py-1 rounded-full">🗣️ Deutsch, Englisch & Albanisch</span>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="py-16 bg-white">
      <div class="section-container">
        <h2 class="heading-md mb-10 text-center">Häufige Fragen zur Fahrschule Wettswil</h2>
        <div class="faq-masonry">
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Übt ihr auch Autobahnauffahrten in Wettswil?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Ja, das ist sogar ein Schwerpunkt. Die Autobahnauffahrten der A3 in Wettswil sind prüfungsrelevant und werden von uns systematisch geübt – Einfahren, Spurwechsel, Geschwindigkeit aufbauen und Ausfahren.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wo findet die Fahrprüfung für Wettswil statt?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Die Fahrprüfung findet am Strassenverkehrsamt Zürich-Albisgütli statt. Skender kennt alle Prüfungsrouten ab Albisgütli auswendig – inklusive Whiskeypass, Wettswil-Autobahnauffahrten und Knonaueramt-Strecken.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie komme ich als Wettswiler zum Treffpunkt?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Der Treffpunkt ist der <strong>Bahnhof Wettswil-Bonstetten</strong> (S-Bahn S9/S14). Nach Absprache sind auch flexible Treffpunkte direkt bei dir möglich.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Deckt ihr auch Bonstetten ab?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Ja, Bonstetten ist Teil unseres Tätigkeitsgebiets. Wettswil und Bonstetten liegen direkt nebeneinander und werden von uns als zusammenhängendes Gebiet betreut.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Was kostet die Fahrausbildung in Wettswil?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Eine Fahrstunde (45 Min.) kostet CHF 95.-. Mit 15 Lektionen inkl. VKU, Nothelferkurs und Prüfungsgebühren kommt man auf ca. CHF 2'250.–, mit 30 Lektionen auf ca. CHF 3'530.–.</p>
          </details>
        </div>
      </div>
    </section>

    <!-- Internal Links -->
    <section class="py-12 bg-gray-50">
      <div class="section-container">
        <h2 class="text-xl font-semibold text-gray-900 mb-6">Passende Angebote in Wettswil & Umgebung</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <a href="/fahrschule-uitikon/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Fahrschule Uitikon</a>
          <a href="/fahrschule-birmensdorf/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Fahrschule Birmensdorf</a>
          <a href="/fahrschule-urdorf/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Fahrschule Urdorf</a>
          <a href="/fahrschule-schlieren/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Fahrschule Schlieren</a>
          <a href="/fahrschule-aargau/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Fahrschule Knonaueramt</a>
          <a href="/fahrschule-zuerich/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Fahrschule Zürich</a>
          <a href="/vku-kurs-zuerich/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">VKU Kurs Zürich</a>
          <a href="/fahrschule-preise/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Preise & Kosten</a>
          <a href="/fahrschule-standorte/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Alle Standorte</a>
        </div>
      </div>
    </section>

    <div class="bg-gray-50"><GutscheinSection /></div>
    <CtaSection title="Bereit? Jetzt Termin buchen!" />
    <StandorteSection exclude="wettswil" />
    <WarumSection category="wettswil" />
  </div>
</template>

<script setup lang="ts">
const jsonLdScripts = [
  { type: 'application/ld+json', innerHTML: JSON.stringify({ "@context": "https://schema.org", "@type": ["DrivingSchool", "LocalBusiness"], "name": "Driving Team Fahrschule Wettswil am Albis", "description": "Professionelle Fahrausbildung in Wettswil am Albis. Fahrlehrer Skender – Autobahnauffahrten A3, Whiskeypass, Knonaueramt-Strecken. Prüfung am StVA Albisgütli.", "url": "https://drivingteam.ch/fahrschule-wettswil/", "telephone": "+41444310033", "address": { "@type": "PostalAddress", "addressLocality": "Wettswil am Albis", "postalCode": "8907", "addressCountry": "CH" }, "areaServed": [{ "@type": "City", "name": "Wettswil am Albis" }, { "@type": "City", "name": "Bonstetten" }, { "@type": "City", "name": "Stallikon" }, { "@type": "City", "name": "Uitikon" }], "priceRange": "CHF 95–200", "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "reviewCount": "143", "bestRating": "5", "worstRating": "1" } }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" }, { "@type": "ListItem", "position": 2, "name": "Fahrschule Wettswil", "item": "https://drivingteam.ch/fahrschule-wettswil/" }] }) },
]
useHead({ script: jsonLdScripts })

import InstructorProfileSection from '~/components/InstructorProfileSection.vue'
import { getInstructorsByLocation } from '~/instructor-data'
const instructors = getInstructorsByLocation('wettswil')
</script>
