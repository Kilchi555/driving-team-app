<template>
  <div>
    <Head>
      <Title>Fahrschule Schlieren | Skender | DE/EN/AL | Driving Team</Title>
      <Meta name="description" content="Fahrschule Schlieren ✓ Fahrlehrer Skender ✓ Treffpunkt Bhf Schlieren & Glanzenberg ✓ Prüfung Albisgütli/Regensdorf ✓ DE/EN/AL ✓ Ab CHF 95.-. Anmelden!" />
      <Meta name="keywords" content="Fahrschule Schlieren, Fahrstunden Schlieren, Fahrlehrer Schlieren, Fahrschule Limmattal, Führerschein Schlieren, Auto Fahrschule Schlieren" />
      <Meta property="og:title" content="Fahrschule Schlieren – Skender | Driving Team" />
      <Meta property="og:description" content="Fahrschule Schlieren mit Fahrlehrer Skender. Treffpunkt Bahnhof Schlieren, Glanzenberg oder Weihermatt. Prüfung Albisgütli/Regensdorf. Deutsch, Englisch & Albanisch." />
      <Meta property="og:url" content="https://drivingteam.ch/fahrschule-schlieren/" />
      <Link rel="canonical" href="https://drivingteam.ch/fahrschule-schlieren/" />
      <Meta property="og:image" content="https://drivingteam.ch/images/locations/dietikon-hero.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
      <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <!-- Hero -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-8 xs:py-16 md:py-24 relative overflow-hidden">
      <img src="/images/locations/dietikon-hero.webp" alt="Fahrstunden in Schlieren – Auto Fahrschule Driving Team Limmattal" class="absolute inset-0 w-full h-full object-cover opacity-100" fetchpriority="high" loading="eager" width="1920" height="1080" />
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="section-container relative z-10">
        <div class="max-w-3xl">
          <p class="text-primary-200 text-sm font-semibold uppercase tracking-widest mb-3">Fahrschule Driving Team</p>
          <h1 class="heading-lg text-white mb-4">Fahrschule Schlieren</h1>
          <p class="text-base xs:text-xl text-white mb-6">Skender gibt Fahrstunden in Schlieren und dem Limmattal – ab Bahnhof Schlieren, Glanzenberg oder Weihermatt. Auf Deutsch, Englisch und Albanisch.</p>
          <div class="flex flex-wrap gap-2 mb-6">
            <span class="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-semibold px-3 py-1.5 rounded-full">📍 Bhf Schlieren / Glanzenberg / Weihermatt</span>
            <span class="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-semibold px-3 py-1.5 rounded-full">⭐ 5.0 · 414 Bewertungen</span>
            <span class="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-semibold px-3 py-1.5 rounded-full">🗣️ DE / EN / Albanisch</span>
          </div>
          <a href="https://app.simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
            ✨ Jetzt Termin buchen
          </a>
        </div>
      </div>
    </section>

    <!-- Features -->
    <FeatureSection
      title="Warum Driving Team Schlieren?"
      subtitle="Top-bewertete Fahrschule im Limmattal – Skender kennt jede Strasse in Schlieren und bereitet dich gezielt auf deine Prüfung vor."
      :extras="['Unterricht auch in <strong>Albanisch</strong> möglich!', '<strong>85% Erfolgsquote</strong> beim ersten Versuch', '414+ Google-Bewertungen · 5.0 Sterne']"
    />

    <section class="py-10 bg-gray-50 text-center">
      <div class="section-container">
        <p class="text-gray-600 mb-4 text-sm">Was kostet deine Fahrausbildung in Schlieren?</p>
        <PriceCalculator title="Kostenrechner Fahrschule Schlieren" />
      </div>
    </section>

    <!-- Instructor -->
    <InstructorProfileSection :instructors="instructors" />

    <!-- Standort Map -->
    <div class="bg-gray-50">
      <LazyStandortMapSection location-key="zuerich" />
    </div>

    <!-- Ausbildungsthemen -->
    <AusbildungsthemenSection location="Schlieren" />

    <!-- Reviews -->
    <ReviewsSection category="zuerich" />

    <!-- CTA -->
    <CtaSection title="Jetzt in Schlieren starten!" />

    <PriceSection />

    <!-- Prüfungsgebiet Schlieren -->
    <section class="section-container py-12">
      <div class="max-w-3xl mx-auto">
        <h2 class="heading-md mb-4">Prüfungsgebiet & Übungsrouten Schlieren</h2>
        <p class="text-gray-700 mb-4">Schlieren bietet ein vielfältiges Übungsgebiet: dichter Stadtverkehr entlang der Zürcherstrasse und Bernstrasse, zahlreiche Lichtsignalanlagen, Kreisel und Strassenbahntrassees. Der angrenzende Schlierener Wald und die Übergänge nach Urdorf und Birmensdorf sind klassische Prüfungsrouten.</p>
        <p class="text-gray-700 mb-6">Die Fahrprüfung findet am Strassenverkehrsamt <strong>Zürich-Albisgütli</strong> oder <strong>Regensdorf</strong> statt. Fahrlehrer <strong>Skender</strong> kennt alle Prüfungsrouten auswendig und trainiert dich genau auf die Strecken, die du an der Prüfung fahren wirst.</p>

        <h3 class="font-bold text-gray-900 mb-3">Treffpunkte in Schlieren</h3>
        <div class="grid sm:grid-cols-3 gap-3 mb-6">
          <div class="bg-primary-50 rounded-xl p-4 text-center border border-primary-100">
            <p class="text-2xl mb-1">🚉</p>
            <p class="font-semibold text-gray-900 text-sm">Bahnhof Schlieren</p>
            <p class="text-xs text-gray-500 mt-1">S-Bahn S3 / S12</p>
          </div>
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

        <h3 class="font-bold text-gray-900 mb-3">Typische Prüfungsrouten ab Schlieren</h3>
        <ul class="space-y-2 text-gray-700 mb-6">
          <li class="flex gap-2"><span class="text-primary-600 font-bold">→</span> Schlierener Wald – kurvenreiche Waldstrecke, sehr beliebt an der Prüfung</li>
          <li class="flex gap-2"><span class="text-primary-600 font-bold">→</span> Urdorf / Birmensdorf – ländliche Übergänge mit Rechtsvortrittssituationen</li>
          <li class="flex gap-2"><span class="text-primary-600 font-bold">→</span> Richtung Altstetten / Zürich – urbaner Stadtverkehr</li>
          <li class="flex gap-2"><span class="text-primary-600 font-bold">→</span> Regensdorf / Otelfingen – Überlandstrecken und Autobahn</li>
        </ul>
        <div class="flex flex-wrap gap-2 text-sm">
          <span class="bg-primary-50 text-primary-700 px-3 py-1 rounded-full">📍 Schlieren, Urdorf, Birmensdorf</span>
          <span class="bg-primary-50 text-primary-700 px-3 py-1 rounded-full">📍 Dietikon, Spreitenbach, Altstetten</span>
          <span class="bg-gray-100 text-gray-700 px-3 py-1 rounded-full">🗣️ Deutsch, Englisch & Albanisch</span>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="py-16 bg-white">
      <div class="section-container">
        <h2 class="heading-md mb-10 text-center">Häufige Fragen zur Fahrschule Schlieren</h2>
        <div class="faq-masonry">
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wo ist der Treffpunkt für Fahrstunden in Schlieren?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Wir treffen uns am Bahnhof Schlieren, Bahnhof Glanzenberg oder Bahnhof Weihermatt – je nach deinem Wohnort. Alle drei Bahnhöfe sind per S-Bahn (S3/S12) gut erreichbar. Nach Absprache sind auch flexible Treffpunkte möglich.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wo findet die Fahrprüfung für Schlieren statt?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Die Fahrprüfung findet am Strassenverkehrsamt Zürich-Albisgütli oder am StVA Regensdorf statt – je nach Wohnkanton. Skender kennt beide Prüfungsgebiete auswendig und bereitet dich gezielt auf die Prüfungsrouten vor.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Gibt es Unterricht auf Albanisch in Schlieren?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Ja! Skender spricht Deutsch und Albanisch. Gerade in Schlieren mit dem hohen Anteil albanischsprachiger Bevölkerung ist das ein grosser Vorteil. Einfach bei der Buchung die gewünschte Sprache angeben.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wieviele Fahrstunden benötige ich?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Das ist individuell verschieden und hängt von Vorkenntnissen und Lerngeschwindigkeit ab. Wir empfehlen zu Beginn 5–10 Fahrlektionen und dann regelmässige private Lernfahrten. Skenders 84% Erfolgsquote zeigt, dass wir effizient ausbilden.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Was kostet die Fahrausbildung in Schlieren?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Eine Fahrstunde (45 Min.) kostet CHF 95.-. Mit 15 Lektionen kommt man inkl. VKU, Nothelferkurs und Prüfungsgebühren auf ca. CHF 2'250.–, mit 30 Lektionen auf ca. CHF 3'530.–. Nutze unseren Kostenrechner für eine genaue Schätzung.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Welche Gebiete deckt die Fahrschule Schlieren ab?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Neben Schlieren selbst fahren wir in Urdorf, Birmensdorf, Uitikon, Dietikon, Spreitenbach, Altstetten und Umgebung. Das gesamte Limmattal und Knonaueramt ist unser Gebiet. Treffpunkt ist flexibel je nach Wohnort.</p>
          </details>
        </div>
      </div>
    </section>

    <!-- Internal Links -->
    <section class="py-12 bg-gray-50">
      <div class="section-container">
        <h2 class="text-xl font-semibold text-gray-900 mb-6">Passende Angebote in Schlieren & Umgebung</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <a href="/auto-fahrschule-zuerich/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Auto Fahrschule Zürich</a>
          <a href="/fahrschule-urdorf/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Fahrschule Urdorf</a>
          <a href="/fahrschule-uitikon/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Fahrschule Uitikon</a>
          <a href="/fahrschule-wettswil/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Fahrschule Wettswil</a>
          <a href="/fahrschule-dietikon/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Fahrschule Dietikon</a>
          <a href="/fahrschule-birmensdorf/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Fahrschule Birmensdorf</a>
          <a href="/vku-kurs-zuerich/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">VKU Kurs Zürich</a>
          <a href="/nothelferkurs/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Nothelferkurs</a>
          <a href="/fahrschule-preise/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Preise & Kosten</a>
          <a href="/fahrschule-standorte/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Alle Standorte</a>
        </div>
      </div>
    </section>

    <div class="bg-gray-50"><GutscheinSection /></div>
    <CtaSection title="Bereit? Jetzt Termin buchen!" />
    <StandorteSection exclude="schlieren" />
    <WarumSection category="schlieren" />
  </div>
