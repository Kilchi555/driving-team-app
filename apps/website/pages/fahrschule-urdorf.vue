<template>
  <div>
    <Head>
      <Title>Fahrschule Urdorf | Skender | DE/EN/AL | Driving Team</Title>
      <Meta name="description" content="Mit Fahrlehrer Skender ab Bhf Glanzenberg oder Weihermatt zur Prüfung. Ab CHF 95.-, dreisprachig (DE/EN/AL), Prüfung Albisgütli/Regensdorf. Jetzt buchen!" />
      <Meta name="keywords" content="Fahrschule Urdorf, Fahrstunden Urdorf, Fahrlehrer Urdorf, Führerschein Urdorf, Auto Fahrschule Urdorf, Fahrschule Limmattal" />
      <Meta property="og:title" content="Fahrschule Urdorf – Skender | Driving Team" />
      <Meta property="og:description" content="Fahrschule Urdorf mit Fahrlehrer Skender. Treffpunkt Bahnhof Glanzenberg oder Weihermatt. Prüfung Albisgütli/Regensdorf. Deutsch, Englisch & Albanisch." />
      <Meta property="og:url" content="https://drivingteam.ch/fahrschule-urdorf/" />
      <Link rel="canonical" href="https://drivingteam.ch/fahrschule-urdorf/" />
      <Meta property="og:image" content="https://drivingteam.ch/images/locations/dietikon-hero.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
      <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <!-- Hero -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-8 xs:py-16 md:py-24 relative overflow-hidden">
      <img src="/images/locations/dietikon-hero.webp" alt="Fahrstunden in Urdorf – Auto Fahrschule Driving Team Limmattal" class="absolute inset-0 w-full h-full object-cover opacity-100" fetchpriority="high" loading="eager" width="1920" height="1080" />
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="section-container relative z-10">
        <div class="max-w-3xl">
          <p class="text-primary-200 text-sm font-semibold uppercase tracking-widest mb-3">Fahrschule Driving Team</p>
          <h1 class="heading-lg text-white mb-4">Fahrschule Urdorf</h1>
          <p class="text-base xs:text-xl text-white mb-6">Skender gibt Fahrstunden in Urdorf und dem Limmattal – ab Bahnhof Glanzenberg oder Weihermatt. Auf Deutsch, Englisch und Albanisch.</p>
          <div class="flex flex-wrap gap-2 mb-6">
            <span class="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-semibold px-3 py-1.5 rounded-full">📍 Bhf Glanzenberg & Weihermatt</span>
            <span class="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-semibold px-3 py-1.5 rounded-full">⭐ 5.0 · 414 Bewertungen</span>
            <span class="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-semibold px-3 py-1.5 rounded-full">🗣️ DE / EN / Albanisch</span>
          </div>
          <a href="https://app.simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
            ✨ Jetzt Termin buchen
          </a>
        </div>
      </div>
    </section>

    <!-- Urdorf Location Info -->
    <section class="py-10 bg-white">
      <div class="section-container">
        <div class="max-w-3xl mx-auto">
          <p class="text-gray-700 leading-relaxed">Urdorf liegt im Bezirk Dietikon im Kanton Zürich, direkt an der A1-Autobahn und grenzt an Schlieren, Birmensdorf und Spreitenbach. Die Fahrprüfung für Fahrschüler aus Urdorf findet am Strassenverkehrsamt Zürich-Albisgütli oder in Regensdorf statt. Treffpunkt für Fahrstunden in Urdorf ist der Bahnhof Glanzenberg oder Weihermatt – beide bequem per S-Bahn (S3/S12) erreichbar. Das vielfältige Übungsgebiet bietet ruhige Quartierstrassen sowie anspruchsvolle Übergänge ins Knonaueramt und an die Autobahn.</p>
        </div>
      </div>
    </section>

    <FeatureSection
      title="Warum Driving Team Urdorf?"
      subtitle="Top-bewertete Fahrschule im Limmattal – Skender kennt das Übungsgebiet Urdorf und die Prüfungsrouten in- und auswendig."
      :extras="['Unterricht auch in <strong>Albanisch</strong> möglich!', '<strong>84% Erfolgsquote</strong> beim ersten Versuch', '414+ Google-Bewertungen · 5.0 Sterne']"
    />

    <section class="py-10 bg-gray-50 text-center">
      <div class="section-container">
        <p class="text-gray-600 mb-4 text-sm">Was kostet deine Fahrausbildung in Urdorf?</p>
        <PriceCalculator title="Kostenrechner Fahrschule Urdorf" />
      </div>
    </section>

    <InstructorProfileSection :instructors="instructors" />

    <div class="bg-gray-50">
      <LazyStandortMapSection location-key="zuerich" />
    </div>

    <AusbildungsthemenSection location="Urdorf" />
    <ReviewsSection category="zuerich" />
    <CtaSection title="Jetzt in Urdorf starten!" />
    <PriceSection />

    <!-- Prüfungsgebiet Urdorf -->
    <section class="section-container py-12">
      <div class="max-w-3xl mx-auto">
        <h2 class="heading-md mb-4">Prüfungsgebiet & Übungsrouten Urdorf</h2>
        <p class="text-gray-700 mb-4">Urdorf liegt ideal zwischen Schlieren und Birmensdorf – das Übungsgebiet kombiniert ruhigere Quartierstrassen mit Übergängen ins Knonaueramt und dem Zugang zur Autobahn. Die Verbindung nach Birmensdorf und Richtung Albis gehört zu den anspruchsvollsten und prüfungsrelevanteren Strecken im Gebiet.</p>
        <p class="text-gray-700 mb-6">Die Fahrprüfung findet am Strassenverkehrsamt <strong>Zürich-Albisgütli</strong> oder <strong>Regensdorf</strong> statt. Skender bereitet dich gezielt auf die Routen vor, die du wirklich an der Prüfung fahren wirst.</p>

        <h3 class="font-bold text-gray-900 mb-3">Treffpunkte für Urdorf</h3>
        <div class="grid sm:grid-cols-2 gap-3 mb-6">
          <div class="bg-primary-50 rounded-xl p-4 text-center border border-primary-100">
            <p class="text-2xl mb-1">🚉</p>
            <p class="font-semibold text-gray-900 text-sm">Bahnhof Glanzenberg</p>
            <p class="text-xs text-gray-500 mt-1">S-Bahn S3 / S12</p>
          </div>
          <div class="bg-primary-50 rounded-xl p-4 text-center border border-primary-100">
            <p class="text-2xl mb-1">🚉</p>
            <p class="font-semibold text-gray-900 text-sm">Bahnhof Weihermatt</p>
            <p class="text-xs text-gray-500 mt-1">S-Bahn S3 / S12</p>
          </div>
        </div>

        <h3 class="font-bold text-gray-900 mb-3">Typische Prüfungsrouten ab Urdorf</h3>
        <ul class="space-y-2 text-gray-700 mb-6">
          <li class="flex gap-2"><span class="text-primary-600 font-bold">→</span> Urdorf – Birmensdorf – Richtung Albis (Üetlibergtunnel)</li>
          <li class="flex gap-2"><span class="text-primary-600 font-bold">→</span> Schlieren – Limmattal – Dietikon</li>
          <li class="flex gap-2"><span class="text-primary-600 font-bold">→</span> Regensdorf / Otelfingen – Überlandstrecke</li>
          <li class="flex gap-2"><span class="text-primary-600 font-bold">→</span> Autobahnein-/ausfahrten Urdorf (A3)</li>
        </ul>
        <div class="flex flex-wrap gap-2 text-sm">
          <span class="bg-primary-50 text-primary-700 px-3 py-1 rounded-full">📍 Urdorf, Schlieren, Birmensdorf</span>
          <span class="bg-primary-50 text-primary-700 px-3 py-1 rounded-full">📍 Dietikon, Uitikon, Spreitenbach</span>
          <span class="bg-gray-100 text-gray-700 px-3 py-1 rounded-full">🗣️ Deutsch, Englisch & Albanisch</span>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="py-16 bg-white">
      <div class="section-container">
        <h2 class="heading-md mb-10 text-center">Häufige Fragen zur Fahrschule Urdorf</h2>
        <div class="faq-masonry">
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wo ist der Treffpunkt für Fahrstunden in Urdorf?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Wir treffen uns am Bahnhof Glanzenberg oder Bahnhof Weihermatt – je nach Wohnlage. Beide Bahnhöfe sind per S-Bahn (S3/S12) gut erreichbar. Flexible Treffpunkte nach Absprache sind ebenfalls möglich.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wo findet die Fahrprüfung für Urdorf statt?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Die Fahrprüfung findet am StVA Zürich-Albisgütli oder am StVA Regensdorf statt. Beide StVA liegen im Kanton Zürich. Skender kennt sämtliche Prüfungsrouten und bereitet dich gezielt darauf vor.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Ist Unterricht auf Albanisch in Urdorf möglich?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Ja! Skender spricht Deutsch und Albanisch. Das ist ein echter Vorteil in der Region Limmattal. Einfach bei der Buchung die Sprache angeben.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Was kostet die Fahrausbildung in Urdorf?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Eine Fahrstunde (45 Min.) kostet CHF 95.-. Mit 15 Lektionen inkl. VKU, Nothelferkurs und Prüfungsgebühren kommt man auf ca. CHF 2'250.–, mit 30 Lektionen auf ca. CHF 3'530.–.</p>
          </details>
        </div>
      </div>
    </section>

    <!-- Internal Links -->
    <section class="py-12 bg-gray-50">
      <div class="section-container">
        <h2 class="text-xl font-semibold text-gray-900 mb-6">Passende Angebote in Urdorf & Umgebung</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <a href="/fahrschule-schlieren/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Fahrschule Schlieren</a>
          <a href="/fahrschule-birmensdorf/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Fahrschule Birmensdorf</a>
          <a href="/fahrschule-uitikon/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Fahrschule Uitikon</a>
          <a href="/fahrschule-wettswil/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Fahrschule Wettswil</a>
          <a href="/fahrschule-dietikon/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Fahrschule Dietikon</a>
          <a href="/fahrschule-zuerich/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Fahrschule Zürich</a>
          <a href="/vku-kurs-zuerich/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">VKU Kurs Zürich</a>
          <a href="/nothelferkurs/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Nothelferkurs</a>
          <a href="/fahrschule-preise/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Preise & Kosten</a>
          <a href="/fahrschule-standorte/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Alle Standorte</a>
        </div>
      </div>
    </section>

    <div class="bg-gray-50"><GutscheinSection /></div>
    <CtaSection title="Bereit? Jetzt Termin buchen!" />
    <StandorteSection exclude="urdorf" />
    <WarumSection category="urdorf" />
  </div>
