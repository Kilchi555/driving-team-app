<template>
  <div>
    <Head>
      <Title>Fahrschule Pfäffikon SZ | Auto & Motorrad | Driving Team</Title>
      <Meta name="description" content="Fahrschule Pfäffikon SZ – Auto, Motorrad & Anhänger Fahrstunden im Bezirk Höfe. StVA Pfäffikon SZ, flexible Treffpunkte, eidg. diplomierte Fahrlehrer. Jetzt buchen!" />
      <Meta name="keywords" content="Fahrschule Pfäffikon SZ, Fahrstunden Pfäffikon SZ, Fahrlehrer Pfäffikon SZ, Autofahrschule Pfäffikon, Motorrad Fahrschule Pfäffikon SZ" />
      <Meta property="og:title" content="Fahrschule Pfäffikon SZ | Auto & Motorrad | Driving Team" />
      <Meta property="og:description" content="Professionelle Fahrausbildung in Pfäffikon SZ. Auto, Motorrad, Anhänger. StVA Pfäffikon SZ. Bezirk Höfe & Ausserschwyz." />
      <Meta property="og:url" content="https://drivingteam.ch/fahrschule-pfaeffikon-sz/" />
      <Meta property="og:type" content="website" />
      <Meta property="og:locale" content="de_CH" />
      <Link rel="canonical" href="https://drivingteam.ch/fahrschule-pfaeffikon-sz/" />
      <Link rel="preload" as="image" href="/images/locations/pfaeffikon-hero.webp" fetchpriority="high" />
      <Meta property="og:image" content="https://drivingteam.ch/images/locations/pfaeffikon-hero.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
      <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <!-- Breadcrumb -->
    <BreadcrumbNav :breadcrumbs="[{ label: 'Fahrschule', href: '/' }, { label: 'Fahrschule Pfäffikon SZ' }]" />

    <!-- 1. Hero -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-8 xs:py-16 md:py-24 relative overflow-hidden">
      <img src="/images/locations/pfaeffikon-hero.webp" alt="Fahrstunden in Pfäffikon SZ – Auto, Motorrad und Anhänger mit Driving Team" class="absolute inset-0 w-full h-full object-cover opacity-100" fetchpriority="high" loading="eager" width="1920" height="1080" />
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="section-container relative z-10">
        <div class="max-w-3xl">
          <p class="text-primary-200 text-sm font-semibold uppercase tracking-widest mb-3">Fahrschule Driving Team</p>
          <h1 class="heading-lg text-white mb-6">Fahrschule Pfäffikon SZ</h1>
          <p class="hidden xs:block text-xl text-white mb-8">Deine moderne Fahrschule in Pfäffikon SZ – individuelle Ausbildung im Bezirk Höfe, flexible Treffpunkte und eidg. diplomierte Fahrlehrer.</p>
          <a href="https://www.simy.ch/booking/availability/driving-team" target="_blank" rel="noopener noreferrer" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">
            ✨ Jetzt Termin buchen
          </a>
        </div>
      </div>
    </section>

    <!-- 2. Lokale Info-Cards -->
    <section class="py-12 bg-white">
      <div class="section-container">
        <h2 class="heading-md text-center mb-10">Fahrschule im Bezirk Höfe & Ausserschwyz</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div class="bg-gray-50 rounded-2xl p-6 text-center">
            <div class="text-3xl mb-3">📍</div>
            <h3 class="font-bold text-gray-900 mb-2">Standort Pfäffikon SZ</h3>
            <p class="text-gray-600 text-sm">Hofacker 2, 8808 Pfäffikon SZ – zentral im Bezirk Höfe, direkt am Zürichsee.</p>
          </div>
          <div class="bg-gray-50 rounded-2xl p-6 text-center">
            <div class="text-3xl mb-3">🏛️</div>
            <h3 class="font-bold text-gray-900 mb-2">StVA Pfäffikon SZ</h3>
            <p class="text-gray-600 text-sm">Praktische Prüfungen am Strassenverkehrsamt Pfäffikon SZ (Churerstrasse 50) – wir bereiten dich gezielt auf alle lokalen Prüfungsrouten vor.</p>
          </div>
          <div class="bg-gray-50 rounded-2xl p-6 text-center">
            <div class="text-3xl mb-3">🗺️</div>
            <h3 class="font-bold text-gray-900 mb-2">Fahrgebiet</h3>
            <p class="text-gray-600 text-sm">Pfäffikon SZ, Freienbach, Wollerau, Feusisberg, Schindellegi, Altendorf, Lachen, Wädenswil – das ganze Zürichseeufer.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. Features -->
    <FeatureSection
      title="Warum Driving Team Pfäffikon SZ?"
      subtitle="Melde Dich in unserer Fahrschule Pfäffikon SZ an und Du kannst folgende Punkte von uns erwarten…"
      :extras="['Unterricht auch in <strong>Englisch</strong> möglich!']"
    />

    <!-- 4. Instructors -->
    <InstructorProfileSection :instructors="instructors" />

    <!-- 5. Standort Map -->
    <div class="bg-gray-50">
      <LazyStandortMapSection location-key="pfaeffikon" />
    </div>

    <!-- 6. Ausbildungsthemen -->
    <AusbildungsthemenSection location="Pfäffikon SZ" />

    <!-- 7. Reviews -->
    <ReviewsSection category="pfaeffikon" />

    <!-- 8. CTA -->
    <CtaSection title="Jetzt in Pfäffikon SZ starten!" />

    <PriceSection />

    <!-- 9. FAQ -->
    <section class="py-16 bg-white">
      <div class="section-container">
        <h2 class="heading-md mb-10 text-center">Häufige Fragen zur Fahrschule Pfäffikon SZ</h2>
        <div class="faq-masonry">
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wo findet die praktische Prüfung statt?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Die praktische Fahrprüfung wird am <strong>Strassenverkehrsamt Pfäffikon SZ</strong> (Churerstrasse 50, 8808 Pfäffikon SZ) abgelegt. Typische Prüfungsrouten: Altendorf/Lachen, Feusisberg/Schindellegi, Wollerau/Samstagern, Freienbach/Richterswil, Rapperswil/Jona. Wir kennen alle Routen und bereiten dich gezielt darauf vor.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">In welchen Gebieten bietet ihr Fahrstunden an?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Das Tätigkeitsgebiet des Driving Team Pfäffikon SZ erstreckt sich von Hinwil bis nach Schwyz und von Horgen bis nach Ziegelbrücke. Konkret: Pfäffikon SZ, Freienbach, Wollerau, Feusisberg, Schindellegi, Altendorf, Lachen, Wangen, Siebnen, Galgenen, Wädenswil und Rapperswil-Jona. Treffpunkte sind flexibel – wir holen euch wenn möglich zu Hause oder bei der Arbeit ab.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wie viele Fahrstunden benötige ich?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Das hängt von deiner Vorerfahrung und deinem Lerntempo ab. Bei regelmässigem Üben (2–4 Mal pro Woche inkl. privaten Lernfahrten) erreichst du dein Ziel am schnellsten. Wir empfehlen zu Beginn ca. 5–10 Fahrlektionen.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Wieviel betragen die ungefähren Gesamtkosten?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Mit 15 Lektionen ca. CHF 2'250.–, mit 30 Lektionen ca. CHF 3'530.– inkl. aller Kurse und Gebühren. Nutze unseren <a href="/kostenrechner/" class="text-primary-600 hover:underline">Kostenrechner</a> für eine persönliche Schätzung.</p>
          </details>
          <details class="bg-gray-50 border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-[0_4px_16px_rgba(1,158,229,0.25)] transition group">
            <summary class="font-semibold text-gray-900 flex justify-between items-center">Soll ich geschaltet oder automatisch fahren lernen?<span class="text-primary-500 group-open:rotate-180 transition">▼</span></summary>
            <p class="text-gray-600 mt-4 text-sm leading-relaxed">Das muss jeder für sich entscheiden. Rechtlich ist es egal – nach bestandener Prüfung darfst du so oder so beides fahren.</p>
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
        <h2 class="text-xl font-semibold text-gray-900 mb-6">Kurse & Ausbildungen in Pfäffikon SZ</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
          <a href="/wab-kurse-zuerich/" class="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition text-center">
            <span class="text-2xl">🚛</span>
            <p class="font-semibold text-gray-900 text-sm">WAB Kurse</p>
            <p class="text-xs text-primary-600">Pfäffikon/Zürich Oberland</p>
          </a>
          <a href="/fahrschule-lachen/" class="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition text-center">
            <span class="text-2xl">📍</span>
            <p class="font-semibold text-gray-900 text-sm">Fahrschule</p>
            <p class="text-xs text-primary-600">Lachen SZ</p>
          </a>
          <a href="/motorrad-grundkurs-lachen/" class="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition text-center">
            <span class="text-2xl">🏍️</span>
            <p class="font-semibold text-gray-900 text-sm">Motorrad Grundkurs</p>
            <p class="text-xs text-primary-600">Lachen</p>
          </a>
          <a href="/fahrschule-zuerich/" class="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition text-center">
            <span class="text-2xl">🏙️</span>
            <p class="font-semibold text-gray-900 text-sm">Fahrschule</p>
            <p class="text-xs text-primary-600">Zürich</p>
          </a>
        </div>
      </div>
    </section>

    <div class="bg-gray-50">
      <GutscheinSection />
    </div>

    <CtaSection title="Bereit? Jetzt Termin buchen!" />

    <StandorteSection exclude="pfaeffikon" />

    <WarumSection category="pfaeffikon" />
  </div>