</template>

<script setup lang="ts">
const jsonLdScripts = [
  { type: 'application/ld+json', innerHTML: JSON.stringify({ "@context": "https://schema.org", "@type": ["DrivingSchool", "LocalBusiness"], "name": "Driving Team Fahrschule Schlieren", "description": "Professionelle Fahrausbildung in Schlieren und Limmattal. Fahrlehrer Skender – Deutsch, Englisch und Albanisch. Treffpunkt Bahnhof Schlieren, Glanzenberg oder Weihermatt.", "url": "https://drivingteam.ch/fahrschule-schlieren/", "telephone": "+41444310033", "address": { "@type": "PostalAddress", "addressLocality": "Schlieren", "postalCode": "8952", "addressCountry": "CH" }, "areaServed": [{ "@type": "City", "name": "Schlieren" }, { "@type": "City", "name": "Urdorf" }, { "@type": "City", "name": "Birmensdorf" }], "priceRange": "CHF 95–200", "aggregateRating": { "@type": "AggregateRating", "ratingValue": "5.0", "bestRating": "5", "worstRating": "1", "reviewCount": "414" } }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" }, { "@type": "ListItem", "position": 2, "name": "Fahrschule Schlieren", "item": "https://drivingteam.ch/fahrschule-schlieren/" }] }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{ "@type": "Question", "name": "Wo ist der Treffpunkt für Fahrstunden in Schlieren?", "acceptedAnswer": { "@type": "Answer", "text": "Treffpunkt ist Bahnhof Schlieren, Glanzenberg oder Weihermatt – je nach Wohnort. Alle drei sind per S-Bahn (S3/S12) gut erreichbar." } }, { "@type": "Question", "name": "Wo findet die Fahrprüfung für Schlieren statt?", "acceptedAnswer": { "@type": "Answer", "text": "Am StVA Zürich-Albisgütli oder StVA Regensdorf, je nach Wohnkanton. Skender kennt beide Prüfungsgebiete auswendig." } }, { "@type": "Question", "name": "Gibt es Unterricht auf Albanisch in Schlieren?", "acceptedAnswer": { "@type": "Answer", "text": "Ja, Skender gibt Fahrstunden auf Deutsch und Albanisch." } }] }) },
]
useHead({ script: jsonLdScripts })

import InstructorProfileSection from '~/components/InstructorProfileSection.vue'
import { getInstructorsByLocation } from '~/instructor-data'
const instructors = getInstructorsByLocation('schlieren')
</script>
