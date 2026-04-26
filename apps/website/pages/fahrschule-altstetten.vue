<template>
  <div>
    <Head>
      <Title>Fahrschule Altstetten | Direkt beim Bahnhof Altstetten</Title>
      <Meta name="description" content="Fahrschule Altstetten ✓ Hauptstandort Baslerstrasse 145 ✓ Auto, Motorrad, Anhänger ✓ 85% Erfolgsquote ✓ ab CHF 95.- ✓ Flexible Zeiten. Jetzt buchen!" />
      <Meta name="keywords" content="Fahrschule Altstetten, Fahrstunden Altstetten, Auto Fahrschule Altstetten, Fahrlehrer Altstetten, Fahrschule Zürich Altstetten" />
      <Meta property="og:title" content="Fahrschule Altstetten – Driving Team | Baslerstrasse 145" />
      <Meta property="og:description" content="Deine Fahrschule direkt in Zürich-Altstetten. Auto, Motorrad & Anhänger ab CHF 95.-. Buche jetzt flexibel online." />
      <Meta property="og:url" content="https://drivingteam.ch/fahrschule-altstetten/" />
      <Link rel="canonical" href="https://drivingteam.ch/fahrschule-altstetten/" />
      <Link rel="preload" as="image" href="/images/locations/zuerich-hero.webp" fetchpriority="high" />
      <Meta property="og:image" content="https://drivingteam.ch/images/locations/zuerich-hero.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
      <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <BreadcrumbNav :breadcrumbs="[{ label: 'Fahrschule', href: '/' }, { label: 'Zürich', href: '/fahrschule-zuerich/' }, { label: 'Altstetten' }]" />

    <!-- Hero -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-8 xs:py-16 md:py-24 relative overflow-hidden">
      <img src="/images/locations/zuerich-hero.webp" alt="Fahrschule Altstetten – Driving Team an der Baslerstrasse 145 in Zürich-Altstetten" class="absolute inset-0 w-full h-full object-cover opacity-100" fetchpriority="high" loading="eager" width="1920" height="1080" />
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="section-container relative z-10">
        <div class="max-w-3xl">
          <p class="text-primary-200 text-sm font-semibold uppercase tracking-widest mb-3">Fahrschule Driving Team</p>
          <h1 class="heading-lg text-white mb-6">Fahrschule Altstetten</h1>
          <p class="text-base xs:text-xl text-white mb-8">Unser Hauptstandort mitten in Zürich-Altstetten. Direkt an der Baslerstrasse, gut erreichbar mit S-Bahn und Tram.</p>
          <a href="https://www.simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
            ✨ Jetzt Termin buchen
          </a>
        </div>
      </div>
    </section>

    <!-- Standort-Info Altstetten -->
    <section class="py-12 md:py-16 bg-gradient-to-b from-primary-50 to-white">
      <div class="max-w-4xl mx-auto px-4">
        <div class="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Wo findest du uns in Altstetten?</h2>
            <div class="space-y-3 text-gray-700">
              <p class="text-lg">📍 <strong>Baslerstrasse 145, 8048 Zürich-Altstetten</strong></p>
              <p>Unser Standort liegt im Herzen von Altstetten – einem der lebhaftesten Stadtteile Zürichs mit direktem Anschluss an die Autobahn und das öffentliche Verkehrsnetz.</p>
            </div>
          </div>
          <div class="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 class="font-bold text-gray-900 mb-5">Anreise</h3>
            <div class="space-y-4">
              <div class="flex items-center gap-4 p-3 rounded-xl bg-gray-50">
                <span class="text-2xl w-10 text-center">🚆</span>
                <div>
                  <p class="font-semibold text-gray-900 text-sm">S-Bahn</p>
                  <p class="text-gray-600 text-sm">S3 / S9 / S12 – Bahnhof Altstetten (2 Min. zu Fuss)</p>
                </div>
              </div>
              <div class="flex items-center gap-4 p-3 rounded-xl bg-gray-50">
                <span class="text-2xl w-10 text-center">🚋</span>
                <div>
                  <p class="font-semibold text-gray-900 text-sm">Tram</p>
                  <p class="text-gray-600 text-sm">Tram 2 – Haltestelle Lindenplatz (4 Min. zu Fuss)</p>
                </div>
              </div>
              <div class="flex items-center gap-4 p-3 rounded-xl bg-gray-50">
                <span class="text-2xl w-10 text-center">🚌</span>
                <div>
                  <p class="font-semibold text-gray-900 text-sm">Bus</p>
                  <p class="text-gray-600 text-sm">Bus 80 – Haltestelle Bristenstrasse</p>
                </div>
              </div>
              <div class="flex items-center gap-4 p-3 rounded-xl bg-gray-50">
                <span class="text-2xl w-10 text-center">🚗</span>
                <div>
                  <p class="font-semibold text-gray-900 text-sm">Auto</p>
                  <p class="text-gray-600 text-sm">Parkplätze direkt vor Ort und in der Umgebung verfügbar</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <FeatureSection
      title="Warum Driving Team in Altstetten?"
      subtitle="Unser Hauptstandort in Zürich-Altstetten. Alle Kurse – Nothelfer, VKU, Theorie, Motorrad – finden hier statt. Was dich bei uns erwartet:"
      :extras="['Unterricht auch in <strong>Englisch &amp; Albanisch</strong> möglich!']"
    />

    <!-- Reviews -->
    <ReviewsSection category="zuerich" />

    <!-- Instructors -->
    <InstructorProfileSection :instructors="instructors" />

    <!-- Karte -->
    <div class="bg-gray-50">
      <LazyStandortMapSection location-key="zuerich" />
    </div>

    <!-- Ausbildungsthemen -->
    <AusbildungsthemenSection location="Altstetten" />

    <!-- Prüfungsgebiet Altstetten -->
    <section class="py-14 bg-white">
      <div class="section-container">
        <div class="max-w-3xl mx-auto">
          <h2 class="heading-md mb-6 text-center">Prüfungsgebiet ab Altstetten</h2>
          <p class="text-gray-600 text-center mb-8">Die praktische Fahrprüfung findet ab dem Strassenverkehrsamt Zürich-Albisgütli statt. Wir kennen alle Prüfungsrouten und trainieren sie mit dir.</p>
          <div class="grid sm:grid-cols-2 gap-4">
            <div class="bg-primary-50 rounded-xl p-5 border border-primary-100">
              <h3 class="font-bold text-primary-800 mb-3">🗺️ Häufige Prüfungsrouten</h3>
              <ul class="text-sm text-gray-700 space-y-1.5">
                <li>→ Altstetten – Albisrieden – Wiedikon</li>
                <li>→ Uitikon – Birmensdorf – Sihlcity</li>
                <li>→ Enge – Wollishofen – Kilchberg</li>
                <li>→ Leimbach – Adliswil – Autobahn Richtung Zürich</li>
              </ul>
            </div>
            <div class="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <h3 class="font-bold text-gray-900 mb-3">📋 Prüfungsort</h3>
              <ul class="text-sm text-gray-700 space-y-1.5">
                <li>🏛️ Strassenverkehrsamt Zürich</li>
                <li>📍 Üetlibergstrasse 301, 8036 Zürich</li>
                <li>🚌 Tram 13 / Bus 32 & 89 ab Altstetten</li>
                <li>⏱️ ca. 15 Min. ab unserem Standort</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->

    <PriceSection />

    <!-- FAQ Altstetten-spezifisch -->
    <section class="py-16 bg-white">
      <div class="section-container">
        <h2 class="heading-md mb-10 text-center">Fragen zur Fahrschule Altstetten</h2>
        <div class="faq-masonry">
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wo genau befindet sich eure Fahrschule in Altstetten?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Unser Hauptstandort ist an der Baslerstrasse 145, 8048 Zürich-Altstetten. Du erreichst uns mit der S-Bahn (Bahnhof Altstetten, 5 Min. zu Fuss), Tram 2 (Lindenplatz) oder dem Bus 80. Parkplätze sind in der Umgebung verfügbar.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">In welchen Quartieren fahren wir beim Unterricht?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Ab Altstetten fahren wir durch Albisrieden, Wiedikon, Schlieren, Urdorf und Zürich-West. Für Autobahnübungen nutzen wir die A1 und A3. Du wirst das Prüfungsgebiet rund um das Strassenverkehrsamt Albisgütli bestens kennen lernen.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Kann ich den Treffpunkt für die Fahrstunde frei wählen?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Ja, nach Möglichkeit holen wir dich auch zuhause oder beim Bahnhof  ab – sofern es in unserem Tätigkeitsgebiet liegt (Limmattal, Knonaueramt, Zürich-West). Sprich uns einfach an.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Bietet ihr auch Abendtermine und Wochenendfahrstunden in Altstetten an?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Ja. Wir bieten flexible Zeiten von früh morgens bis abends. Auch Samstagsfahrstunden sind möglich. Buche einfach online über unser Buchungssystem deinen Wunschtermin.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Sind Fahrstunden auf Englisch oder Albanisch in Altstetten möglich?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Ja, absolut. Unser Team in Altstetten unterrichtet auf Deutsch, Englisch und Albanisch.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Was kostet eine Fahrstunde ab Altstetten?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Eine Fahrstunde (45 Min.) kostet ab CHF 95.-. Für genaue Preise aller Kategorien besuche unsere <a href="/fahrschule-preise/" class="text-primary-600 hover:underline">Preisseite</a>.</p>
          </details>
        </div>
      </div>
    </section>

    <!-- Interne Verlinkung -->
    <section class="py-10 bg-gray-50">
      <div class="section-container">
        <h2 class="text-lg font-bold text-gray-900 mb-5">Weitere Angebote ab Altstetten</h2>
        <div class="flex flex-wrap gap-3">
          <a href="/fahrschule-zuerich/" class="inline-flex items-center gap-2 bg-white border-2 border-primary-200 text-primary-700 hover:border-primary-400 hover:bg-primary-50 font-semibold px-5 py-2.5 rounded-lg transition text-sm">
            🗺️ Alle Angebote in Zürich
          </a>
          <a href="/auto-fahrschule-zuerich/" class="inline-flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 hover:border-primary-300 hover:bg-gray-50 font-semibold px-5 py-2.5 rounded-lg transition text-sm">
            🚗 Auto Fahrschule Zürich
          </a>
          <a href="/vku-kurs-zuerich/" class="inline-flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 hover:border-primary-300 hover:bg-gray-50 font-semibold px-5 py-2.5 rounded-lg transition text-sm">
            📋 VKU Kurs Zürich
          </a>
          <a href="/nothelferkurs-zuerich/" class="inline-flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 hover:border-primary-300 hover:bg-gray-50 font-semibold px-5 py-2.5 rounded-lg transition text-sm">
            ❤️ Nothelferkurs Zürich
          </a>
          <a href="/motorrad-grundkurs-zuerich/" class="inline-flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 hover:border-primary-300 hover:bg-gray-50 font-semibold px-5 py-2.5 rounded-lg transition text-sm">
            🏍️ Motorrad Grundkurs Zürich
          </a>
          <a href="/taxi-fahrschule-zuerich/" class="inline-flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 hover:border-primary-300 hover:bg-gray-50 font-semibold px-5 py-2.5 rounded-lg transition text-sm">
            🚕 Taxi Fahrschule Zürich
          </a>
        </div>
      </div>
    </section>

    <CtaSection title="Fahrschule Altstetten – jetzt Termin sichern!" />

    <StandorteSection exclude="zuerich" />
  </div>