</template>

<script setup lang="ts">
const jsonLdScripts = [
  { type: 'application/ld+json', innerHTML: JSON.stringify({ "@context": "https://schema.org", "@type": ["DrivingSchool", "LocalBusiness"], "name": "Driving Team Fahrschule Urdorf", "description": "Professionelle Fahrausbildung in Urdorf im Limmattal. Fahrlehrer Skender – Deutsch, Albanisch und Englisch. Treffpunkt Bahnhof Glanzenberg oder Weihermatt.", "url": "https://drivingteam.ch/fahrschule-urdorf/", "telephone": "+41444310033", "address": { "@type": "PostalAddress", "addressLocality": "Urdorf", "postalCode": "8902", "addressCountry": "CH" }, "areaServed": [{ "@type": "City", "name": "Urdorf" }, { "@type": "City", "name": "Schlieren" }, { "@type": "City", "name": "Birmensdorf" }], "priceRange": "CHF 95–200", "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "reviewCount": "143", "bestRating": "5", "worstRating": "1" } }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" }, { "@type": "ListItem", "position": 2, "name": "Fahrschule Urdorf", "item": "https://drivingteam.ch/fahrschule-urdorf/" }] }) },
]
useHead({ script: jsonLdScripts })

import InstructorProfileSection from '~/components/InstructorProfileSection.vue'
import { getInstructorsByLocation } from '~/instructor-data'
const instructors = getInstructorsByLocation('urdorf')
</script>
