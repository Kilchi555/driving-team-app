<template>
  <div>
    <Head>
      <Title>Fahrschule Spreitenbach | Auto & Anhänger | Driving Team</Title>
      <Meta name="description" content="Fahrschule Spreitenbach – Auto und Anhänger Fahrstunden im Limmattal & Knonaueramt. Eidg. diplomierte Fahrlehrer, flexible Treffpunkte, 85% Erfolgsquote. Jetzt buchen!" />
      <Meta property="og:title" content="Fahrschule Spreitenbach | Auto & Anhänger | Driving Team" />
      <Meta property="og:description" content="Professionelle Fahrausbildung in Spreitenbach und Umgebung. Auto, Anhänger. StVA Wettingen. 85% Erfolgsquote." />
      <Meta property="og:url" content="https://drivingteam.ch/fahrschule-spreitenbach/" />
      <Link rel="canonical" href="https://drivingteam.ch/fahrschule-spreitenbach/" />
      <Link rel="preload" as="image" href="/images/locations/aargau-hero.webp" fetchpriority="high" />
      <Meta property="og:image" content="https://drivingteam.ch/images/locations/aargau-hero.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
      <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <!-- 1. Hero -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-8 xs:py-16 md:py-24 relative overflow-hidden">
      <img src="/images/locations/aargau-hero.webp" alt="Fahrstunden in Spreitenbach – Auto und Anhänger Fahrschule mit Driving Team" class="absolute inset-0 w-full h-full object-cover opacity-100" fetchpriority="high" loading="eager" width="1920" height="1080" />
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="section-container relative z-10">
        <div class="max-w-3xl">
          <p class="text-primary-200 text-sm font-semibold uppercase tracking-widest mb-3">Fahrschule Driving Team</p>
          <h1 class="heading-lg text-white mb-6">Fahrschule Spreitenbach</h1>
          <p class="hidden xs:block text-xl text-white mb-8">Deine Fahrschule in Spreitenbach – individuelle Ausbildung, flexible Treffpunkte im Limmattal und professionelle Fahrlehrer mit eidg. Fachausweis.</p>
          <a href="https://www.simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
            ✨ Jetzt Termin buchen
          </a>
        </div>
      </div>
    </section>

    <!-- 2. Lokale Info-Cards -->
    <section class="py-12 bg-white">
      <div class="section-container">
        <h2 class="heading-md text-center mb-10">Fahrschule im Limmattal & Knonaueramt</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div class="bg-gray-50 rounded-2xl p-6 text-center">
            <div class="text-3xl mb-3">📍</div>
            <h3 class="font-bold text-gray-900 mb-2">Standort Spreitenbach</h3>
            <p class="text-gray-600 text-sm">Haldenstrasse 13, 8957 Spreitenbach – zentral im Limmattal, direkt an der Autobahn A1.</p>
          </div>
          <div class="bg-gray-50 rounded-2xl p-6 text-center">
            <div class="text-3xl mb-3">🏛️</div>
            <h3 class="font-bold text-gray-900 mb-2">StVA Wettingen</h3>
            <p class="text-gray-600 text-sm">Praktische Prüfungen am Strassenverkehrsamt Wettingen – wir bereiten dich gezielt auf alle Prüfungsrouten vor.</p>
          </div>
          <div class="bg-gray-50 rounded-2xl p-6 text-center">
            <div class="text-3xl mb-3">🗺️</div>
            <h3 class="font-bold text-gray-900 mb-2">Fahrgebiet</h3>
            <p class="text-gray-600 text-sm">Spreitenbach, Dietikon, Baden, Wettingen, Neuenhof, Killwangen, Würenlos – das ganze Limmattal.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. Features -->
    <FeatureSection
      title="Warum Driving Team Spreitenbach?"
      subtitle="Melde Dich in unserer Fahrschule Spreitenbach an und Du kannst folgende Punkte von uns erwarten…"
      :extras="['Unterricht auch in <strong>Albanisch</strong> möglich!']"
    />

    <!-- 4. Instructors -->
    <InstructorProfileSection :instructors="instructors" />

    <!-- 5. Standort Map -->
    <div class="bg-gray-50">
      <LazyStandortMapSection location-key="spreitenbach" />
    </div>

    <!-- 6. Ausbildungsthemen -->
    <AusbildungsthemenSection location="Spreitenbach" />

    <!-- 7. Reviews -->
    <ReviewsSection category="aargau" />

    <!-- 8. CTA -->
    <CtaSection title="Jetzt in Spreitenbach starten!" />

    <PriceSection />

    <!-- 9. FAQ -->
    <section class="py-16 bg-white">
      <div class="section-container">
        <h2 class="heading-md mb-10 text-center">Häufige Fragen zur Fahrschule Spreitenbach</h2>
        <div class="faq-masonry">
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wo findet die praktische Prüfung statt?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Die praktische Fahrprüfung wird am <strong>Strassenverkehrsamt Wettingen</strong> (Kanton Aargau) abgelegt. Typische Prüfungsrouten führen nach Regensberg/Buchs, Otelfingen/Würenlos, Baden/Ehrendingen oder Baden/Obersiggenthal. Wir bereiten dich gezielt auf diese Routen vor.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">In welchen Gebieten bietet ihr Fahrstunden an?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Unser Fahrgebiet umfasst das gesamte Limmattal und Knonaueramt: Spreitenbach, Dietikon, Schlieren, Baden, Wettingen, Neuenhof, Killwangen, Würenlos, Bergdietikon, Oetwil an der Limmat und Umgebung. Bei der Anhänger- und Motorradausbildung ist der Treffpunkt Zürich-Altstetten.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wieviele Fahrstunden benötige ich?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Das ist individuell verschieden. Wir empfehlen zu Beginn ca. 5–10 Fahrlektionen und anschliessend regelmässige private Lernfahrten (2–4 Mal pro Woche). Mit seriösem Training erreichst du dein Ziel effizient.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wieviel betragen die ungefähren Gesamtkosten?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Mit 15 Lektionen kommst du inkl. aller Kurse und Gebühren auf ca. CHF 2'250.–, mit 30 Lektionen auf ca. CHF 3'530.–. Nutze unseren <a href="/kostenrechner/" class="text-primary-600 hover:underline">Kostenrechner</a> für eine persönliche Schätzung.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie lange dauert eine Fahrstunde?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Eine Lektion dauert 45 Minuten – da die Konzentration danach nachlässt, ist dies unsere Grundeinheit. Je nach Übungsgebiet und Ausbildungsstand empfehlen wir 1,5- oder Doppellektionen.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Ab welchem Alter kann ich starten?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Für 50ccm Motorräder ab 15 Jahren, 125ccm ab 16 Jahren. Lernfahrten fürs Auto sind ab dem 17. Geburtstag erlaubt.</p>
          </details>
        </div>
      </div>
    </section>

    <!-- 10. Internal Links -->
    <section class="py-12 bg-gray-50">
      <div class="section-container">
        <h2 class="text-xl font-semibold text-gray-900 mb-6">Passende Angebote in Spreitenbach & Umgebung</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <a href="/auto-fahrschule/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Auto Fahrschule</a>
          <a href="/anhaenger-fahrschule/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Anhänger Fahrschule</a>
          <a href="/fahrschule-dietikon/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Fahrschule Dietikon</a>
          <a href="/vku-kurse/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">VKU Kurs</a>
          <a href="/fahrschule-preise/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Preise & Kosten</a>
          <a href="/kostenrechner/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Kostenrechner</a>
          <a href="/blog/fuehrerschein-kosten-schweiz/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Führerschein Kosten</a>
          <a href="/fahrschule-standorte/" class="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition text-center">Alle Standorte</a>
        </div>
      </div>
    </section>

    <div class="bg-gray-50">
      <GutscheinSection />
    </div>

    <CtaSection title="Bereit? Jetzt Termin buchen!" />

    <StandorteSection exclude="aargau" />

    <WarumSection category="aargau" />
  </div>