</template>

<script setup lang="ts">
const jsonLdScripts = [
  { type: 'application/ld+json', innerHTML: JSON.stringify({
    "@context": "https://schema.org",
    "@type": ["DrivingSchool", "LocalBusiness"],
    "name": "Driving Team Fahrschule Altstetten",
    "description": "Fahrschule in Zürich-Altstetten an der Baslerstrasse 145. Auto, Motorrad, Anhänger, Lastwagen. Unterricht auf Deutsch, Englisch und Albanisch.",
    "url": "https://drivingteam.ch/fahrschule-altstetten/",
    "telephone": "+41444310033",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Baslerstrasse 145",
      "addressLocality": "Zürich",
      "addressRegion": "Altstetten",
      "postalCode": "8048",
      "addressCountry": "CH"
    },
    "geo": { "@type": "GeoCoordinates", "latitude": 47.3905, "longitude": 8.4877 },
    "openingHoursSpecification": [
      { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"], "opens": "07:00", "closes": "17:00" },
      { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Saturday"], "opens": "07:00", "closes": "16:00" }
    ],
    "image": "https://drivingteam.ch/images/locations/zuerich-hero.webp",
    "priceRange": "CHF 95-200",
    "sameAs": ["https://drivingteam.ch"]
  }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drivingteam.ch/" },
      { "@type": "ListItem", "position": 2, "name": "Fahrschule Zürich", "item": "https://drivingteam.ch/fahrschule-zuerich/" },
      { "@type": "ListItem", "position": 3, "name": "Fahrschule Altstetten", "item": "https://drivingteam.ch/fahrschule-altstetten/" }
    ]
  }) },
  { type: 'application/ld+json', innerHTML: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Wo genau befindet sich eure Fahrschule in Altstetten?",
        "acceptedAnswer": { "@type": "Answer", "text": "Baslerstrasse 145, 8048 Zürich-Altstetten. Erreichbar mit S-Bahn (Bahnhof Altstetten, 5 Min.), Tram 2 (Haltestelle Lindenplatz) oder Bus 80." }
      },
      {
        "@type": "Question",
        "name": "In welchen Quartieren fahren wir beim Unterricht?",
        "acceptedAnswer": { "@type": "Answer", "text": "Ab Altstetten fahren wir durch Albisrieden, Wiedikon, Schlieren, Urdorf und Zürich-West. Für Autobahnübungen nutzen wir die A1 und A3." }
      },
      {
        "@type": "Question",
        "name": "Was kostet eine Fahrstunde ab Altstetten?",
        "acceptedAnswer": { "@type": "Answer", "text": "Eine Fahrstunde (45 Min.) kostet ab CHF 95.-. Alle Kategorienpreise findest du auf unserer Preisseite." }
      }
    ]
  }) }
]
useHead({ script: jsonLdScripts })

import InstructorProfileSection from '~/components/InstructorProfileSection.vue'
import { getInstructorsByLocation } from '~/instructor-data'

definePageMeta({ layout: 'default' })

const instructors = getInstructorsByLocation('zuerich')
</script>