</template>

<script setup lang="ts">
import { buildLocationSchema, LOCATION_PFAEFFIKON } from '~/business.config'
import InstructorProfileSection from '~/components/InstructorProfileSection.vue'
import { getInstructorsByLocation } from '~/instructor-data'

const instructors = getInstructorsByLocation('pfaeffikon')

const jsonLdScripts = [
  {
    type: 'application/ld+json',
    innerHTML: JSON.stringify(buildLocationSchema(LOCATION_PFAEFFIKON)),
  },
  {
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://drivingteam.ch/' },
        { '@type': 'ListItem', position: 2, name: 'Fahrschule Pfäffikon SZ', item: 'https://drivingteam.ch/fahrschule-pfaeffikon-sz/' },
      ],
    }),
  },
  {
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'Wo findet die praktische Prüfung statt in Pfäffikon SZ?', acceptedAnswer: { '@type': 'Answer', text: 'Am Strassenverkehrsamt Pfäffikon SZ, Churerstrasse 50, 8808 Pfäffikon SZ. Typische Routen: Altendorf/Lachen, Feusisberg/Schindellegi, Wollerau/Samstagern, Freienbach/Richterswil, Rapperswil/Jona.' } },
        { '@type': 'Question', name: 'Welche Gebiete deckt die Fahrschule Pfäffikon SZ ab?', acceptedAnswer: { '@type': 'Answer', text: 'Pfäffikon SZ, Freienbach, Wollerau, Feusisberg, Schindellegi, Altendorf, Lachen, Wangen, Siebnen, Galgenen, Wädenswil und Rapperswil-Jona (Bezirk Höfe + Ausserschwyz).' } },
        { '@type': 'Question', name: 'Wie hoch sind die Gesamtkosten für den Führerschein in Pfäffikon SZ?', acceptedAnswer: { '@type': 'Answer', text: 'Mit 15 Lektionen ca. CHF 2\'250.–, mit 30 Lektionen ca. CHF 3\'530.– inkl. aller Kurse und Gebühren.' } },
      ],
    }),
  },
]
useHead({ script: jsonLdScripts })
</script>