</template>

<script setup lang="ts">
import { buildLocationSchema, LOCATION_SPREITENBACH } from '~/business.config'
import InstructorProfileSection from '~/components/InstructorProfileSection.vue'
import { getInstructorsByLocation } from '~/instructor-data'

const instructors = getInstructorsByLocation('aargau')

const jsonLdScripts = [
  {
    type: 'application/ld+json',
    innerHTML: JSON.stringify(buildLocationSchema(LOCATION_SPREITENBACH)),
  },
  {
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://drivingteam.ch/' },
        { '@type': 'ListItem', position: 2, name: 'Fahrschule Spreitenbach', item: 'https://drivingteam.ch/fahrschule-spreitenbach/' },
      ],
    }),
  },
  {
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Wo findet die praktische Prüfung statt?',
          acceptedAnswer: { '@type': 'Answer', text: 'Die praktische Fahrprüfung wird am Strassenverkehrsamt Wettingen abgelegt. Typische Prüfungsrouten: Regensberg/Buchs, Otelfingen/Würenlos, Baden/Ehrendingen, Baden/Obersiggenthal.' },
        },
        {
          '@type': 'Question',
          name: 'In welchen Gebieten bietet Driving Team Spreitenbach Fahrstunden an?',
          acceptedAnswer: { '@type': 'Answer', text: 'Das Fahrgebiet umfasst das gesamte Limmattal und Knonaueramt: Spreitenbach, Dietikon, Schlieren, Baden, Wettingen, Neuenhof, Killwangen, Würenlos und Umgebung.' },
        },
        {
          '@type': 'Question',
          name: 'Wieviel betragen die ungefähren Gesamtkosten?',
          acceptedAnswer: { '@type': 'Answer', text: 'Mit 15 Lektionen kommt man inkl. allen Kursen und Gebühren auf ca. CHF 2\'250.–, mit 30 Lektionen auf ca. CHF 3\'530.–.' },
        },
      ],
    }),
  },
]
useHead({ script: jsonLdScripts })
</script>
